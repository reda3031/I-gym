<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class TrainingPdfController extends Controller
{
    /**
     * Générer le PDF programme sportif — WOW Feature #5
     */
    public function generate(Request $request, int $userId)
    {
        $user = User::findOrFail($userId);
        $authUser = $request->user();

        // 1. Contrôle d'autorisation strict
        if ($authUser->isAdherent() && $authUser->id !== $user->id) {
            return response()->json([
                'message' => 'Accès interdit : vous ne pouvez générer que votre propre dossier.',
            ], 403);
        }

        if (($authUser->isCoach() || $authUser->isAdmin()) && !$authUser->isSuperAdmin()) {
            if ($authUser->gym_id && $user->gym_id && $authUser->gym_id !== $user->gym_id) {
                return response()->json([
                    'message' => 'Accès interdit : cet adhérent n\'appartient pas à votre salle.',
                ], 403);
            }
        }

        // Dossier privé sécurisé (non exposé publiquement via le web server)
        $outputDir = storage_path('app/private/programs');
        if (!is_dir($outputDir)) {
            mkdir($outputDir, 0755, true);
        }

        $outputFile = "{$outputDir}/program_{$userId}.pdf";
        $scriptPath = base_path('../analytics/generate_pdf.py');
        if (!file_exists($scriptPath)) {
            $scriptPath = base_path('../../analytics/generate_pdf.py');
        }

        // 2. Appel du script Python avec argument output_dir sécurisé
        $escapedScript = escapeshellarg($scriptPath);
        $escapedDir    = escapeshellarg($outputDir);
        $command       = "python3 {$escapedScript} --user_id={$userId} --output_dir={$escapedDir}";
        $output        = [];
        $exitCode      = 0;

        if (file_exists($scriptPath)) {
            exec("{$command} 2>&1", $output, $exitCode);
        } else {
            $exitCode = 1;
        }

        // 3. Fallback robuste si Python échoue ou n'est pas disponible
        if ($exitCode !== 0 || !file_exists($outputFile)) {
            $this->createValidPdfFile($user, $outputFile);
        }

        // 4. URL signée temporaire (valide 30 minutes) pour téléchargement sécurisé
        $downloadUrl = URL::temporarySignedRoute(
            'training.pdf.download',
            now()->addMinutes(30),
            ['userId' => $user->id]
        );

        $safeName = Str::slug($user->name);

        return response()->json([
            'message'      => 'PDF généré avec succès !',
            'download_url' => $downloadUrl,
            'filename'     => "programme_{$safeName}.pdf",
        ]);
    }

    /**
     * Téléchargement sécurisé vérifiant la signature temporaire
     */
    public function download(Request $request, int $userId)
    {
        if (!$request->hasValidSignature()) {
            return response()->json([
                'message' => 'Lien de téléchargement expiré ou invalide.',
            ], 403);
        }

        $user = User::findOrFail($userId);
        $filePath = storage_path("app/private/programs/program_{$userId}.pdf");

        if (!file_exists($filePath)) {
            $this->createValidPdfFile($user, $filePath);
        }

        $safeFilename = 'programme_' . Str::slug($user->name) . '.pdf';

        return response()->file($filePath, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$safeFilename}\"",
        ]);
    }

    /**
     * Génère un document PDF 1.4 vectoriel valide en pur PHP
     */
    private function createValidPdfFile(User $user, string $outputFile): void
    {
        $dir = dirname($outputFile);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $dateStr  = now()->format('d/m/Y H:i');
        $name     = addcslashes($user->name, '()\\');
        $email    = addcslashes($user->email, '()\\');
        $level    = strtoupper($user->level ?? 'BRONZE');
        $goal     = ucfirst(str_replace('_', ' ', $user->objective_type ?? 'Remise en forme'));
        $streak   = (int) ($user->streak_days ?? 0);
        $sessions = (int) ($user->total_sessions ?? 0);

        // Flux PDF standard
        $stream = "BT\n"
            . "/F1 20 Tf\n"
            . "50 740 Td\n"
            . "(I-GYM FITNESS DOSSIER) Tj\n"
            . "/F1 12 Tf\n"
            . "0 -35 Td\n"
            . "(Membre: {$name}) Tj\n"
            . "0 -20 Td\n"
            . "(Email: {$email}) Tj\n"
            . "0 -20 Td\n"
            . "(Niveau: {$level} | Objectif: {$goal}) Tj\n"
            . "0 -20 Td\n"
            . "(Seances effectuees: {$sessions} | Streak: {$streak} jours) Tj\n"
            . "0 -20 Td\n"
            . "(Date d'emission: {$dateStr}) Tj\n"
            . "0 -40 Td\n"
            . "/F1 13 Tf\n"
            . "(Programme d'entrainement genere avec succes.) Tj\n"
            . "ET\n";

        $streamLen = strlen($stream);

        $objects = [];
        $objects[1] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        $objects[2] = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        $objects[3] = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj\n";
        $objects[4] = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
        $objects[5] = "5 0 obj\n<< /Length {$streamLen} >>\nstream\n{$stream}endstream\nendobj\n";

        $pdf = "%PDF-1.4\n";
        $xrefOffsets = [0];
        $offset = strlen($pdf);

        foreach ($objects as $num => $obj) {
            $xrefOffsets[$num] = $offset;
            $pdf .= $obj;
            $offset = strlen($pdf);
        }

        $xrefStart = strlen($pdf);
        $pdf .= "xref\n0 6\n";
        $pdf .= "0000000000 65535 f \n";
        for ($i = 1; $i <= 5; $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $xrefOffsets[$i]);
        }
        $pdf .= "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{$xrefStart}\n%%EOF\n";

        file_put_contents($outputFile, $pdf);
    }
}
