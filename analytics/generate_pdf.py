#!/usr/bin/env python3
"""
I-Gym — Générateur de PDF Programme Sportif
WOW Feature #5 : Génération PDF 3 pages avec fpdf2 + MySQL
Usage : python3 generate_pdf.py --user_id=5
"""

import argparse
import sys
import os
from datetime import datetime, date

try:
    from fpdf import FPDF
    import mysql.connector
except ImportError:
    print("ERREUR: Installez les dépendances : pip install fpdf2 mysql-connector-python")
    sys.exit(1)

# ── Configuration MySQL ────────────────────────────────────────────────
DB_CONFIG = {
    'host':     os.getenv('DB_HOST',     '127.0.0.1'),
    'port':     int(os.getenv('DB_PORT', '3306')),
    'database': os.getenv('DB_DATABASE', 'igym'),
    'user':     os.getenv('DB_USERNAME', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
}

# ── Palette couleurs I-Gym ─────────────────────────────────────────────
COLOR_BG      = (15, 23, 42)      # #0f172a
COLOR_ACCENT  = (34, 197, 94)     # #22c55e
COLOR_CARD    = (30, 41, 59)      # #1e293b
COLOR_TEXT    = (248, 250, 252)   # #f8fafc
COLOR_MUTED   = (148, 163, 184)   # #94a3b8
COLOR_WARNING = (245, 158, 11)    # #f59e0b


class IGymPDF(FPDF):
    def header(self):
        """En-tête avec logo I-Gym"""
        # Fond sombre
        self.set_fill_color(*COLOR_BG)
        self.rect(0, 0, 210, 30, 'F')

        # Carré vert logo
        self.set_fill_color(*COLOR_ACCENT)
        self.rect(10, 8, 14, 14, 'F')

        # Texte logo
        self.set_xy(26, 11)
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(*COLOR_ACCENT)
        self.cell(0, 6, 'I-GYM', ln=False)

        self.set_xy(26, 18)
        self.set_font('Helvetica', '', 7)
        self.set_text_color(*COLOR_MUTED)
        self.cell(0, 4, 'Plateforme Fitness Nouvelle Generation')

        # Date
        self.set_xy(150, 13)
        self.set_font('Helvetica', '', 9)
        self.set_text_color(*COLOR_MUTED)
        self.cell(50, 6, datetime.now().strftime('%d/%m/%Y'), align='R')

        self.ln(32)

    def footer(self):
        """Pied de page"""
        self.set_y(-15)
        self.set_fill_color(*COLOR_BG)
        self.rect(0, self.get_y() - 2, 210, 20, 'F')
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(*COLOR_MUTED)
        self.cell(0, 10, f'I-Gym © {datetime.now().year} — Page {self.page_no()}', align='C')

    def section_title(self, title, emoji=''):
        """Titre de section stylé"""
        self.set_fill_color(*COLOR_CARD)
        self.rect(10, self.get_y(), 190, 10, 'F')
        # Barre accent gauche
        self.set_fill_color(*COLOR_ACCENT)
        self.rect(10, self.get_y(), 3, 10, 'F')
        self.set_xy(16, self.get_y() + 1)
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(*COLOR_TEXT)
        self.cell(0, 8, f'{emoji}  {title}', ln=True)
        self.ln(4)

    def info_row(self, label, value, value_color=None):
        """Ligne label : valeur"""
        self.set_font('Helvetica', '', 9)
        self.set_text_color(*COLOR_MUTED)
        self.set_x(15)
        self.cell(50, 7, label + ' :')
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(*(value_color or COLOR_TEXT))
        self.cell(0, 7, str(value), ln=True)


def get_user_data(user_id: int) -> dict:
    """Récupérer toutes les données de l'adhérent depuis MySQL"""
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    # Données utilisateur
    cursor.execute("""
        SELECT u.id, u.name, u.email, u.phone, u.objective_type,
               u.streak_days, u.total_sessions, u.level, u.created_at,
               s.plan, s.end_date, s.status as sub_status
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
        WHERE u.id = %s
        LIMIT 1
    """, (user_id,))
    user = cursor.fetchone()

    if not user:
        cursor.close()
        conn.close()
        raise ValueError(f"Utilisateur {user_id} introuvable.")

    # 10 dernières séances
    cursor.execute("""
        SELECT al.checked_in_at, al.checked_out_at, r.name as room_name
        FROM attendance_logs al
        LEFT JOIN rooms r ON r.id = al.room_id
        WHERE al.user_id = %s AND al.status = 'granted'
        ORDER BY al.checked_in_at DESC
        LIMIT 10
    """, (user_id,))
    sessions = cursor.fetchall()

    # Badges
    cursor.execute("""
        SELECT badge_type, earned_at FROM badges WHERE user_id = %s
    """, (user_id,))
    badges = cursor.fetchall()

    # Prochaines réservations
    cursor.execute("""
        SELECT c.name, c.type, c.starts_at, u2.name as coach_name, ro.name as room_name
        FROM reservations r
        JOIN courses c ON c.id = r.course_id
        JOIN users u2 ON u2.id = c.coach_id
        JOIN rooms ro ON ro.id = c.room_id
        WHERE r.user_id = %s AND r.status = 'confirmed' AND c.starts_at > NOW()
        ORDER BY c.starts_at
        LIMIT 7
    """, (user_id,))
    upcoming = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        'user':     user,
        'sessions': sessions,
        'badges':   badges,
        'upcoming': upcoming,
    }


