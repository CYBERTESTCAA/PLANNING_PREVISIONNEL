#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/planning_previsionnel}"

PREV="$(ls -1dt "$DEPLOY_PATH/releases"/* | sed -n '2p')"
if [ -z "${PREV:-}" ]; then
  echo "No previous release found" >&2
  exit 1
fi

ln -sfn "$PREV" "$DEPLOY_PATH/current"

sudo systemctl restart planning-api.service
sudo systemctl reload nginx || true

echo "Rolled back to: $PREV"
