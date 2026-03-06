# 🔍 Audit complet du classeur « Liste plans - F25101 - 103 CE - R6.xlsm »

Je lance l'audit. Commençons par lire le contenu de chaque onglet pour dresser l'inventaire complet. Je vais d'abord récupérer les données de tous les onglets en parallèle.

Lire l'onglet CHANTIER

Lire en-têtes LISTE PLANS

Lire l'onglet LISTE QUESTIONS

Lire en-têtes LISTE OF

Lire en-têtes C700-3-TachesCum

Lire en-têtes TEMPS PASSES

Bien, j'ai les en-têtes et premières lignes. Je vais maintenant lire les données complètes des onglets importants, les objets (tables, TCD, graphiques), les noms définis, et les formules clés.

Lire premières lignes données LISTE PLANS

Lire toutes les données LISTE PLANS

Lire toutes les données LISTE OF

Lire toutes les données C700-3-TachesCum

Lire toutes les données TEMPS PASSES

Lister tous les objets du classeur

Excellent ! J'ai trouvé un graphique avec des liens externes vers SharePoint. Maintenant, je vais récupérer les formules structurantes et les styles clés.

Lire formules en-têtes LISTE PLANS

Lire formules CHANTIER

Lire formules en-têtes LISTE OF

Lister les noms définis

Maintenant je vais chercher les tables structurées, les validations de données, les mises en forme conditionnelles et les protections.

Lister toutes les tables structurées

Vérifier protections et MFC

Vérifier protections des feuilles

Lister mises en forme conditionnelles

Maintenant, cherchons les connexions externes, les slicers et vérifions s'il y a du contenu VBA accessible.

Chercher slicers et formes/boutons

Rechercher les erreurs #REF!

J'ai maintenant toutes les données nécessaires. Laissez-moi compiler le rapport d'audit complet.

---

# 📋 AUDIT COMPLET DU CLASSEUR

## « Liste plans - F25101 - 103 CE - R6.xlsm »

---

## 1. VUE D'ENSEMBLE

### Objectif métier

Ce classeur est un **outil de gestion de production pour un chantier d'agencement haut de gamme** réalisé par **CAA Agencement** pour **Louis Vuitton** au **103 Avenue des Champs-Élysées, 75008 Paris** (étages R+5 et R+6). Il centralise :

* **L'inventaire complet des plans** (carnets de détails, plans d'exécution, fiches produit, échantillons)
* **Le suivi de l'avancement** (dessin, validation architecte, fabrication, usinage, pose)
* **Le suivi budgétaire en heures** (heures prévues vs effectuées par type : MOE/MOU/MOF/MOP)
* **Le suivi des questions techniques** ouvertes avec l'architecte et les fournisseurs
* **La liste des ordres de fabrication** (OF) et leur décomposition

### Entrées principales

* Saisie manuelle des plans, indices, dates de diffusion
* Import ERP via tables `H.OF` (heures prévues) et `_C621_MODetail` (temps passés réels)
* Paramètres chantier (table `CHANTIER`)

### Sorties finales

* Tableau de bord d'avancement (LISTE PLANS lignes 1-4 : % dessin = 66.7%, % validation = 9.1%)
* Comparatif heures prévues / effectuées par plan et par type de tâche
* Liste questions techniques avec statut (9 non traitées, 1 en cours, 7 terminées)

### Workflow utilisateur typique

1. **Paramétrage** : Renseigner les infos chantier dans `CHANTIER` (table LISTE OF !Y1
   )
2. **Saisie des plans** : Ajouter les lignes dans LISTE PLANS avec les codes phase/OF
3. **Suivi d'avancement** : Mettre à jour les dates d'indice (A, B, C…), l'état de validation
4. **Import ERP** : Les tables `H.OF` et `_C621_MODetail` sont alimentées (probablement via macro/connexion SharePoint)
5. **Analyse** : Lecture des colonnes calculées (heures prévues, effectuées, écarts) et du tableau de bord

---

## 2. INVENTAIRE DES FEUILLES

