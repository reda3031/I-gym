# I-Gym — Guide Démon C

## Compilation

```bash
cd daemon

# macOS (Homebrew MySQL)
brew install mysql-client
export LIBRARY_PATH="$(brew --prefix mysql-client)/lib:$LIBRARY_PATH"
export CPATH="$(brew --prefix mysql-client)/include:$CPATH"

gcc -o igym_monitor monitor.c \
    -I$(brew --prefix mysql-client)/include/mysql \
    -L$(brew --prefix mysql-client)/lib \
    -lmysqlclient -lpthread

# Linux Ubuntu/Debian
sudo apt-get install libmysqlclient-dev
make

# Vérifier la compilation
./igym_monitor --help 2>/dev/null || echo "Binaire compilé"
```

## Lancement Manuel

```bash
# Lancer en arrière-plan
./igym_monitor &

# Vérifier les logs
tail -f /tmp/igym_monitor.log

# Arrêt propre (SIGTERM)
kill -TERM $(pgrep igym_monitor)
```

## Installation systemd (Linux uniquement)

```bash
# Copier le binaire
sudo cp igym_monitor /usr/local/bin/

# Copier le service
sudo cp igym.service /etc/systemd/system/

# Activer et démarrer
sudo systemctl daemon-reload
sudo systemctl enable igym
sudo systemctl start igym

# Statut
sudo systemctl status igym
journalctl -u igym -f
```

## Fonctionnement

Le démon surveille toutes les salles toutes les 60 secondes :
- Si `current_count / capacity > 80%` → INSERT dans `alerts`
- Anti-doublon : pas d'alerte si une alerte non lue < 30 min existe déjà
- Logs dans `/tmp/igym_monitor.log` (ou `/var/log/igym_monitor.log` en prod)
- Arrêt propre sur SIGTERM/SIGINT (Ctrl+C)

## Variables d'environnement

Modifiez directement les constantes dans `monitor.c` :
```c
#define DB_HOST  "127.0.0.1"
#define DB_NAME  "igym"
#define DB_USER  "root"
#define DB_PASS  "votre_mot_de_passe"
```

## Lecture des alertes depuis Laravel

```bash
# Voir les alertes générées
GET /api/v1/admin/alerts
```
