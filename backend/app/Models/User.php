<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role', 'phone', 'avatar',
        'objective_type', 'streak_days', 'total_sessions', 'level',
        'qr_token', 'last_session_date', 'age', 'weight', 'height', 'gender',
        'gym_id', 'language_preference',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_session_date' => 'date',
        'password' => 'hashed',
    ];

    // Relations
    public function coachProfile()
    {
        return $this->hasOne(Coach::class, 'user_id');
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription()
    {
        return $this->hasOne(Subscription::class)->where('status', 'active')->latest();
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    public function attendanceLogs()
    {
        return $this->hasMany(AttendanceLog::class);
    }

    public function objectives()
    {
        return $this->hasMany(Objective::class);
    }

    public function badges()
    {
        return $this->hasMany(Badge::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function coursesCoached()
    {
        return $this->hasMany(Course::class, 'coach_id');
    }

    public function trainingSheets()
    {
        return $this->hasMany(TrainingSheet::class, 'adherent_id');
    }

    public function gym()
    {
        return $this->belongsTo(Gym::class);
    }

    // Helpers
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isCoach(): bool
    {
        return $this->role === 'coach';
    }

    public function isAdherent(): bool
    {
        return $this->role === 'adherent';
    }

    public function hasActiveSubscription(): bool
    {
        $activeSub = $this->subscriptions()
            ->where('status', 'active')
            ->latest('end_date')
            ->first();

        if (!$activeSub) {
            return false;
        }

        if ($activeSub->end_date->lt(now()->startOfDay())) {
            $activeSub->update(['status' => 'expired']);

            // Decrement member count in gym
            if ($this->gym && $this->gym->member_count > 0) {
                $this->gym->decrement('member_count');
            }

            // Create notification
            \App\Models\Notification::create([
                'user_id' => $this->id,
                'type' => 'subscription_expired',
                'title' => 'Abonnement Expiré',
                'message' => 'Votre abonnement a expiré. Veuillez renouveler votre accès auprès de votre salle.',
                'is_read' => false,
                'action_url' => '/adherent',
            ]);

            return false;
        }

        return true;
    }

    public function getSubscriptionStatus(): string
    {
        $sub = $this->subscriptions()->latest()->first();

        if (!$sub) return 'expired';
        
        if ($sub->status === 'pending') {
            return 'pending';
        }
        
        if ($sub->status === 'suspended') {
            return 'suspended';
        }
        
        if ($sub->status === 'active' && $sub->end_date->lt(now()->startOfDay())) {
            return 'expired';
        }
        
        if ($sub->status === 'active') {
            $daysRemaining = (int) now()->diffInDays($sub->end_date, false);
            if ($daysRemaining <= 7 && $daysRemaining >= 0) {
                return 'expiring_soon';
            }
            return 'active';
        }

        return $sub->status;
    }

    public function checkUpcomingExpirations(): void
    {
        $sub = $this->subscriptions()->where('status', 'active')->latest('end_date')->first();
        if (!$sub) return;

        $daysRemaining = (int) now()->diffInDays($sub->end_date, false);
        $today = now()->toDateString();
        
        if (in_array($daysRemaining, [7, 3, 0])) {
            $notificationTitle = 'Expiration de votre abonnement';
            $notificationMessage = '';
            $notificationType = "expiry_warning_{$daysRemaining}d";
            
            if ($daysRemaining === 7) {
                $notificationMessage = "Votre abonnement expire dans 7 jours. Pensez à le renouveler.";
            } elseif ($daysRemaining === 3) {
                $notificationMessage = "Votre abonnement expire dans 3 jours ! Évitez l'interruption de vos services en renouvelant dès maintenant.";
            } elseif ($daysRemaining === 0) {
                $notificationMessage = "Votre abonnement expire aujourd'hui. Veuillez renouveler votre accès auprès de votre salle.";
            }
            
            $alreadySent = \App\Models\Notification::where('user_id', $this->id)
                ->where('type', $notificationType)
                ->whereDate('created_at', $today)
                ->exists();
                
            if (!$alreadySent) {
                \App\Models\Notification::create([
                    'user_id' => $this->id,
                    'type' => $notificationType,
                    'title' => $notificationTitle,
                    'message' => $notificationMessage,
                    'is_read' => false,
                    'action_url' => '/adherent',
                ]);
            }
        }
    }
}
