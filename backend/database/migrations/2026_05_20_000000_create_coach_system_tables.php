<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create coaches table
        Schema::create('coaches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->text('bio')->nullable();
            $table->integer('experience')->default(1);
            $table->float('popularity_score')->default(0.0);
            $table->float('satisfaction_score')->default(5.0);
            $table->string('online_status')->default('offline');
            $table->timestamps();
        });

        // 2. Create coach_specialties table
        Schema::create('coach_specialties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coach_id')->constrained('coaches')->onDelete('cascade');
            $table->string('specialty');
            $table->timestamps();
        });

        // 3. Create coach_availabilities table
        Schema::create('coach_availabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coach_id')->constrained('coaches')->onDelete('cascade');
            $table->string('day_of_week'); // e.g. Lundi, Mardi...
            $table->time('start_time');
            $table->time('end_time');
            $table->boolean('is_off')->default(false);
            $table->time('pause_start')->nullable();
            $table->time('pause_end')->nullable();
            $table->timestamps();
        });

        // 4. Create coach_reviews table
        Schema::create('coach_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coach_id')->constrained('coaches')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // Adherent reviewer
            $table->integer('rating'); // 1-5
            $table->text('comment')->nullable();
            $table->timestamps();
            
            $table->unique(['coach_id', 'user_id']); // One review per user per coach
        });

        // 5. Create challenges table
        Schema::create('challenges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coach_id')->constrained('coaches')->onDelete('cascade');
            $table->foreignId('gym_id')->constrained('gyms')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('duration_days')->default(30);
            $table->integer('xp_reward')->default(100);
            $table->string('badge_reward')->nullable();
            $table->string('status')->default('active'); // active, completed
            $table->timestamps();
        });

        // 6. Create challenge_participants table
        Schema::create('challenge_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('challenge_id')->constrained('challenges')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->integer('progress')->default(0); // e.g. percentage or days completed
            $table->string('status')->default('in_progress'); // in_progress, completed
            $table->timestamps();

            $table->unique(['challenge_id', 'user_id']);
        });

        // 7. Update notifications table type column to string to handle all types without enum limitation
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('type')->change();
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->enum('type', [
                'cours_reminder',
                'subscription_expiry',
                'coach_change',
                'badge_unlocked',
                'weekly_recap',
                'check_in_success',
                'reservation_confirmed'
            ])->change();
        });

        Schema::dropIfExists('challenge_participants');
        Schema::dropIfExists('challenges');
        Schema::dropIfExists('coach_reviews');
        Schema::dropIfExists('coach_availabilities');
        Schema::dropIfExists('coach_specialties');
        Schema::dropIfExists('coaches');
    }
};
