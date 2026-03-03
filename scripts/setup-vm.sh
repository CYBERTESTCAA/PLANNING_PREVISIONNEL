#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# setup-vm.sh — Configuration initiale de la VM Debian 13
# À exécuter UNE SEULE FOIS en tant que root ou avec sudo
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "=== Configuration VM Debian pour Planning Prévisionnel ==="

# 1. Mise à jour système
echo ">>> Mise à jour système..."
apt-get update && apt-get upgrade -y

# 2. Installer les paquets requis
echo ">>> Installation de git, curl, ca-certificates..."
apt-get install -y git curl ca-certificates gnupg lsb-release

# 3. Installer Docker (méthode officielle Debian)
echo ">>> Installation de Docker..."
if ! command -v docker &> /dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo "Docker installé ✅"
else
  echo "Docker déjà installé ✅"
fi

# 4. Ajouter l'utilisateur au groupe docker
DEPLOY_USER="${SUDO_USER:-$USER}"
if ! groups "$DEPLOY_USER" | grep -q docker; then
  usermod -aG docker "$DEPLOY_USER"
  echo "Utilisateur $DEPLOY_USER ajouté au groupe docker"
fi

# 5. Créer le répertoire de l'application
mkdir -p /opt/planning
chown "$DEPLOY_USER:$DEPLOY_USER" /opt/planning

# 6. Créer le répertoire de logs
mkdir -p /var/log
touch /var/log/planning-deploy.log
chown "$DEPLOY_USER:$DEPLOY_USER" /var/log/planning-deploy.log

# 7. Créer le répertoire de backups
mkdir -p /var/backups/planning
chown "$DEPLOY_USER:$DEPLOY_USER" /var/backups/planning

# 8. Installer le service systemd d'auto-update
cat > /etc/systemd/system/planning-update.service << 'EOF'
[Unit]
Description=Planning Prévisionnel - Auto update
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
User=root
WorkingDirectory=/opt/planning
ExecStart=/opt/planning/scripts/deploy.sh
StandardOutput=append:/var/log/planning-deploy.log
StandardError=append:/var/log/planning-deploy.log
EOF

cat > /etc/systemd/system/planning-update.timer << 'EOF'
[Unit]
Description=Vérifier les mises à jour du Planning toutes les 5 minutes

[Timer]
OnBootSec=60
OnUnitActiveSec=5min
Persistent=true

[Install]
WantedBy=timers.target
EOF

# 9. Installer le service de backup SQLite
cat > /etc/systemd/system/planning-backup.service << 'EOF'
[Unit]
Description=Planning Prévisionnel - Backup SQLite

[Service]
Type=oneshot
ExecStart=/opt/planning/scripts/backup.sh
EOF

cat > /etc/systemd/system/planning-backup.timer << 'EOF'
[Unit]
Description=Backup quotidien de la base Planning

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable planning-update.timer
systemctl start planning-update.timer
systemctl enable planning-backup.timer
systemctl start planning-backup.timer

echo ""
echo "=== Configuration terminée ! ==="
echo ""
echo "Prochaines étapes :"
echo "  1. Déconnectez-vous et reconnectez-vous (pour le groupe docker)"
echo "  2. Clonez le repo :  ./scripts/deploy.sh --init"
echo "  3. Editez api/.env : nano /opt/planning/api/.env"
echo "  4. Lancez :          cd /opt/planning && ./scripts/deploy.sh"
echo ""
echo "L'auto-update vérifie GitHub toutes les 5 minutes."
echo "Backups SQLite quotidiens dans /var/backups/planning/"
