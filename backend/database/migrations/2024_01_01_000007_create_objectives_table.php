<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('objectives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['perte_de_poids', 'prise_de_masse', 'endurance', 'flexibilite']);
            $table->decimal('target_value', 8, 2)->nullable();
            $table->decimal('current_value', 8, 2)->default(0);
            $table->string('unit')->nullable()->comment('kg, km, sessions...');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('objectives');
    }
};
