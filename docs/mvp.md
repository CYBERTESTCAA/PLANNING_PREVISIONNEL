# 🚀 MVP Web — Remplacement du classeur « Liste de Plans »

## 1. Ce que fait RÉELLEMENT le classeur (en simplifié)

Avant de coder quoi que ce soit, le classeur fait **5 choses** :

1. **Stocker les infos chantier** (client, adresse, délais) → table `CHANTIER`
2. **Lister et suivre ~100 plans** (qui dessine quoi, quel indice, quelle date, validé ou pas) → table `ListePlans`
3. **Comparer heures prévues vs réelles** par plan et par type (dessin, usinage, fab, pose) → croisement `H.OF` × `_C621_MODetail`
4. **Suivre les questions techniques** avec l'archi → table `Tableau134`
5. **Piloter la production** (fiches fab, sous-traitance, palettisation, livraison)

---

## 2. Architecture MVP — La plus simple possible

`┌─────────────┐ ┌──────────────┐ ┌─────────────────┐ │ Frontend │────▶│ API REST │────▶│ Base de │ │ React/Vue │◀────│ (Node ou │◀────│ données │ │ │ │ Python) │ │ PostgreSQL │ └─────────────┘ └──────────────┘ └─────────────────┘ │ ┌──────▼──────┐ │ Sync ERP │ (remplace les macros │ (CRON/API) │ d'actualisation) └─────────────┘`**Stack recommandée (simple et éprouvée) :**

* **Frontend** : React + TanStack Table (ou AG Grid gratuit) pour les grilles
* **Backend** : Node.js (Express/Fastify) ou Python (FastAPI)
* **BDD** : PostgreSQL
* **Auth** : Simple SSO d'entreprise ou auth basique (JWT)
* **Hébergement** : Azure App Service (vous êtes déjà sur SharePoint/Microsoft)

---

## 3. Modèle de données (5 tables principales)

```
-- 1. Le chantier (remplace la table CHANTIER)
chantier
  id, code (F25101), titre (103 CE), client, adresse,
  cp, ville, charge_affaire, date_creation, delai_fin

-- 2. Les plans (remplace ListePlans)
plan
  id, chantier_id,
  num_phase_of, num_phase, num_ordre,
  phase, discipline, emetteur, lot, type, zone, niveau, num,
  indice, nom_plan, designation, qte,
  dessinateur, fabricant,
  etat_avancement (enum: a_diffuser/diffuse/en_attente/en_cours/valide/supprime),
  date_previsionnelle,
  validation, sous_traitance,
  responsable_montage, commentaires

-- 3. Historique des indices (remplace les colonnes date ind A→J)
plan_indice
  id, plan_id, indice (A/B/C...), date_diffusion, created_by

-- 4. Heures (remplace H.OF + _C621_MODetail)
heure_prevue
  id, plan_id, type_mo (MOE/MOU/MOF/MOP), code_tache, heures, montant

heure_reelle
  id, plan_id, code_phase, code_tache, qte,
  date_pointage, code_salarie

-- 5. Questions techniques (remplace Tableau134)
question
  id, chantier_id, designation, observations,
  date_q, auteur, zone, question_text,
  groupe, destinataire, date_r, reponse,
  avancement (enum: non_traite/en_cours/termine)
```

**Ce que ça simplifie :**

* Plus de colonnes #REF! → les relations sont en BDD
* Plus de SUMIFS → ce sont des `SELECT SUM(...) GROUP BY`
* Plus de noms définis cassés → plus besoin
* Plus de macros VBA → l'API fait le travail

---

## 4. Les 4 écrans du MVP

### Écran 1 — Dashboard chantier (remplace lignes 1-4 de LISTE PLANS)

`┌─────────────────────────────────────────────────────┐ │ 103 CE — Louis Vuitton — 103 Champs-Élysées │ │ F25101 │ CdA: 1LAUGI │ Délai: 28/02/2026 │ ├──────────┬──────────┬──────────┬────────────────────┤ │ Plans │ Dessinés │ Validés │ Heures │ │ 44 │ 66.7% │ 9.1% │ 382/2400 DES │ │ │ ████░░ │ █░░░░░ │ 24/0 MET │ ├──────────┴──────────┴──────────┴────────────────────┤ │ Questions: 9 ouvertes │ Fab: 562h prévues │ └─────────────────────────────────────────────────────┘`→ **Requête SQL** : `SELECT SUM(heures), type_mo FROM heure_prevue GROUP BY type_mo` → **Remplace** : toutes les formules SUBTOTAL de la ligne 4

---

### Écran 2 — Liste des plans (remplace le corps de LISTE PLANS)

