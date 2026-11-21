<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\Room;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QrCheckInConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    private Gym $gym;
    private Room $room;
    private User $member;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gym = Gym::create([
            'name' => 'FitZone Casablanca',
            'slug' => 'fitzone-casa',
            'address' => 'Ghandi',
            'city' => 'Casablanca',
            'phone' => '+212500000001',
        ]);

        $this->room = Room::create([
            'name' => 'Salle Cardio',
            'capacity' => 20,
            'current_count' => 0,
            'gym_id' => $this->gym->id,
        ]);

        $this->member = User::create([
            'name' => 'Ahmed Benali',
            'email' => 'ahmed@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'adherent',
            'gym_id' => $this->gym->id,
            'qr_token' => 'original_token_11112222333344445555666677778888',
            'age' => 26,
            'streak_days' => 2,
            'total_sessions' => 5,
        ]);

        Subscription::create([
            'user_id' => $this->member->id,
            'plan' => 'mensuel',
            'price' => 300,
            'start_date' => now()->subDays(10)->toDateString(),
            'end_date' => now()->addDays(20)->toDateString(),
            'status' => 'active',
            'gym_id' => $this->gym->id,
        ]);
    }

    public function test_valid_checkin_grants_access_and_rotates_qr_token(): void
    {
        Sanctum::actingAs($this->member);

        $initialToken = $this->member->qr_token;

        $response = $this->postJson('/api/v1/attendance/check-in', [
            'qr_token' => $initialToken,
            'room_id' => $this->room->id,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'granted',
            'user_name' => 'Ahmed Benali',
            'subscription_status' => 'active',
        ]);

        $this->member->refresh();
        $this->room->refresh();

        // Le token a été régénéré et est différent de l'initial
        $this->assertNotEquals($initialToken, $this->member->qr_token);
        $this->assertEquals(64, strlen($this->member->qr_token));

        // Le compteur de la salle a été incrémenté
        $this->assertEquals(1, $this->room->current_count);
        $this->assertEquals(6, $this->member->total_sessions);
    }

    public function test_replaying_used_qr_token_is_rejected(): void
    {
        Sanctum::actingAs($this->member);

        $initialToken = $this->member->qr_token;

        // Premier scan : succès
        $firstResponse = $this->postJson('/api/v1/attendance/check-in', [
            'qr_token' => $initialToken,
        ]);
        $firstResponse->assertStatus(200);

        // Deuxième tentative avec le MÊME token initial (replay) : rejeté
        $replayResponse = $this->postJson('/api/v1/attendance/check-in', [
            'qr_token' => $initialToken,
        ]);

        $replayResponse->assertStatus(422);
        $replayResponse->assertJson([
            'status' => 'denied',
        ]);
    }

    public function test_expired_subscription_denies_checkin(): void
    {
        // Créer un membre avec abonnement expiré
        $expiredMember = User::create([
            'name' => 'Samir Expired',
            'email' => 'samir@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'adherent',
            'gym_id' => $this->gym->id,
            'qr_token' => 'expired_member_token_9999',
            'age' => 30,
        ]);

        Subscription::create([
            'user_id' => $expiredMember->id,
            'plan' => 'mensuel',
            'price' => 300,
            'start_date' => now()->subDays(60)->toDateString(),
            'end_date' => now()->subDays(5)->toDateString(), // expiré il y a 5 jours
            'status' => 'expired',
            'gym_id' => $this->gym->id,
        ]);

        // 1. Si le membre lui-même tente la requête, le middleware bloque avec 403
        Sanctum::actingAs($expiredMember);
        $responseMember = $this->postJson('/api/v1/attendance/check-in', [
            'qr_token' => 'expired_member_token_9999',
        ]);
        $responseMember->assertStatus(403);
        $responseMember->assertJson([
            'code' => 'subscription_inactive',
            'subscription_status' => 'expired',
        ]);

        // 2. Si le scanner de l'accueil (admin de la salle) scanne le token du membre expiré
        $admin = User::create([
            'name' => 'Admin Desk',
            'email' => 'desk_admin@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'gym_id' => $this->gym->id,
            'age' => 32,
        ]);

        Sanctum::actingAs($admin);
        $responseDesk = $this->postJson('/api/v1/attendance/check-in', [
            'qr_token' => 'expired_member_token_9999',
        ]);

        $responseDesk->assertStatus(200);
        $responseDesk->assertJson([
            'status' => 'denied',
            'subscription_status' => 'expired',
        ]);
    }

    public function test_checkout_ends_session_and_decrements_room_occupancy(): void
    {
        Sanctum::actingAs($this->member);

        // Check-in d'abord
        $this->postJson('/api/v1/attendance/check-in', [
            'qr_token' => $this->member->qr_token,
            'room_id' => $this->room->id,
        ]);

        $this->room->refresh();
        $this->assertEquals(1, $this->room->current_count);

        // Check-out
        $response = $this->postJson('/api/v1/attendance/check-out');
        $response->assertStatus(200);

        $this->room->refresh();
        $this->assertEquals(0, $this->room->current_count);
    }
}
