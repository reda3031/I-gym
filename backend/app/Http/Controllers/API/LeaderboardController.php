<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeaderboardController extends Controller
{
    /**
     * Classement membres — filtré par gym
     */
    public function index(Request $request)
    {
        $period   = $request->get('period', 'week');
        $authUser = $request->user();
        $gymId    = $authUser->gym_id;

        $query = DB::table('attendance_logs')
            ->join('users', 'users.id', '=', 'attendance_logs.user_id')
            ->where('attendance_logs.status', 'granted')
            ->select(
                'users.id',
                'users.name',
                'users.level',
                'users.streak_days',
                'users.avatar',
                'users.gym_id',
                DB::raw('COUNT(attendance_logs.id) as sessions_count')
            )
            ->groupBy('users.id', 'users.name', 'users.level', 'users.streak_days', 'users.avatar', 'users.gym_id')
            ->orderByDesc('sessions_count')
            ->limit(10);

        // Filtrer par gym (adherent/coach/admin voient leur gym, super_admin voit tout)
        if (!$authUser->isSuperAdmin() && $gymId) {
            $query->where('users.gym_id', $gymId);
        }

        // Filtrer selon la période
        $query = match($period) {
            'week'  => $query->where('checked_in_at', '>=', now()->startOfWeek()),
            'month' => $query->where('checked_in_at', '>=', now()->startOfMonth()),
            default => $query,
        };

        $leaderboard = $query->get();

        $medals = ['🥇', '🥈', '🥉'];
        $ranked = $leaderboard->map(function ($entry, $index) use ($medals, $authUser) {
            return [
                'rank'           => $index + 1,
                'medal'          => $medals[$index] ?? null,
                'user_id'        => $entry->id,
                'name'           => $entry->name,
                'level'          => $entry->level,
                'streak_days'    => $entry->streak_days,
                'sessions_count' => $entry->sessions_count,
                'is_me'          => $authUser && $entry->id === $authUser->id,
            ];
        });

        $myRank = null;
        if ($authUser) {
            $myRank = $ranked->firstWhere('user_id', $authUser->id)['rank'] ?? null;
        }

        return response()->json([
            'period'      => $period,
            'leaderboard' => $ranked,
            'my_rank'     => $myRank,
        ]);
    }

    /**
     * Classement par streak pour la même salle
     */
    public function streakLeaderboard(Request $request)
    {
        $authUser = $request->user();
        $gymId = $authUser->gym_id;

        if (!$gymId) {
            return response()->json(['leaderboard' => []]);
        }

        $leaderboard = User::where('gym_id', $gymId)
            ->where('role', 'adherent')
            ->orderByDesc('streak_days')
            ->select('id', 'name', 'streak_days', 'avatar', 'level')
            ->limit(20)
            ->get();

        $ranked = $leaderboard->map(function ($entry, $index) use ($authUser) {
            return [
                'rank'        => $index + 1,
                'user_id'     => $entry->id,
                'name'        => $entry->name,
                'level'       => $entry->level,
                'streak_days' => $entry->streak_days,
                'avatar'      => $entry->avatar ? asset('storage/' . $entry->avatar) : null,
                'is_me'       => $authUser && $entry->id === $authUser->id,
            ];
        });

        return response()->json([
            'leaderboard' => $ranked,
        ]);
    }
}

