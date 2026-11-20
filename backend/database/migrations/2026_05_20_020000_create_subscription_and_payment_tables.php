<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Modify gyms table
        Schema::table('gyms', function (Blueprint $table) {
            $table->decimal('price_monthly', 8, 2)->default(300.00)->after('opening_hours');
            $table->decimal('price_yearly', 8, 2)->default(2500.00)->after('price_monthly');
            $table->string('currency')->default('DH')->after('price_yearly');
            $table->json('advantages')->nullable()->after('currency');
        });

        // 2. Modify subscriptions table to support more statuses and gym relation
        Schema::table('subscriptions', function (Blueprint $table) {
            // Change status from enum to string to allow 'pending', 'active', 'expired', 'suspended'
            $table->string('status')->default('pending')->change();
            
            $table->foreignId('gym_id')->nullable()->constrained('gyms')->onDelete('cascade')->after('user_id');
            $table->string('payment_method')->nullable()->after('status');
            $table->foreignId('validated_by_admin')->nullable()->constrained('users')->onDelete('set null')->after('payment_method');
        });

        // 3. Create payments table
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('gym_id')->constrained()->onDelete('cascade');
            $table->foreignId('subscription_id')->constrained()->onDelete('cascade');
            $table->decimal('amount', 8, 2);
            $table->string('payment_method')->default('cash'); // cash, card, etc.
            $table->foreignId('validated_by_admin')->nullable()->constrained('users')->onDelete('set null');
            $table->string('status')->default('pending'); // pending, paid, failed
            $table->timestamps();
        });

        // 4. Create renewals table
        Schema::create('renewals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('gym_id')->constrained()->onDelete('cascade');
            $table->foreignId('subscription_id')->constrained()->onDelete('cascade');
            $table->string('plan_type'); // mensuel, annuel
            $table->decimal('amount', 8, 2);
            $table->date('start_date');
            $table->date('end_date');
            $table->foreignId('validated_by_admin')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('renewals');
        Schema::dropIfExists('payments');

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropForeign(['gym_id']);
            $table->dropColumn('gym_id');
            $table->dropColumn('payment_method');
            $table->dropForeign(['validated_by_admin']);
            $table->dropColumn('validated_by_admin');
        });

        Schema::table('gyms', function (Blueprint $table) {
            $table->dropColumn(['price_monthly', 'price_yearly', 'currency', 'advantages']);
        });
    }
};
