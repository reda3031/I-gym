<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('description')->nullable();
            $table->json('specialities')->nullable();
            $table->json('availabilities')->nullable();
            $table->string('online_status')->default('offline');
            $table->float('popularity_score')->default(0.0);
            $table->float('satisfaction_score')->default(5.0);
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->string('status')->default('active'); // active, cancelled
            $table->string('cancellation_reason')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['description', 'specialities', 'availabilities', 'online_status', 'popularity_score', 'satisfaction_score']);
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn(['status', 'cancellation_reason']);
        });
    }
};
