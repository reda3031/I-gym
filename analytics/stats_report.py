#!/usr/bin/env python3
"""
I-Gym — Rapport Statistiques Analytics
Calcul : taux occupation, top coachs, renouvellements
Export JSON dans storage/reports/
Usage : python3 stats_report.py
"""

import json
import os
import sys
from datetime import datetime, date

try:
    import mysql.connector
except ImportError:
    print("ERREUR: pip install mysql-connector-python")
    sys.exit(1)

DB_CONFIG = {
    'host':     os.getenv('DB_HOST',     '127.0.0.1'),
    'port':     int(os.getenv('DB_PORT', '3306')),
    'database': os.getenv('DB_DATABASE', 'igym'),
    'user':     os.getenv('DB_USERNAME', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
}


def generate_report() -> dict:
    conn   = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    # Taux d'occupation par salle
    cursor.execute("""
        SELECT r.name, r.capacity, r.current_count,
               ROUND((r.current_count / r.capacity) * 100, 1) as occupancy_rate,
               COUNT(al.id) as total_sessions_month
        FROM rooms r
        LEFT JOIN attendance_logs al
            ON al.room_id = r.id AND MONTH(al.checked_in_at) = MONTH(NOW())
        GROUP BY r.id
        ORDER BY occupancy_rate DESC
    """)
    rooms_stats = cursor.fetchall()

    # Top 5 coachs par nombre de cours
    cursor.execute("""
        SELECT u.name as coach_name,
               COUNT(c.id) as total_courses,
               SUM(c.current_reservations) as total_students
        FROM users u
        JOIN courses c ON c.coach_id = u.id
        WHERE u.role = 'coach'
        GROUP BY u.id
        ORDER BY total_courses DESC
        LIMIT 5
    """)
    top_coaches = cursor.fetchall()

    # Taux renouvellement abonnements
    cursor.execute("""
        SELECT
            COUNT(*) as total_subscriptions,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM subscriptions
    """)
    sub_stats = cursor.fetchone()

    # Séances par jour (7 derniers jours)
    cursor.execute("""
        SELECT DATE(checked_in_at) as day, COUNT(*) as count
        FROM attendance_logs
        WHERE checked_in_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(checked_in_at)
        ORDER BY day
    """)
    daily_sessions = cursor.fetchall()

    cursor.close()
    conn.close()

    report = {
        'generated_at':   datetime.now().isoformat(),
        'rooms_stats':    rooms_stats,
        'top_coaches':    top_coaches,
        'subscriptions':  sub_stats,
        'daily_sessions': [
            {'day': str(r['day']), 'count': r['count']}
            for r in daily_sessions
        ],
    }

    return report


if __name__ == '__main__':
    output_dir = os.getenv('REPORT_DIR', '../backend/storage/reports')
    os.makedirs(output_dir, exist_ok=True)

    today       = date.today().strftime('%Y-%m-%d')
    output_path = os.path.join(output_dir, f'report_{today}.json')

    try:
        report = generate_report()
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2, default=str)
        print(f"✅ Rapport généré : {output_path}")
    except Exception as e:
        print(f"ERREUR : {e}", file=sys.stderr)
        sys.exit(1)
