<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Coach extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'bio', 'experience', 'popularity_score', 'satisfaction_score', 'online_status'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function specialties()
    {
        return $this->hasMany(CoachSpecialty::class);
    }

    public function availabilities()
    {
        return $this->hasMany(CoachAvailability::class);
    }

    public function reviews()
    {
        return $this->hasMany(CoachReview::class);
    }

    public function challenges()
    {
        return $this->hasMany(Challenge::class);
    }
}
