<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CoachAvailability extends Model
{
    use HasFactory;

    protected $fillable = [
        'coach_id', 'day_of_week', 'start_time', 'end_time', 'is_off', 'pause_start', 'pause_end'
    ];

    protected $casts = [
        'is_off' => 'boolean'
    ];

    public function coach()
    {
        return $this->belongsTo(Coach::class);
    }
}
