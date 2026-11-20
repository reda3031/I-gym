<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'gym_id', 'plan', 'price', 'start_date', 'end_date', 'status',
        'payment_method', 'validated_by_admin'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date'   => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'validated_by_admin');
    }

    public function getDaysRemainingAttribute(): int
    {
        return max(0, (int) now()->diffInDays($this->end_date, false));
    }
}
