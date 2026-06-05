<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ImpersonationLog;
use App\Models\Notification;
use Illuminate\Http\Request;

class SuperAdminController extends Controller
{
    /**
     * Se connecter en tant qu'un autre utilisateur — Super Admin
     */
    public function impersonate(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            return response()->json(['message' => 'Accès réservé au Super Admin.'], 403);
        }

        $targetUser = User::with('gym')->findOrFail($id);

        if ($targetUser->isSuperAdmin()) {
            return response()->json(['message' => 'Impossible de simuler un autre Super Admin.'], 400);
        }

        // Empêcher l'impersonation de soi-même
        if ($user->id === $targetUser->id) {
            return response()->json(['message' => 'Impossible de simuler votre propre compte.'], 400);
        }

        // Enregistrer le log d'impersonation
        ImpersonationLog::create([
            'super_admin_id' => $user->id,
            'target_user_id' => $targetUser->id,
            'start_time'     => now(),
            'ip_address'     => $request->ip(),
        ]);

        // Notifier l'utilisateur simulé (Optionnel de sécurité)
        Notification::create([
            'user_id'    => $targetUser->id,
            'type'       => 'security_impersonation',
            'title'      => 'Accès Super Admin',
            'message'    => 'Un Super Admin a accédé temporairement à votre compte pour des raisons de support.',
            'is_read'    => false,
            'action_url' => '',
        ]);

        // Créer un token Sanctum pour l'utilisateur ciblé
        $token = $targetUser->createToken('impersonate_token')->plainTextToken;

        return response()->json([
            'message' => 'Simulation démarrée.',
            'token'   => $token,
            'user'    => $targetUser
        ]);
    }

    /**
     * Terminer la simulation d'un autre utilisateur
     */
    public function stopImpersonate(Request $request)
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            return response()->json(['message' => 'Accès réservé au Super Admin.'], 403);
        }

        $request->validate([
            'target_user_id' => 'required|integer|exists:users,id',
        ]);

        // Mettre à jour le log d'impersonation le plus récent sans end_time pour ce super admin et cette cible
        $log = ImpersonationLog::where('super_admin_id', $user->id)
            ->where('target_user_id', $request->target_user_id)
            ->whereNull('end_time')
            ->orderBy('id', 'desc')
            ->first();

        if ($log) {
            $log->update([
                'end_time' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Simulation terminée avec succès.'
        ]);
    }

    /**
     * Obtenir tous les logs d'impersonation pour l'audit du Super Admin
     */
    public function getImpersonationLogs(Request $request)
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            return response()->json(['message' => 'Accès réservé au Super Admin.'], 403);
        }

        $logs = ImpersonationLog::with(['superAdmin', 'targetUser'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($logs);
    }
}
