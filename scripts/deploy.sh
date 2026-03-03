#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# deploy.sh — Script de déploiement / mise à jour automatique
# Usage:  ./scripts/deploy.sh          (pull + rebuild + restart)
#         ./scripts/deploy.sh --init   (premier déploiement)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/opt/planning"
REPO_URL="https://github.com/CYBERTESTCAA/PLANNING_PREVISIONNEL.git"
BRANCH="main"
LOG_FILE="/var/log/planning-deploy.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# ── Premier déploiement ─────────────────────────────────────────────────────
if [ "${1:-}" = "--init" ]; then
  log "=== INITIALISATION ==="

  # Cloner le repo
  if [ ! -d "$APP_DIR/.git" ]; then
    log "Clonage du repo..."
    sudo mkdir -p "$APP_DIR"
    sudo chown "$USER:$USER" "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
  fi

  cd "$APP_DIR"

  # Copier les fichiers d'environnement depuis les exemples
  if [ ! -f api/.env ]; then
    cp api/.env.example api/.env
    log "⚠️  api/.env créé depuis l'exemple — EDITEZ-LE avec vos secrets !"
    log "   nano $APP_DIR/api/.env"
  fi

  log "Initialisation terminée. Editez api/.env puis relancez: ./scripts/deploy.sh"
  exit 0
fi

# ── Mise à jour standard ────────────────────────────────────────────────────
cd "$APP_DIR"
log "=== MISE À JOUR ==="

# Pull les derniers changements
log "Git pull..."
git fetch origin "$BRANCH"
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  log "Déjà à jour (${LOCAL:0:8}). Rien à faire."
  exit 0
fi

log "Nouvelle version détectée: ${LOCAL:0:8} → ${REMOTE:0:8}"
git reset --hard "origin/$BRANCH"

# Rebuild et redémarrage via Docker Compose
log "Rebuild des conteneurs..."
docker compose build --no-cache
log "Redémarrage..."
docker compose down
docker compose up -d

# Nettoyage des anciennes images Docker
docker image prune -f >> "$LOG_FILE" 2>&1

log "✅ Déploiement terminé — version $(git rev-parse --short HEAD)"
log "   Application accessible sur http://192.168.13.51"
