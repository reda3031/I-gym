<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->integer('age')->nullable(false)->after('email'); // age required
            $table->float('weight')->nullable()->after('age');       // weight (poids) optional
            $table->float('height')->nullable()->after('weight');    // height (taille) optional
            $table->string('gender')->nullable()->after('height');   // gender (sexe) optional
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['age', 'weight', 'height', 'gender']);
        });
    }
};
