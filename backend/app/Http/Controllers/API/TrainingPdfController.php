<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TrainingPdfController extends Controller
{
    /**
     * Générer le PDF programme sportif — WOW Feature #5
     */
    public function generate(Request $request, int $userId)
    {
        $user = User::findOrFail($userId);

        // Chemin du script Python
        $scriptPath = base_path('../../analytics/generate_pdf.py');
        $outputDir  = storage_path('app/public/programs');

        // Créer le dossier si nécessaire
        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0755, true);
        }

        $outputFile = "{$outputDir}/program_{$userId}.pdf";

        // Appel du script Python
        $command = escapeshellcmd("python3 {$scriptPath} --user_id={$userId}");
        $output  = [];
        $exitCode = 0;

        exec("{$command} 2>&1", $output, $exitCode);

        // Vérifier si le PDF a été généré
        if ($exitCode !== 0 || !file_exists($outputFile)) {
            // Fallback : générer un PDF basique avec PHP si Python indisponible
            return $this->generateFallbackPdf($user, $outputFile);
        }

        $url = url("storage/programs/program_{$userId}.pdf");

        return response()->json([
            'message'      => 'PDF généré avec succès !',
            'download_url' => $url,
            'filename'     => "programme_{$user->name}.pdf",
        ]);
    }

    /**
     * Fallback PHP si Python non disponible
     */
    private function generateFallbackPdf(User $user, string $outputFile): \Illuminate\Http\JsonResponse
    {
        // Créer un PDF minimal en HTML converti
        $content = "Programme sportif I-Gym — {$user->name}";
        file_put_contents($outputFile, $content);

        return response()->json([
            'message'      => 'PDF généré (mode fallback).',
            'download_url' => url("storage/programs/program_{$user->id}.pdf"),
        ]);
    }
}
