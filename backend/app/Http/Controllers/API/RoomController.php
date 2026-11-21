<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\Room;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    /**
     * Occupation en temps réel des salles — cloisonné par gym_id
     */
    public function occupancy(Request $request)
    {
        $user = $request->user();
        $query = Room::query();

        if ($user && !$user->isSuperAdmin() && $user->gym_id) {
            $query->where('gym_id', $user->gym_id);
        }

        $rooms = $query->get()->map(function (Room $room) {
            $liveCount = AttendanceLog::where('room_id', $room->id)
                ->whereNull('checked_out_at')
                ->count();

            if ($room->current_count !== $liveCount) {
                $room->update(['current_count' => $liveCount]);
            }

            $rate = $room->capacity > 0
                ? round(($liveCount / $room->capacity) * 100, 1)
                : 0;

            $status = match(true) {
                $rate <= 50  => 'low',
                $rate <= 80  => 'medium',
                $rate < 100  => 'high',
                default      => 'full',
            };

            return [
                'id'             => $room->id,
                'name'           => $room->name,
                'capacity'       => $room->capacity,
                'current_count'  => $liveCount,
                'occupancy_rate' => $rate,
                'status'         => $status,
                'gym_id'         => $room->gym_id,
            ];
        });

        return response()->json($rooms);
    }

    /**
     * Historique d'occupation par heure sur les 24 dernières heures
     */
    public function hourlyStats(Request $request, int $roomId)
    {
        $user = $request->user();
        $room = Room::findOrFail($roomId);

        // Cloisonnement multi-tenant
        if ($user && !$user->isSuperAdmin() && $user->gym_id && $room->gym_id !== $user->gym_id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $since = now()->subHours(24);

        $hourlyData = AttendanceLog::where('room_id', $roomId)
            ->where('checked_in_at', '>=', $since)
            ->selectRaw('HOUR(checked_in_at) as hour, COUNT(*) as count')
            ->groupBy('hour')
            ->orderBy('hour')
            ->get()
            ->keyBy('hour');

        $stats = [];
        for ($h = 0; $h < 24; $h++) {
            $stats[] = [
                'hour'  => sprintf('%02d:00', $h),
                'count' => $hourlyData->get($h)?->count ?? 0,
            ];
        }

        return response()->json([
            'room'    => $room->name,
            'stats'   => $stats,
        ]);
    }

    /**
     * Lister les salles (cloisonné par salle)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Room::query();

        if ($user && !$user->isSuperAdmin() && $user->gym_id) {
            $query->where('gym_id', $user->gym_id);
        }

        return response()->json($query->get());
    }
}
