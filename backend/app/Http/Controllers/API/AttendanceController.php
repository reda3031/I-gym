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
     */
    public function checkIn(Request $request)
    {
        $request->validate(['qr_token' => 'required|string']);

        // Trouver l'utilisateur via son QR token
        $user = User::where('qr_token', $request->qr_token)->first();

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

        // Trouver la salle principale (id=1 par défaut)
        $room = Room::first();

        DB::transaction(function () use ($user, $room) {
            // Enregistrer la présence
            AttendanceLog::create([
                'user_id'    => $user->id,
                'room_id'    => $room->id,
                'qr_token'   => $user->qr_token,
                'status'     => 'granted',
            ]);

            // Créer une notification de passage / check-in
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

            // Régénérer QR token après scan
            $user->qr_token = Str::random(64);
            $user->save();

            // Attribuer badges automatiquement
            $this->attributeBadges($user);
        });

        // Recharger l'utilisateur
        $user->refresh();

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
    }

    /**
     * Check-out — libérer la place en salle
     */
    public function checkOut(Request $request)
    {
        $user = $request->user();

        $log = AttendanceLog::where('user_id', $user->id)
            ->whereNull('checked_out_at')
            ->latest()
            ->first();

        if (!$log) {
            return response()->json(['message' => 'Aucune séance en cours.'], 404);
        }

        $log->update(['checked_out_at' => now()]);

        // Décrémenter le compteur de la salle
        $room = Room::find($log->room_id);
        if ($room && $room->current_count > 0) {
            $room->decrement('current_count');
        }

        return response()->json(['message' => '✅ Séance terminée. À bientôt !']);
    }

    /**
     * Récapitulatif hebdomadaire d'un adhérent
     */
    public function weeklySummary(Request $request, int $userId)
    {
        $user = User::findOrFail($userId);

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
            // Vérifier que le badge n'existe pas déjà
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
