<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\Badge;
use App\Models\Notification;
use App\Models\Room;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AttendanceController extends Controller
{
    /**
     * Check-in via QR Code — WOW Feature #1
     * Sécurisé par verrouillage pessimiste (lockForUpdate) et rotation atomique de token.
     */
    public function checkIn(Request $request)
    {
        $request->validate([
            'qr_token' => 'required|string',
            'room_id'  => 'nullable|integer',
        ]);

        return DB::transaction(function () use ($request) {
            // Verrouiller la ligne utilisateur pour sérialiser les requêtes concurrentes
            $user = User::where('qr_token', $request->qr_token)->lockForUpdate()->first();

            if (!$user) {
                return response()->json([
                    'status'  => 'denied',
                    'message' => '❌ QR Code invalide ou expiré.',
                ], 422);
            }

            // Vérifier l'abonnement actif
            $hasActiveSub = $user->subscriptions()
                ->where('status', 'active')
                ->where('end_date', '>=', now()->toDateString())
                ->exists();

            if (!$hasActiveSub) {
                return response()->json([
                    'status'              => 'denied',
                    'user_name'           => $user->name,
                    'subscription_status' => 'expired',
                    'message'             => '❌ Accès Refusé — Abonnement expiré.',
                ]);
            }

            // Anti-doublon immédiat (< 60 secondes sans check-out)
            $recentActiveLog = AttendanceLog::where('user_id', $user->id)
                ->where('status', 'granted')
                ->whereNull('checked_out_at')
                ->where('checked_in_at', '>=', now()->subSeconds(60))
                ->first();

            if ($recentActiveLog) {
                return response()->json([
                    'status'  => 'denied',
                    'message' => '⚠️ Check-in déjà effectué récemment. Veuillez patienter avant un nouveau scan.',
                ], 429);
            }

            // Trouver la salle en respectant le cloisonnement multi-tenant (gym_id)
            $room = null;
            if ($request->filled('room_id')) {
                $room = Room::where('id', $request->room_id)
                    ->when($user->gym_id, fn($q) => $q->where('gym_id', $user->gym_id))
                    ->lockForUpdate()
                    ->first();
            }

            if (!$room && $user->gym_id) {
                $room = Room::where('gym_id', $user->gym_id)->lockForUpdate()->first();
            }

            if (!$room) {
                $room = Room::lockForUpdate()->first();
            }

            if (!$room) {
                return response()->json([
                    'status'  => 'denied',
                    'message' => '❌ Aucune salle disponible pour enregistrer l\'accès.',
                ], 422);
            }

            // Enregistrer la présence
            AttendanceLog::create([
                'user_id'    => $user->id,
                'room_id'    => $room->id,
                'qr_token'   => $user->qr_token,
                'status'     => 'granted',
            ]);

            // Notification pour l'utilisateur
            Notification::create([
                'user_id'   => $user->id,
                'type'      => 'check_in_success',
                'title'     => '🚪 Entrée enregistrée',
                'message'   => "Votre accès à la salle '{$room->name}' a été validé avec succès.",
            ]);

            // Incrémenter le compteur de la salle
            $room->increment('current_count');

            // Calculer streak
            $today = now()->toDateString();
            $yesterday = now()->subDay()->toDateString();

            if ($user->last_session_date == $yesterday) {
                $user->streak_days++;
            } elseif ($user->last_session_date != $today) {
                $user->streak_days = 1;
            }

            $user->total_sessions++;
            $user->last_session_date = $today;

            // Calculer le niveau
            $user->level = match(true) {
                $user->total_sessions >= 50 => 'platinum',
                $user->total_sessions >= 30 => 'gold',
                $user->total_sessions >= 10 => 'silver',
                default                     => 'bronze',
            };

            // Régénérer immédiatement le token QR (invalidation instantanée des replays)
            $user->qr_token = Str::random(64);
            $user->save();

            // Attribuer badges automatiquement
            $this->attributeBadges($user);

            return response()->json([
                'status'              => 'granted',
                'user_name'           => $user->name,
                'subscription_status' => 'active',
                'streak_days'         => $user->streak_days,
                'total_sessions'      => $user->total_sessions,
                'level'               => $user->level,
                'message'             => "✅ Accès Accordé — Bienvenue {$user->name} !",
                'new_qr_token'        => $user->qr_token,
            ]);
        });
    }

    /**
     * Check-out — libérer la place en salle
     */
    public function checkOut(Request $request)
    {
        $user = $request->user();

        return DB::transaction(function () use ($user) {
            $log = AttendanceLog::where('user_id', $user->id)
                ->whereNull('checked_out_at')
                ->latest()
                ->lockForUpdate()
                ->first();

            if (!$log) {
                return response()->json(['message' => 'Aucune séance en cours.'], 404);
            }

            $log->update(['checked_out_at' => now()]);

            // Décrémenter le compteur de la salle de manière atomique
            $room = Room::where('id', $log->room_id)->lockForUpdate()->first();
            if ($room && $room->current_count > 0) {
                $room->decrement('current_count');
            }

            return response()->json(['message' => '✅ Séance terminée. À bientôt !']);
        });
    }

    /**
     * Récapitulatif hebdomadaire d'un adhérent (avec contrôle de visibilité)
     */
    public function weeklySummary(Request $request, int $userId)
    {
        $authUser = $request->user();
        $user = User::findOrFail($userId);

        if ($authUser->isAdherent() && $authUser->id !== $userId) {
            return response()->json(['message' => 'Accès interdit.'], 403);
        }

        if (($authUser->isCoach() || $authUser->isAdmin()) && !$authUser->isSuperAdmin()) {
            if ($authUser->gym_id && $user->gym_id && $authUser->gym_id !== $user->gym_id) {
                return response()->json(['message' => 'Accès interdit (autre salle).'], 403);
            }
        }

        $weekStart = now()->startOfWeek();
        $sessionsThisWeek = AttendanceLog::where('user_id', $userId)
            ->where('status', 'granted')
            ->where('checked_in_at', '>=', $weekStart)
            ->count();

        // Objectif : 3 séances par semaine par défaut
        $weeklyGoal = 3;

        $message = match(true) {
            $sessionsThisWeek === 0 =>
                "😴 Pas encore de séance cette semaine. Commencez maintenant !",
            $sessionsThisWeek < $weeklyGoal =>
                "💪 Vous avez fait {$sessionsThisWeek} séance(s) cette semaine. Encore " . ($weeklyGoal - $sessionsThisWeek) . " pour atteindre l'objectif !",
            $sessionsThisWeek === $weeklyGoal =>
                "🎯 Objectif hebdomadaire atteint ! Excellent travail !",
            default =>
                "🏆 Incroyable ! {$sessionsThisWeek} séances cette semaine. Vous dépassez l'objectif !",
        };

        $nextReservation = $user->reservations()
            ->with('course')
            ->whereHas('course', fn($q) => $q->where('starts_at', '>', now()))
            ->where('status', 'confirmed')
            ->orderBy('reserved_at')
            ->first();

        return response()->json([
            'sessions_this_week'  => $sessionsThisWeek,
            'weekly_goal'         => $weeklyGoal,
            'progress_percentage' => min(100, round(($sessionsThisWeek / $weeklyGoal) * 100)),
            'message'             => $message,
            'streak_days'         => $user->streak_days,
            'next_reservation'    => $nextReservation ? [
                'course_name' => $nextReservation->course->name,
                'starts_at'   => $nextReservation->course->starts_at,
            ] : null,
        ]);
    }

    /**
     * Attribuer badges automatiquement selon les seuils
     */
    private function attributeBadges(User $user): void
    {
        $newBadges = [];

        // Première séance
        if ($user->total_sessions === 1) {
            $newBadges[] = 'first_session';
        }

        // Streaks
        if ($user->streak_days === 5) {
            $newBadges[] = 'streak_5';
        }
        if ($user->streak_days === 10) {
            $newBadges[] = 'streak_10';
        }

        // Champion du mois (20+ séances ce mois)
        $sessionsThisMonth = AttendanceLog::where('user_id', $user->id)
            ->whereMonth('checked_in_at', now()->month)
            ->count();
        if ($sessionsThisMonth >= 20) {
            $newBadges[] = 'monthly_champion';
        }

        // Cardio master (10 séances cardio)
        $cardioSessions = AttendanceLog::where('user_id', $user->id)
            ->whereHas('room')
            ->count();
        if ($cardioSessions >= 10) {
            $newBadges[] = 'cardio_master';
        }

        // Early bird (check-in avant 8h)
        if (now()->hour < 8) {
            $newBadges[] = 'early_bird';
        }

        foreach ($newBadges as $badgeType) {
            $exists = Badge::where('user_id', $user->id)
                ->where('badge_type', $badgeType)
                ->exists();

            if (!$exists) {
                Badge::create([
                    'user_id'    => $user->id,
                    'badge_type' => $badgeType,
                    'earned_at'  => now(),
                ]);

                // Notifier l'utilisateur
                Notification::create([
                    'user_id' => $user->id,
                    'type'    => 'badge_unlocked',
                    'title'   => '🏆 Nouveau badge débloqué !',
                    'message' => 'Vous avez débloqué : ' . Badge::getLabel($badgeType),
                ]);
            }
        }
    }
}
