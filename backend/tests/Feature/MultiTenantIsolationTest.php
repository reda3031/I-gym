<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\Course;
use App\Models\Gym;
use App\Models\Room;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MultiTenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    private Gym $gym1;
    private Gym $gym2;
    private User $adminGym1;
    private User $adminGym2;
    private User $coachGym2;
    private User $memberGym1;
    private Room $roomGym1;
    private Room $roomGym2;
    private Course $courseGym2;
    private Alert $alertGym2;

    protected function setUp(): void
    {
        parent::setUp();

        // Club 1
        $this->gym1 = Gym::create([
            'name' => 'FitZone Casablanca',
            'slug' => 'fitzone-casa',
            'address' => 'Ghandi',
            'city' => 'Casablanca',
            'phone' => '+212500000001',
        ]);

        $this->roomGym1 = Room::create([
            'name' => 'Salle Cardio Casa',
            'capacity' => 20,
            'current_count' => 5,
            'gym_id' => $this->gym1->id,
        ]);

        $this->adminGym1 = User::create([
            'name' => 'Admin Casa',
            'email' => 'admin_casa@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'gym_id' => $this->gym1->id,
            'age' => 30,
        ]);

        $this->memberGym1 = User::create([
            'name' => 'Member Casa',
            'email' => 'member_casa@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'adherent',
            'gym_id' => $this->gym1->id,
            'qr_token' => 'token_casa_123',
            'age' => 24,
        ]);

        Subscription::create([
            'user_id' => $this->memberGym1->id,
            'plan' => 'mensuel',
            'price' => 300,
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addDays(25)->toDateString(),
            'status' => 'active',
            'gym_id' => $this->gym1->id,
        ]);

        // Club 2
        $this->gym2 = Gym::create([
            'name' => 'PowerHouse Rabat',
            'slug' => 'powerhouse-rabat',
            'address' => 'Agdal',
            'city' => 'Rabat',
            'phone' => '+212500000002',
        ]);

        $this->roomGym2 = Room::create([
            'name' => 'Salle Musculation Rabat',
            'capacity' => 25,
            'current_count' => 10,
            'gym_id' => $this->gym2->id,
        ]);

        $this->adminGym2 = User::create([
            'name' => 'Admin Rabat',
            'email' => 'admin_rabat@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'gym_id' => $this->gym2->id,
            'age' => 34,
        ]);

        $this->coachGym2 = User::create([
            'name' => 'Coach Rabat',
            'email' => 'coach_rabat@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'coach',
            'gym_id' => $this->gym2->id,
            'age' => 29,
        ]);

        $this->courseGym2 = Course::create([
            'name' => 'HIIT Rabat Express',
            'type' => 'HIIT',
            'coach_id' => $this->coachGym2->id,
            'room_id' => $this->roomGym2->id,
            'gym_id' => $this->gym2->id,
            'starts_at' => now()->addDays(2)->setTime(10, 0),
            'ends_at' => now()->addDays(2)->setTime(11, 0),
            'max_capacity' => 15,
            'current_reservations' => 0,
            'status' => 'active',
        ]);

        $this->alertGym2 = Alert::create([
            'type' => 'surfrequentation',
            'message' => 'Salle Musculation Rabat à 90%',
            'room_id' => $this->roomGym2->id,
            'is_read' => false,
        ]);
    }

    public function test_room_occupancy_is_scoped_to_user_gym(): void
    {
        Sanctum::actingAs($this->adminGym1);

        $response = $this->getJson('/api/v1/rooms/occupancy');
        $response->assertStatus(200);

        $rooms = collect($response->json());
        $this->assertTrue($rooms->contains('id', $this->roomGym1->id));
        $this->assertFalse($rooms->contains('id', $this->roomGym2->id));
    }

    public function test_member_cannot_view_hourly_stats_of_another_gym(): void
    {
        Sanctum::actingAs($this->memberGym1);

        $response = $this->getJson("/api/v1/rooms/{$this->roomGym2->id}/hourly-stats");
        $response->assertStatus(403);
    }

    public function test_admin_cannot_update_course_belonging_to_another_gym(): void
    {
        Sanctum::actingAs($this->adminGym1);

        $response = $this->putJson("/api/v1/admin/courses/{$this->courseGym2->id}", [
            'name' => 'Hijacked Course Name',
        ]);
        $response->assertStatus(404);
    }

    public function test_admin_cannot_delete_course_belonging_to_another_gym(): void
    {
        Sanctum::actingAs($this->adminGym1);

        $response = $this->deleteJson("/api/v1/admin/courses/{$this->courseGym2->id}");
        $response->assertStatus(404);
    }

    public function test_admin_cannot_modify_coach_of_another_gym(): void
    {
        Sanctum::actingAs($this->adminGym1);

        $response = $this->putJson("/api/v1/admin/coaches/{$this->coachGym2->id}", [
            'name' => 'Hacked Coach Name',
            'email' => 'coach_rabat@igym.ma',
            'experience' => 5,
            'specialties' => ['HIIT'],
        ]);
        $response->assertStatus(404);
    }

    public function test_admin_cannot_delete_coach_of_another_gym(): void
    {
        Sanctum::actingAs($this->adminGym1);

        $response = $this->deleteJson("/api/v1/admin/coaches/{$this->coachGym2->id}");
        $response->assertStatus(404);
    }

    public function test_admin_does_not_receive_alerts_from_other_gyms(): void
    {
        Sanctum::actingAs($this->adminGym1);

        $response = $this->getJson('/api/v1/admin/alerts');
        $response->assertStatus(200);

        $alerts = collect($response->json());
        $this->assertFalse($alerts->contains('id', $this->alertGym2->id));
    }

    public function test_admin_cannot_mark_alert_from_another_gym_as_read(): void
    {
        Sanctum::actingAs($this->adminGym1);

        $response = $this->patchJson("/api/v1/admin/alerts/{$this->alertGym2->id}/read");
        $response->assertStatus(404);
    }
}
