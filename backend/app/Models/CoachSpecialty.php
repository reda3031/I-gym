<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CoachSpecialty extends Model
{
    use HasFactory;

    protected $fillable = ['coach_id', 'specialty'];

    public function coach()
    {
        return $this->belongsTo(Coach::class);
    }
}
