<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckActiveSubscription
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Only enforce for adherents (members)
        if ($user && $user->isAdherent()) {
            // Whitelisted paths that a user can access even without an active subscription
            $whitelistedPaths = [
                'v1/me',
                'v1/logout',
                'v1/user/profile',
                'v1/notifications',
            ];

            $currentPath = $request->path();
            $isWhitelisted = false;

            foreach ($whitelistedPaths as $path) {
                if (str_contains($currentPath, $path)) {
                    $isWhitelisted = true;
                    break;
                }
            }

            if (!$isWhitelisted && !$user->hasActiveSubscription()) {
                return response()->json([
                    'message' => 'Votre abonnement est inactif, expiré ou en attente de validation.',
                    'code' => 'subscription_inactive',
                    'subscription_status' => $user->getSubscriptionStatus(),
                ], 403);
            }
        }

        return $next($request);
    }
}
