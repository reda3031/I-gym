<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Lien vers la gym (nullable au début pour ne pas bloquer les migrations existantes)
            $table->unsignedBigInteger('gym_id')->nullable()->after('id');
            $table->foreign('gym_id')->references('id')->on('gyms')->nullOnDelete();

            // Étendre le rôle pour inclure super_admin
            // On ne peut pas modifier un ENUM directement en MySQL sans tout recréer,
            // donc on utilise une colonne string temporairement lors du fresh seed
        });

        // Modifier l'ENUM role pour ajouter super_admin (spécifique à MySQL)
        if (\Illuminate\Support\Facades\DB::getDriverName() === 'mysql') {
            \Illuminate\Support\Facades\DB::statement(
                "ALTER TABLE users MODIFY role ENUM('adherent','coach','admin','super_admin') DEFAULT 'adherent'"
            );
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['gym_id']);
            $table->dropColumn('gym_id');
        });

        if (\Illuminate\Support\Facades\DB::getDriverName() === 'mysql') {
            \Illuminate\Support\Facades\DB::statement(
                "ALTER TABLE users MODIFY role ENUM('adherent','coach','admin') DEFAULT 'adherent'"
            );
        }
    }
};
