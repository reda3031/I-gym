<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('badges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('badge_type', [
                'first_session',
                'streak_5',
                'streak_10',
                'cardio_master',
                'early_bird',
                'monthly_champion',
                'crossfit_warrior',
                'yoga_zen',
                'consistency_king'
            ]);
            $table->timestamp('earned_at')->useCurrent();
            $table->timestamps();

            $table->unique(['user_id', 'badge_type']); // Un badge unique par utilisateur
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('badges');
    }
};
