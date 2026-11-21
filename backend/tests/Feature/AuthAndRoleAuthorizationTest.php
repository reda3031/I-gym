<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\Room;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthAndRoleAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private Gym $gym;
    private User $superAdmin;
    private User $admin;
    private User $coach;
    private User $member;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gym = Gym::create([
            'name' => 'FitZone Casablanca',
            'slug' => 'fitzone-casa',
            'address' => 'Ghandi',
            'city' => 'Casablanca',
            'phone' => '+212500000000',
        ]);

        Room::create([
            'name' => 'Salle Principale',
            'capacity' => 30,
            'current_count' => 5,
            'gym_id' => $this->gym->id,
        ]);

        $this->superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'super@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'super_admin',
            'age' => 35,
        ]);

        $this->admin = User::create([
            'name' => 'Gym Admin',
            'email' => 'admin@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'gym_id' => $this->gym->id,
            'age' => 32,
        ]);

        $this->coach = User::create([
            'name' => 'Gym Coach',
            'email' => 'coach@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'coach',
            'gym_id' => $this->gym->id,
            'age' => 28,
        ]);

        $this->member = User::create([
            'name' => 'Gym Member',
            'email' => 'member@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'adherent',
            'gym_id' => $this->gym->id,
            'qr_token' => 'initial_token_1234567890_test',
            'age' => 25,
        ]);

        Subscription::create([
            'user_id' => $this->member->id,
            'plan' => 'mensuel',
            'price' => 300,
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addDays(25)->toDateString(),
            'status' => 'active',
            'gym_id' => $this->gym->id,
        ]);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/me');
        $response->assertStatus(401);
    }

    public function test_member_cannot_access_admin_kpis(): void
    {
        Sanctum::actingAs($this->member);

        $response = $this->getJson('/api/v1/admin/kpis');
        $response->assertStatus(403);
    }

    public function test_member_cannot_access_coach_dashboard(): void
    {
        Sanctum::actingAs($this->member);

        $response = $this->getJson('/api/v1/coach/dashboard');
        $response->assertStatus(403);
    }

    public function test_coach_cannot_access_admin_management(): void
    {
        Sanctum::actingAs($this->coach);

        $response = $this->getJson('/api/v1/admin/coaches');
        $response->assertStatus(403);

        $response2 = $this->getJson('/api/v1/admin/subscriptions');
        $response2->assertStatus(403);
    }

    public function test_admin_cannot_access_super_admin_gyms_route(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/super-admin/gyms');
        $response->assertStatus(403);

        $response2 = $this->getJson('/api/v1/super-admin/impersonation-logs');
        $response2->assertStatus(403);
    }

    public function test_super_admin_can_access_super_admin_dashboard(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $response = $this->getJson('/api/v1/super-admin/gyms');
        $response->assertStatus(200);
    }

    public function test_admin_can_access_admin_kpis(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/admin/kpis');
        $response->assertStatus(200);
    }

    public function test_coach_can_access_coach_dashboard(): void
    {
        Sanctum::actingAs($this->coach);

        $response = $this->getJson('/api/v1/coach/dashboard');
        $response->assertStatus(200);
    }
}
