<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\Room;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    /**
     * Occupation en temps réel de toutes les salles — WOW Feature #2
     */
    public function occupancy()
    {
        $rooms = Room::all()->map(function (Room $room) {
            // Recalculer depuis les logs actifs (pas de check-out)
            $liveCount = AttendanceLog::where('room_id', $room->id)
                ->whereNull('checked_out_at')
                ->count();

            // Synchroniser si nécessaire
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
            ];
        });

        return response()->json($rooms);
    }

    /**
     * Historique d'occupation par heure sur les 24 dernières heures
     */
    public function hourlyStats(Request $request, int $roomId)
    {
        $room = Room::findOrFail($roomId);
        $since = now()->subHours(24);

        // Grouper les check-ins par heure
        $hourlyData = AttendanceLog::where('room_id', $roomId)
            ->where('checked_in_at', '>=', $since)
            ->selectRaw('HOUR(checked_in_at) as hour, COUNT(*) as count')
            ->groupBy('hour')
            ->orderBy('hour')
            ->get()
            ->keyBy('hour');

        // Construire tableau complet 24h
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
     * Lister toutes les salles
     */
    public function index()
    {
        return response()->json(Room::all());
    }
}
