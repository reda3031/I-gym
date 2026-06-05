/*
 * I-Gym Monitor Daemon — Service C de surveillance surfrequentation
 * Connexion MySQL via libmysqlclient
 * Boucle infinie sleep(60) — detecte occupation > 80%
 * Compilation : gcc -o igym_monitor monitor.c -lmysqlclient -lpthread
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <signal.h>
#include <time.h>
#include <mysql/mysql.h>

/* ── Configuration ────────────────────────────────────────────────────── */
#define DB_HOST     "127.0.0.1"
#define DB_PORT     3306
#define DB_NAME     "igym"
#define DB_USER     "root"
#define DB_PASS     ""
#define LOG_FILE    "/tmp/igym_monitor.log"
#define SLEEP_SEC   60
#define ALERT_THRESHOLD 0.80

/* ── Flag d'arrêt propre (SIGTERM/SIGINT) ─────────────────────────────── */
static volatile int keep_running = 1;

void handle_signal(int sig)
{
    (void)sig;
    keep_running = 0;
}

/* ── Écriture dans le log avec timestamp ──────────────────────────────── */
void log_message(FILE *log_fp, const char *level, const char *msg)
{
    time_t     now = time(NULL);
    struct tm *tm  = localtime(&now);
    char       ts[32];

    strftime(ts, sizeof(ts), "%Y-%m-%d %H:%M:%S", tm);
    fprintf(log_fp, "[%s] [%s] %s\n", ts, level, msg);
    fflush(log_fp);
}

/* ── Connexion MySQL ──────────────────────────────────────────────────── */
MYSQL *db_connect(void)
{
    MYSQL *conn = mysql_init(NULL);
    if (!conn)
        return NULL;

    if (!mysql_real_connect(conn, DB_HOST, DB_USER, DB_PASS,
                            DB_NAME, DB_PORT, NULL, 0)) {
        mysql_close(conn);
        return NULL;
    }
    return conn;
}

/* ── Vérification occupation salles ────────────────────────────────────── */
void check_rooms(MYSQL *conn, FILE *log_fp)
{
    const char *query = "SELECT id, name, current_count, capacity FROM rooms";
    char        insert_buf[512];
    char        log_buf[256];

    if (mysql_query(conn, query)) {
        log_message(log_fp, "ERROR", "Echec requete SELECT rooms");
        return;
    }

    MYSQL_RES *res = mysql_store_result(conn);
    if (!res)
        return;

    MYSQL_ROW row;
    while ((row = mysql_fetch_row(res)) != NULL) {
        int    room_id       = atoi(row[0]);
        char  *room_name     = row[1];
        int    current_count = atoi(row[2]);
        int    capacity      = atoi(row[3]);

        if (capacity <= 0)
            continue;

        double rate = (double)current_count / (double)capacity;

        /* Seuil dépassé : insérer une alerte */
        if (rate > ALERT_THRESHOLD) {
            int percent = (int)(rate * 100);

            snprintf(log_buf, sizeof(log_buf),
                     "ALERTE: %s est a %d%% de capacite (%d/%d)",
                     room_name, percent, current_count, capacity);
            log_message(log_fp, "ALERT", log_buf);

            /* Vérifier qu'une alerte non lue n'existe pas déjà */
            snprintf(insert_buf, sizeof(insert_buf),
                "INSERT INTO alerts (type, message, room_id, is_read, created_at, updated_at) "
                "SELECT 'surfrequentation', "
                "'%s est a %d%% de sa capacite (%d/%d personnes)', "
                "%d, 0, NOW(), NOW() "
                "WHERE NOT EXISTS ("
                "  SELECT 1 FROM alerts "
                "  WHERE room_id = %d AND is_read = 0 "
                "  AND created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)"
                ")",
                room_name, percent, current_count, capacity, room_id, room_id);

            if (mysql_query(conn, insert_buf)) {
                snprintf(log_buf, sizeof(log_buf),
                         "Erreur INSERT alerte pour salle %d: %s",
                         room_id, mysql_error(conn));
                log_message(log_fp, "ERROR", log_buf);
            } else {
                log_message(log_fp, "INFO", "Alerte inseree en base de donnees");
            }
        }
    }

    mysql_free_result(res);
}

/* ── Point d'entrée ───────────────────────────────────────────────────── */
int main(void)
{
    char log_buf[256];

    /* Gestion signaux pour arrêt propre */
    signal(SIGTERM, handle_signal);
    signal(SIGINT,  handle_signal);

    /* Ouvrir le fichier de log */
    FILE *log_fp = fopen(LOG_FILE, "a");
    if (!log_fp) {
        fprintf(stderr, "Impossible d'ouvrir %s\n", LOG_FILE);
        return EXIT_FAILURE;
    }

    log_message(log_fp, "INFO", "=== I-Gym Monitor Daemon demarre ===");
    snprintf(log_buf, sizeof(log_buf),
             "Seuil alerte: %.0f%% | Intervalle: %ds",
             ALERT_THRESHOLD * 100, SLEEP_SEC);
    log_message(log_fp, "INFO", log_buf);

    /* Boucle principale */
    while (keep_running) {
        MYSQL *conn = db_connect();

        if (!conn) {
            log_message(log_fp, "ERROR", "Connexion MySQL echouee — nouvelle tentative dans 60s");
        } else {
            log_message(log_fp, "INFO", "Verification des salles...");
            check_rooms(conn, log_fp);
            mysql_close(conn);
        }

        /* Attendre SLEEP_SEC secondes (interruptible par signal) */
        for (int i = 0; i < SLEEP_SEC && keep_running; i++)
            sleep(1);
    }

    log_message(log_fp, "INFO", "=== I-Gym Monitor Daemon arrete proprement ===");
    fclose(log_fp);

    return EXIT_SUCCESS;
}
