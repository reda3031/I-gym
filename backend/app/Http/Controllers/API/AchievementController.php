<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Badge;
use App\Models\User;
use Illuminate\Http\Request;

class AchievementController extends Controller
{
    public function index(Request $request, int $userId)
    {
        $user = User::with('badges')->findOrFail($userId);

        $nextLevelInfo = match($user->level) {
            'bronze'   => ['next' => 'silver',   'sessions_for_next' => 10],
            'silver'   => ['next' => 'gold',     'sessions_for_next' => 30],
            'gold'     => ['next' => 'platinum', 'sessions_for_next' => 50],
            'platinum' => ['next' => null,        'sessions_for_next' => null],
            default    => ['next' => 'silver',   'sessions_for_next' => 10],
        };

        $progressToNext = null;
        if ($nextLevelInfo['sessions_for_next']) {
            $progressToNext = min(100, round(($user->total_sessions / $nextLevelInfo['sessions_for_next']) * 100));
        }

        return response()->json([
            'streak_days'       => $user->streak_days,
            'total_sessions'    => $user->total_sessions,
            'level'             => $user->level,
            'next_level'        => $nextLevelInfo['next'],
            'sessions_for_next' => $nextLevelInfo['sessions_for_next'],
            'progress_to_next'  => $progressToNext,
            'badges'            => $user->badges->map(fn($b) => [
                'type'      => $b->badge_type,
                'label'     => Badge::getLabel($b->badge_type),
                'earned_at' => $b->earned_at->format('d/m/Y'),
            ]),
        ]);
    }
}
