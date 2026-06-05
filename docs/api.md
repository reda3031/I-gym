# I-Gym — Documentation API

Base URL : `http://localhost:8000/api/v1`

Toutes les routes protégées nécessitent : `Authorization: Bearer {token}`

---

## Auth

### POST /login
**Body :** `{ email, password }`
**Réponse :** `{ token, user: { id, name, role, qr_token, ... } }`

### POST /logout *(auth)*
**Réponse :** `{ message }`

### GET /me *(auth)*
**Réponse :** Profil complet avec subscription, badges

---

## Présence QR Code

### POST /attendance/check-in *(auth)*
**Body :** `{ qr_token }`
**Réponse :**
```json
{
  "status": "granted|denied",
  "user_name": "Ahmed Benali",
  "subscription_status": "active|expired",
  "streak_days": 5,
  "message": "✅ Accès Accordé — Bienvenue Ahmed !"
}
```

### POST /attendance/check-out *(auth)*
**Réponse :** `{ message }`

### GET /attendance/weekly-summary/{userId} *(auth)*
**Réponse :** `{ sessions_this_week, weekly_goal, progress_percentage, message, next_reservation }`

---

## Salles

### GET /rooms/occupancy *(auth)*
**Réponse :**
```json
[{
  "id": 1, "name": "Salle Cardio",
  "capacity": 20, "current_count": 18,
  "occupancy_rate": 90.0, "status": "high"
}]
```

### GET /rooms/{id}/hourly-stats *(auth)*
**Réponse :** `{ room, stats: [{ hour, count }] }`

---

## Cours & Réservations

### GET /courses *(auth)*
**Params :** `?date=YYYY-MM-DD&type=Cardio`
**Réponse :** Liste cours avec `spots_remaining`, `color`, `is_full`

### POST /reservations *(auth)*
**Body :** `{ course_id }`
**Réponse 201 :** `{ message, reservation }`
**Erreurs :** 422 si complet ou déjà réservé

### DELETE /reservations/{id} *(auth)*
**Réponse :** `{ message }`

### GET /reservations/mine *(auth)*
**Réponse :** Mes réservations confirmées avec cours

---

## Notifications

### GET /notifications *(auth)*
**Réponse :** `{ notifications: [...], unread_count: 3 }`

### PATCH /notifications/{id}/read *(auth)*
### PATCH /notifications/read-all *(auth)*

---

## Leaderboard

### GET /leaderboard *(auth)*
**Params :** `?period=week|month|all`
**Réponse :**
```json
{
  "period": "week",
  "leaderboard": [{
    "rank": 1, "medal": "🥇",
    "name": "Nadia Chraibi",
    "sessions_count": 6,
    "streak_days": 7,
    "level": "platinum",
    "is_me": false
  }],
  "my_rank": 2
}
```

---

## Gamification

### GET /users/{id}/achievements *(auth)*
**Réponse :** `{ streak_days, total_sessions, level, next_level, progress_to_next, badges }`

---

## Recommandations

### POST /recommendations *(auth)*
**Body :** `{ objective_type: "perte_de_poids|prise_de_masse|endurance|flexibilite" }`
**Réponse :** `{ objective, rule: { types, frequency, days, tip }, courses: [...] }`

---

## PDF Programme

### GET /training/generate-pdf/{userId} *(auth)*
**Réponse :** `{ message, download_url, filename }`

---

## Admin

### GET /admin/kpis *(auth)*
**Réponse :** `{ active_members, courses_today, unread_alerts, monthly_revenue, reservations_per_day }`

### GET /admin/alerts *(auth)*
**Réponse :** Liste alertes démon C

### PATCH /admin/alerts/{id}/read *(auth)*

### GET /admin/recent-members *(auth)*

---

## Codes HTTP

| Code | Signification |
|------|--------------|
| 200  | Succès |
| 201  | Ressource créée |
| 401  | Non authentifié |
| 403  | Accès interdit (rôle insuffisant) |
| 422  | Validation échouée |
| 500  | Erreur serveur |
