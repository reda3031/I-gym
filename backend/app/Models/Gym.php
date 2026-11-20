<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Gym extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'slug', 'logo', 'address', 'phone', 'email', 'description',
        'speciality', 'color', 'city', 'member_count', 'max_capacity', 'is_active',
        'opening_hours', 'price_monthly', 'price_yearly', 'currency', 'advantages',
    ];

    protected $casts = [
        'is_active'     => 'boolean',
        'opening_hours' => 'array',
        'advantages'    => 'array',
        'member_count'  => 'integer',
        'max_capacity'  => 'integer',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function admins()
    {
        return $this->hasMany(User::class)->where('role', 'admin');
    }

    public function coaches()
    {
        return $this->hasMany(User::class)->where('role', 'coach');
    }

    public function members()
    {
        return $this->hasMany(User::class)->where('role', 'adherent');
    }

    public function courses()
    {
        return $this->hasMany(Course::class);
    }

    public function rooms()
    {
        return $this->hasMany(Room::class);
    }

    // Compter les membres actifs (avec abonnement valide)
    public function activeMembers()
    {
        return $this->members()->whereHas('subscriptions', fn($q) =>
            $q->where('status', 'active')->where('end_date', '>=', now()->toDateString())
        );
    }

    // Statistiques live pour le Super Admin
    public function getLiveStatsAttribute(): array
    {
        return [
            'total_members'  => $this->members()->count(),
            'active_members' => $this->activeMembers()->count(),
            'total_coaches'  => $this->coaches()->count(),
            'courses_today'  => $this->courses()->whereDate('starts_at', today())->count(),
        ];
    }
}
