#!/usr/bin/env bash
set -euo pipefail

DUMP_FILE="${1:-}"
if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
  echo "Usage: $0 /path/to/planning_previsionnel_YYYY-MM-DD.dump" >&2
  exit 1
fi

: "${DATABASE_URL:?DATABASE_URL is required}"

# WARNING: This will overwrite data.
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$DATABASE_URL" "$DUMP_FILE"

echo "Restore done: $DUMP_FILE"