| # | Onglet                             | Rôle                                                 | Lignes × Col. | Gel volets                           | Description                                                                                  |
| - | ---------------------------------- | ----------------------------------------------------- | -------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| 1 | **CHANTIER** (id=19)         | Paramètres / Saisie                                  | 31 × 17       | Non                                  | Fiche signalétique du chantier + listes de validation (matériaux, normes, transport, etc.) |
| 2 | **LISTE PLANS** (id=12)      | **Tableau de bord principal** / Saisie + Calcul | 136 × 57      | Lignes 1-5 gelées, col. A-V gelées | Table maître des plans avec suivi heures, dates, validation, fabrication                    |
| 3 | **LISTE QUESTIONS** (id=8)   | Saisie / Suivi                                        | 22 × 14       | Non                                  | Questions techniques posées à l'archi/fournisseurs, avec réponses et avancement           |
| 4 | **LISTE OF** (id=15)         | Données de référence / Paramètres                 | 205 × 43      | Non                                  | Liste des ordres de fabrication (COMMANDE CLIENT + OF) + table CHANTIER (infos chantier)     |
| 5 | **C700-3-TachesCum** (id=14) | Données brutes (ERP)                                 | 161 × 9       | Non                                  | Heures cumulées prévues par phase/tâche (budget) — provenance ERP                        |
| 6 | **TEMPS PASSES** (id=22)     | Données brutes (ERP)                                 | 588 × 6       | Non                                  | Détail des pointages réels (salarié, date, tâche, heures) — provenance ERP              |

---

## 3. TABLEAUX STRUCTURÉS (Ctrl+T / ListObjects)

### 3.1 — Table `ListePlans`

| Propriété               | Valeur                                      |
| ------------------------- | ------------------------------------------- |
| **Onglet**          | LISTE PLANS                                 |
| **Plage en-têtes** | B5                                          |
| **Plage données**  | B6(**131 lignes × 56 colonnes** )    |
| **Totaux**          | Non activés (totaux manuels en lignes 2-4) |
| **Filtre auto**     | Oui                                         |

**Colonnes clés (ID)** : `NumPhaseOF` (B), `NumPhase` (C), `numOrdre` (D), `HK` (E), `OF ETUDES` (F), `OF FAB` (G)

**Colonnes saisies** : PHASE, DISCI, EMET, LOT, TYPE, ZONE, NIV, NUM, IND, NOM PLAN, N ART, DESIGNATION MOBILIERS, QTE, IND2, DESSINATEUR, FABRICATION, Etat avancement, date PREVISIONNELLE, dates ind A→J, VALIDATION, N° FICHE, DATE FICHE FAB, SOUS TRAITANCE, USINAGE, RESPONSABLE MONTAGE, DATE DE DEPART ATELIER, PALETISATION, LIVRE SUR CHANTIER, COMMENTAIRES

**Colonnes calculées (formules SUMIFS)** :

| Colonne                        | Formule                                                       | Source                     |
| ------------------------------ | ------------------------------------------------------------- | -------------------------- |
| `MOE prévues` (X)           | `=SUMIFS(H.OF[HeuresMoChantier], …, "MOE")`                | Table H.OF                 |
| `dont DES prévus` (Y)       | `=SUMIFS(H.OF[HeuresMoChantier], …, "1MO/DES")`            | Table H.OF                 |
| `DES effectués` (Z)         | `=SUMIFS(_C621_MODetail[Qte], …, "1MO/DES") / COUNTIF(…)` | Table _C621_MODetail       |
| `dont MET prévus` (AA)      | `=SUMIFS(H.OF[…], …, "1MO/MET")`                          | Table H.OF                 |
| `MET effectués` (AB)        | `=SUMIFS(_C621_MODetail[Qte], …, "1MO/MET") / COUNTIF(…)` | Table _C621_MODetail       |
| `H USINAGE` (AU)             | `=SUMIFS(H.OF[…], …, "MOU")`                              | Table H.OF                 |
| `H FAB` (AW)                 | `=SUMIFS(H.OF[…], …, "MOF")`                              | Table H.OF                 |
| `H MANUTENTION` (BA)         | `=SUMIFS(H.OF[…], "MOP", "*MAN")`                          | Table H.OF                 |
| `H POSE` (BB)                | `=SUMIFS(H.OF[…], "MOP", "*POS")`                          | Table H.OF                 |
| `H POSE NUIT` (BD)           | `=SUMIFS(H.OF[…], "MOP", "*PON")`                          | Table H.OF                 |
| **`€ POSE STT` (BC)** | ⚠️**`=SUMIFS(#REF!, #REF!, …, "STTPOSE")`**        | **CASSÉE — #REF!** |

---
