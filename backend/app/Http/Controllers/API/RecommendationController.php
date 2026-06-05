<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    /**
     * Recommandations intelligentes par objectif — WOW Feature #3
     */
    public function recommend(Request $request)
    {
        $request->validate([
            'objective_type' => 'required|in:perte_de_poids,prise_de_masse,endurance,flexibilite',
        ]);

        $objective = $request->objective_type;

        // Règles métier statiques (Smart Coach Engine)
        $rules = [
            'perte_de_poids' => [
                'types'       => ['Cardio', 'HIIT', 'Zumba'],
                'frequency'   => '3 fois par semaine',
                'days'        => ['Lundi', 'Mercredi', 'Vendredi'],
                'description' => 'Programme axé sur la dépense calorique et le cardio-training.',
                'tip'         => '💡 Combinez avec une alimentation équilibrée pour maximiser les résultats.',
            ],
            'prise_de_masse' => [
                'types'       => ['Musculation', 'Crossfit'],
                'frequency'   => '4 fois par semaine',
                'days'        => ['Lundi', 'Mardi', 'Jeudi', 'Vendredi'],
                'description' => 'Programme de musculation progressive pour augmenter la masse musculaire.',
                'tip'         => '💡 Augmentez votre apport en protéines (1.6g/kg de poids corporel).',
            ],
            'endurance' => [
                'types'       => ['Cardio', 'HIIT'],
                'frequency'   => '5 fois par semaine',
                'days'        => ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
                'description' => 'Programme d\'endurance cardiovasculaire pour améliorer votre résistance.',
                'tip'         => '💡 Progressez graduellement — augmentez l\'intensité de 10% par semaine.',
            ],
            'flexibilite' => [
                'types'       => ['Yoga', 'Pilates'],
                'frequency'   => '3 fois par semaine',
                'days'        => ['Mardi', 'Jeudi', 'Samedi'],
                'description' => 'Programme douceur pour améliorer la souplesse et la mobilité articulaire.',
                'tip'         => '💡 Pratiquez 10 minutes d\'étirements chaque matin pour accélérer les progrès.',
            ],
        ];

        $rule = $rules[$objective];

        // Trouver les cours disponibles correspondants
        $courses = Course::with(['coach:id,name', 'room:id,name'])
            ->withCount(['reservations as current_reservations' => function ($q) {
                $q->where('status', 'confirmed');
            }])
            ->whereIn('type', $rule['types'])
            ->where('status', 'active')
            ->where('starts_at', '>', now())
            ->orderBy('starts_at')
            ->limit(6)
            ->get()
            ->map(fn($c) => [
                'id'        => $c->id,
                'name'      => $c->name,
                'type'      => $c->type,
                'coach'     => $c->coach?->name,
                'room'      => $c->room?->name,
                'starts_at' => $c->starts_at,
                'spots'     => max(0, $c->max_capacity - $c->current_reservations),
            ]);

        // Mettre à jour l'objectif de l'utilisateur
        $request->user()->update(['objective_type' => $objective]);

        return response()->json([
            'objective'   => $objective,
            'rule'        => $rule,
            'courses'     => $courses,
        ]);
    }
}
