<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CoachReview extends Model
{
    use HasFactory;

    protected $fillable = ['coach_id', 'user_id', 'rating', 'comment'];

    public function coach()
    {
        return $this->belongsTo(Coach::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class); // Adherent
    }
}
