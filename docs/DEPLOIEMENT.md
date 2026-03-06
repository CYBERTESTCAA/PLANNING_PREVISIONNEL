# Guide de déploiement — VM Debian 13 avec Docker

## Architecture

```
┌─ PC Dev (192.168.13.50) ──────────────────────┐
│  Code source → git push → GitHub              │
└────────────────────────────────────────────────┘
                    │
                    ▼ (auto-pull toutes les 5 min)
┌─ VM Debian 13 (192.168.13.51) ────────────────┐
│                                                │
│  Docker Compose                                │
│  ┌──────────────────────┐  ┌───────────────┐  │
│  │  planning-web :80    │  │ planning-api  │  │
│  │  (Nginx + SPA)       │──│ :3001         │  │
│  │  Sert le frontend    │  │ Fastify +     │  │
│  │  Proxy /api → :3001  │  │ Prisma/SQLite │  │
│  └──────────────────────┘  └───────────────┘  │
│                                │               │
│                          api-data (volume)     │
└────────────────────────────────────────────────┘
         ↑
   Accessible en http://192.168.13.51
   depuis tout le réseau local
```

## Prérequis

- VM Debian 13 avec accès SSH depuis le PC dev
- Accès internet depuis la VM (pour Docker Hub + GitHub)
- Compte GitHub avec accès au repo

---

## Étape 1 — Push du code sur GitHub (depuis le PC dev)

```powershell
cd "C:\Users\NielPOUPELIN\Downloads\PLANNING_PREVI\shiftwise-planner-main (1)\shiftwise-planner-main"

git init
git add .
git commit -m "Initial commit - Planning prévisionnel"
git branch -M main
git remote add origin https://github.com/CYBERTESTCAA/PLANNING_PREVISIONNEL.git
git push -u origin main
```

> **Note** : Les fichiers `.env` et `api/.env` sont exclus par `.gitignore` (ils contiennent des secrets).

---

## Étape 2 — Configurer la VM Debian 13

```bash
# Depuis le PC dev, se connecter en SSH
ssh utilisateur@192.168.13.51

# Télécharger et exécuter le script d'installation
curl -fsSL https://raw.githubusercontent.com/CYBERTESTCAA/PLANNING_PREVISIONNEL/main/scripts/setup-vm.sh -o /tmp/setup-vm.sh
# Ou bien, si pas encore poussé, copier manuellement le script
sudo bash /tmp/setup-vm.sh

# Se déconnecter et reconnecter (pour le groupe docker)
exit
ssh utilisateur@192.168.13.51
```

Le script `setup-vm.sh` installe automatiquement :
- Docker + Docker Compose
- Le timer systemd d'auto-update (toutes les 5 min)
- Le timer de backup quotidien

---

## Étape 3 — Premier déploiement

```bash
# Cloner le repo
cd /opt/planning
git clone https://github.com/CYBERTESTCAA/PLANNING_PREVISIONNEL.git .

# Créer le fichier d'environnement API
cp api/.env.example api/.env
nano api/.env
```

Éditez `api/.env` avec les vraies valeurs :
```env
DATABASE_URL="file:/data/planning.sqlite"
PORT=3001
HOST=0.0.0.0

FABRIC_SQL_ENDPOINT="eujjqvl7et3e7bty4hx3e7ithy-2yuxrr44y2aevad5c5wx4megk4.datawarehouse.fabric.microsoft.com"
FABRIC_DATABASE="WH_OR_GROUPE_CAA"
FABRIC_TENANT_ID="55981225-247f-4ff6-8678-e1efb27d133e"
FABRIC_CLIENT_ID="c7abec75-508c-4495-9043-851280c3160c"
FABRIC_CLIENT_SECRET="VOTRE_SECRET"
FABRIC_SYNC_CRON="0 * * * *"

AZURE_AD_TENANT_ID="55981225-247f-4ff6-8678-e1efb27d133e"
AZURE_AD_CLIENT_ID="c7abec75-508c-4495-9043-851280c3160c"
AZURE_AD_GROUP_ID="bd3a6f77-0a07-4ade-a2e5-d26cd8310297"
```

```bash
# Rendre les scripts exécutables
chmod +x scripts/*.sh

# Lancer le build et démarrage
docker compose up -d --build
```

Vérifier que tout tourne :
```bash
docker compose ps
# → planning-web et planning-api doivent être "Up"

curl http://localhost/api/health
# → {"ok":true}
```

L'application est maintenant accessible sur **http://192.168.13.51** depuis n'importe quel PC du réseau.

---

## Mise à jour automatique

Le timer systemd `planning-update.timer` vérifie GitHub **toutes les 5 minutes**.
Si un nouveau commit est détecté sur `main`, il :
1. Pull le code
2. Rebuild les conteneurs Docker
3. Redémarre l'application

**Workflow développeur** :
```
PC dev → modifier le code → git add . → git commit → git push
         ↓ (max 5 min)
VM → auto-pull → rebuild → redémarrage → app à jour ✅
```

### Mise à jour manuelle (instantanée)

```bash
ssh utilisateur@192.168.13.51
cd /opt/planning
./scripts/deploy.sh
```

---

## Commandes utiles

| Action | Commande |
|--------|----------|
| Voir les logs API | `docker compose logs -f api` |
| Voir les logs frontend | `docker compose logs -f web` |
| Redémarrer tout | `docker compose restart` |
| Rebuild + redémarrer | `docker compose up -d --build` |
| Arrêter tout | `docker compose down` |
| Voir l'état | `docker compose ps` |
| Logs de déploiement | `cat /var/log/planning-deploy.log` |
| Backup manuel | `./scripts/backup.sh` |
| Vérifier le timer | `systemctl status planning-update.timer` |

---

## Sauvegardes

- **Automatique** : tous les jours à 2h00 (systemd timer)
- **Stockage** : `/var/backups/planning/`
- **Rétention** : 30 dernières sauvegardes
- **Restauration** :
  ```bash
  # Arrêter l'API
  docker compose stop api
  # Restaurer
  gunzip -c /var/backups/planning/planning_XXXXXXXX.sqlite.gz > /tmp/restore.sqlite
  docker cp /tmp/restore.sqlite planning-api:/data/planning.sqlite
  # Redémarrer
  docker compose start api
  ```

---

## Pour un autre développeur

1. Cloner le repo : `git clone https://github.com/CYBERTESTCAA/PLANNING_PREVISIONNEL.git`
2. `cp .env.example .env` et `cp api/.env.example api/.env` — remplir les valeurs
3. `npm install && cd api && npm install && npm run prisma:generate && cd ..`
4. Terminal 1 : `cd api && npm run dev`
5. Terminal 2 : `npm run dev`
6. Ouvrir http://localhost:8080

---

## Architecture de la base de données

```
Subsidiary → Workshop → Team → Employee
                     ↓
                  Project → ManufacturingOrder
                     ↓
                Assignment (Employee + Project + Date + Slot)
                Absence    (Employee + Date + Type)
                Task       (Employee + Title + DueDate → respond DONE/NOT_DONE)
```
