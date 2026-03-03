#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# backup.sh — Sauvegarde quotidienne de la base SQLite
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_DIR="/var/backups/planning"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="planning-api"

mkdir -p "$BACKUP_DIR"

# Copier la base SQLite depuis le volume Docker
docker cp "$CONTAINER":/data/planning.sqlite "$BACKUP_DIR/planning_${DATE}.sqlite"

# Compresser
gzip "$BACKUP_DIR/planning_${DATE}.sqlite"

# Garder seulement les 30 dernières sauvegardes
ls -t "$BACKUP_DIR"/planning_*.sqlite.gz 2>/dev/null | tail -n +31 | xargs -r rm

echo "[$(date)] Backup terminé: planning_${DATE}.sqlite.gz"
