<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Rôle utilisateur
            $table->enum('role', ['adherent', 'coach', 'admin'])->default('adherent')->after('email');
            // Champ téléphone
            $table->string('phone')->nullable()->after('role');
            // Photo de profil
            $table->string('avatar')->nullable()->after('phone');
            // Objectif principal
            $table->enum('objective_type', ['perte_de_poids', 'prise_de_masse', 'endurance', 'flexibilite'])->nullable()->after('avatar');
            // Gamification
            $table->integer('streak_days')->default(0)->after('objective_type');
            $table->integer('total_sessions')->default(0)->after('streak_days');
            $table->enum('level', ['bronze', 'silver', 'gold', 'platinum'])->default('bronze')->after('total_sessions');
            // QR Code token (régénéré à chaque scan)
            $table->string('qr_token')->nullable()->unique()->after('level');
            // Dernière séance pour calcul streak
            $table->date('last_session_date')->nullable()->after('qr_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'phone', 'avatar', 'objective_type', 'streak_days', 'total_sessions', 'level', 'qr_token', 'last_session_date']);
        });
    }
};
