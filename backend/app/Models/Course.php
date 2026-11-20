<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'coach_id', 'room_id', 'starts_at', 'ends_at',
        'max_capacity', 'current_reservations', 'type', 'description',
        'gym_id', 'status', 'cancellation_reason',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at'   => 'datetime',
    ];

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }

    public function coach()
    {
        return $this->belongsTo(User::class, 'coach_id');
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    public function getSpotsRemainingAttribute(): int
    {
        return max(0, $this->max_capacity - $this->current_reservations);
    }

    public function getOccupancyColorAttribute(): string
    {
        $rate = $this->current_reservations / max(1, $this->max_capacity);
        if ($rate <= 0.5) return 'green';
        if ($rate <= 1.0) return 'orange';
        return 'red';
    }
}
