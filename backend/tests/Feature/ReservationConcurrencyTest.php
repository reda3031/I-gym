<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Gym;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReservationConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    private Gym $gym1;
    private Gym $gym2;
    private User $coach;
    private Room $room;
    private Course $course;
    private User $member1;
    private User $member2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gym1 = Gym::create([
            'name' => 'FitZone Casablanca',
            'slug' => 'fitzone-casa',
            'address' => 'Ghandi',
            'city' => 'Casablanca',
            'phone' => '+212500000001',
        ]);

        $this->gym2 = Gym::create([
            'name' => 'PowerHouse Rabat',
            'slug' => 'powerhouse-rabat',
            'address' => 'Agdal',
            'city' => 'Rabat',
            'phone' => '+212500000002',
        ]);

        $this->room = Room::create([
            'name' => 'Salle Crossfit',
            'capacity' => 10,
            'current_count' => 0,
            'gym_id' => $this->gym1->id,
        ]);

        $this->coach = User::create([
            'name' => 'Coach Karim',
            'email' => 'karim@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'coach',
            'gym_id' => $this->gym1->id,
            'age' => 31,
        ]);

        // Course avec capacité limitée à 1 place pour tester la saturation
        $this->course = Course::create([
            'name' => 'CrossFit WOD Elite',
            'type' => 'Crossfit',
            'coach_id' => $this->coach->id,
            'room_id' => $this->room->id,
            'gym_id' => $this->gym1->id,
            'starts_at' => now()->addDays(2)->setTime(18, 0),
            'ends_at' => now()->addDays(2)->setTime(19, 0),
            'max_capacity' => 1,
            'current_reservations' => 0,
            'status' => 'active',
        ]);

        $this->member1 = User::create([
            'name' => 'Adherent 1',
            'email' => 'adherent1@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'adherent',
            'gym_id' => $this->gym1->id,
            'age' => 24,
        ]);

        Subscription::create([
            'user_id' => $this->member1->id,
            'plan' => 'mensuel',
            'price' => 300,
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addDays(25)->toDateString(),
            'status' => 'active',
            'gym_id' => $this->gym1->id,
        ]);

        $this->member2 = User::create([
            'name' => 'Adherent 2',
            'email' => 'adherent2@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'adherent',
            'gym_id' => $this->gym1->id,
            'age' => 27,
        ]);

        Subscription::create([
            'user_id' => $this->member2->id,
            'plan' => 'mensuel',
            'price' => 300,
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addDays(25)->toDateString(),
            'status' => 'active',
            'gym_id' => $this->gym1->id,
        ]);
    }

    public function test_booking_fills_capacity_and_second_booking_is_rejected(): void
    {
        // 1. Premier adhérent réserve l'unique place
        Sanctum::actingAs($this->member1);
        $res1 = $this->postJson('/api/v1/reservations', [
            'course_id' => $this->course->id,
        ]);
        $res1->assertStatus(201);

        $this->course->refresh();
        $this->assertEquals(1, $this->course->current_reservations);

        // 2. Deuxième adhérent tente de réserver le cours devenu complet
        Sanctum::actingAs($this->member2);
        $res2 = $this->postJson('/api/v1/reservations', [
            'course_id' => $this->course->id,
        ]);

        $res2->assertStatus(422);
        $res2->assertJson([
            'message' => 'Ce cours est complet.',
        ]);

        $this->course->refresh();
        // Vérifier que la capacité n'a pas été dépassée
        $this->assertEquals(1, $this->course->current_reservations);
    }

    public function test_member_cannot_book_same_course_twice(): void
    {
        // Augmenter la capacité à 5
        $this->course->update(['max_capacity' => 5]);

        Sanctum::actingAs($this->member1);

        $res1 = $this->postJson('/api/v1/reservations', [
            'course_id' => $this->course->id,
        ]);
        $res1->assertStatus(201);

        // Deuxième réservation par le même adhérent
        $res2 = $this->postJson('/api/v1/reservations', [
            'course_id' => $this->course->id,
        ]);
        $res2->assertStatus(422);
        $res2->assertJson([
            'message' => 'Vous êtes déjà inscrit à ce cours.',
        ]);
    }

    public function test_cross_tenant_course_booking_is_forbidden(): void
    {
        // Créer un membre appartenant au Club 2
        $memberRabat = User::create([
            'name' => 'Member Rabat',
            'email' => 'rabat_member@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'adherent',
            'gym_id' => $this->gym2->id,
            'age' => 26,
        ]);

        Subscription::create([
            'user_id' => $memberRabat->id,
            'plan' => 'mensuel',
            'price' => 300,
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addDays(25)->toDateString(),
            'status' => 'active',
            'gym_id' => $this->gym2->id,
        ]);

        Sanctum::actingAs($memberRabat);

        // Tenter de réserver un cours appartenant au Club 1
        $response = $this->postJson('/api/v1/reservations', [
            'course_id' => $this->course->id,
        ]);

        $response->assertStatus(403);
        $response->assertJson([
            'message' => "Ce cours n'appartient pas à votre salle.",
        ]);
    }

    public function test_cancelling_reservation_frees_up_spot(): void
    {
        Sanctum::actingAs($this->member1);

        $bookingRes = $this->postJson('/api/v1/reservations', [
            'course_id' => $this->course->id,
        ]);
        $bookingRes->assertStatus(201);
        $reservationId = $bookingRes->json('reservation.id');

        $this->course->refresh();
        $this->assertEquals(1, $this->course->current_reservations);

        // Annuler la réservation
        $cancelRes = $this->deleteJson("/api/v1/reservations/{$reservationId}");
        $cancelRes->assertStatus(200);

        $this->course->refresh();
        $this->assertEquals(0, $this->course->current_reservations);

        // Maintenant le deuxième adhérent peut réserver la place libérée
        Sanctum::actingAs($this->member2);
        $bookingRes2 = $this->postJson('/api/v1/reservations', [
            'course_id' => $this->course->id,
        ]);
        $bookingRes2->assertStatus(201);

        $this->course->refresh();
        $this->assertEquals(1, $this->course->current_reservations);
    }
}
