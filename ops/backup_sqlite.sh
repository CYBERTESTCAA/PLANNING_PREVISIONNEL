#!/usr/bin/env bash
# ─── SQLite Online Backup ─────────────────────────────────────────────────────
# Usage: ./ops/backup_sqlite.sh
# Runs nightly via cron: 0 2 * * * /path/to/ops/backup_sqlite.sh
#
# Uses SQLite's .backup command (safe while the app is running - WAL mode).
# Keeps 30 days of backups. Logs result to ops/backup.log.

set -euo pipefail

DB_FILE="${DB_FILE:-$(dirname "$0")/../api/planning.sqlite}"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
LOG_FILE="$(dirname "$0")/backup.log"
DATE=$(date +%Y-%m-%d)
DEST="$BACKUP_DIR/planning_$DATE.sqlite"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup → $DEST" | tee -a "$LOG_FILE"

# sqlite3 .backup is incremental-safe with WAL
sqlite3 "$DB_FILE" ".backup '$DEST'"

SIZE=$(du -sh "$DEST" | cut -f1)
echo "[$(date -Iseconds)] Backup OK — $SIZE written to $DEST" | tee -a "$LOG_FILE"

# ─── Retention: supprimer les backups > 30 jours ─────────────────────────────
find "$BACKUP_DIR" -name "planning_*.sqlite" -mtime +30 -delete
echo "[$(date -Iseconds)] Old backups (>30d) purged." | tee -a "$LOG_FILE"
