<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\AttendanceLog;
use App\Models\Course;
use App\Models\Gym;
use App\Models\Reservation;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    private function adminGym(Request $request): ?Gym
    {
        return Gym::find($request->user()->gym_id);
    }

    private function isAuthorized(Request $request): bool
    {
        $user = $request->user();
        return $user->isAdmin() || $user->isSuperAdmin();
    }

    private function handleLogoUpload(Request $request, ?string $currentLogo = null): ?string
    {
        if (!$request->exists('logo')) {
            return $currentLogo;
        }

        $logo = $request->input('logo');
        if (empty($logo)) {
            return null;
        }

        if ($currentLogo !== null && $logo === $currentLogo) {
            return $currentLogo;
        }

        // If it starts with data:image/, it is a base64 string upload
        if (preg_match('/^data:image\/(\w+);base64,/', $logo, $type)) {
            $data = substr($logo, strpos($logo, ',') + 1);
            $type = strtolower($type[1]); // jpg, png, gif, webp

            if (!in_array($type, ['jpg', 'jpeg', 'gif', 'png', 'webp'])) {
                return $currentLogo;
            }
            $data = base64_decode($data);
            if ($data === false) {
                return $currentLogo;
            }

            $fileName = 'gym_' . uniqid() . '.' . $type;
            \Illuminate\Support\Facades\Storage::disk('public')->put('gyms/' . $fileName, $data);
            return asset('storage/gyms/' . $fileName);
        }

        return $currentLogo;
    }

    // ─── KPIs Dashboard ─────────────────────────────────────────────────────

    /**
     * KPIs enrichis du dashboard admin
     */
    public function kpis(Request $request)
    {
        $user    = $request->user();
        $gymId   = $user->gym_id;
        $isSuper = $user->isSuperAdmin();

        $activeMembers = User::where('role', 'adherent')
            ->when(!$isSuper && $gymId, fn($q) => $q->where('gym_id', $gymId))
            ->whereHas('subscriptions', fn($q) => $q->where('status', 'active')
                ->where('end_date', '>=', now()->toDateString()))
            ->count();

        $totalMembers = User::where('role', 'adherent')
            ->when(!$isSuper && $gymId, fn($q) => $q->where('gym_id', $gymId))
            ->count();

        $coursesToday = Course::when(!$isSuper && $gymId, fn($q) => $q->where('gym_id', $gymId))
            ->whereDate('starts_at', today())
            ->count();

        $unreadAlerts = Alert::where('is_read', false)->count();

        $monthlyRevenue = Subscription::when(!$isSuper && $gymId, fn($q) =>
                $q->whereHas('user', fn($u) => $u->where('gym_id', $gymId))
            )
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('price');

        // Fréquentation 7 jours
        $reservationsPerDay = [];
        for ($i = 6; $i >= 0; $i--) {
            $date  = now()->subDays($i);
            $query = AttendanceLog::whereDate('checked_in_at', $date);
            if (!$isSuper && $gymId) {
                $query->whereHas('user', fn($q) => $q->where('gym_id', $gymId));
            }
            $reservationsPerDay[] = [
                'date'  => $date->format('d/m'),
                'count' => $query->count(),
            ];
        }

        // Présences aujourd'hui
        $todayAttendance = AttendanceLog::whereDate('checked_in_at', today())
            ->when(!$isSuper && $gymId, fn($q) => $q->whereHas('user', fn($u) => $u->where('gym_id', $gymId)))
            ->count();

        // Taux occupation moyen salles
        $gym = $this->adminGym($request);
        $occupancyRate = 0;
        if ($gym) {
            $rooms = $gym->rooms;
            if ($rooms->count() > 0) {
                $totalCapacity = $rooms->sum('capacity');
                $currentCount  = $rooms->sum('current_count');
                $occupancyRate = $totalCapacity > 0
                    ? round(($currentCount / $totalCapacity) * 100, 1)
                    : 0;
            }
        }

        return response()->json([
            'active_members'       => $activeMembers,
            'total_members'        => $totalMembers,
            'courses_today'        => $coursesToday,
            'unread_alerts'        => $unreadAlerts,
            'monthly_revenue'      => $monthlyRevenue,
            'reservations_per_day' => $reservationsPerDay,
            'today_attendance'     => $todayAttendance,
            'occupancy_rate'       => $occupancyRate,
        ]);
    }

    // ─── Gym Management ──────────────────────────────────────────────────────

    /**
     * Infos de la gym de l'admin
     */
    public function getGym(Request $request)
    {
        $gym = $this->adminGym($request);
        if (!$gym) {
            return response()->json(['message' => 'Aucune salle associée à ce compte.'], 404);
        }
        return response()->json($gym);
    }

    public function updateGym(Request $request)
    {
        $gym = $this->adminGym($request);
        if (!$gym) {
            return response()->json(['message' => 'Salle introuvable.'], 404);
        }

        $validated = $request->validate([
            'name'          => 'sometimes|string|max:120',
            'logo'          => 'nullable|string',
            'description'   => 'sometimes|string|max:1000',
            'address'       => 'sometimes|string|max:250',
            'city'          => 'sometimes|string|max:100',
            'phone'         => 'sometimes|string|max:20',
            'email'         => 'sometimes|email|max:120',
            'speciality'    => 'sometimes|string|max:100',
            'max_capacity'  => 'sometimes|integer|min:1',
            'opening_hours' => 'sometimes|array',
            'price_monthly' => 'sometimes|numeric|min:0',
            'price_yearly'  => 'sometimes|numeric|min:0',
            'currency'      => 'sometimes|string|max:10',
            'advantages'    => 'sometimes|array',
        ]);

        if (array_key_exists('logo', $validated)) {
            $validated['logo'] = $this->handleLogoUpload($request, $gym->logo);
        }

        $gym->update($validated);

        return response()->json(['message' => 'Salle mise à jour avec succès.', 'gym' => $gym]);
    }

    // ─── Coaches ─────────────────────────────────────────────────────────────

    /**
     * Liste des coachs de la gym
     */
    /**
     * Liste des coachs de la gym avec détails étendus
     */
    public function coaches(Request $request)
    {
        $gymId = $request->user()->gym_id;

        $coaches = User::where('role', 'coach')
            ->where('gym_id', $gymId)
            ->with(['coachProfile.specialties', 'coachProfile.availabilities'])
            ->get()
            ->map(function ($u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'phone' => $u->phone,
                    'avatar' => $u->avatar,
                    'created_at' => $u->created_at,
                    'bio' => $u->coachProfile?->bio,
                    'experience' => $u->coachProfile?->experience ?? 1,
                    'popularity_score' => $u->coachProfile?->popularity_score ?? 0.0,
                    'satisfaction_score' => $u->coachProfile?->satisfaction_score ?? 5.0,
                    'online_status' => $u->coachProfile?->online_status ?? 'offline',
                    'specialties' => $u->coachProfile?->specialties->pluck('specialty') ?? [],
                    'availabilities' => $u->coachProfile?->availabilities ?? [],
                ];
            });

        return response()->json($coaches);
    }

    /**
     * Créer un nouveau coach et son profil associé
     */
    public function storeCoach(Request $request)
    {
        $adminGymId = $request->user()->gym_id;

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'bio' => 'nullable|string',
            'experience' => 'required|integer|min:0',
            'specialties' => 'required|array',
            'specialties.*' => 'string|in:Crossfit,Yoga,Musculation,Cardio,HIIT,Pilates,Boxing,Fitness',
            'avatar' => 'nullable|string',
            'gym_id' => 'nullable|exists:gyms,id',
        ]);

        $gymId = $request->gym_id ?: $adminGymId;

        $user = DB::transaction(function () use ($request, $gymId) {
            $u = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'phone' => $request->phone,
                'password' => \Illuminate\Support\Facades\Hash::make('password'), // default password
                'age' => 30,
                'role' => 'coach',
                'gym_id' => $gymId,
                'avatar' => $request->avatar ?: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150',
                'qr_token' => \Illuminate\Support\Str::random(64),
            ]);

            $coach = \App\Models\Coach::create([
                'user_id' => $u->id,
                'bio' => $request->bio ?: "Coach certifié.",
                'experience' => $request->experience,
                'popularity_score' => 5.0,
                'satisfaction_score' => 5.0,
                'online_status' => 'offline',
            ]);

            foreach ($request->specialties as $spec) {
                \App\Models\CoachSpecialty::create([
                    'coach_id' => $coach->id,
                    'specialty' => $spec,
                ]);
            }

            // Generate initial availabilities Lundi - Samedi (08h-20h), Dimanche off
            $daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
            foreach ($daysOfWeek as $day) {
                \App\Models\CoachAvailability::create([
                    'coach_id' => $coach->id,
                    'day_of_week' => $day,
                    'start_time' => '08:00:00',
                    'end_time' => '20:00:00',
                    'is_off' => false,
                    'pause_start' => '12:00:00',
                    'pause_end' => '14:00:00',
                ]);
            }
            \App\Models\CoachAvailability::create([
                'coach_id' => $coach->id,
                'day_of_week' => 'Dimanche',
                'start_time' => '09:00:00',
                'end_time' => '16:00:00',
                'is_off' => true,
            ]);

            return $u;
        });

        return response()->json([
            'message' => 'Coach créé avec succès. Mot de passe temporaire : password',
            'coach' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'gym_id' => $user->gym_id,
                'bio' => $user->coachProfile?->bio,
                'experience' => $user->coachProfile?->experience,
                'specialties' => $user->coachProfile?->specialties->pluck('specialty'),
            ]
        ], 201);
    }

    /**
     * Modifier les informations et spécialités d'un coach
     */
    public function updateCoach(Request $request, $id)
    {
        $u = User::where('id', $id)->where('role', 'coach')->firstOrFail();

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => "required|email|unique:users,email,{$id}",
            'phone' => 'nullable|string|max:20',
            'bio' => 'nullable|string',
            'experience' => 'required|integer|min:0',
            'specialties' => 'required|array',
            'specialties.*' => 'string|in:Crossfit,Yoga,Musculation,Cardio,HIIT,Pilates,Boxing,Fitness',
            'avatar' => 'nullable|string',
            'gym_id' => 'nullable|exists:gyms,id',
        ]);

        DB::transaction(function () use ($request, $u) {
            $u->update([
                'name' => $request->name,
                'email' => $request->email,
                'phone' => $request->phone,
                'avatar' => $request->avatar ?: $u->avatar,
                'gym_id' => $request->gym_id ?: $u->gym_id,
            ]);

            $coach = \App\Models\Coach::firstOrCreate(['user_id' => $u->id]);
            $coach->update([
                'bio' => $request->bio,
                'experience' => $request->experience,
            ]);

            // Re-assign specialties
            \App\Models\CoachSpecialty::where('coach_id', $coach->id)->delete();
            foreach ($request->specialties as $spec) {
                \App\Models\CoachSpecialty::create([
                    'coach_id' => $coach->id,
                    'specialty' => $spec,
                ]);
            }
        });

        return response()->json([
            'message' => 'Informations du coach mises à jour.',
            'coach' => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'avatar' => $u->avatar,
                'gym_id' => $u->gym_id,
                'bio' => $u->coachProfile?->bio,
                'experience' => $u->coachProfile?->experience,
                'specialties' => $u->coachProfile?->specialties->pluck('specialty'),
            ]
        ]);
    }

    /**
     * Supprimer un coach de la base de données
     */
    public function deleteCoach(Request $request, $id)
    {
        $u = User::where('id', $id)->where('role', 'coach')->firstOrFail();
        
        $u->delete();

        return response()->json(['message' => 'Coach supprimé de la base de données.']);
    }

    // ─── Members ─────────────────────────────────────────────────────────────

    /**
     * Liste paginée des membres de la gym avec filtres
     */
    public function members(Request $request)
    {
        $gymId = $request->user()->gym_id;

        $query = User::where('role', 'adherent')
            ->where('gym_id', $gymId)
            ->with('activeSubscription');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) => $q
                ->where('name', 'like', "%{$s}%")
                ->orWhere('email', 'like', "%{$s}%")
            );
        }

        if ($request->filled('level')) {
            $query->where('level', $request->level);
        }

        if ($request->filled('gender')) {
            $query->where('gender', $request->gender);
        }

        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->whereHas('subscriptions', fn($q) => $q
                    ->where('status', 'active')
                    ->where('end_date', '>=', now()->toDateString()));
            } elseif ($request->status === 'expired') {
                $query->whereDoesntHave('subscriptions', fn($q) => $q
                    ->where('status', 'active')
                    ->where('end_date', '>=', now()->toDateString()));
            }
        }

        $members = $query->orderBy('created_at', 'desc')->paginate(25);

        return response()->json($members);
    }

    // ─── Courses (CRUD) ──────────────────────────────────────────────────────

    /**
     * Liste des cours de la gym
     */
    public function listCourses(Request $request)
    {
        $gymId = $request->user()->gym_id;

        $query = Course::with(['coach:id,name', 'room:id,name'])
            ->withCount(['reservations as current_reservations' => function ($q) {
                $q->where('status', 'confirmed');
            }])
            ->where('gym_id', $gymId);

        if ($request->filled('date')) {
            $query->whereDate('starts_at', $request->date);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $courses = $query->orderBy('starts_at')->get()->map(fn($c) => [
            'id'                   => $c->id,
            'name'                 => $c->name,
            'type'                 => $c->type,
            'coach'                => $c->coach ? ['id' => $c->coach->id, 'name' => $c->coach->name] : null,
            'room'                 => $c->room  ? ['id' => $c->room->id,  'name' => $c->room->name]  : null,
            'starts_at'            => $c->starts_at,
            'ends_at'              => $c->ends_at,
            'max_capacity'         => $c->max_capacity,
            'current_reservations' => $c->current_reservations,
            'spots_remaining'      => $c->spots_remaining,
            'description'          => $c->description,
            'color'                => $c->occupancy_color,
            'is_full'              => $c->spots_remaining === 0,
            'status'               => $c->status,
        ]);

        return response()->json($courses);
    }

    /**
     * Créer un cours
     */
    public function createCourse(Request $request)
    {
        $gymId = $request->user()->gym_id;

        $validated = $request->validate([
            'name'         => 'required|string|max:120',
            'type'         => 'required|in:Crossfit,Yoga,Cardio,Musculation,Boxing,Pilates,HIIT,Stretching',
            'coach_id'     => 'required|exists:users,id',
            'room_id'      => 'nullable|exists:rooms,id',
            'starts_at'    => 'required|date|after:now',
            'ends_at'      => 'required|date|after:starts_at',
            'max_capacity' => 'required|integer|min:1|max:500',
            'description'  => 'nullable|string|max:500',
        ]);

        $validated['gym_id']              = $gymId;
        $validated['current_reservations'] = 0;

        $course = Course::create($validated);

        return response()->json([
            'message' => 'Cours créé avec succès.',
            'course'  => $course->load('coach:id,name', 'room:id,name'),
        ], 201);
    }

    /**
     * Modifier un cours
     */
    public function updateCourse(Request $request, int $id)
    {
        $gymId  = $request->user()->gym_id;
        $course = Course::where('id', $id)->where('gym_id', $gymId)->firstOrFail();

        $validated = $request->validate([
            'name'         => 'sometimes|string|max:120',
            'type'         => 'sometimes|in:Crossfit,Yoga,Cardio,Musculation,Boxing,Pilates,HIIT,Stretching',
            'coach_id'     => 'sometimes|exists:users,id',
            'room_id'      => 'nullable|exists:rooms,id',
            'starts_at'    => 'sometimes|date',
            'ends_at'      => 'sometimes|date',
            'max_capacity' => 'sometimes|integer|min:1|max:500',
            'description'  => 'nullable|string|max:500',
        ]);

        $course->update($validated);

        return response()->json([
            'message' => 'Cours mis à jour.',
            'course'  => $course->load('coach:id,name', 'room:id,name'),
        ]);
    }

    /**
     * Supprimer un cours
     */
    public function deleteCourse(Request $request, int $id)
    {
        $gymId  = $request->user()->gym_id;
        $course = Course::where('id', $id)->where('gym_id', $gymId)->firstOrFail();
        $course->delete();

        return response()->json(['message' => 'Cours supprimé.']);
    }

    // ─── Reservations (live) ────────────────────────────────────────────────

    /**
     * Réservations live des cours du jour
     */
    public function reservations(Request $request)
    {
        $gymId = $request->user()->gym_id;

        $courses = Course::with([
                'coach:id,name',
                'room:id,name',
                'reservations' => fn($q) => $q->where('status', 'confirmed')->with('user:id,name,email,level,avatar'),
            ])
            ->where('gym_id', $gymId)
            ->whereDate('starts_at', today())
            ->orderBy('starts_at')
            ->get()
            ->map(function ($c) {
                $confirmedCount = $c->reservations->count();
                $spotsLeft = max(0, $c->max_capacity - $confirmedCount);
                return [
                    'id'                   => $c->id,
                    'name'                 => $c->name,
                    'type'                 => $c->type,
                    'coach'                => $c->coach?->name,
                    'room'                 => $c->room?->name,
                    'starts_at'            => $c->starts_at->format('H:i'),
                    'ends_at'              => $c->ends_at->format('H:i'),
                    'max_capacity'         => $c->max_capacity,
                    'current_reservations' => $confirmedCount,
                    'spots_remaining'      => $spotsLeft,
                    'is_full'              => $spotsLeft === 0,
                    'occupancy_pct'        => $c->max_capacity > 0
                        ? round(($confirmedCount / $c->max_capacity) * 100)
                        : 0,
                    'members' => $c->reservations->map(fn($r) => [
                        'id'     => $r->user->id,
                        'name'   => $r->user->name,
                        'email'  => $r->user->email,
                        'level'  => $r->user->level,
                    ]),
                ];
            });

        return response()->json($courses);
    }

    // ─── Heatmap fréquentation ───────────────────────────────────────────────

    /**
     * Données de fréquentation par heure sur 7 jours pour la heatmap
     */
    public function heatmap(Request $request)
    {
        $gymId = $request->user()->gym_id;
        $since = now()->subDays(7);

        $data = AttendanceLog::whereHas('user', fn($q) => $q->where('gym_id', $gymId))
            ->where('checked_in_at', '>=', $since)
            ->selectRaw('DAYOFWEEK(checked_in_at) as day, HOUR(checked_in_at) as hour, COUNT(*) as count')
            ->groupBy('day', 'hour')
            ->orderBy('day')
            ->orderBy('hour')
            ->get();

        // Construire grille 7 jours × 24 heures
        $grid = [];
        for ($d = 1; $d <= 7; $d++) {
            for ($h = 6; $h <= 22; $h++) {
                $row   = $data->firstWhere(fn($r) => $r->day === $d && $r->hour === $h);
                $grid[] = [
                    'day'   => $d,
                    'hour'  => $h,
                    'count' => $row?->count ?? 0,
                ];
            }
        }

        return response()->json($grid);
    }

    // ─── Alertes ─────────────────────────────────────────────────────────────

    public function alerts(Request $request)
    {
        $alerts = Alert::with('room:id,name')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json($alerts);
    }

    public function markAlertRead(int $id)
    {
        Alert::findOrFail($id)->update(['is_read' => true]);
        return response()->json(['message' => 'Alerte marquée comme lue.']);
    }

    // ─── Membres récents ─────────────────────────────────────────────────────

    public function recentMembers(Request $request)
    {
        $user    = $request->user();
        $gymId   = $user->gym_id;
        $isSuper = $user->isSuperAdmin();

        $members = User::where('role', 'adherent')
            ->when(!$isSuper && $gymId, fn($q) => $q->where('gym_id', $gymId))
            ->with(['activeSubscription', 'gym:id,name'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(fn($u) => [
                'id'             => $u->id,
                'name'           => $u->name,
                'email'          => $u->email,
                'level'          => $u->level,
                'total_sessions' => $u->total_sessions,
                'subscription'   => $u->activeSubscription?->plan,
                'joined_at'      => $u->created_at->format('d/m/Y'),
                'gym'            => $u->gym?->name,
            ]);

        return response()->json($members);
    }

    // ─── Subscriptions & Payments ─────────────────────────────────────────────

    /**
     * Get subscriptions for the admin's gym
     */
    public function subscriptions(Request $request)
    {
        $user = $request->user();
        $gymId = $user->gym_id;

        if (!$gymId && !$user->isSuperAdmin()) {
            return response()->json(['message' => 'Aucune salle associée à ce compte.'], 404);
        }

        $status = $request->query('status');
        $search = $request->query('search');

        $query = \App\Models\Subscription::with(['user:id,name,email,created_at'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->where('gym_id', $gymId));

        // Filter by Status
        if ($status) {
            if ($status === 'active') {
                $query->where('status', 'active')
                      ->where('end_date', '>=', now()->toDateString());
            } elseif ($status === 'expired') {
                $query->where(function($q) {
                    $q->whereIn('status', ['expired', 'suspended'])
                      ->orWhere(fn($sq) => $sq->where('status', 'active')->where('end_date', '<', now()->toDateString()));
                });
            } else { // pending
                $query->where('status', $status);
            }
        }

        // Filter by Search (User name or email)
        if (!empty($search)) {
            $query->whereHas('user', function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $subscriptions = $query->orderBy('created_at', 'desc')->get();

        return response()->json($subscriptions);
    }

    /**
     * Validate payment manually by Admin
     */
    public function validateSubscriptionPayment(Request $request, int $id)
    {
        $admin = $request->user();
        $gymId = $admin->gym_id;

        $sub = \App\Models\Subscription::findOrFail($id);

        if (!$admin->isSuperAdmin() && $sub->gym_id !== $gymId) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $request->validate([
            'payment_method' => 'nullable|string|in:cash,card',
        ]);

        $duration = $sub->plan === 'annuel' ? now()->addYear() : now()->addMonth();
        
        $sub->update([
            'status' => 'active',
            'start_date' => now(),
            'end_date' => $duration,
            'payment_method' => $request->payment_method ?? 'cash',
            'validated_by_admin' => $admin->id,
        ]);

        // Log payment
        \App\Models\Payment::create([
            'user_id' => $sub->user_id,
            'gym_id' => $sub->gym_id,
            'subscription_id' => $sub->id,
            'amount' => $sub->price,
            'payment_method' => $request->payment_method ?? 'cash',
            'validated_by_admin' => $admin->id,
            'status' => 'paid',
        ]);

        // Log renewal
        \App\Models\Renewal::create([
            'user_id' => $sub->user_id,
            'gym_id' => $sub->gym_id,
            'subscription_id' => $sub->id,
            'plan_type' => $sub->plan,
            'amount' => $sub->price,
            'start_date' => now(),
            'end_date' => $duration,
            'validated_by_admin' => $admin->id,
        ]);

        $gym = \App\Models\Gym::find($sub->gym_id);
        if ($gym) {
            $gym->increment('member_count');
        }

        \App\Models\Notification::create([
            'user_id' => $sub->user_id,
            'type' => 'subscription_activated',
            'title' => 'Abonnement Activé !',
            'message' => 'Votre paiement a été validé. Votre accès à l’application est débloqué ! Bonne séance.',
            'is_read' => false,
            'action_url' => '/adherent',
        ]);

        return response()->json([
            'message' => 'Paiement validé avec succès. Abonnement activé.',
            'subscription' => $sub->load('user'),
        ]);
    }

    /**
     * Suspend subscription
     */
    public function suspendSubscription(Request $request, int $id)
    {
        $admin = $request->user();
        $gymId = $admin->gym_id;

        $sub = \App\Models\Subscription::findOrFail($id);

        if (!$admin->isSuperAdmin() && $sub->gym_id !== $gymId) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $sub->update([
            'status' => 'suspended',
        ]);

        $gym = \App\Models\Gym::find($sub->gym_id);
        if ($gym && $gym->member_count > 0) {
            $gym->decrement('member_count');
        }

        \App\Models\Notification::create([
            'user_id' => $sub->user_id,
            'type' => 'subscription_suspended',
            'title' => 'Abonnement Suspendu',
            'message' => 'Votre abonnement a été suspendu par votre salle. Contactez l’accueil pour plus d’informations.',
            'is_read' => false,
            'action_url' => '/adherent',
        ]);

        return response()->json([
            'message' => 'Abonnement suspendu.',
            'subscription' => $sub->load('user'),
        ]);
    }

    /**
     * Renew subscription manually by Admin
     */
    public function renewSubscription(Request $request, int $id)
    {
        $admin = $request->user();
        $gymId = $admin->gym_id;

        $sub = \App\Models\Subscription::findOrFail($id);

        if (!$admin->isSuperAdmin() && $sub->gym_id !== $gymId) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $request->validate([
            'plan' => 'required|string|in:mensuel,annuel',
            'payment_method' => 'nullable|string|in:cash,card',
            'price' => 'nullable|numeric|min:0',
        ]);

        $planType = $request->plan;
        
        $gym = \App\Models\Gym::find($sub->gym_id);
        $price = $request->price ?? ($planType === 'annuel' ? $gym->price_yearly : $gym->price_monthly);

        $startDate = ($sub->status === 'active' && $sub->end_date && $sub->end_date->gt(now())) 
            ? $sub->end_date 
            : now();

        $endDate = $planType === 'annuel' 
            ? $startDate->copy()->addYear() 
            : $startDate->copy()->addMonth();

        $sub->update([
            'plan' => $planType,
            'price' => $price,
            'status' => 'active',
            'start_date' => $startDate,
            'end_date' => $endDate,
            'payment_method' => $request->payment_method ?? 'cash',
            'validated_by_admin' => $admin->id,
        ]);

        // Log payment
        \App\Models\Payment::create([
            'user_id' => $sub->user_id,
            'gym_id' => $sub->gym_id,
            'subscription_id' => $sub->id,
            'amount' => $price,
            'payment_method' => $request->payment_method ?? 'cash',
            'validated_by_admin' => $admin->id,
            'status' => 'paid',
        ]);

        // Log renewal
        \App\Models\Renewal::create([
            'user_id' => $sub->user_id,
            'gym_id' => $sub->gym_id,
            'subscription_id' => $sub->id,
            'plan_type' => $planType,
            'amount' => $price,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'validated_by_admin' => $admin->id,
        ]);

        \App\Models\Notification::create([
            'user_id' => $sub->user_id,
            'type' => 'subscription_renewed',
            'title' => 'Abonnement Renouvelé !',
            'message' => "Votre formule d'abonnement a été renouvelée jusqu'au " . $endDate->format('d/m/Y') . ". Merci de votre fidélité !",
            'is_read' => false,
            'action_url' => '/adherent',
        ]);

        return response()->json([
            'message' => 'Abonnement renouvelé avec succès.',
            'subscription' => $sub->load('user'),
        ]);
    }

    /**
     * Get revenue stats breakdown for the admin dashboard
     */
    public function subscriptionStats(Request $request)
    {
        $user = $request->user();
        $gymId = $user->gym_id;

        if (!$gymId && !$user->isSuperAdmin()) {
            return response()->json(['message' => 'Aucune salle associée à ce compte.'], 404);
        }

        $activeCount = User::where('role', 'adherent')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->where('gym_id', $gymId))
            ->whereHas('subscriptions', fn($q) => $q->where('status', 'active')->where('end_date', '>=', now()->toDateString()))
            ->count();

        $expiredCount = User::where('role', 'adherent')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->where('gym_id', $gymId))
            ->whereHas('subscriptions', fn($q) => $q->where('status', 'expired'))
            ->count();

        $suspendedCount = User::where('role', 'adherent')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->where('gym_id', $gymId))
            ->whereHas('subscriptions', fn($q) => $q->where('status', 'suspended'))
            ->count();

        $pendingCount = User::where('role', 'adherent')
            ->when(!$user->isSuperAdmin(), fn($q) => $q->where('gym_id', $gymId))
            ->whereHas('subscriptions', fn($q) => $q->where('status', 'pending'))
            ->count();

        $monthlyRevenue = \App\Models\Payment::when(!$user->isSuperAdmin(), fn($q) => $q->where('gym_id', $gymId))
            ->where('status', 'paid')
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('amount');

        $annualRevenue = \App\Models\Payment::when(!$user->isSuperAdmin(), fn($q) => $q->where('gym_id', $gymId))
            ->where('status', 'paid')
            ->whereYear('created_at', now()->year)
            ->sum('amount');

        $paymentsHistory = \App\Models\Payment::with(['user:id,name,email'])
            ->when(!$user->isSuperAdmin(), fn($q) => $q->where('gym_id', $gymId))
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json([
            'active_members' => $activeCount,
            'expired_members' => $expiredCount,
            'suspended_members' => $suspendedCount,
            'pending_payments' => $pendingCount,
            'monthly_revenue' => $monthlyRevenue,
            'annual_revenue' => $annualRevenue,
            'payments_history' => $paymentsHistory,
        ]);
    }
}
