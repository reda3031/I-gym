<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Gym;
use App\Models\User;
use App\Models\AttendanceLog;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Arr;

class GymController extends Controller
{
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

    /**
     * Liste des gyms actives — route PUBLIQUE (pour la page d'inscription)
     */
    public function index(Request $request)
    {
        $query = Gym::where('is_active', true);

        // Recherche dynamique
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%")
                  ->orWhere('speciality', 'like', "%{$search}%");
            });
        }

        // Filtre par spécialité
        if ($request->filled('speciality')) {
            $query->where('speciality', $request->speciality);
        }

        $gyms = $query->orderBy('member_count', 'desc')->get()->map(fn($g) => $this->formatGym($g));

        return response()->json($gyms);
    }

    /**
     * Détails d'une gym — public
     */
    public function show(int $id)
    {
        $gym = Gym::where('is_active', true)->findOrFail($id);
        return response()->json($this->formatGym($gym, true));
    }

    /**
     * Statistiques live d'une gym — protégé
     */
    public function stats(Request $request, int $id)
    {
        $gym = Gym::findOrFail($id);

        // Vérifier accès (super_admin voit tout, admin voit sa gym)
        $user = $request->user();
        if (!$user->isSuperAdmin() && $user->gym_id !== $gym->id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $activeNow = AttendanceLog::whereNull('checked_out_at')
            ->where('status', 'granted')
            ->whereHas('user', fn($q) => $q->where('gym_id', $gym->id))
            ->count();

        $coursesToday = Course::where('gym_id', $gym->id)
            ->whereDate('starts_at', today())
            ->count();

        // Fréquentation 7 derniers jours
        $frequentation = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $frequentation[] = [
                'date'  => $date->format('d/m'),
                'count' => AttendanceLog::whereDate('checked_in_at', $date)
                    ->whereHas('user', fn($q) => $q->where('gym_id', $gym->id))
                    ->count(),
            ];
        }

        return response()->json([
            'gym'               => $this->formatGym($gym),
            'active_now'        => $activeNow,
            'courses_today'     => $coursesToday,
            'total_members'     => $gym->members()->count(),
            'active_members'    => $gym->activeMembers()->count(),
            'total_coaches'     => $gym->coaches()->count(),
            'frequentation'     => $frequentation,
        ]);
    }

    /**
     * Dashboard Super Admin — toutes les gyms
     */
    public function superAdminDashboard(Request $request)
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            return response()->json(['message' => 'Accès réservé au Super Admin.'], 403);
        }

        $gyms = Gym::where('is_active', true)->get()->map(function ($gym) {
            $activeNow = AttendanceLog::whereNull('checked_out_at')
                ->where('status', 'granted')
                ->whereHas('user', fn($q) => $q->where('gym_id', $gym->id))
                ->count();

            return array_merge($this->formatGym($gym), [
                'active_now'     => $activeNow,
                'total_members'  => $gym->members()->count(),
                'active_members' => $gym->activeMembers()->count(),
                'total_coaches'  => $gym->coaches()->count(),
                'courses_today'  => $gym->courses()->whereDate('starts_at', today())->count(),
            ]);
        });

        // Gym la plus active
        $mostActive = $gyms->sortByDesc('active_now')->first();

        return response()->json([
            'gyms'        => $gyms->values(),
            'most_active' => $mostActive,
            'total_gyms'  => $gyms->count(),
            'total_members_all' => $gyms->sum('total_members'),
        ]);
    }

    /**
     * Liste des utilisateurs par rôle pour le Super Admin
     */
    public function superAdminUsers(Request $request)
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            return response()->json(['message' => 'Accès réservé au Super Admin.'], 403);
        }

        $query = \App\Models\User::query();

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        } else {
            $query->where('role', '!=', 'super_admin');
        }

        if ($request->filled('gym_id')) {
            $query->where('gym_id', $request->gym_id);
        }

        if ($request->filled('gender')) {
            $query->where('gender', $request->gender);
        }

        if ($request->filled('objective_type')) {
            $query->where('objective_type', $request->objective_type);
        }

        if ($request->filled('level')) {
            $query->where('level', $request->level);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->with('gym')
            ->orderBy('id', 'desc')
            ->paginate(50);

        return response()->json($users);
    }

    /**
     * Récupérer tous les coachs et admins pour la gestion dans la modale
     */
    public function getAllCoachesAndAdmins(Request $request)
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            return response()->json(['message' => 'Accès réservé au Super Admin.'], 403);
        }

        $admins = User::where('role', 'admin')->get(['id', 'name', 'email', 'gym_id']);
        $coaches = User::where('role', 'coach')->get(['id', 'name', 'email', 'gym_id']);

        return response()->json([
            'admins'  => $admins,
            'coaches' => $coaches,
        ]);
    }

    /**
     * Créer une nouvelle gym — Super Admin
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            return response()->json(['message' => 'Accès réservé au Super Admin.'], 403);
        }
        $validated = $request->validate([
            'name'           => 'required|string|max:120',
            'slug'           => 'required|string|max:120|unique:gyms,slug',
            'logo'           => 'nullable|string',
            'description'    => 'nullable|string|max:1000',
            'address'        => 'required|string|max:250',
            'city'           => 'required|string|max:100',
            'phone'          => 'required|string|max:20',
            'email'          => 'nullable|email|max:120',
            'speciality'     => 'required|string|max:150',
            'color'          => 'required|string|max:50',
            'max_capacity'   => 'required|integer|min:1',
            'opening_hours'  => 'nullable|array',
            'price_monthly'  => 'nullable|numeric|min:0',
            'price_yearly'   => 'nullable|numeric|min:0',
            'currency'       => 'nullable|string|max:10',
            'advantages'     => 'nullable|array',
            'admin_ids'      => 'nullable|array',
            'admin_ids.*'    => 'exists:users,id',
            'coach_ids'      => 'nullable|array',
            'coach_ids.*'    => 'exists:users,id',
            'new_coaches'    => 'nullable|array',
            'new_coaches.*.name' => 'required|string|max:120',
            'new_coaches.*.email' => 'required|email|unique:users,email',
            'new_coaches.*.phone' => 'nullable|string|max:20',
            'new_coaches.*.bio' => 'nullable|string',
            'new_coaches.*.experience' => 'required|integer|min:0',
            'new_coaches.*.specialties' => 'nullable',
            
            // Compte administrateur optionnel
            'admin_name'     => 'nullable|string|max:120',
            'admin_email'    => 'nullable|email|max:150|unique:users,email',
            'admin_password' => 'nullable|string|min:6|required_with:admin_email',
        ]);

        // Validation logique des horaires
        if (!empty($request->opening_hours) && is_array($request->opening_hours)) {
            foreach ($request->opening_hours as $day => $times) {
                if (isset($times['active']) && $times['active']) {
                    $start = $times['start'] ?? '';
                    $end = $times['end'] ?? '';
                    if (empty($start) || empty($end)) {
                        return response()->json(['message' => "Les horaires pour le jour {$day} doivent être renseignés."], 422);
                    }
                    if (strtotime($end) <= strtotime($start)) {
                        return response()->json(['message' => "L'heure de fermeture doit être après l'heure d'ouverture pour le jour {$day}."], 422);
                    }
                }
            }
        }

        $gymData = \Illuminate\Support\Arr::except($validated, [
            'admin_name', 'admin_email', 'admin_password', 
            'admin_ids', 'coach_ids', 'new_coaches'
        ]);

        $gymData['logo'] = $this->handleLogoUpload($request);

        $gym = Gym::create(array_merge($gymData, [
            'is_active' => true,
            'member_count' => 0
        ]));
        // Lier les administrateurs existants selectionnés
        if (!empty($request->admin_ids)) {
            User::whereIn('id', $request->admin_ids)->where('role', 'admin')->update(['gym_id' => $gym->id]);
        }

        // Lier les coachs existants selectionnés
        if (!empty($request->coach_ids)) {
            User::whereIn('id', $request->coach_ids)->where('role', 'coach')->update(['gym_id' => $gym->id]);
        }

        // Créer les nouveaux coachs
        if (!empty($request->new_coaches) && is_array($request->new_coaches)) {
            foreach ($request->new_coaches as $ncData) {
                $coachUser = User::create([
                    'name' => $ncData['name'],
                    'email' => $ncData['email'],
                    'phone' => $ncData['phone'] ?? null,
                    'password' => Hash::make($ncData['password'] ?? 'password'),
                    'age' => intval($ncData['age'] ?? 30),
                    'role' => 'coach',
                    'gym_id' => $gym->id,
                    'avatar' => $ncData['avatar'] ?? 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150',
                    'qr_token' => Str::random(64),
                ]);

                $coachProfile = \App\Models\Coach::create([
                    'user_id' => $coachUser->id,
                    'bio' => $ncData['bio'] ?? "Coach certifié.",
                    'experience' => intval($ncData['experience'] ?? 1),
                    'popularity_score' => 5.0,
                    'satisfaction_score' => 5.0,
                    'online_status' => 'offline',
                ]);

                $specs = $ncData['specialties'] ?? [];
                if (is_string($specs)) {
                    $specs = array_map('trim', explode(',', $specs));
                }
                foreach ($specs as $spec) {
                    if (!empty($spec)) {
                        \App\Models\CoachSpecialty::create([
                            'coach_id' => $coachProfile->id,
                            'specialty' => $spec,
                        ]);
                    }
                }

                // Horaires par défaut Lundi-Samedi
                $daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
                foreach ($daysOfWeek as $day) {
                    \App\Models\CoachAvailability::create([
                        'coach_id' => $coachProfile->id,
                        'day_of_week' => $day,
                        'start_time' => '08:00:00',
                        'end_time' => '20:00:00',
                        'is_off' => false,
                    ]);
                }
                \App\Models\CoachAvailability::create([
                    'coach_id' => $coachProfile->id,
                    'day_of_week' => 'Dimanche',
                    'start_time' => '09:00:00',
                    'end_time' => '16:00:00',
                    'is_off' => true,
                ]);
            }
        }

        // Créer l'administrateur principal optionnel
        if (!empty($validated['admin_email'])) {
            User::create([
                'name'     => $validated['admin_name'] ?: 'Admin ' . $gym->name,
                'email'    => $validated['admin_email'],
                'password' => \Illuminate\Support\Facades\Hash::make($validated['admin_password']),
                'age'      => 30,
                'role'     => 'admin',
                'gym_id'   => $gym->id,
            ]);
        }

        return response()->json([
            'message' => 'Club créé avec succès' . (!empty($validated['admin_email']) ? ' ainsi que son compte Administrateur.' : '.'),
            'gym'     => $this->formatGym($gym)
        ]);
    }

    /**
     * Mettre à jour une gym — Super Admin
     */
    public function updateGym(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            return response()->json(['message' => 'Accès réservé au Super Admin.'], 403);
        }

        $gym = Gym::findOrFail($id);

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:120',
            'slug'           => 'sometimes|string|max:120|unique:gyms,slug,' . $id,
            'logo'           => 'nullable|string',
            'description'    => 'nullable|string|max:1000',
            'address'        => 'sometimes|string|max:250',
            'city'           => 'sometimes|string|max:100',
            'phone'          => 'sometimes|string|max:20',
            'email'          => 'nullable|email|max:120',
            'speciality'     => 'sometimes|string|max:150',
            'color'          => 'sometimes|string|max:50',
            'max_capacity'   => 'sometimes|integer|min:1',
            'opening_hours'  => 'nullable|array',
            'price_monthly'  => 'nullable|numeric|min:0',
            'price_yearly'   => 'nullable|numeric|min:0',
            'currency'       => 'nullable|string|max:10',
            'advantages'     => 'nullable|array',
            'admin_ids'      => 'nullable|array',
            'admin_ids.*'    => 'exists:users,id',
            'coach_ids'      => 'nullable|array',
            'coach_ids.*'    => 'exists:users,id',
            'new_coaches'    => 'nullable|array',
            'new_coaches.*.name' => 'required|string|max:120',
            'new_coaches.*.email' => 'required|email|unique:users,email',
            'new_coaches.*.phone' => 'nullable|string|max:20',
            'new_coaches.*.bio' => 'nullable|string',
            'new_coaches.*.experience' => 'required|integer|min:0',
            'new_coaches.*.specialties' => 'nullable',
        ]);

        // Validation logique des horaires
        if (!empty($request->opening_hours) && is_array($request->opening_hours)) {
            foreach ($request->opening_hours as $day => $times) {
                if (isset($times['active']) && $times['active']) {
                    $start = $times['start'] ?? '';
                    $end = $times['end'] ?? '';
                    if (empty($start) || empty($end)) {
                        return response()->json(['message' => "Les horaires pour le jour {$day} doivent être renseignés."], 422);
                    }
                    if (strtotime($end) <= strtotime($start)) {
                        return response()->json(['message' => "L'heure de fermeture doit être après l'heure d'ouverture pour le jour {$day}."], 422);
                    }
                }
            }
        }

        $gymData = \Illuminate\Support\Arr::except($validated, [
            'admin_ids', 'coach_ids', 'new_coaches'
        ]);

        if (array_key_exists('logo', $gymData)) {
            $gymData['logo'] = $this->handleLogoUpload($request, $gym->logo);
        }

        $gym->update($gymData);

        // Mettre à jour l'assignation des admins
        $currentAdminIds = $gym->admins()->pluck('id')->toArray();
        $newAdminIds = $request->admin_ids ?? [];
        $adminsToDissociate = array_diff($currentAdminIds, $newAdminIds);
        if (!empty($adminsToDissociate)) {
            User::whereIn('id', $adminsToDissociate)->update(['gym_id' => null]);
        }
        if (!empty($newAdminIds)) {
            User::whereIn('id', $newAdminIds)->where('role', 'admin')->update(['gym_id' => $gym->id]);
        }

        // Mettre à jour l'assignation des coachs
        $currentCoachIds = $gym->coaches()->pluck('id')->toArray();
        $newCoachIds = $request->coach_ids ?? [];
        $coachesToDissociate = array_diff($currentCoachIds, $newCoachIds);
        if (!empty($coachesToDissociate)) {
            User::whereIn('id', $coachesToDissociate)->update(['gym_id' => null]);
        }
        if (!empty($newCoachIds)) {
            User::whereIn('id', $newCoachIds)->where('role', 'coach')->update(['gym_id' => $gym->id]);
        }

        // Créer les nouveaux coachs
        if (!empty($request->new_coaches) && is_array($request->new_coaches)) {
            foreach ($request->new_coaches as $ncData) {
                $coachUser = User::create([
                    'name' => $ncData['name'],
                    'email' => $ncData['email'],
                    'phone' => $ncData['phone'] ?? null,
                    'password' => Hash::make($ncData['password'] ?? 'password'),
                    'age' => intval($ncData['age'] ?? 30),
                    'role' => 'coach',
                    'gym_id' => $gym->id,
                    'avatar' => $ncData['avatar'] ?? 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150',
                    'qr_token' => Str::random(64),
                ]);

                $coachProfile = \App\Models\Coach::create([
                    'user_id' => $coachUser->id,
                    'bio' => $ncData['bio'] ?? "Coach certifié.",
                    'experience' => intval($ncData['experience'] ?? 1),
                    'popularity_score' => 5.0,
                    'satisfaction_score' => 5.0,
                    'online_status' => 'offline',
                ]);

                $specs = $ncData['specialties'] ?? [];
                if (is_string($specs)) {
                    $specs = array_map('trim', explode(',', $specs));
                }
                foreach ($specs as $spec) {
                    if (!empty($spec)) {
                        \App\Models\CoachSpecialty::create([
                            'coach_id' => $coachProfile->id,
                            'specialty' => $spec,
                        ]);
                    }
                }

                // Availabilities
                $daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
                foreach ($daysOfWeek as $day) {
                    \App\Models\CoachAvailability::create([
                        'coach_id' => $coachProfile->id,
                        'day_of_week' => $day,
                        'start_time' => '08:00:00',
                        'end_time' => '20:00:00',
                        'is_off' => false,
                    ]);
                }
                \App\Models\CoachAvailability::create([
                    'coach_id' => $coachProfile->id,
                    'day_of_week' => 'Dimanche',
                    'start_time' => '09:00:00',
                    'end_time' => '16:00:00',
                    'is_off' => true,
                ]);
            }
        }

        return response()->json([
            'message' => 'Club mis à jour avec succès.',
            'gym'     => $this->formatGym($gym)
        ]);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private function formatGym(Gym $gym, bool $details = false): array
    {
        $data = [
            'id'            => $gym->id,
            'name'          => $gym->name,
            'slug'          => $gym->slug,
            'logo'          => $gym->logo,
            'address'       => $gym->address,
            'city'          => $gym->city,
            'phone'         => $gym->phone,
            'email'         => $gym->email,
            'speciality'    => $gym->speciality,
            'color'         => $gym->color,
            'member_count'  => $gym->member_count,
            'max_capacity'  => $gym->max_capacity,
            'description'   => $gym->description,
            'opening_hours' => $gym->opening_hours,
            'admin_ids'     => $gym->admins()->pluck('id')->toArray(),
            'coach_ids'     => $gym->coaches()->pluck('id')->toArray(),
        ];

        return $data;
    }
}
