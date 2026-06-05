<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Challenge extends Model
{
    use HasFactory;

    protected $fillable = [
        'coach_id', 'gym_id', 'title', 'description', 'duration_days', 'xp_reward', 'badge_reward', 'status'
    ];

    public function coach()
    {
        return $this->belongsTo(Coach::class);
    }

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }

    public function participants()
    {
        return $this->hasMany(ChallengeParticipant::class);
    }
}
