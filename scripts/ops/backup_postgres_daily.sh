#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/planning_previsionnel/postgres"
DATE="$(date +%F)"
FILE="$BACKUP_DIR/planning_previsionnel_${DATE}.dump"

mkdir -p "$BACKUP_DIR"

pg_dump --format=custom --file "$FILE" "${DATABASE_URL:?DATABASE_URL is required}"

find "$BACKUP_DIR" -type f -name "planning_previsionnel_*.dump" -mtime +14 -delete
