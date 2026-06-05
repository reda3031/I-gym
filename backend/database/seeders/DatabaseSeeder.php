<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\AttendanceLog;
use App\Models\Badge;
use App\Models\Course;
use App\Models\Gym;
use App\Models\Notification;
use App\Models\Objective;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\Subscription;
use App\Models\User;
use App\Models\Coach;
use App\Models\CoachSpecialty;
use App\Models\CoachAvailability;
use App\Models\CoachReview;
use App\Models\Challenge;
use App\Models\ChallengeParticipant;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Clean up tables to avoid constraints
        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        ChallengeParticipant::truncate();
        Challenge::truncate();
        CoachReview::truncate();
        CoachAvailability::truncate();
        CoachSpecialty::truncate();
        Coach::truncate();
        Alert::truncate();
        AttendanceLog::truncate();
        Badge::truncate();
        Reservation::truncate();
        Course::truncate();
        Subscription::truncate();
        Objective::truncate();
        Notification::truncate();
        Room::truncate();
        User::truncate();
        Gym::truncate();
        \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $passwordHash = Hash::make('password');

        // ── 1. Create Gyms ────────────────────────────────────────────────
        $gym1 = Gym::create([
            'name' => 'FitZone Casablanca',
            'slug' => 'fitzone-casablanca',
            'logo' => null,
            'address' => 'Boulevard Ghandi, Anfa',
            'city' => 'Casablanca',
            'phone' => '+212522001122',
            'description' => 'La plus grande salle de CrossFit et fitness de Casablanca avec équipements haut de gamme.',
            'speciality' => 'CrossFit & Cardio',
            'color' => 'indigo', // custom CSS theme color
            'member_count' => 120,
            'opening_hours' => [
                'lun-ven' => '06:00-22:00',
                'sam' => '08:00-20:00',
                'dim' => '09:00-16:00'
            ],
            'price_monthly' => 300.00,
            'price_yearly' => 2500.00,
            'currency' => 'DH',
            'advantages' => ['Accès 24/7', 'Toutes les zones fitness', 'Cours collectifs inclus', '1 séance de coaching offerte'],
        ]);

        $gym2 = Gym::create([
            'name' => 'PowerHouse Rabat',
            'slug' => 'powerhouse-rabat',
            'logo' => null,
            'address' => 'Avenue de France, Agdal',
            'city' => 'Rabat',
            'phone' => '+212537002233',
            'description' => 'Le temple de la musculation et de la force athlétique au cœur de Rabat.',
            'speciality' => 'Musculation & Powerlifting',
            'color' => 'orange',
            'member_count' => 80,
            'opening_hours' => [
                'lun-ven' => '06:00-22:00',
                'sam-dim' => '08:00-18:00'
            ],
            'price_monthly' => 350.00,
            'price_yearly' => 3000.00,
            'currency' => 'DH',
            'advantages' => ['Espace musculation libre', 'Accès 06:00-22:00', 'Suivi programme force'],
        ]);

        $gym3 = Gym::create([
            'name' => 'ZenFit Marrakech',
            'slug' => 'zenfit-marrakech',
            'logo' => null,
            'address' => 'Avenue Mohammed VI, Hivernage',
            'city' => 'Marrakech',
            'phone' => '+212524003344',
            'description' => 'Un espace bien-être combinant yoga, pilates et entraînement fonctionnel doux.',
            'speciality' => 'Yoga & Pilates',
            'color' => 'emerald',
            'member_count' => 200,
            'opening_hours' => [
                'lun-sam' => '07:00-21:00',
                'dim' => 'Fermé'
            ],
            'price_monthly' => 400.00,
            'price_yearly' => 3800.00,
            'currency' => 'DH',
            'advantages' => ['Cours illimités de Yoga & Pilates', 'Espace tisanerie & détente', 'Accès sauna et vestiaires premium'],
        ]);

        // ── 2. Create Rooms for each Gym ─────────────────────────────────
        $roomsData = [
            $gym1->id => [
                ['name' => 'Salle Cardio Ghandi', 'capacity' => 30, 'current_count' => 12, 'description' => 'Tapis de course et vélos de dernière génération'],
                ['name' => 'Box CrossFit Anfa', 'capacity' => 20, 'current_count' => 8, 'description' => 'Zone WOD équipée Rogue'],
                ['name' => 'Studio Pilates', 'capacity' => 15, 'current_count' => 0, 'description' => 'Réformateurs et tapis de sol'],
            ],
            $gym2->id => [
                ['name' => 'Plateau Musculation', 'capacity' => 40, 'current_count' => 22, 'description' => 'Poids libres et haltères jusqu\'à 60kg'],
                ['name' => 'Zone Cardio Express', 'capacity' => 15, 'current_count' => 5, 'description' => 'Rameurs et vélos elliptiques'],
            ],
            $gym3->id => [
                ['name' => 'Studio Shanti Yoga', 'capacity' => 25, 'current_count' => 4, 'description' => 'Ambiance zen, tapis en liège et briques fournis'],
                ['name' => 'Zone Functional Training', 'capacity' => 20, 'current_count' => 2, 'description' => 'Kettlebells, TRX et sacs de frappe'],
            ]
        ];

        $rooms = [];
        foreach ($roomsData as $gymId => $list) {
            foreach ($list as $r) {
                $rooms[$gymId][] = Room::create(array_merge($r, ['gym_id' => $gymId]));
            }
        }

        // ── 3. Create Super Admin (Global) ────────────────────────────────
        User::create([
            'name' => 'Super Administrateur I-Gym',
            'email' => 'superadmin@igym.ma',
            'password' => $passwordHash,
            'role' => 'super_admin',
            'phone' => '+212600000000',
            'qr_token' => Str::random(64),
            'age' => 35,
        ]);

        // ── 4. Seeding Gym 1 (FitZone Casablanca) ────────────────────────
        // Admins (2)
        $admin1 = User::create([
            'name' => 'Administrateur Ghandi',
            'email' => 'admin@igym.ma', // Keep original admin credentials
            'password' => $passwordHash,
            'role' => 'admin',
            'phone' => '+212600000001',
            'qr_token' => Str::random(64),
            'gym_id' => $gym1->id,
            'age' => 32,
        ]);
        User::create([
            'name' => 'Siham Tazi',
            'email' => 'siham@igym.ma',
            'password' => $passwordHash,
            'role' => 'admin',
            'phone' => '+212600000004',
            'qr_token' => Str::random(64),
            'gym_id' => $gym1->id,
            'age' => 29,
        ]);

        // Coaches (5)
        $coach1 = User::create([
            'name' => 'Youssef Benali',
            'email' => 'coach@igym.ma', // Keep original coach
            'password' => $passwordHash,
            'role' => 'coach',
            'phone' => '+212600000002',
            'qr_token' => Str::random(64),
            'gym_id' => $gym1->id,
            'age' => 34,
        ]);
        $coach2 = User::create([
            'name' => 'Fatima Zahra El Idrissi',
            'email' => 'coach2@igym.ma', // Keep original coach2
            'password' => $passwordHash,
            'role' => 'coach',
            'phone' => '+212600000003',
            'qr_token' => Str::random(64),
            'gym_id' => $gym1->id,
            'age' => 28,
        ]);
        $coachesGym1 = [$coach1, $coach2];
        $namesCoaches1 = ['Karim Benslimane', 'Salma El Fassi', 'Mehdi Chraibi'];
        foreach ($namesCoaches1 as $idx => $nc) {
            $coachesGym1[] = User::create([
                'name' => $nc,
                'email' => "coach_g1_" . ($idx + 3) . "@igym.ma",
                'password' => $passwordHash,
                'role' => 'coach',
                'phone' => '+21261122334' . $idx,
                'qr_token' => Str::random(64),
                'gym_id' => $gym1->id,
                'age' => rand(25, 45),
            ]);
        }

        // Members (120 - Let's seed 30 with realistic details and 90 procedurally)
        $ahmed = User::create([
            'name' => 'Ahmed Benali',
            'email' => 'ahmed@igym.ma', // Star demo adherent
            'password' => $passwordHash,
            'role' => 'adherent',
            'phone' => '+212600000010',
            'objective_type' => 'perte_de_poids',
            'streak_days' => 5,
            'total_sessions' => 15,
            'level' => 'silver',
            'qr_token' => Str::random(64),
            'last_session_date' => Carbon::yesterday()->toDateString(),
            'gym_id' => $gym1->id,
            'age' => 28,
            'weight' => 84.5,
            'height' => 180,
            'gender' => 'homme',
        ]);

        $membersGym1 = [$ahmed];
        $members1Names = [
            'Sara Mansouri' => 'flexibilite',
            'Karim El Fassi' => 'prise_de_masse',
            'Nadia Chraibi' => 'endurance',
            'Omar Tazi' => 'prise_de_masse',
            'Amina Alami' => 'perte_de_poids',
            'Khalid El Mansouri' => 'endurance',
            'Yasmine Zouhair' => 'flexibilite',
            'Mehdi Slaoui' => 'prise_de_masse',
            'Sofia Bennani' => 'perte_de_poids',
        ];
        
        $i = 0;
        foreach ($members1Names as $name => $obj) {
            $i++;
            $membersGym1[] = User::create([
                'name' => $name,
                'email' => Str::slug($name) . '@igym.ma',
                'password' => $passwordHash,
                'role' => 'adherent',
                'phone' => '+21262233445' . $i,
                'objective_type' => $obj,
                'streak_days' => rand(0, 10),
                'total_sessions' => rand(5, 50),
                'level' => ['bronze', 'silver', 'gold', 'platinum'][rand(0, 3)],
                'qr_token' => Str::random(64),
                'gym_id' => $gym1->id,
                'age' => rand(18, 50),
                'weight' => rand(55, 95),
                'height' => rand(160, 195),
                'gender' => $i % 2 === 0 ? 'femme' : 'homme',
            ]);
        }

        // Add 110 more fake members for Casablanca to match stats
        for ($j = 0; $j < 110; $j++) {
            $fn = ['Mounir', 'Adnane', 'Hassan', 'Leila', 'Meriem', 'Zineb', 'Anass', 'Tariq', 'Rania', 'Ghita'][rand(0, 9)];
            $ln = ['Alaoui', 'Filali', 'Jamil', 'Hassani', 'Kabbaj', 'Benjelloun', 'Seddiki', 'Berrada'][rand(0, 7)];
            $name = $fn . ' ' . $ln;
            $email = Str::slug($name) . '_' . $j . '@igym.ma';
            User::create([
                'name' => $name,
                'email' => $email,
                'password' => $passwordHash,
                'role' => 'adherent',
                'phone' => '+2126' . rand(10000000, 99999999),
                'objective_type' => ['perte_de_poids', 'prise_de_masse', 'endurance', 'flexibilite'][rand(0, 3)],
                'streak_days' => rand(0, 3),
                'total_sessions' => rand(1, 15),
                'level' => 'bronze',
                'qr_token' => Str::random(64),
                'gym_id' => $gym1->id,
                'age' => rand(20, 45),
            ]);
        }

        // Subscriptions Gym 1
        $plans = [
            ['mensuel', 300.00, 30],
            ['trimestriel', 800.00, 90],
            ['annuel', 2800.00, 365],
        ];
        foreach ($membersGym1 as $idx => $member) {
            [$plan, $price, $days] = $plans[$idx % count($plans)];
            Subscription::create([
                'user_id' => $member->id,
                'gym_id' => $gym1->id,
                'plan' => $plan,
                'price' => $price,
                'start_date' => Carbon::now()->subDays(10),
                'end_date' => Carbon::now()->addDays($days - 10),
                'status' => 'active',
                'payment_method' => 'cash',
                'validated_by_admin' => $admin1->id,
            ]);
        }

        // Courses Gym 1
        $coursesGym1 = [];
        $courseDataGym1 = [
            ['CrossFit Matinal', 'Crossfit', 7, 60, 15],
            ['Cardio Endurance', 'Cardio', 10, 45, 20],
            ['HIIT Cardio', 'HIIT', 18, 45, 20],
            ['Yoga Ashtanga', 'Yoga', 9, 60, 18],
            ['Pilates Matwork', 'Pilates', 11, 50, 18],
            ['Musculation Force', 'Musculation', 17, 60, 25],
        ];

        foreach ($courseDataGym1 as $idx => [$cName, $cType, $hour, $duration, $cap]) {
            $coach = $coachesGym1[$idx % count($coachesGym1)];
            $room = $rooms[$gym1->id][$idx % count($rooms[$gym1->id])];
            $start = now()->addDays($idx + 1)->setHour($hour)->setMinute(0)->setSecond(0);

            $coursesGym1[] = Course::create([
                'name' => $cName,
                'coach_id' => $coach->id,
                'room_id' => $room->id,
                'gym_id' => $gym1->id,
                'starts_at' => $start,
                'ends_at' => (clone $start)->addMinutes($duration),
                'max_capacity' => $cap,
                'current_reservations' => 0,
                'type' => $cType,
                'description' => 'Un cours intense pour progresser rapidement.',
            ]);
        }

        // Ahmed makes a reservation
        Reservation::create([
            'user_id' => $ahmed->id,
            'course_id' => $coursesGym1[0]->id,
            'status' => 'confirmed',
        ]);
        $coursesGym1[0]->increment('current_reservations');

        // Attendance logs for Ahmed (15 sessions)
        for ($k = 1; $k <= 15; $k++) {
            AttendanceLog::create([
                'user_id' => $ahmed->id,
                'room_id' => $rooms[$gym1->id][0]->id,
                'qr_token' => Str::random(64),
                'checked_in_at' => Carbon::now()->subDays($k)->setHour(rand(7, 11))->setMinute(rand(0, 59)),
                'checked_out_at' => Carbon::now()->subDays($k)->setHour(rand(12, 13))->setMinute(rand(0, 59)),
                'status' => 'granted',
            ]);
        }

        // Live attendance inside Gym 1 (Cardio: 12 inside, CrossFit: 8 inside)
        for ($k = 0; $k < 12; $k++) {
            AttendanceLog::create([
                'user_id' => $membersGym1[$k % count($membersGym1)]->id,
                'room_id' => $rooms[$gym1->id][0]->id,
                'qr_token' => Str::random(64),
                'checked_in_at' => Carbon::now()->subMinutes(rand(15, 90)),
                'checked_out_at' => null,
                'status' => 'granted',
            ]);
        }
        for ($k = 0; $k < 8; $k++) {
            AttendanceLog::create([
                'user_id' => $membersGym1[($k + 5) % count($membersGym1)]->id,
                'room_id' => $rooms[$gym1->id][1]->id,
                'qr_token' => Str::random(64),
                'checked_in_at' => Carbon::now()->subMinutes(rand(15, 90)),
                'checked_out_at' => null,
                'status' => 'granted',
            ]);
        }


        // ── 5. Seeding Gym 2 (PowerHouse Rabat) ─────────────────────────
        // Admin (1)
        $admin2 = User::create([
            'name' => 'Admin PowerHouse',
            'email' => 'admin_rabat@igym.ma',
            'password' => $passwordHash,
            'role' => 'admin',
            'phone' => '+212600000021',
            'qr_token' => Str::random(64),
            'gym_id' => $gym2->id,
            'age' => 31,
        ]);

        // Coaches (3)
        $coachesGym2 = [];
        $namesCoaches2 = ['Hamza Mansouri', 'Nisrine El Alami', 'Jalal Bennani'];
        foreach ($namesCoaches2 as $idx => $nc) {
            $coachesGym2[] = User::create([
                'name' => $nc,
                'email' => "coach_g2_" . ($idx + 1) . "@igym.ma",
                'password' => $passwordHash,
                'role' => 'coach',
                'phone' => '+2126224455' . $idx,
                'qr_token' => Str::random(64),
                'gym_id' => $gym2->id,
                'age' => rand(25, 45),
            ]);
        }

        // Members (80 - seed 10 and 70 procedurally)
        $membersGym2 = [];
        for ($j = 0; $j < 80; $j++) {
            $fn = ['Adil', 'Rachid', 'Hicham', 'Nabil', 'Fouad', 'Sanaa', 'Houda', 'Imane'][rand(0, 7)];
            $ln = ['Tahiri', 'Slaoui', 'Bakkali', 'Amrani', 'Touimi', 'Benkirane'][rand(0, 5)];
            $name = $fn . ' ' . $ln;
            $email = Str::slug($name) . '_g2_' . $j . '@igym.ma';
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => $passwordHash,
                'role' => 'adherent',
                'phone' => '+2126' . rand(10000000, 99999999),
                'objective_type' => ['prise_de_masse', 'endurance'][rand(0, 1)],
                'streak_days' => rand(0, 5),
                'total_sessions' => rand(1, 20),
                'level' => 'bronze',
                'qr_token' => Str::random(64),
                'gym_id' => $gym2->id,
                'age' => rand(18, 40),
            ]);
            if ($j < 10) {
                $membersGym2[] = $user;
            }
        }

        // Subscriptions Gym 2
        foreach ($membersGym2 as $idx => $member) {
            Subscription::create([
                'user_id' => $member->id,
                'gym_id' => $gym2->id,
                'plan' => 'mensuel',
                'price' => 350.00,
                'start_date' => Carbon::now()->subDays(5),
                'end_date' => Carbon::now()->addDays(25),
                'status' => 'active',
                'payment_method' => 'card',
                'validated_by_admin' => $admin2->id,
            ]);
        }

        // Courses Gym 2
        $coursesGym2 = [];
        $courseDataGym2 = [
            ['Musculation Squat/Deadlift', 'Musculation', 18, 60, 20],
            ['HIIT Challenge', 'HIIT', 19, 45, 15],
            ['Coaching Haltérophilie', 'Musculation', 10, 90, 10],
        ];

        foreach ($courseDataGym2 as $idx => [$cName, $cType, $hour, $duration, $cap]) {
            $coach = $coachesGym2[$idx % count($coachesGym2)];
            $room = $rooms[$gym2->id][$idx % count($rooms[$gym2->id])];
            $start = now()->addDays($idx + 1)->setHour($hour)->setMinute(0)->setSecond(0);

            $coursesGym2[] = Course::create([
                'name' => $cName,
                'coach_id' => $coach->id,
                'room_id' => $room->id,
                'gym_id' => $gym2->id,
                'starts_at' => $start,
                'ends_at' => (clone $start)->addMinutes($duration),
                'max_capacity' => $cap,
                'current_reservations' => 0,
                'type' => $cType,
                'description' => 'Musculation intensive pour développer la force maximale.',
            ]);
        }

        // Live attendance inside Gym 2 (Musculation: 22 inside, Cardio Express: 5 inside)
        for ($k = 0; $k < 22; $k++) {
            AttendanceLog::create([
                'user_id' => User::where('gym_id', $gym2->id)->where('role', 'adherent')->skip($k)->first()->id,
                'room_id' => $rooms[$gym2->id][0]->id,
                'qr_token' => Str::random(64),
                'checked_in_at' => Carbon::now()->subMinutes(rand(10, 75)),
                'checked_out_at' => null,
                'status' => 'granted',
            ]);
        }
        for ($k = 0; $k < 5; $k++) {
            AttendanceLog::create([
                'user_id' => User::where('gym_id', $gym2->id)->where('role', 'adherent')->skip($k + 25)->first()->id,
                'room_id' => $rooms[$gym2->id][1]->id,
                'qr_token' => Str::random(64),
                'checked_in_at' => Carbon::now()->subMinutes(rand(10, 75)),
                'checked_out_at' => null,
                'status' => 'granted',
            ]);
        }


        // ── 6. Seeding Gym 3 (ZenFit Marrakech) ─────────────────────────
        // (4 Coaches, 200 Members)
        // Coaches (4)
        $coachesGym3 = [];
        $namesCoaches3 = ['Layla Jamil', 'Sonia Filali', 'Amine Berrada', 'Taha Kabbaj'];
        foreach ($namesCoaches3 as $idx => $nc) {
            $coachesGym3[] = User::create([
                'name' => $nc,
                'email' => "coach_g3_" . ($idx + 1) . "@igym.ma",
                'password' => $passwordHash,
                'role' => 'coach',
                'phone' => '+2126335566' . $idx,
                'qr_token' => Str::random(64),
                'gym_id' => $gym3->id,
                'age' => rand(25, 45),
            ]);
        }

        // Members (200 - seed 10 and 190 procedurally)
        $membersGym3 = [];
        for ($j = 0; $j < 200; $j++) {
            $fn = ['Malak', 'Mariam', 'Zouhair', 'Zakaria', 'Yassine', 'Nouzha', 'Nezha', 'Fadoua'][rand(0, 7)];
            $ln = ['Chraibi', 'El Fassi', 'Kacimi', 'Daoudi', 'Mansouri', 'Tazi'][rand(0, 5)];
            $name = $fn . ' ' . $ln;
            $email = Str::slug($name) . '_g3_' . $j . '@igym.ma';
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => $passwordHash,
                'role' => 'adherent',
                'phone' => '+2126' . rand(10000000, 99999999),
                'objective_type' => ['flexibilite', 'endurance', 'perte_de_poids'][rand(0, 2)],
                'streak_days' => rand(0, 15),
                'total_sessions' => rand(5, 75),
                'level' => ['bronze', 'silver', 'gold', 'platinum'][rand(0, 3)],
                'qr_token' => Str::random(64),
                'gym_id' => $gym3->id,
                'age' => rand(18, 65),
            ]);
            if ($j < 10) {
                $membersGym3[] = $user;
            }
        }

        // Subscriptions Gym 3
        foreach ($membersGym3 as $idx => $member) {
            Subscription::create([
                'user_id' => $member->id,
                'gym_id' => $gym3->id,
                'plan' => 'trimestriel',
                'price' => 900.00,
                'start_date' => Carbon::now()->subDays(20),
                'end_date' => Carbon::now()->addDays(70),
                'status' => 'active',
                'payment_method' => 'cash',
            ]);
        }

        // Courses Gym 3
        $coursesGym3 = [];
        $courseDataGym3 = [
            ['Vinyasa Flow', 'Yoga', 9, 75, 20],
            ['Yin Yoga Méditation', 'Yoga', 17, 60, 20],
            ['Pilates Alignement', 'Pilates', 10, 50, 18],
            ['Functional Circuit Training', 'HIIT', 18, 45, 15],
        ];

        foreach ($courseDataGym3 as $idx => [$cName, $cType, $hour, $duration, $cap]) {
            $coach = $coachesGym3[$idx % count($coachesGym3)];
            $room = $rooms[$gym3->id][$idx % count($rooms[$gym3->id])];
            $start = now()->addDays($idx + 1)->setHour($hour)->setMinute(0)->setSecond(0);

            $coursesGym3[] = Course::create([
                'name' => $cName,
                'coach_id' => $coach->id,
                'room_id' => $room->id,
                'gym_id' => $gym3->id,
                'starts_at' => $start,
                'ends_at' => (clone $start)->addMinutes($duration),
                'max_capacity' => $cap,
                'current_reservations' => 0,
                'type' => $cType,
                'description' => 'Cours doux pour harmoniser le corps et le mental.',
            ]);
        }

        // Live attendance inside Gym 3 (Yoga: 4 inside, Functional: 2 inside)
        for ($k = 0; $k < 4; $k++) {
            AttendanceLog::create([
                'user_id' => User::where('gym_id', $gym3->id)->where('role', 'adherent')->skip($k)->first()->id,
                'room_id' => $rooms[$gym3->id][0]->id,
                'qr_token' => Str::random(64),
                'checked_in_at' => Carbon::now()->subMinutes(rand(10, 60)),
                'checked_out_at' => null,
                'status' => 'granted',
            ]);
        }
        for ($k = 0; $k < 2; $k++) {
            AttendanceLog::create([
                'user_id' => User::where('gym_id', $gym3->id)->where('role', 'adherent')->skip($k + 10)->first()->id,
                'room_id' => $rooms[$gym3->id][1]->id,
                'qr_token' => Str::random(64),
                'checked_in_at' => Carbon::now()->subMinutes(rand(10, 60)),
                'checked_out_at' => null,
                'status' => 'granted',
            ]);
        }


        // ── 7. Global Objectives & Badges ───────────────────────────────
        Objective::create(['user_id' => $ahmed->id, 'type' => 'perte_de_poids', 'target_value' => 10, 'current_value' => 3, 'unit' => 'kg']);
        Badge::create(['user_id' => $ahmed->id, 'badge_type' => 'first_session', 'earned_at' => Carbon::now()->subDays(15)]);
        Badge::create(['user_id' => $ahmed->id, 'badge_type' => 'streak_5', 'earned_at' => Carbon::now()->subDay()]);

        // ── 8. Global Notifications ─────────────────────────────────────
        Notification::create([
            'user_id' => $ahmed->id,
            'type' => 'badge_unlocked',
            'title' => '🏆 Nouveau badge débloqué !',
            'message' => 'Félicitations ! Vous avez débloqué le badge "🔥 Streak 5 Jours".',
            'is_read' => false,
        ]);
        Notification::create([
            'user_id' => $ahmed->id,
            'type' => 'cours_reminder',
            'title' => '⏰ Rappel de cours',
            'message' => 'Votre cours CrossFit Matinal commence bientôt.',
            'is_read' => false,
        ]);

        // ── 9. Global System Alerts ──────────────────────────────────────
        Alert::create([
            'type' => 'surfrequentation',
            'message' => 'Salle Cardio Ghandi est à 90% de sa capacité (12/30 personnes)',
            'room_id' => $rooms[$gym1->id][0]->id,
            'is_read' => false,
        ]);

        // ── 10. Advanced Coach System Seeding ───────────────────────────
        $allCoaches = array_merge($coachesGym1, $coachesGym2, $coachesGym3);
        $specialtyPool = ['Crossfit', 'Yoga', 'Musculation', 'Cardio', 'HIIT', 'Pilates', 'Boxing', 'Fitness'];
        $daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

        foreach ($allCoaches as $u) {
            $experienceYears = rand(3, 12);
            $popularity = rand(85, 100) / 10;
            $satisfaction = rand(45, 50) / 10;
            
            $coach = Coach::create([
                'user_id' => $u->id,
                'bio' => "Coach certifié d'État avec {$experienceYears} ans d'expérience. Spécialisé dans l'entraînement personnalisé et l'optimisation des performances sportives. Mon but est de vous aider à vous dépasser à chaque séance.",
                'experience' => $experienceYears,
                'popularity_score' => $popularity,
                'online_status' => rand(0, 1) ? 'online' : 'offline',
                'satisfaction_score' => $satisfaction
            ]);

            // Assign 2-3 specialties
            $specs = (array) array_rand(array_flip($specialtyPool), rand(2, 3));
            foreach ($specs as $s) {
                CoachSpecialty::create([
                    'coach_id' => $coach->id,
                    'specialty' => $s,
                ]);
            }

            // Define weekly availabilities
            foreach ($daysOfWeek as $dName) {
                CoachAvailability::create([
                    'coach_id' => $coach->id,
                    'day_of_week' => $dName,
                    'start_time' => '08:00:00',
                    'end_time' => '20:00:00',
                    'is_off' => false,
                    'pause_start' => '12:00:00',
                    'pause_end' => '14:00:00',
                ]);
            }
            // Sunday is off
            CoachAvailability::create([
                'coach_id' => $coach->id,
                'day_of_week' => 'Dimanche',
                'start_time' => '09:00:00',
                'end_time' => '16:00:00',
                'is_off' => true,
            ]);
        }

        // Add some realistic coach reviews for Gym 1 coaches
        foreach ($coachesGym1 as $cUser) {
            $coach = Coach::where('user_id', $cUser->id)->first();
            if ($coach) {
                // Let some members rate
                $reviewers = array_slice($membersGym1, 0, min(3, count($membersGym1)));
                $comments = [
                    "Une pédagogie incroyable, des encouragements continus !",
                    "Séances super structurées et très bon suivi technique.",
                    "Toujours ponctuel et de bonne humeur. Les résultats sont là !"
                ];
                foreach ($reviewers as $idx => $rev) {
                    CoachReview::create([
                        'coach_id' => $coach->id,
                        'user_id' => $rev->id,
                        'rating' => rand(4, 5),
                        'comment' => $comments[$idx % count($comments)],
                    ]);
                }
                
                // Recalculate average rating
                $avg = CoachReview::where('coach_id', $coach->id)->avg('rating');
                $coach->update(['satisfaction_score' => round($avg ?? 5.0, 1)]);
            }
        }

        // Seed fitness challenges for Gym 1
        if (count($coachesGym1) > 0) {
            $coach = Coach::where('user_id', $coachesGym1[0]->id)->first();
            $challenge1 = Challenge::create([
                'coach_id' => $coach->id,
                'gym_id' => $gym1->id,
                'title' => 'Challenge 30 jours HIIT & Cardio',
                'description' => 'Brûlez un maximum de graisses avec un entraînement quotidien intensif de HIIT et de Cardio. Complétez vos séances et gagnez des récompenses !',
                'duration_days' => 30,
                'xp_reward' => 250,
                'badge_reward' => 'streak_5',
                'status' => 'active',
            ]);

            $challenge2 = Challenge::create([
                'coach_id' => $coach->id,
                'gym_id' => $gym1->id,
                'title' => 'Prise de masse Clean Bulk',
                'description' => 'Un programme de renforcement musculaire axé sur l\'hypertrophie avec des conseils nutritionnels hebdomadaires.',
                'duration_days' => 45,
                'xp_reward' => 400,
                'badge_reward' => 'first_session',
                'status' => 'active',
            ]);

            // Add Ahmed to participant list for both challenges
            ChallengeParticipant::create([
                'challenge_id' => $challenge1->id,
                'user_id' => $ahmed->id,
                'progress' => 30, // 30% progress
                'status' => 'in_progress',
            ]);

            ChallengeParticipant::create([
                'challenge_id' => $challenge2->id,
                'user_id' => $ahmed->id,
                'progress' => 10,
                'status' => 'in_progress',
            ]);
        }

        $this->command->info('✅ Base de données I-Gym SaaS Multi-Gym initialisée !');
        $this->command->info('👑 Super Admin : superadmin@igym.ma / password (toutes gyms)');
        $this->command->info('👤 Admin Casab. : admin@igym.ma / password');
        $this->command->info('🏋️ Coach Casab. : coach@igym.ma / password');
        $this->command->info('💪 Adhérent Cas. : ahmed@igym.ma / password');
    }
}
