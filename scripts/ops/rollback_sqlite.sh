#!/usr/bin/env bash
# ─── SQLite Rollback J-1 ──────────────────────────────────────────────────────
# Usage: ./ops/rollback_sqlite.sh [YYYY-MM-DD]
# Exemple: ./ops/rollback_sqlite.sh 2026-02-17
#
# ⚠️  Arrête le service API, remplace le fichier SQLite, relance le service.

set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-planning-api}"
DB_FILE="${DB_FILE:-$(dirname "$0")/../api/planning.sqlite}"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
LOG_FILE="$(dirname "$0")/backup.log"

# ─── Résoudre la date cible ───────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  TARGET_DATE="$1"
else
  TARGET_DATE=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)
fi

BACKUP_FILE="$BACKUP_DIR/planning_$TARGET_DATE.sqlite"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌  Backup introuvable: $BACKUP_FILE"
  echo "    Backups disponibles:"
  ls "$BACKUP_DIR"/planning_*.sqlite 2>/dev/null || echo "    (aucun)"
  exit 1
fi

echo "[$(date -Iseconds)] 🔄  Rollback vers $TARGET_DATE" | tee -a "$LOG_FILE"

# ─── Arrêter le service ───────────────────────────────────────────────────────
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  systemctl stop "$SERVICE_NAME"
  echo "[$(date -Iseconds)] Service '$SERVICE_NAME' arrêté." | tee -a "$LOG_FILE"
fi

# ─── Sauvegarder l'état courant avant rollback ───────────────────────────────
EMERGENCY_BACKUP="$BACKUP_DIR/planning_pre-rollback_$(date +%Y-%m-%dT%H%M%S).sqlite"
cp "$DB_FILE" "$EMERGENCY_BACKUP" 2>/dev/null && \
  echo "[$(date -Iseconds)] État courant sauvegardé → $EMERGENCY_BACKUP" | tee -a "$LOG_FILE" || true

# ─── Remplacer la base ────────────────────────────────────────────────────────
cp "$BACKUP_FILE" "$DB_FILE"
echo "[$(date -Iseconds)] ✅  Base restaurée depuis $BACKUP_FILE" | tee -a "$LOG_FILE"

# ─── Redémarrer le service ────────────────────────────────────────────────────
if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
  systemctl start "$SERVICE_NAME"
  echo "[$(date -Iseconds)] Service '$SERVICE_NAME' redémarré." | tee -a "$LOG_FILE"
fi

echo "[$(date -Iseconds)] Rollback terminé." | tee -a "$LOG_FILE"
