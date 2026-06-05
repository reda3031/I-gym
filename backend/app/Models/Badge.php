<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Badge extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'badge_type', 'earned_at'];

    protected $casts = ['earned_at' => 'datetime'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Labels et icônes par type
    public static function getLabel(string $type): string
    {
        return match($type) {
            'first_session'     => '🏋️ Première Séance',
            'streak_5'          => '🔥 Streak 5 Jours',
            'streak_10'         => '🔥 Streak 10 Jours',
            'cardio_master'     => '❤️ Cardio Master',
            'early_bird'        => '🌅 Lève-Tôt',
            'monthly_champion'  => '🏆 Champion du Mois',
            'crossfit_warrior'  => '⚡ CrossFit Warrior',
            'yoga_zen'          => '🧘 Yoga Zen',
            'consistency_king'  => '👑 Roi de la Régularité',
            default             => '🎖️ Badge',
        };
    }
}