Un **tableau éditable en ligne** (comme Excel mais en web) :

* **Colonnes visibles par défaut** : Zone, Num, Nom Plan, Désignation, Dessinateur, État, Dernier indice, Date prévisionnelle
* **Colonnes « Heures »** en panneau latéral ou expandable row
* **Filtres** par Zone, État, Dessinateur (remplace les filtres auto Excel)
* **Édition inline** : clic sur une cellule → modification directe
* **Bouton « Diffuser indice »** → crée une entrée dans `plan_indice` avec la date du jour
* **Code couleur** identique à l'Excel :
  * 🟢 Validé
  * 🔵 Diffusé à l'archi
  * 🟡 En attente
  * 🟠 En cours
  * 🔴 Supprimé

→ **Remplace** : la table ListePlans + les MFC + le bouton « Generer liste prévisionnelle »

---

### Écran 3 — Suivi heures prévu vs réel (remplace les colonnes X→BD)

**Par plan** (vue détail) :

`Plan: Prototype 1NM R6 WF06B Mural ┌──────────┬──────────┬──────────┬──────────┐ │ Type │ Prévu │ Réel │ Écart │ ├──────────┼──────────┼──────────┼──────────┤ │ DES │ 32h │ 59.5h │ +27.5h │ 🔴 │ MET │ 16h │ 14.5h │ -1.5h │ 🟢 │ Usinage │ 12h │ - │ │ │ FAB │ 84.5h │ - │ │ │ Pose │ 0h │ - │ │ └──────────┴──────────┴──────────┴──────────┘`→ **Remplace** : toutes les formules SUMIFS croisées entre H.OF et _C621_MODetail → **Bonus** : les calculs sont côté serveur, instantanés, sans risque de #REF!

---

### Écran 4 — Questions techniques (remplace LISTE QUESTIONS)

Un simple **kanban ou tableau** :

`Non traité (9) │ En cours (1) │ Terminé (7) ────────────── │ ───────────── │ ────────── BBG rouge │ Crémone pompier │ Oculus miroirs BBG vert DAS │ │ Serrure KEL 560 Rainure à brique │ │ Jarretière ok ... │ │ ...`---

## 5. Ce qui remplace le VBA/macros

| Bouton Excel                                  | Remplacement web                                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **« ACTUALISER »**                    | CRON job ou webhook : l'ERP pousse les heures (H.OF + pointages) vers l'API toutes les heures/nuits |
| **« Generer liste prévisionnelle »** | Endpoint `POST /api/plans/generate` qui crée les lignes automatiquement à partir des OF         |
| **« Actualiser » (LISTE OF)**         | Sync automatique ERP → BDD                                                                         |
| **Graphique camembert SharePoint**      | Widget dashboard intégré (Chart.js / Recharts) — plus de lien externe cassable                   |

---

## 6. Plan de développement — 4 sprints

| Sprint             | Durée | Contenu                                                   | Ce que ça remplace                                       |
| ------------------ | ------ | --------------------------------------------------------- | --------------------------------------------------------- |
| **Sprint 1** | 2 sem. | BDD + API CRUD + Auth + Dashboard + Liste plans (lecture) | Tables CHANTIER + LISTEOF + ListePlans (lecture seule)    |
| **Sprint 2** | 2 sem. | Édition inline plans + gestion indices + filtres         | Saisie Excel + MFC + filtres auto                         |
| **Sprint 3** | 2 sem. | Module heures (import ERP + comparatif prévu/réel)      | Tables H.OF + _C621_MODetail + toutes les formules SUMIFS |
| **Sprint 4** | 1 sem. | Questions techniques + export PDF/Excel                   | LISTE QUESTIONS + zone impression dynamique               |

**Total estimé : 7 semaines** pour un dev fullstack expérimenté.

---

## 7. Gains concrets vs Excel actuel

| Problème Excel                                | Résolu comment                                       |
| ---------------------------------------------- | ----------------------------------------------------- |
| 132 cellules #REF! (colonne € POSE STT)       | Relations BDD — impossible de casser une référence |
| 30 noms définis cassés                       | Plus de noms définis — tout est en BDD              |
| Lien SharePoint cassé (graphique)             | Données locales, graphique intégré                 |
| Aucune protection → modification accidentelle | Rôles utilisateurs (lecteur / éditeur / admin)      |
| VBA opaque non auditable                       | Code source versionné (Git), testable, documenté    |
| ~700 SUMIFS qui ralentissent le classeur       | Requêtes SQL indexées — résultat instantané      |
| Un seul utilisateur à la fois                 | Multi-utilisateur natif                               |
| Sync ERP manuelle (bouton macro)               | Sync automatique (CRON/webhook)                       |
