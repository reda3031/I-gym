<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'capacity', 'current_count', 'description', 'gym_id'];

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }

    public function courses()
    {
        return $this->hasMany(Course::class);
    }

    public function attendanceLogs()
    {
        return $this->hasMany(AttendanceLog::class);
    }

    public function alerts()
    {
        return $this->hasMany(Alert::class);
    }

    public function getOccupancyRateAttribute(): float
    {
        if ($this->capacity == 0) return 0;
        return round(($this->current_count / $this->capacity) * 100, 1);
    }

    public function getStatusAttribute(): string
    {
        $rate = $this->occupancy_rate;
        if ($rate <= 50) return 'low';
        if ($rate <= 80) return 'medium';
        if ($rate < 100) return 'high';
        return 'full';
    }
}
