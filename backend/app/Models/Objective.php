<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Objective extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'type', 'target_value', 'current_value', 'unit'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getProgressPercentageAttribute(): float
    {
        if (!$this->target_value || $this->target_value == 0) return 0;
        return min(100, round(($this->current_value / $this->target_value) * 100, 1));
    }
}
