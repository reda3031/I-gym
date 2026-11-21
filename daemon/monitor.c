/*
 * I-Gym Monitor Daemon — Service C de surveillance surfrequentation
 * Connexion MySQL via libmysqlclient avec configuration dynamique par variables d'environnement
 * Boucle continue interruptible (SIGTERM/SIGINT) — detecte occupation > seuil (defaut: 80%)
 * Compilation : gcc -o igym_monitor monitor.c -lmysqlclient -lpthread
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <signal.h>
#include <time.h>
#include <mysql/mysql.h>

/* ── Valeurs par defaut sures ─────────────────────────────────────────── */
#define DEFAULT_DB_HOST         "127.0.0.1"
#define DEFAULT_DB_PORT         3306
#define DEFAULT_DB_NAME         "igym"
#define DEFAULT_DB_USER         "root"
#define DEFAULT_LOG_FILE        "/tmp/igym_monitor.log"
#define DEFAULT_SLEEP_SEC       60
#define DEFAULT_ALERT_THRESHOLD 0.80

/* ── Flag d'arrêt propre (SIGTERM/SIGINT) ─────────────────────────────── */
static volatile int keep_running = 1;

void handle_signal(int sig)
{
    (void)sig;
    keep_running = 0;
}

/* ── Helpers de lecture des variables d'environnement ─────────────────── */
static const char *get_env_str(const char *name, const char *alt_name, const char *def_val)
{
    const char *val = getenv(name);
    if (val && *val) return val;
    if (alt_name) {
        val = getenv(alt_name);
        if (val && *val) return val;
    }
    return def_val;
}

static unsigned int get_env_port(const char *name, unsigned int def_port)
{
    const char *val = getenv(name);
    if (val && *val) {
        int p = atoi(val);
        if (p > 0) return (unsigned int)p;
    }
    return def_port;
}

static double get_env_double(const char *name, double def_val)
{
    const char *val = getenv(name);
    if (val && *val) {
        double d = atof(val);
        if (d > 0.0 && d <= 1.0) return d;
    }
    return def_val;
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

/* ── Connexion MySQL dynamique ────────────────────────────────────────── */
MYSQL *db_connect(void)
{
    const char   *host = get_env_str("DB_HOST", NULL, DEFAULT_DB_HOST);
    unsigned int  port = get_env_port("DB_PORT", DEFAULT_DB_PORT);
    const char   *name = get_env_str("DB_DATABASE", "DB_NAME", DEFAULT_DB_NAME);
    const char   *user = get_env_str("DB_USERNAME", "DB_USER", DEFAULT_DB_USER);
    const char   *pass = get_env_str("DB_PASSWORD", "DB_PASS", "");

    MYSQL *conn = mysql_init(NULL);
    if (!conn)
        return NULL;

    if (!mysql_real_connect(conn, host, user, pass, name, port, NULL, 0)) {
        mysql_close(conn);
        return NULL;
    }
    return conn;
}

/* ── Vérification occupation salles ────────────────────────────────────── */
void check_rooms(MYSQL *conn, FILE *log_fp, double alert_threshold)
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
        if (rate > alert_threshold) {
            int percent = (int)(rate * 100);

            snprintf(log_buf, sizeof(log_buf),
                     "ALERTE: %s est a %d%% de capacite (%d/%d)",
                     room_name, percent, current_count, capacity);
            log_message(log_fp, "ALERT", log_buf);

            /* Vérifier qu'une alerte non lue n'existe pas déjà sur les 30 dernières minutes */
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
    char         log_buf[256];
    const char  *log_file   = get_env_str("LOG_FILE", "IGYM_LOG_FILE", DEFAULT_LOG_FILE);
    unsigned int sleep_sec  = get_env_port("SLEEP_SEC", DEFAULT_SLEEP_SEC);
    double       threshold  = get_env_double("ALERT_THRESHOLD", DEFAULT_ALERT_THRESHOLD);

    /* Gestion signaux pour arrêt propre */
    signal(SIGTERM, handle_signal);
    signal(SIGINT,  handle_signal);

    /* Ouvrir le fichier de log */
    FILE *log_fp = fopen(log_file, "a");
    if (!log_fp) {
        fprintf(stderr, "Impossible d'ouvrir %s\n", log_file);
        return EXIT_FAILURE;
    }

    log_message(log_fp, "INFO", "=== I-Gym Monitor Daemon demarre ===");
    snprintf(log_buf, sizeof(log_buf),
             "Seuil alerte: %.0f%% | Intervalle: %us | Log: %s",
             threshold * 100.0, sleep_sec, log_file);
    log_message(log_fp, "INFO", log_buf);

    /* Boucle principale */
    while (keep_running) {
        MYSQL *conn = db_connect();

        if (!conn) {
            log_message(log_fp, "ERROR", "Connexion MySQL echouee — nouvelle tentative...");
        } else {
            log_message(log_fp, "INFO", "Verification des salles...");
            check_rooms(conn, log_fp, threshold);
            mysql_close(conn);
        }

        /* Attendre sleep_sec secondes (interruptible par signal) */
        for (unsigned int i = 0; i < sleep_sec && keep_running; i++)
            sleep(1);
    }

    log_message(log_fp, "INFO", "=== I-Gym Monitor Daemon arrete proprement ===");
    fclose(log_fp);

    return EXIT_SUCCESS;
}
