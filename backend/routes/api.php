<?php

use App\Http\Controllers\API\AchievementController;
use App\Http\Controllers\API\AdminController;
use App\Http\Controllers\API\AttendanceController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\GymController;
use App\Http\Controllers\API\LeaderboardController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\RecommendationController;
use App\Http\Controllers\API\ReservationController;
use App\Http\Controllers\API\RoomController;
use App\Http\Controllers\API\TrainingPdfController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| I-Gym API Routes — Version 1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // ─── Gyms (routes publiques) ───────────────────────────────────────────
    Route::get('/gyms',          [GymController::class, 'index']);
    Route::get('/gyms/{id}',     [GymController::class, 'show']);

    // ─── Auth (public) ────────────────────────────────────────────────────
    Route::post('/login',    [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);

    // ─── Routes protégées par Sanctum ─────────────────────────────────────
    Route::middleware(['auth:sanctum', 'subscription.active'])->group(function () {

        // Auth
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me',      [AuthController::class, 'me']);
        Route::put('/user/profile', [AuthController::class, 'updateProfile']);
        Route::get('/user/avatar',  [AuthController::class, 'getAvatar']);

        // Gyms (statistiques — protégé)
        Route::get('/gyms/{id}/stats', [GymController::class, 'stats']);
        Route::get('/super-admin/gyms', [GymController::class, 'superAdminDashboard']);
        Route::post('/super-admin/gyms', [GymController::class, 'store']);
        Route::put('/super-admin/gyms/{id}', [GymController::class, 'updateGym']);
        Route::get('/super-admin/users', [GymController::class, 'superAdminUsers']);
        Route::get('/super-admin/all-coaches', [GymController::class, 'getAllCoachesAndAdmins']);
        Route::post('/super-admin/impersonate/{id}', [\App\Http\Controllers\API\SuperAdminController::class, 'impersonate']);
        Route::post('/super-admin/stop-impersonate', [\App\Http\Controllers\API\SuperAdminController::class, 'stopImpersonate']);
        Route::get('/super-admin/impersonation-logs', [\App\Http\Controllers\API\SuperAdminController::class, 'getImpersonationLogs']);

        // ── Présence QR Code ────────────────────────────────────────────
        Route::post('/attendance/check-in',               [AttendanceController::class, 'checkIn']);
        Route::post('/attendance/check-out',              [AttendanceController::class, 'checkOut']);
        Route::get('/attendance/weekly-summary/{userId}', [AttendanceController::class, 'weeklySummary']);

        // ── Salles ──────────────────────────────────────────────────────
        Route::get('/rooms',                   [RoomController::class, 'index']);
        Route::get('/rooms/occupancy',         [RoomController::class, 'occupancy']);
        Route::get('/rooms/{id}/hourly-stats', [RoomController::class, 'hourlyStats']);

        // ── Cours & Réservations ────────────────────────────────────────
        Route::get('/courses',              [ReservationController::class, 'courses']);
        Route::get('/reservations/mine',    [ReservationController::class, 'myReservations']);
        Route::post('/reservations',        [ReservationController::class, 'store']);
        Route::delete('/reservations/{id}', [ReservationController::class, 'destroy']);

        // ── Notifications ───────────────────────────────────────────────
        Route::get('/notifications',             [NotificationController::class, 'index']);
        Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
        Route::patch('/notifications/read-all',  [NotificationController::class, 'markAllRead']);

        // ── Leaderboard ─────────────────────────────────────────────────
        Route::get('/leaderboard', [LeaderboardController::class, 'index']);
        Route::get('/leaderboard/streak', [LeaderboardController::class, 'streakLeaderboard']);

        // ── Achievements / Gamification ─────────────────────────────────
        Route::get('/users/{id}/achievements', [AchievementController::class, 'index']);

        // ── Recommandations IA ──────────────────────────────────────────
        Route::post('/recommendations', [RecommendationController::class, 'recommend']);

        // ── PDF Programme ────────────────────────────────────────────────
        Route::get('/training/generate-pdf/{userId}', [TrainingPdfController::class, 'generate']);

        // ── Coach Routes ────────────────────────────────────────────────
        Route::prefix('coach')->group(function () {
            Route::get('/dashboard',          [\App\Http\Controllers\API\CoachController::class, 'dashboard']);
            Route::put('/availabilities',     [\App\Http\Controllers\API\CoachController::class, 'updateAvailabilities']);
            Route::post('/status',            [\App\Http\Controllers\API\CoachController::class, 'toggleStatus']);
            Route::post('/courses',           [\App\Http\Controllers\API\CoachController::class, 'createCourse']);
            Route::put('/courses/{id}',       [\App\Http\Controllers\API\CoachController::class, 'updateCourse']);
            Route::post('/courses/{id}/cancel',[\App\Http\Controllers\API\CoachController::class, 'cancelCourse']);
            Route::post('/challenges',        [\App\Http\Controllers\API\CoachController::class, 'createChallenge']);
        });

        // ── Member Coach/Challenge Routes ────────────────────────────────
        Route::get('/members/coaches',          [\App\Http\Controllers\API\CoachController::class, 'listCoachesForMembers']);
        Route::get('/members/coaches/{id}',      [\App\Http\Controllers\API\CoachController::class, 'showCoachForMembers']);
        Route::post('/members/coaches/{id}/reviews', [\App\Http\Controllers\API\CoachController::class, 'submitReview']);
        Route::get('/members/challenges',        [\App\Http\Controllers\API\CoachController::class, 'listChallengesForMembers']);
        Route::post('/members/challenges/{id}/join', [\App\Http\Controllers\API\CoachController::class, 'joinChallenge']);

        // ── Admin ────────────────────────────────────────────────────────
        Route::prefix('admin')->group(function () {
            // Dashboard KPIs
            Route::get('/kpis',               [AdminController::class, 'kpis']);
            Route::get('/alerts',             [AdminController::class, 'alerts']);
            Route::patch('/alerts/{id}/read', [AdminController::class, 'markAlertRead']);
            Route::get('/recent-members',     [AdminController::class, 'recentMembers']);

            // Subscriptions management
            Route::get('/subscriptions',                  [AdminController::class, 'subscriptions']);
            Route::get('/subscriptions/stats',            [AdminController::class, 'subscriptionStats']);
            Route::post('/subscriptions/{id}/validate',   [AdminController::class, 'validateSubscriptionPayment']);
            Route::post('/subscriptions/{id}/suspend',    [AdminController::class, 'suspendSubscription']);
            Route::post('/subscriptions/{id}/renew',      [AdminController::class, 'renewSubscription']);

            // Gym management
            Route::get('/gym', [AdminController::class, 'getGym']);
            Route::put('/gym', [AdminController::class, 'updateGym']);

            // Coaches
            Route::get('/coaches', [AdminController::class, 'coaches']);
            Route::post('/coaches', [AdminController::class, 'storeCoach']);
            Route::put('/coaches/{id}', [AdminController::class, 'updateCoach']);
            Route::delete('/coaches/{id}', [AdminController::class, 'deleteCoach']);

            // Members
            Route::get('/members', [AdminController::class, 'members']);

            // Courses CRUD
            Route::get('/courses',         [AdminController::class, 'listCourses']);
            Route::post('/courses',        [AdminController::class, 'createCourse']);
            Route::put('/courses/{id}',    [AdminController::class, 'updateCourse']);
            Route::delete('/courses/{id}', [AdminController::class, 'deleteCourse']);

            // Reservations live
            Route::get('/reservations', [AdminController::class, 'reservations']);

            // Heatmap fréquentation
            Route::get('/heatmap', [AdminController::class, 'heatmap']);
        });
    });
});