def generate_pdf(user_id: int, output_dir: str) -> str:
    """Générer le PDF 3 pages programme sportif"""
    data    = get_user_data(user_id)
    user    = data['user']
    sessions = data['sessions']
    badges  = data['badges']
    upcoming = data['upcoming']

    pdf = IGymPDF()
    pdf.set_auto_page_break(auto=True, margin=20)

    # ════════════════════════════════════════════════════
    # PAGE 1 : Profil + Objectif + Gamification
    # ════════════════════════════════════════════════════
    pdf.add_page()
    pdf.set_fill_color(*COLOR_BG)
    pdf.rect(0, 0, 210, 297, 'F')

    pdf.section_title('Profil du Membre', '👤')

    objective_labels = {
        'perte_de_poids': 'Perte de Poids',
        'prise_de_masse': 'Prise de Masse',
        'endurance':      'Endurance',
        'flexibilite':    'Flexibilite',
    }

    level_emojis = {
        'bronze': '🥉 Bronze', 'silver': '🥈 Argent',
        'gold': '🥇 Or', 'platinum': '💎 Platine'
    }

    pdf.info_row('Nom',         user['name'])
    pdf.info_row('Email',       user['email'])
    pdf.info_row('Telephone',   user['phone'] or 'Non renseigne')
    pdf.info_row('Objectif',    objective_labels.get(user['objective_type'], 'Non defini'), COLOR_ACCENT)
    pdf.info_row('Niveau',      level_emojis.get(user['level'], user['level']), COLOR_WARNING)
    pdf.info_row('Abonnement',  (user['plan'] or 'Inactif').capitalize())
    if user['end_date']:
        pdf.info_row('Expire le', str(user['end_date']))
    pdf.ln(6)

    # Stats gamification
    pdf.section_title('Statistiques & Gamification', '🏆')

    # Boxes stats
    stats = [
        ('Streak Actuel',    f"{user['streak_days']} jours 🔥",  COLOR_ACCENT),
        ('Total Seances',    f"{user['total_sessions']} seances", COLOR_TEXT),
        ('Badges Debloques', f"{len(badges)} badges 🏅",          COLOR_WARNING),
    ]

    x_start = 15
    for label, value, color in stats:
        pdf.set_fill_color(*COLOR_CARD)
        pdf.rect(x_start, pdf.get_y(), 55, 22, 'F')
        pdf.set_fill_color(*COLOR_ACCENT)
        pdf.rect(x_start, pdf.get_y(), 55, 2, 'F')
        pdf.set_xy(x_start + 2, pdf.get_y() + 4)
        pdf.set_font('Helvetica', '', 8)
        pdf.set_text_color(*COLOR_MUTED)
        pdf.cell(51, 5, label, ln=True)
        pdf.set_x(x_start + 2)
        pdf.set_font('Helvetica', 'B', 10)
        pdf.set_text_color(*color)
        pdf.cell(51, 6, value, ln=True)
        x_start += 65

    pdf.ln(30)

    # Badges liste
    if badges:
        pdf.section_title('Badges Obtenus', '🏅')
        badge_labels = {
            'first_session': '🏋️ Premiere Seance', 'streak_5': '🔥 Streak 5 Jours',
            'streak_10': '🔥 Streak 10 Jours', 'cardio_master': '❤️ Cardio Master',
            'early_bird': '🌅 Leve-Tot', 'monthly_champion': '🏆 Champion du Mois',
        }
        for badge in badges:
            label = badge_labels.get(badge['badge_type'], badge['badge_type'])
            earned = badge['earned_at'].strftime('%d/%m/%Y') if hasattr(badge['earned_at'], 'strftime') else str(badge['earned_at'])
            pdf.info_row(label, f"Obtenu le {earned}", COLOR_ACCENT)

    # ════════════════════════════════════════════════════
    # PAGE 2 : Programme hebdomadaire
    # ════════════════════════════════════════════════════
    pdf.add_page()
    pdf.set_fill_color(*COLOR_BG)
    pdf.rect(0, 0, 210, 297, 'F')

    pdf.section_title('Programme Hebdomadaire Recommande', '📅')

    # Tableau planning
    days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
    col_w = [30, 55, 40, 35, 30]
    headers = ['Jour', 'Cours', 'Salle', 'Horaire', 'Coach']

    # En-tête tableau
    pdf.set_fill_color(*COLOR_ACCENT)
    pdf.set_font('Helvetica', 'B', 9)
    pdf.set_text_color(*COLOR_BG)
    for i, h in enumerate(headers):
        pdf.cell(col_w[i], 8, h, border=0, fill=True, align='C')
    pdf.ln()

    # Lignes planning
    pdf.set_font('Helvetica', '', 8)
    for i, course in enumerate(upcoming[:7]):
        fill = i % 2 == 0
        pdf.set_fill_color(*COLOR_CARD if fill else COLOR_BG)
        pdf.set_text_color(*COLOR_TEXT)

        day_name = course['starts_at'].strftime('%A').capitalize() if hasattr(course['starts_at'], 'strftime') else days[i % 7]
        time_str  = course['starts_at'].strftime('%H:%M') if hasattr(course['starts_at'], 'strftime') else '07:00'

        pdf.cell(col_w[0], 8, day_name, border=0, fill=fill)
        pdf.set_text_color(*COLOR_ACCENT)
        pdf.cell(col_w[1], 8, course['name'][:25], border=0, fill=fill)
        pdf.set_text_color(*COLOR_TEXT)
        pdf.cell(col_w[2], 8, (course.get('room_name') or '')[:18], border=0, fill=fill)
        pdf.cell(col_w[3], 8, time_str, border=0, fill=fill, align='C')
        pdf.cell(col_w[4], 8, (course.get('coach_name') or '')[:15], border=0, fill=fill)
        pdf.ln()

    pdf.ln(8)

    # Conseils par objectif
    pdf.section_title('Conseils Personnalises', '💡')
    tips = {
        'perte_de_poids': [
            '- Combinez cardio et HIIT 3x par semaine',
            '- Maintenez un deficit calorique modere (-300 kcal/j)',
            '- Buvez 2.5L d\'eau par jour',
            '- Dormez 7-8h pour optimiser la recuperation',
        ],
        'prise_de_masse': [
            '- Musculation progressive 4x par semaine',
            '- Apport proteique : 1.6-2g/kg de poids corporel',
            '- Surplus calorique modere (+300 kcal/j)',
            '- Repos suffisant entre les seances (48h par groupe musculaire)',
        ],
        'endurance': [
            '- Augmentez progressivement la duree (+10% par semaine)',
            '- Variez intensite : sorties longues + fractionne',
            '- Hydratation optimale avant/pendant/apres',
            '- Etirez-vous apres chaque seance',
        ],
        'flexibilite': [
            '- Pratiquez le yoga ou pilates 3x par semaine',
            '- Etirez-vous 10 min chaque matin au reveil',
            '- Ne forcez jamais au-dela de votre limite',
            '- La regularite est plus importante que l\'intensite',
        ],
    }

    obj_tips = tips.get(user['objective_type'], tips['endurance'])
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(*COLOR_TEXT)
    for tip in obj_tips:
        pdf.set_x(15)
        pdf.cell(0, 7, tip, ln=True)

    # ════════════════════════════════════════════════════
    # PAGE 3 : Historique + Statistiques
    # ════════════════════════════════════════════════════
    pdf.add_page()
    pdf.set_fill_color(*COLOR_BG)
    pdf.rect(0, 0, 210, 297, 'F')

    pdf.section_title('Historique des 10 Dernieres Seances', '📊')

    # Tableau historique
    col_h = [50, 50, 50, 40]
    h_headers = ['Date', 'Heure entree', 'Heure sortie', 'Salle']

    pdf.set_fill_color(*COLOR_ACCENT)
    pdf.set_font('Helvetica', 'B', 9)
    pdf.set_text_color(*COLOR_BG)
    for i, h in enumerate(h_headers):
        pdf.cell(col_h[i], 8, h, border=0, fill=True, align='C')
    pdf.ln()

    pdf.set_font('Helvetica', '', 8)
    for i, session in enumerate(sessions):
        fill = i % 2 == 0
        pdf.set_fill_color(*COLOR_CARD if fill else COLOR_BG)
        pdf.set_text_color(*COLOR_TEXT)

        checked_in  = session['checked_in_at']
        checked_out = session['checked_out_at']

        date_str  = checked_in.strftime('%d/%m/%Y') if hasattr(checked_in, 'strftime') else str(checked_in)[:10]
        in_str    = checked_in.strftime('%H:%M') if hasattr(checked_in, 'strftime') else '—'
        out_str   = checked_out.strftime('%H:%M') if checked_out and hasattr(checked_out, 'strftime') else '—'
        room_name = session.get('room_name', '—')

        pdf.cell(col_h[0], 8, date_str,   border=0, fill=fill, align='C')
        pdf.set_text_color(*COLOR_ACCENT)
        pdf.cell(col_h[1], 8, in_str,     border=0, fill=fill, align='C')
        pdf.set_text_color(*COLOR_TEXT)
        pdf.cell(col_h[2], 8, out_str,    border=0, fill=fill, align='C')
        pdf.cell(col_h[3], 8, room_name,  border=0, fill=fill, align='C')
        pdf.ln()

    pdf.ln(8)

    # Statistiques récapitulatives
    pdf.section_title('Recapitulatif Statistiques', '📈')

    total = user['total_sessions']
    streak = user['streak_days']
    level_fr = level_emojis.get(user['level'], user['level'])

    pdf.info_row('Total seances effectuees', f"{total} seances", COLOR_ACCENT)
    pdf.info_row('Streak actuel',            f"{streak} jours consecutifs 🔥", COLOR_ACCENT)
    pdf.info_row('Niveau actuel',            level_fr, COLOR_WARNING)
    pdf.info_row('Badges obtenus',           f"{len(badges)} / 9 badges", COLOR_TEXT)
    pdf.info_row('Membre depuis',            user['created_at'].strftime('%d/%m/%Y') if hasattr(user['created_at'], 'strftime') else str(user['created_at'])[:10])
    pdf.ln(8)

    # Message du coach
    pdf.section_title('Message du Coach', '💬')
    messages = {
        'perte_de_poids': "Excellente progression ! Continuez votre programme cardio avec regularite. Chaque seance vous rapproche de votre objectif. La perseverance est la cle du succes !",
        'prise_de_masse': "Votre dedication a la musculation est remarquable ! Augmentez progressivement les charges et assurez-vous de bien recuperer entre les seances.",
        'endurance':      "Votre endurance s'ameliore chaque semaine ! Continuez a progresser graduellement. Vous etes sur la bonne voie pour atteindre vos objectifs !",
        'flexibilite':    "Votre pratique reguliere du yoga et du pilates porte ses fruits ! La flexibilite s'acquiert avec patience et regularite. Bravo !",
    }

    pdf.set_fill_color(*COLOR_CARD)
    pdf.rect(15, pdf.get_y(), 180, 30, 'F')
    pdf.set_fill_color(*COLOR_ACCENT)
    pdf.rect(15, pdf.get_y(), 3, 30, 'F')
    pdf.set_xy(21, pdf.get_y() + 4)
    pdf.set_font('Helvetica', 'I', 9)
    pdf.set_text_color(*COLOR_TEXT)
    msg = messages.get(user['objective_type'], messages['endurance'])
    pdf.multi_cell(172, 6, f'"{msg}"')

    # Sauvegarder
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f'program_{user_id}.pdf')
    pdf.output(output_path)
    print(f"✅ PDF généré : {output_path}")
    return output_path


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='I-Gym PDF Generator')
    parser.add_argument('--user_id', type=int, required=True, help='ID de l\'adhérent')
    parser.add_argument('--output_dir', default='../backend/storage/app/public/programs',
                        help='Dossier de sortie du PDF')
    args = parser.parse_args()

    try:
        path = generate_pdf(args.user_id, args.output_dir)
        print(f"PDF disponible : {path}")
        sys.exit(0)
    except Exception as e:
        print(f"ERREUR : {e}", file=sys.stderr)
        sys.exit(1)
