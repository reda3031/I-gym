<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainingSheet extends Model
{
    use HasFactory;

    protected $fillable = ['coach_id', 'adherent_id', 'content', 'title', 'notes'];

    protected $casts = ['content' => 'array'];

    public function coach()
    {
        return $this->belongsTo(User::class, 'coach_id');
    }

    public function adherent()
    {
        return $this->belongsTo(User::class, 'adherent_id');
    }
}
