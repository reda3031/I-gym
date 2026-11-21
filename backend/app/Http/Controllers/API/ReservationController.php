<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Notification;
use App\Models\Reservation;
use App\Models\Alert;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReservationController extends Controller
{
    /**
     * Liste des cours — filtrés par gym de l'utilisateur
     */
    public function courses(Request $request)
    {
        $user  = $request->user();
        $gymId = $user->gym_id;

        $query = Course::with(['coach:id,name', 'room:id,name'])
            ->withCount(['reservations as current_reservations' => function ($q) {
                $q->where('status', 'confirmed');
            }])
            ->where('status', 'active')
            ->where('starts_at', '>', now());

        // Filtrer par gym (les utilisateurs ne voient QUE leur gym, sauf super_admin)
        if ($gymId && !$user->isSuperAdmin()) {
            $query->where('gym_id', $gymId);
        }

        // Filtre coach (pour dashboard coach)
        if ($request->filled('coach_id')) {
            $query->where('coach_id', $request->coach_id);
        }

        if ($request->filled('date')) {
            $query->whereDate('starts_at', $request->date);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $myReservations = [];
        if ($user) {
            $myReservations = Reservation::where('user_id', $user->id)
                ->where('status', 'confirmed')
                ->pluck('course_id')
                ->toArray();
        }

        $courses = $query->orderBy('starts_at')->get()->map(function (Course $c) use ($myReservations) {
            $spotsLeft = max(0, $c->max_capacity - $c->current_reservations);
            $rate = $c->max_capacity > 0
                ? ($c->current_reservations / $c->max_capacity)
                : 0;

            return [
                'id'                   => $c->id,
                'name'                 => $c->name,
                'type'                 => $c->type,
                'coach'                => $c->coach?->name,
                'room'                 => $c->room?->name,
                'starts_at'            => $c->starts_at,
                'ends_at'              => $c->ends_at,
                'max_capacity'         => $c->max_capacity,
                'current_reservations' => $c->current_reservations,
                'spots_remaining'      => $spotsLeft,
                'color'                => $rate <= 0.5 ? 'green' : ($rate < 1 ? 'orange' : 'red'),
                'is_full'              => $spotsLeft === 0,
                'gym_id'               => $c->gym_id,
                'is_reserved'          => in_array($c->id, $myReservations),
            ];
        });

        return response()->json($courses);
    }

    /**
     * Réservation d'un cours avec transaction atomique et verrouillage pessimiste
     */
    public function store(Request $request)
    {
        $request->validate(['course_id' => 'required|exists:courses,id']);

        $user = $request->user();

        return DB::transaction(function () use ($user, $request) {
            // Verrouiller la ligne du cours pour sérialiser les réservations simultanées
            $course = Course::where('id', $request->course_id)->lockForUpdate()->firstOrFail();

            // Vérifier que le cours n'est pas annulé
            if ($course->status === 'cancelled') {
                return response()->json(['message' => 'Ce cours a été annulé.'], 422);
            }

            // Vérifier le cloisonnement par salle (multi-tenant)
            if ($user->gym_id && $course->gym_id && $user->gym_id !== $course->gym_id) {
                return response()->json(['message' => 'Ce cours n\'appartient pas à votre salle.'], 403);
            }

            // Vérifier les places disponibles avec verrouillage des réservations existantes
            $confirmedCount = Reservation::where('course_id', $course->id)
                ->where('status', 'confirmed')
                ->lockForUpdate()
                ->count();

            if ($confirmedCount >= $course->max_capacity) {
                return response()->json(['message' => 'Ce cours est complet.'], 422);
            }

            // Vérifier si une réservation existe déjà pour cet adhérent
            $reservation = Reservation::where('user_id', $user->id)
                ->where('course_id', $course->id)
                ->lockForUpdate()
                ->first();

            if ($reservation) {
                if ($reservation->status === 'confirmed') {
                    return response()->json(['message' => 'Vous êtes déjà inscrit à ce cours.'], 422);
                }
                // Réactiver la réservation annulée
                $reservation->update(['status' => 'confirmed']);
            } else {
                // Créer une nouvelle réservation
                $reservation = Reservation::create([
                    'user_id'   => $user->id,
                    'course_id' => $course->id,
                    'status'    => 'confirmed',
                ]);
            }

            // Recalculer le compteur réel et mettre à jour le cours
            $newConfirmedCount = Reservation::where('course_id', $course->id)
                ->where('status', 'confirmed')
                ->count();
            $course->update(['current_reservations' => $newConfirmedCount]);

            // Notification pour l'adhérent
            Notification::create([
                'user_id' => $user->id,
                'type'    => 'reservation_confirmed',
                'title'   => '✅ Réservation confirmée',
                'message' => "Votre cours {$course->name} est confirmé pour le " .
                    $course->starts_at->format('d/m/Y à H:i') . '.',
            ]);

            // Notification pour le coach
            if ($course->coach_id) {
                Notification::create([
                    'user_id' => $course->coach_id,
                    'type'    => 'coach_change',
                    'title'   => '👥 Nouvelle inscription',
                    'message' => "L'adhérent {$user->name} s'est inscrit à votre cours '{$course->name}' du " .
                        $course->starts_at->format('d/m/Y à H:i') . ".",
                ]);
            }

            // Alerte pour le manager de la salle
            Alert::create([
                'type'    => 'info',
                'message' => "📅 Nouvelle réservation : {$user->name} s'est inscrit(e) au cours '{$course->name}'.",
                'room_id' => $course->room_id,
                'is_read' => false,
            ]);

            return response()->json([
                'message'     => 'Réservation confirmée !',
                'reservation' => $reservation->load('course'),
            ], 201);
        });
    }

    /**
     * Annuler une réservation
     */
    public function destroy(Request $request, int $id)
    {
        $user = $request->user();

        return DB::transaction(function () use ($user, $id) {
            $reservation = Reservation::where('id', $id)
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $reservation->update(['status' => 'cancelled']);

            $course = Course::where('id', $reservation->course_id)->lockForUpdate()->first();
            if ($course) {
                $newConfirmedCount = Reservation::where('course_id', $course->id)
                    ->where('status', 'confirmed')
                    ->count();
                $course->update(['current_reservations' => max(0, $newConfirmedCount)]);

                if ($course->coach_id) {
                    Notification::create([
                        'user_id' => $course->coach_id,
                        'type'    => 'coach_change',
                        'title'   => '🚫 Annulation de réservation',
                        'message' => "L'adhérent {$user->name} a annulé sa réservation pour votre cours '{$course->name}' du " .
                            $course->starts_at->format('d/m/Y à H:i') . ".",
                    ]);
                }
            }

            return response()->json(['message' => 'Réservation annulée.']);
        });
    }

    /**
     * Mes réservations
     */
    public function myReservations(Request $request)
    {
        $reservations = Reservation::where('user_id', $request->user()->id)
            ->where('status', 'confirmed')
            ->with(['course.coach:id,name', 'course.room:id,name'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($reservations);
    }
}
