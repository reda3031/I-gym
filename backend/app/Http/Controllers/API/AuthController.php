<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Gym;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Connexion utilisateur — retourne token Sanctum
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants sont incorrects.'],
            ]);
        }

        // Supprimer les anciens tokens
        $user->tokens()->delete();

        $token = $user->createToken('igym-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $this->formatUser($user),
        ]);
    }

    /**
     * Inscription d'un nouvel adhérent
     */
    public function register(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
            'email'      => 'required|string|email|max:255|unique:users',
            'password'   => 'required|string|min:6',
            'age'        => 'required|integer|min:1|max:120',
            'weight'     => 'nullable|numeric|min:1',
            'height'     => 'nullable|numeric|min:1',
            'gender'     => 'nullable|string|in:homme,femme,autre',
            'gym_id'     => 'required|exists:gyms,id',
            'plan'       => 'required|string|in:mensuel,annuel',
            'language_preference' => 'nullable|string|in:fr,en,ar,es,de',
        ]);

        $gym = Gym::findOrFail($request->gym_id);

        $user = User::create([
            'name'                => trim($request->first_name . ' ' . $request->last_name),
            'email'               => $request->email,
            'password'            => Hash::make($request->password),
            'age'                 => $request->age,
            'weight'              => $request->weight,
            'height'              => $request->height,
            'gender'              => $request->gender,
            'role'                => 'adherent',
            'level'               => 'bronze',
            'streak_days'         => 0,
            'total_sessions'      => 0,
            'qr_token'            => bin2hex(random_bytes(16)),
            'gym_id'              => $gym->id,
            'language_preference' => $request->language_preference ?? 'fr',
        ]);

        // Get plan configuration details
        $planType = $request->plan;
        $price = $planType === 'annuel' ? $gym->price_yearly : $gym->price_monthly;

        // Create pending subscription
        $user->subscriptions()->create([
            'gym_id'     => $gym->id,
            'plan'       => $planType,
            'price'      => $price,
            'start_date' => now(),
            'end_date'   => $planType === 'annuel' ? now()->addYear() : now()->addMonth(),
            'status'     => 'pending',
        ]);

        // Send real-time notification in database to all admins of this gym
        $admins = User::where('gym_id', $gym->id)->where('role', 'admin')->get();
        foreach ($admins as $admin) {
            \App\Models\Notification::create([
                'user_id' => $admin->id,
                'type' => 'new_member_pending',
                'title' => 'Nouveau membre en attente',
                'message' => "Nouveau membre inscrit ({$user->name}) en attente de paiement pour la formule " . ($planType === 'annuel' ? 'Annuelle' : 'Mensuelle') . ".",
                'is_read' => false,
                'action_url' => '/admin/subscriptions',
            ]);
        }

        $token = $user->createToken('igym-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $this->formatUser($user->load('gym')),
        ], 201);
    }

    /**
     * Déconnexion — révocation du token courant
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté avec succès.']);
    }

    /**
     * Retourner le profil de l'utilisateur authentifié
     */
    public function me(Request $request)
    {
        $user = $request->user()->load(['badges', 'objectives', 'gym']);

        $user->checkUpcomingExpirations();

        $sub = $user->subscriptions()->latest()->first();

        return response()->json([
            'id'                  => $user->id,
            'name'                => $user->name,
            'email'               => $user->email,
            'role'                => $user->role,
            'phone'               => $user->phone,
            'avatar'              => $user->avatar,
            'age'                 => $user->age,
            'weight'              => $user->weight,
            'height'              => $user->height,
            'gender'              => $user->gender,
            'streak_days'         => $user->streak_days,
            'total_sessions'      => $user->total_sessions,
            'level'               => $user->level,
            'objective_type'      => $user->objective_type,
            'qr_token'            => $user->qr_token,
            'gym_id'              => $user->gym_id,
            'language_preference' => $user->language_preference ?? 'fr',
            'gym'                 => $user->gym ? [
                'id'            => $user->gym->id,
                'name'          => $user->gym->name,
                'logo'          => $user->gym->logo,
                'color'         => $user->gym->color,
                'city'          => $user->gym->city,
                'speciality'    => $user->gym->speciality,
                'price_monthly' => $user->gym->price_monthly,
                'price_yearly'  => $user->gym->price_yearly,
                'currency'      => $user->gym->currency,
                'address'       => $user->gym->address,
                'phone'         => $user->gym->phone,
                'advantages'    => $user->gym->advantages,
            ] : null,
            'subscription'        => $sub ? [
                'plan'           => $sub->plan,
                'price'          => $sub->price,
                'end_date'       => $sub->end_date ? $sub->end_date->format('Y-m-d') : null,
                'status'         => $sub->status,
                'days_remaining' => $sub->days_remaining,
            ] : null,
            'subscription_status' => $user->getSubscriptionStatus(),
            'badges'              => $user->badges->map(fn($b) => [
                'type'      => $b->badge_type,
                'label'     => \App\Models\Badge::getLabel($b->badge_type),
                'earned_at' => $b->earned_at,
            ]),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'current_password' => 'nullable|string|min:8',
            'new_password' => 'nullable|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
            'age' => 'nullable|integer|min:10|max:100',
            'weight' => 'nullable|numeric|min:30|max:300',
            'height' => 'nullable|numeric|min:100|max:250',
            'gender' => 'nullable|string|in:homme,femme',
            'objective_type' => 'nullable|string',
            'language_preference' => 'nullable|string|in:fr,en,ar,es,de',
            'avatar' => 'nullable|string',
        ]);

        if (!empty($validated['new_password'])) {
            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json(['message' => 'Mot de passe actuel incorrect.'], 400);
            }
            $user->password = Hash::make($validated['new_password']);
        }

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        if (array_key_exists('phone', $validated)) $user->phone = $validated['phone'];
        if (array_key_exists('age', $validated)) $user->age = $validated['age'];
        if (array_key_exists('weight', $validated)) $user->weight = $validated['weight'];
        if (array_key_exists('height', $validated)) $user->height = $validated['height'];
        if (array_key_exists('gender', $validated)) $user->gender = $validated['gender'];
        if (array_key_exists('objective_type', $validated)) $user->objective_type = $validated['objective_type'];
        if (array_key_exists('language_preference', $validated)) $user->language_preference = $validated['language_preference'];

        if ($request->exists('avatar')) {
            $avatar = $request->input('avatar');
            if (empty($avatar)) {
                $user->avatar = null;
            } elseif ($avatar !== $user->avatar) {
                if (preg_match('/^data:image\/(\w+);base64,/', $avatar, $type)) {
                    $data = substr($avatar, strpos($avatar, ',') + 1);
                    $type = strtolower($type[1]);

                    if (in_array($type, ['jpg', 'jpeg', 'gif', 'png', 'webp'])) {
                        $data = base64_decode($data);
                        if ($data !== false) {
                            $fileName = 'avatar_' . uniqid() . '.' . $type;
                            \Illuminate\Support\Facades\Storage::disk('public')->put('avatars/' . $fileName, $data);
                            $user->avatar = asset('storage/avatars/' . $fileName);
                        }
                    }
                } else {
                    $user->avatar = $avatar;
                }
            }
        }

        $user->save();

        return response()->json([
            'message' => 'Profil mis à jour avec succès.',
            'user' => $this->formatUser($user)
        ]);
    }

    public function getAvatar(\Illuminate\Http\Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->avatar) {
            return response()->json(['error' => 'No avatar found'], 404);
        }

        $avatarUrl = $user->avatar;

        if (strpos($avatarUrl, 'data:image') === 0) {
            $data = explode(',', $avatarUrl);
            if (count($data) > 1) {
                $type = explode(';', explode(':', $data[0])[1])[0];
                return response(base64_decode($data[1]), 200)->header('Content-Type', $type);
            }
        }

        $storageUrl = asset('storage/');
        $path = str_replace($storageUrl, '', $avatarUrl);
        $path = ltrim($path, '/');

        if (\Illuminate\Support\Facades\Storage::disk('public')->exists($path)) {
            $file = \Illuminate\Support\Facades\Storage::disk('public')->get($path);
            $type = \Illuminate\Support\Facades\Storage::disk('public')->mimeType($path);
            return response($file, 200)->header('Content-Type', $type);
        }

        return response()->json(['error' => 'File not found on storage'], 404);
    }

    // ─── Helper interne ──────────────────────────────────────────────────────

    private function formatUser(User $user): array
    {
        $user->loadMissing('gym');
        return [
            'id'                  => $user->id,
            'name'                => $user->name,
            'email'               => $user->email,
            'role'                => $user->role,
            'phone'               => $user->phone,
            'avatar'              => $user->avatar,
            'age'                 => $user->age,
            'weight'              => $user->weight,
            'height'              => $user->height,
            'gender'              => $user->gender,
            'streak_days'         => $user->streak_days,
            'total_sessions'      => $user->total_sessions,
            'level'               => $user->level,
            'objective_type'      => $user->objective_type,
            'qr_token'            => $user->qr_token,
            'gym_id'              => $user->gym_id,
            'language_preference' => $user->language_preference ?? 'fr',
            'gym'                 => $user->gym ? [
                'id'         => $user->gym->id,
                'name'       => $user->gym->name,
                'logo'       => $user->gym->logo,
                'color'      => $user->gym->color,
                'city'       => $user->gym->city,
                'speciality' => $user->gym->speciality,
            ] : null,
        ];
    }
}
