# I-Gym — Guide Scripts Python Analytics

## Installation

```bash
cd analytics
pip3 install -r requirements.txt
```

## Variables d'environnement MySQL

```bash
export DB_HOST=127.0.0.1
export DB_PORT=3306
export DB_DATABASE=igym
export DB_USERNAME=root
export DB_PASSWORD=votre_mot_de_passe
```

## Génération PDF Programme Sportif

```bash
# Générer le PDF pour l'adhérent ID=3 (Ahmed)
python3 generate_pdf.py --user_id=3

# Avec dossier de sortie personnalisé
python3 generate_pdf.py --user_id=3 --output_dir=/tmp/igym_pdfs

# Le PDF est sauvegardé dans :
# backend/storage/app/public/programs/program_{userId}.pdf
# Accessible via : http://localhost:8000/storage/programs/program_3.pdf
```

## Génération Rapport Statistiques

```bash
# Générer le rapport du jour
python3 stats_report.py

# Le rapport JSON est sauvegardé dans :
# backend/storage/reports/report_YYYY-MM-DD.json
```

## Structure du PDF (3 pages)

### Page 1 — Profil
- Nom, Email, Téléphone
- Objectif principal
- Niveau (Bronze/Argent/Or/Platine)
- Abonnement et date d'expiration
- Statistiques : Streak, Total séances, Badges

### Page 2 — Programme
- Planning hebdomadaire (7 jours)
- Cours recommandés avec horaires et coach
- Conseils personnalisés selon l'objectif

### Page 3 — Historique
- 10 dernières séances (date, entrée, sortie, salle)
- Récapitulatif statistiques
- Message motivationnel du coach

## Intégration avec Laravel

Le controller `TrainingPdfController` appelle Python :
```php
exec("python3 analytics/generate_pdf.py --user_id={$userId}");
```

Si Python n'est pas disponible, un fallback PHP minimal est utilisé.

## Appel via Artisan (stats)

```bash
# Créer la commande Artisan (optionnel)
php artisan make:command GenerateReport

# Contenu de la commande
exec("python3 " . base_path("../../analytics/stats_report.py"));
```
