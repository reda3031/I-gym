<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Coach;
use App\Models\CoachAvailability;
use App\Models\CoachSpecialty;
use App\Models\Course;
use App\Models\Room;
use App\Models\User;
use App\Models\Reservation;
use App\Models\Notification;
use App\Models\Alert;
use App\Models\Challenge;
use App\Models\ChallengeParticipant;
use App\Models\CoachReview;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CoachController extends Controller
{
    /**
     * Coach Dashboard KPIs and Calendar
     */
    public function dashboard(Request $request)
    {
        $user = $request->user();
        $coach = Coach::where('user_id', $user->id)
            ->with(['specialties', 'availabilities'])
            ->first();

        if (!$coach) {
            // Auto-create profile if missing for compatibility
            $coach = Coach::create([
                'user_id' => $user->id,
                'bio' => 'Nouveau coach.',
                'experience' => 1,
            ]);
        }

        // 1. KPI Today's courses
        $today = Carbon::today();
        $coursesTodayCount = Course::where('coach_id', $user->id)
            ->whereDate('starts_at', $today)
            ->where('status', 'active')
            ->count();

        // 2. Total active courses
        $totalCourses = Course::where('coach_id', $user->id)
            ->where('status', 'active')
            ->count();

        // 3. Average Fill Rate
        $fillRate = 0;
        $totalCapacity = Course::where('coach_id', $user->id)->where('status', 'active')->sum('max_capacity');
        $totalReservations = Course::where('coach_id', $user->id)->where('status', 'active')->sum('current_reservations');
        if ($totalCapacity > 0) {
            $fillRate = round(($totalReservations / $totalCapacity) * 100, 1);
        }

        // 4. Total participants registered
        $totalParticipants = Reservation::whereHas('course', function ($q) use ($user) {
            $q->where('coach_id', $user->id)->where('status', 'active');
        })->where('status', 'confirmed')->count();

        // 5. Calendar courses
        $courses = Course::where('coach_id', $user->id)
            ->with(['room:id,name', 'reservations.user:id,name,email'])
            ->orderBy('starts_at')
            ->get()
            ->map(function ($c) {
                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'type' => $c->type,
                    'starts_at' => $c->starts_at,
                    'ends_at' => $c->ends_at,
                    'max_capacity' => $c->max_capacity,
                    'current_reservations' => $c->reservations->filter(fn($r) => $r->status === 'confirmed')->count(),
                    'status' => $c->status,
                    'cancellation_reason' => $c->cancellation_reason,
                    'room_name' => $c->room?->name,
                    'room_id' => $c->room_id,
                    'description' => $c->description,
                    'participants' => $c->reservations->filter(fn($r) => $r->status === 'confirmed')->map(fn($r) => [
                        'id' => $r->user?->id,
                        'name' => $r->user?->name,
                        'email' => $r->user?->email,
                    ])->values()
                ];
            });

        // 6. Recent reviews
        $reviews = CoachReview::where('coach_id', $coach->id)
            ->with('user:id,name,avatar')
            ->latest()
            ->take(5)
            ->get()
            ->map(fn($r) => [
                'id' => $r->id,
                'rating' => $r->rating,
                'comment' => $r->comment,
                'user_name' => $r->user?->name,
                'user_avatar' => $r->user?->avatar,
                'created_at' => $r->created_at->format('d/m/Y'),
            ]);

        // 7. Active challenges
        $challenges = Challenge::where('coach_id', $coach->id)
            ->withCount('participants')
            ->get();

        // 8. Heatmap data (aggregate courses attendance by weekday and hour slot)
        $heatmap = Course::where('coach_id', $user->id)
            ->where('status', 'active')
            ->get()
            ->groupBy(function ($c) {
                return $c->starts_at->format('N'); // 1 (Mon) - 7 (Sun)
            })
            ->map(function ($dayCourses) {
                $slots = array_fill(6, 17, 0); // 6h to 22h
                foreach ($dayCourses as $c) {
                    $hour = intval($c->starts_at->format('H'));
                    if ($hour >= 6 && $hour <= 22) {
                        $slots[$hour] += $c->current_reservations;
                    }
                }
                return $slots;
            });

        return response()->json([
            'coach' => [
                'id' => $coach->id,
                'bio' => $coach->bio,
                'experience' => $coach->experience,
                'popularity_score' => $coach->popularity_score,
                'satisfaction_score' => $coach->satisfaction_score,
                'online_status' => $coach->online_status,
                'specialties' => $coach->specialties->pluck('specialty'),
                'availabilities' => $coach->availabilities
            ],
            'kpis' => [
                'courses_today' => $coursesTodayCount,
                'total_courses' => $totalCourses,
                'fill_rate' => $fillRate,
                'total_participants' => $totalParticipants
            ],
            'courses' => $courses,
            'reviews' => $reviews,
            'challenges' => $challenges,
            'heatmap' => $heatmap
        ]);
    }

    /**
     * Save coach availabilities
     */
    public function updateAvailabilities(Request $request)
    {
        $user = $request->user();
        $coach = Coach::where('user_id', $user->id)->first();
        if (!$coach) {
            return response()->json(['message' => 'Profil de coach introuvable.'], 404);
        }

        $request->validate([
            'availabilities' => 'required|array',
            'availabilities.*.day_of_week' => 'required|string',
            'availabilities.*.start_time' => 'required|date_format:H:i:s',
            'availabilities.*.end_time' => 'required|date_format:H:i:s|after:availabilities.*.start_time',
            'availabilities.*.is_off' => 'required|boolean',
            'availabilities.*.pause_start' => 'nullable|date_format:H:i:s',
            'availabilities.*.pause_end' => 'nullable|date_format:H:i:s|after:availabilities.*.pause_start',
        ]);

        DB::transaction(function () use ($coach, $request) {
            // Delete old ones
            CoachAvailability::where('coach_id', $coach->id)->delete();

            foreach ($request->availabilities as $av) {
                CoachAvailability::create([
                    'coach_id' => $coach->id,
                    'day_of_week' => $av['day_of_week'],
                    'start_time' => $av['start_time'],
                    'end_time' => $av['end_time'],
                    'is_off' => $av['is_off'],
                    'pause_start' => $av['pause_start'] ?? null,
                    'pause_end' => $av['pause_end'] ?? null,
                ]);
            }
        });

        return response()->json([
            'message' => 'Disponibilités mises à jour avec succès.',
            'availabilities' => CoachAvailability::where('coach_id', $coach->id)->get()
        ]);
    }

    /**
     * Toggle coach online status
     */
    public function toggleStatus(Request $request)
    {
        $user = $request->user();
        $coach = Coach::where('user_id', $user->id)->firstOrFail();
        
        $request->validate([
            'status' => 'required|string|in:online,offline'
        ]);

        $coach->update(['online_status' => $request->status]);

        return response()->json([
            'message' => 'Statut de connexion mis à jour.',
            'online_status' => $coach->online_status
        ]);
    }

    /**
     * Create course / session with overlaps & availability validations
     */
    public function createCourse(Request $request)
    {
        $user = $request->user();
        $coach = Coach::where('user_id', $user->id)->firstOrFail();

        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:Crossfit,Yoga,Musculation,Cardio,HIIT,Pilates,Boxing,Fitness',
            'starts_at' => 'required|date|after:now',
            'ends_at' => 'required|date|after:starts_at',
            'max_capacity' => 'required|integer|min:5|max:100',
            'room_id' => 'required|exists:rooms,id',
            'description' => 'nullable|string',
        ]);

        $startsAt = Carbon::parse($request->starts_at);
        $endsAt = Carbon::parse($request->ends_at);
        $dayOfWeekFr = $this->getFrenchDayName($startsAt->format('l'));

        // 1. Check availability boundaries
        $availability = CoachAvailability::where('coach_id', $coach->id)
            ->where('day_of_week', $dayOfWeekFr)
            ->first();

        if (!$availability || $availability->is_off) {
            return response()->json(['message' => "Vous n'êtes pas disponible le {$dayOfWeekFr}."], 422);
        }

        $availStart = Carbon::createFromTimeString($availability->start_time, $startsAt->timezone);
        $availEnd = Carbon::createFromTimeString($availability->end_time, $startsAt->timezone);

        $courseStartTimeOnly = Carbon::createFromTimeString($startsAt->format('H:i:s'));
        $courseEndTimeOnly = Carbon::createFromTimeString($endsAt->format('H:i:s'));
        $availStartTimeOnly = Carbon::createFromTimeString($availability->start_time);
        $availEndTimeOnly = Carbon::createFromTimeString($availability->end_time);

        if ($courseStartTimeOnly->lt($availStartTimeOnly) || $courseEndTimeOnly->gt($availEndTimeOnly)) {
            return response()->json([
                'message' => "Le cours déborde de votre horaire de disponibilité ({$availability->start_time} - {$availability->end_time})."
            ], 422);
        }

        // Check Pause overlap
        if ($availability->pause_start && $availability->pause_end) {
            $pauseStartOnly = Carbon::createFromTimeString($availability->pause_start);
            $pauseEndOnly = Carbon::createFromTimeString($availability->pause_end);

            if ($courseStartTimeOnly->lt($pauseEndOnly) && $courseEndTimeOnly->gt($pauseStartOnly)) {
                return response()->json([
                    'message' => "Le cours chevauche votre heure de pause ({$availability->pause_start} - {$availability->pause_end})."
                ], 422);
            }
        }

        // 2. Check Coach Schedule overlaps
        $coachConflict = Course::where('coach_id', $user->id)
            ->where('status', 'active')
            ->where(function ($q) use ($startsAt, $endsAt) {
                $q->where(function ($sq) use ($startsAt, $endsAt) {
                    $sq->where('starts_at', '<', $endsAt)
                       ->where('ends_at', '>', $startsAt);
                });
            })
            ->exists();

        if ($coachConflict) {
            return response()->json(['message' => 'Vous enseignez déjà un autre cours sur ce créneau horaire.'], 422);
        }

        // 3. Check Room Schedule overlaps
        $roomConflict = Course::where('room_id', $request->room_id)
            ->where('status', 'active')
            ->where(function ($q) use ($startsAt, $endsAt) {
                $q->where('starts_at', '<', $endsAt)
                   ->where('ends_at', '>', $startsAt);
            })
            ->exists();

        if ($roomConflict) {
            return response()->json(['message' => 'Cette salle est occupée par un autre cours sur ce créneau.'], 422);
        }

        // Get gym_id from room
        $room = Room::findOrFail($request->room_id);

        $course = Course::create([
            'name' => $request->name,
            'coach_id' => $user->id,
            'room_id' => $request->room_id,
            'gym_id' => $room->gym_id,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'max_capacity' => $request->max_capacity,
            'type' => $request->type,
            'description' => $request->description,
            'status' => 'active',
        ]);

        // Trigger notification for adherents of this gym (new course announced)
        $adherents = User::where('gym_id', $room->gym_id)->where('role', 'adherent')->get();
        foreach ($adherents as $adh) {
            Notification::create([
                'user_id' => $adh->id,
                'type' => 'new_course',
                'title' => '📅 Nouveau cours disponible',
                'message' => "Le cours de {$request->type} - '{$request->name}' par Coach {$user->name} est planifié pour le {$startsAt->format('d/m/Y à H:i')}.",
            ]);
        }

        return response()->json([
            'message' => 'Séance créée avec succès.',
            'course' => $course->load('room')
        ], 201);
    }

    /**
     * Edit course details
     */
    public function updateCourse(Request $request, $id)
    {
        $user = $request->user();
        $coach = Coach::where('user_id', $user->id)->firstOrFail();
        $course = Course::where('id', $id)->where('coach_id', $user->id)->firstOrFail();

        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:Crossfit,Yoga,Musculation,Cardio,HIIT,Pilates,Boxing,Fitness',
            'starts_at' => 'required|date|after:now',
            'ends_at' => 'required|date|after:starts_at',
            'max_capacity' => 'required|integer|min:5|max:100',
            'room_id' => 'required|exists:rooms,id',
            'description' => 'nullable|string',
        ]);

        $startsAt = Carbon::parse($request->starts_at);
        $endsAt = Carbon::parse($request->ends_at);
        $dayOfWeekFr = $this->getFrenchDayName($startsAt->format('l'));

        // 1. Check Availability boundaries
        $availability = CoachAvailability::where('coach_id', $coach->id)
            ->where('day_of_week', $dayOfWeekFr)
            ->first();

        if (!$availability || $availability->is_off) {
            return response()->json(['message' => "Vous n'êtes pas disponible le {$dayOfWeekFr}."], 422);
        }

        $courseStartTimeOnly = Carbon::createFromTimeString($startsAt->format('H:i:s'));
        $courseEndTimeOnly = Carbon::createFromTimeString($endsAt->format('H:i:s'));
        $availStartTimeOnly = Carbon::createFromTimeString($availability->start_time);
        $availEndTimeOnly = Carbon::createFromTimeString($availability->end_time);

        if ($courseStartTimeOnly->lt($availStartTimeOnly) || $courseEndTimeOnly->gt($availEndTimeOnly)) {
            return response()->json([
                'message' => "Le cours déborde de votre horaire de disponibilité ({$availability->start_time} - {$availability->end_time})."
            ], 422);
        }

        if ($availability->pause_start && $availability->pause_end) {
            $pauseStartOnly = Carbon::createFromTimeString($availability->pause_start);
            $pauseEndOnly = Carbon::createFromTimeString($availability->pause_end);

            if ($courseStartTimeOnly->lt($pauseEndOnly) && $courseEndTimeOnly->gt($pauseStartOnly)) {
                return response()->json([
                    'message' => "Le cours chevauche votre heure de pause ({$availability->pause_start} - {$availability->pause_end})."
                ], 422);
            }
        }

        // 2. Check Coach Schedule overlaps (exclude current course)
        $coachConflict = Course::where('coach_id', $user->id)
            ->where('id', '!=', $id)
            ->where('status', 'active')
            ->where(function ($q) use ($startsAt, $endsAt) {
                $q->where('starts_at', '<', $endsAt)
                   ->where('ends_at', '>', $startsAt);
            })
            ->exists();

        if ($coachConflict) {
            return response()->json(['message' => 'Vous enseignez déjà un autre cours sur ce créneau horaire.'], 422);
        }

        // 3. Check Room Schedule overlaps (exclude current course)
        $roomConflict = Course::where('room_id', $request->room_id)
            ->where('id', '!=', $id)
            ->where('status', 'active')
            ->where(function ($q) use ($startsAt, $endsAt) {
                $q->where('starts_at', '<', $endsAt)
                   ->where('ends_at', '>', $startsAt);
            })
            ->exists();

        if ($roomConflict) {
            return response()->json(['message' => 'Cette salle est occupée par un autre cours sur ce créneau.'], 422);
        }

        $oldTime = $course->starts_at->format('d/m à H:i');
        
        $course->update([
            'name' => $request->name,
            'room_id' => $request->room_id,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'max_capacity' => $request->max_capacity,
            'type' => $request->type,
            'description' => $request->description,
        ]);

        // Send notification to registered adherents
        $registeredUsers = User::whereHas('reservations', function ($q) use ($id) {
            $q->where('course_id', $id)->where('status', 'confirmed');
        })->get();

        foreach ($registeredUsers as $adh) {
            Notification::create([
                'user_id' => $adh->id,
                'type' => 'coach_change',
                'title' => '⏰ Séance modifiée',
                'message' => "Le cours {$course->name} initialement prévu le {$oldTime} a été décalé au {$startsAt->format('d/m/Y à H:i')}.",
            ]);
        }

        return response()->json([
            'message' => 'Séance mise à jour avec succès.',
            'course' => $course->load('room')
        ]);
    }

    /**
     * Cancel course session (4 hours policy limit check)
     */
    public function cancelCourse(Request $request, $id)
    {
        $user = $request->user();
        $course = Course::where('id', $id)->where('coach_id', $user->id)->firstOrFail();

        if ($course->status === 'cancelled') {
            return response()->json(['message' => 'Ce cours est déjà annulé.'], 400);
        }

        $startsAt = Carbon::parse($course->starts_at);
        $now = Carbon::now();

        // 4 hours policy limit check
        if ($now->diffInHours($startsAt, false) < 4) {
            return response()->json([
                'message' => "Annulation impossible : vous devez annuler la séance au moins 4 heures à l'avance. (Prévu le : " . $startsAt->format('d/m/Y à H:i') . ")"
            ], 400);
        }

        $request->validate([
            'reason' => 'required|string|max:255'
        ]);

        DB::transaction(function () use ($course, $request, $user) {
            $course->update([
                'status' => 'cancelled',
                'cancellation_reason' => $request->reason,
                'current_reservations' => 0
            ]);

            // Cancel all reservations
            $reservations = Reservation::where('course_id', $course->id)
                ->where('status', 'confirmed')
                ->get();

            foreach ($reservations as $res) {
                $res->update(['status' => 'cancelled']);

                // Notify adherent
                Notification::create([
                    'user_id' => $res->user_id,
                    'type' => 'weekly_recap', // maps to red flag in UI
                    'title' => '❌ Séance Annulée',
                    'message' => "Le cours de {$course->type} - '{$course->name}' du " . $course->starts_at->format('d/m à H:i') . " a été annulé par Coach {$user->name}. Motif : {$request->reason}",
                ]);
            }

            // Create system Alert for gym Admin
            Alert::create([
                'type' => 'danger',
                'message' => "🚨 Séance annulée par Coach {$user->name} : '{$course->name}' du " . $course->starts_at->format('d/m/Y à H:i') . ". Motif : {$request->reason}",
                'room_id' => $course->room_id,
                'is_read' => false,
            ]);
        });

        return response()->json(['message' => 'La séance a été annulée avec succès, les participants et les administrateurs ont été notifiés.']);
    }

    /**
     * Create Fitness Challenge (XP / badges)
     */
    public function createChallenge(Request $request)
    {
        $user = $request->user();
        $coach = Coach::where('user_id', $user->id)->firstOrFail();

        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'duration_days' => 'required|integer|min:7|max:180',
            'xp_reward' => 'required|integer|min:50|max:1000',
            'badge_reward' => 'nullable|string|in:first_session,streak_5,streak_10,gold_member',
        ]);

        $challenge = Challenge::create([
            'coach_id' => $coach->id,
            'gym_id' => $user->gym_id,
            'title' => $request->title,
            'description' => $request->description,
            'duration_days' => $request->duration_days,
            'xp_reward' => $request->xp_reward,
            'badge_reward' => $request->badge_reward,
            'status' => 'active',
        ]);

        // Notify adherents in the gym
        $members = User::where('gym_id', $user->gym_id)->where('role', 'adherent')->get();
        foreach ($members as $m) {
            Notification::create([
                'user_id' => $m->id,
                'type' => 'badge_unlocked',
                'title' => '🏆 Nouveau Challenge disponible !',
                'message' => "Le challenge '{$request->title}' par Coach {$user->name} vient de commencer dans votre salle ! Inscrivez-vous et gagnez +{$request->xp_reward} XP.",
            ]);
        }

        return response()->json([
            'message' => 'Challenge créé avec succès !',
            'challenge' => $challenge
        ], 201);
    }

    /**
     * Helper to map English day of week to French
     */
    private function getFrenchDayName(string $engDay): string
    {
        $days = [
            'Monday' => 'Lundi',
            'Tuesday' => 'Mardi',
            'Wednesday' => 'Mercredi',
            'Thursday' => 'Jeudi',
            'Friday' => 'Vendredi',
            'Saturday' => 'Samedi',
            'Sunday' => 'Dimanche',
        ];
        return $days[$engDay] ?? $engDay;
    }

    /**
     * List challenges for members
     */
    public function listChallengesForMembers(Request $request)
    {
        $user = $request->user();
        
        $challenges = Challenge::where('gym_id', $user->gym_id)
            ->with(['coach.user:id,name'])
            ->withCount('participants')
            ->get()
            ->map(function ($c) use ($user) {
                $isJoined = ChallengeParticipant::where('challenge_id', $c->id)
                    ->where('user_id', $user->id)
                    ->exists();

                return [
                    'id' => $c->id,
                    'title' => $c->title,
                    'description' => $c->description,
                    'duration_days' => $c->duration_days,
                    'xp_reward' => $c->xp_reward,
                    'badge_reward' => $c->badge_reward,
                    'status' => $c->status,
                    'coach_name' => $c->coach?->user?->name,
                    'participants_count' => $c->participants_count,
                    'is_joined' => $isJoined,
                ];
            });

        return response()->json($challenges);
    }

    /**
     * List all coaches with details for members
     */
    public function listCoachesForMembers(Request $request)
    {
        $user = $request->user();
        
        // Return coaches in the same gym preferably, but load all gyms for multi-gym exploration
        $coaches = Coach::with(['user:id,name,email,phone,avatar,gym_id', 'specialties', 'user.gym:id,name'])
            ->get()
            ->map(function ($c) {
                return [
                    'id' => $c->id,
                    'user_id' => $c->user_id,
                    'name' => $c->user?->name,
                    'email' => $c->user?->email,
                    'phone' => $c->user?->phone,
                    'avatar' => $c->user?->avatar,
                    'gym_id' => $c->user?->gym_id,
                    'gym_name' => $c->user?->gym?->name,
                    'bio' => $c->bio,
                    'experience' => $c->experience,
                    'popularity_score' => $c->popularity_score,
                    'satisfaction_score' => $c->satisfaction_score,
                    'online_status' => $c->online_status,
                    'specialties' => $c->specialties->pluck('specialty'),
                ];
            });

        return response()->json($coaches);
    }

    /**
     * Get single coach profile details, reviews, availability, and upcoming sessions
     */
    public function showCoachForMembers(Request $request, $id)
    {
        $coach = Coach::where('id', $id)
            ->orWhere('user_id', $id)
            ->with(['user:id,name,email,phone,avatar,gym_id', 'specialties', 'availabilities', 'user.gym:id,name'])
            ->firstOrFail();

        // 1. Get recent reviews
        $reviews = CoachReview::where('coach_id', $coach->id)
            ->with('user:id,name,avatar')
            ->latest()
            ->take(10)
            ->get()
            ->map(fn($r) => [
                'id' => $r->id,
                'rating' => $r->rating,
                'comment' => $r->comment,
                'user_name' => $r->user?->name,
                'user_avatar' => $r->user?->avatar,
                'created_at' => $r->created_at->format('d/m/Y'),
            ]);

        // 2. Get upcoming courses coached by this coach (next 14 days)
        $courses = Course::where('coach_id', $coach->user_id)
            ->where('starts_at', '>=', now())
            ->where('starts_at', '<=', now()->addDays(14))
            ->where('status', 'active')
            ->orderBy('starts_at')
            ->get();

        return response()->json([
            'id' => $coach->id,
            'user_id' => $coach->user_id,
            'name' => $coach->user?->name,
            'email' => $coach->user?->email,
            'phone' => $coach->user?->phone,
            'avatar' => $coach->user?->avatar,
            'gym_id' => $coach->user?->gym_id,
            'gym_name' => $coach->user?->gym?->name,
            'bio' => $coach->bio,
            'experience' => $coach->experience,
            'popularity_score' => $coach->popularity_score,
            'satisfaction_score' => $coach->satisfaction_score,
            'online_status' => $coach->online_status,
            'specialties' => $coach->specialties->pluck('specialty'),
            'availabilities' => $coach->availabilities,
            'reviews' => $reviews,
            'courses' => $courses,
        ]);
    }

    /**
     * Submit rating/review for coach
     */
    public function submitReview(Request $request, $id)
    {
        $user = $request->user();
        
        $coach = Coach::where('id', $id)
            ->orWhere('user_id', $id)
            ->firstOrFail();

        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        // Create or update review
        $review = CoachReview::updateOrCreate(
            ['coach_id' => $coach->id, 'user_id' => $user->id],
            ['rating' => $request->rating, 'comment' => $request->comment]
        );

        // Recalculate average satisfaction score
        $avg = CoachReview::where('coach_id', $coach->id)->avg('rating');
        $coach->update(['satisfaction_score' => round($avg ?? 5.0, 1)]);

        return response()->json([
            'message' => 'Merci pour votre avis ! Note enregistrée.',
            'review' => $review,
            'satisfaction_score' => $coach->satisfaction_score
        ]);
    }

    /**
     * Join fitness challenge
     */
    public function joinChallenge(Request $request, $id)
    {
        $user = $request->user();
        $challenge = Challenge::findOrFail($id);

        if ($challenge->status !== 'active') {
            return response()->json(['message' => 'Ce challenge est déjà terminé.'], 400);
        }

        $participant = ChallengeParticipant::firstOrCreate(
            ['challenge_id' => $challenge->id, 'user_id' => $user->id],
            ['progress' => 0, 'status' => 'in_progress']
        );

        return response()->json([
            'message' => 'Vous avez rejoint le challenge avec succès ! Bon entraînement.',
            'participant' => $participant
        ]);
    }
}
