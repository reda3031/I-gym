<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gyms', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('logo')->nullable();           // URL image/logo
            $table->string('address');
            $table->string('phone')->nullable();
            $table->text('description')->nullable();
            $table->string('speciality')->default('Fitness'); // CrossFit, Yoga, Cardio…
            $table->string('color')->default('#6C63FF');  // couleur thème UI
            $table->string('city')->default('Casablanca');
            $table->integer('member_count')->default(0);  // dénormalisé pour perf
            $table->boolean('is_active')->default(true);
            $table->json('opening_hours')->nullable();    // {"lun":"06:00-22:00",…}
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gyms');
    }
};
