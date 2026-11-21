<?php

namespace Tests\Feature;

use App\Models\Gym;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TrainingPdfSecurityTest extends TestCase
{
    use RefreshDatabase;

    private Gym $gym1;
    private Gym $gym2;
    private User $member1;
    private User $member2;
    private User $adminGym2;
    private User $superAdmin;

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

        $this->member1 = User::create([
            'name' => 'Ahmed Benali',
            'email' => 'ahmed@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'adherent',
            'gym_id' => $this->gym1->id,
            'age' => 25,
            'objective_type' => 'prise_de_masse',
            'level' => 'gold',
            'streak_days' => 12,
            'total_sessions' => 35,
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
            'name' => 'Nadia Chraibi',
            'email' => 'nadia@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'adherent',
            'gym_id' => $this->gym1->id,
            'age' => 28,
            'objective_type' => 'perte_de_poids',
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

        $this->adminGym2 = User::create([
            'name' => 'Admin Rabat',
            'email' => 'admin_rabat@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'gym_id' => $this->gym2->id,
            'age' => 35,
        ]);

        $this->superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'super@igym.ma',
            'password' => bcrypt('password'),
            'role' => 'super_admin',
            'age' => 40,
        ]);
    }

    public function test_member_cannot_generate_pdf_of_another_member(): void
    {
        Sanctum::actingAs($this->member1);

        // Member 1 tente de générer le PDF de Member 2
        $response = $this->getJson("/api/v1/training/generate-pdf/{$this->member2->id}");
        $response->assertStatus(403);
    }

    public function test_admin_cannot_generate_pdf_for_member_of_another_gym(): void
    {
        Sanctum::actingAs($this->adminGym2);

        // Admin Gym 2 tente de générer le PDF de Member 1 (Gym 1)
        $response = $this->getJson("/api/v1/training/generate-pdf/{$this->member1->id}");
        $response->assertStatus(403);
    }

    public function test_member_can_generate_own_pdf_with_signed_url(): void
    {
        Sanctum::actingAs($this->member1);

        $response = $this->getJson("/api/v1/training/generate-pdf/{$this->member1->id}");
        $response->assertStatus(200);

        $downloadUrl = $response->json('download_url');
        $this->assertNotEmpty($downloadUrl);
        $this->assertStringContainsString('signature=', $downloadUrl);
    }

    public function test_downloading_pdf_requires_valid_signature(): void
    {
        // 1. Accès direct sans signature valide : rejeté
        $unsignedResponse = $this->getJson("/api/v1/training/download-pdf/{$this->member1->id}");
        $unsignedResponse->assertStatus(403);

        // 2. Accès avec signature valide obtenue via generate
        Sanctum::actingAs($this->member1);
        $generateResponse = $this->getJson("/api/v1/training/generate-pdf/{$this->member1->id}");
        $downloadUrl = $generateResponse->json('download_url');

        // Extraire chemin relatif avec query string
        $parsed = parse_url($downloadUrl);
        $relativeUrl = $parsed['path'] . '?' . $parsed['query'];

        $downloadResponse = $this->get($relativeUrl);
        $downloadResponse->assertStatus(200);
        $this->assertEquals('application/pdf', $downloadResponse->headers->get('Content-Type'));

        // Le contenu retourné est bien un fichier PDF valide (commence par %PDF-1.4)
        $content = $downloadResponse->streamedContent();
        $this->assertStringStartsWith('%PDF-1.4', $content);
    }
}
