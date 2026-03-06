#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# deploy.sh — Script de déploiement / mise à jour automatique
# Usage:  ./scripts/deploy.sh              (pull + rebuild + restart)
#         ./scripts/deploy.sh --init       (premier déploiement)
#         ./scripts/deploy.sh --rollback   (revenir à la version précédente)
#         ./scripts/deploy.sh --list       (lister les backups disponibles)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/opt/planning"
REPO_URL="https://github.com/CYBERTESTCAA/PLANNING_PREVISIONNEL.git"
BRANCH="main"
LOG_FILE="/var/log/planning-deploy.log"
BACKUP_TAG_PREFIX="planning-backup"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# Récupère le nom des images du projet (depuis docker-compose.yml)
get_project_images() {
  cd "$APP_DIR"
  docker compose config --images 2>/dev/null || true
}

# ── Lister les backups disponibles ──────────────────────────────────────────
if [ "${1:-}" = "--list" ]; then
  echo "=== Backups Docker disponibles ==="
  docker images --filter "reference=${BACKUP_TAG_PREFIX}*" --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" 2>/dev/null
  echo ""
  echo "=== Commits Git récents ==="
  cd "$APP_DIR" 2>/dev/null && git log --oneline -10
  exit 0
fi

# ── Rollback vers la version précédente ─────────────────────────────────────
if [ "${1:-}" = "--rollback" ]; then
  cd "$APP_DIR"
  log "=== ROLLBACK ==="

  # Trouver le backup le plus récent
  LATEST_BACKUP=$(docker images --filter "reference=${BACKUP_TAG_PREFIX}-app*" --format "{{.Repository}}:{{.Tag}}" | head -1)
  LATEST_BACKUP_API=$(docker images --filter "reference=${BACKUP_TAG_PREFIX}-api*" --format "{{.Repository}}:{{.Tag}}" | head -1)

  if [ -z "$LATEST_BACKUP" ] && [ -z "$LATEST_BACKUP_API" ]; then
    log "❌ Aucun backup trouvé. Impossible de faire un rollback."
    log "   Utilisez --list pour voir les backups disponibles."
    exit 1
  fi

  log "Backups trouvés:"
  [ -n "$LATEST_BACKUP" ] && log "  App: $LATEST_BACKUP"
  [ -n "$LATEST_BACKUP_API" ] && log "  API: $LATEST_BACKUP_API"

  # Récupérer les noms d'images actuels
  APP_IMAGE=$(docker compose config --images 2>/dev/null | grep -v api | head -1 || true)
  API_IMAGE=$(docker compose config --images 2>/dev/null | grep api | head -1 || true)

  # Retagger les backups comme images courantes
  if [ -n "$LATEST_BACKUP" ] && [ -n "$APP_IMAGE" ]; then
    log "Restauration app: $LATEST_BACKUP → $APP_IMAGE"
    docker tag "$LATEST_BACKUP" "$APP_IMAGE"
  fi
  if [ -n "$LATEST_BACKUP_API" ] && [ -n "$API_IMAGE" ]; then
    log "Restauration API: $LATEST_BACKUP_API → $API_IMAGE"
    docker tag "$LATEST_BACKUP_API" "$API_IMAGE"
  fi

  # Rollback Git au commit précédent
  PREV_COMMIT=$(git log --format='%H' -2 | tail -1)
  if [ -n "$PREV_COMMIT" ]; then
    log "Rollback Git: $(git rev-parse --short HEAD) → ${PREV_COMMIT:0:8}"
    git reset --hard "$PREV_COMMIT"
  fi

  # Redémarrage avec les anciennes images
  log "Redémarrage avec les images de backup..."
  docker compose down
  docker compose up -d

  log "✅ Rollback terminé — version $(git rev-parse --short HEAD)"
  log "   Application accessible sur http://192.168.13.51"
  exit 0
fi

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

# ── BACKUP: sauvegarder les images Docker actuelles avant mise à jour ──────
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
COMMIT_SHORT="${LOCAL:0:8}"
log "Sauvegarde des images Docker actuelles (tag: ${COMMIT_SHORT}-${TIMESTAMP})..."

for IMAGE in $(get_project_images); do
  if docker image inspect "$IMAGE" >/dev/null 2>&1; then
    # Déterminer un suffixe (app ou api)
    SUFFIX="app"
    echo "$IMAGE" | grep -qi "api" && SUFFIX="api"
    BACKUP_NAME="${BACKUP_TAG_PREFIX}-${SUFFIX}:${COMMIT_SHORT}-${TIMESTAMP}"
    docker tag "$IMAGE" "$BACKUP_NAME"
    log "  ✓ Backup: $IMAGE → $BACKUP_NAME"
  fi
done

# Appliquer le nouveau code
git reset --hard "origin/$BRANCH"

# Rebuild et redémarrage via Docker Compose
log "Rebuild des conteneurs..."
docker compose build --no-cache
log "Redémarrage..."
docker compose down
docker compose up -d

# Nettoyage des images non utilisées (SAUF les backups tagués)
# On ne prune que les images dangling (sans tag), les backups tagués sont conservés
docker image prune -f >> "$LOG_FILE" 2>&1

# Garder seulement les 3 derniers backups par type (app/api)
for TYPE in app api; do
  IMAGES=$(docker images --filter "reference=${BACKUP_TAG_PREFIX}-${TYPE}*" --format "{{.Repository}}:{{.Tag}}" | tail -n +4)
  for OLD in $IMAGES; do
    docker rmi "$OLD" >> "$LOG_FILE" 2>&1 || true
    log "  🗑 Ancien backup supprimé: $OLD"
  done
done

log "✅ Déploiement terminé — version $(git rev-parse --short HEAD)"
log "   Application accessible sur http://192.168.13.51"
log "   💡 En cas de problème: ./scripts/deploy.sh --rollback"
log "   📋 Voir les backups: ./scripts/deploy.sh --list"
