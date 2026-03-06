J'ai maintenant rassemblé toutes les informations nécessaires. Voici le rapport d'audit complet :

---

# 🔍 RAPPORT D'AUDIT COMPLET — « Liste plans - VIERGE.xlsm »

---

## 1. RÉSUMÉ EXÉCUTIF

### 1.1 Objectif du classeur

Ce classeur est un **outil de suivi de chantier** pour la société  **CAA AGENCEMENT** . Il sert à :

* Initialiser un nouveau chantier en récupérant les données depuis la base **Héraklès** (ERP métier, base SQL Server `DQE`)
* Gérer la **liste des plans** (dessin, validation, indices, fabrication, pose)
* Suivre les **heures de main-d'œuvre** (MOE, DES, MET, usinage, fabrication, pose) prévues vs réalisées
* Gérer les **questions/réponses** du chantier
* Piloter la **nomenclature matériaux** (OF)

### 1.2 Points clés (7 bullets)

1. **Classeur-modèle VIERGE** : à l'ouverture, une macro `Workbook_Open` demande un code chantier et interroge la BDD Héraklès pour peupler toutes les données.
2. **5 connexions OLEDB** vers SQL Server `SRV-SQL01\HERAKLES`, base `DQE` — paramétrisées dynamiquement via le code chantier saisi.
3. **⚠️ SÉCURITÉ CRITIQUE** : mot de passe SQL en clair dans le VBA (`Password=toto`, User `sa` = administrateur SQL).
4. **Auto-renommage** : le fichier se renomme automatiquement `Liste plans - [code] - [nom chantier].xlsm` et se déplace dans le dossier OneDrive/local du chantier.
5. **Suppression de l'ancien fichier** (`Kill`) après le renommage — risque de perte si erreur pendant l'opération.
6. **Formules avancées** : utilisation de `XLOOKUP`, `LET`, `TEXTAFTER`, `SUMIFS` avec références structurées aux tables.
7. **1 segment (slicer)** `DocHK` sur le tableau LISTEOF, et **1 graphique pie** lié à un fichier SharePoint externe.

### 1.3 Dépendances externes

| Type                                  | Détail                                                                | Risque                                                          |
| ------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| **SQL Server**                  | `SRV-SQL01\HERAKLES`, base `DQE`, user `sa`                      | ⚠️ Accès admin, mot de passe en clair                        |
| **SharePoint/OneDrive**         | `C:\Users\[user]\CAA AGENCEMENT\...`                                 | Chemin dynamique selon utilisateur Windows                      |
| **Fichier externe (graphique)** | `https://caaagencement-my.sharepoint.com/.../Suivi de chantier.xlsm` | ⚠️ Le graphique pie référence un fichier externe SharePoint |
| **Noms définis cassés**       | 20+ noms en `#REF!` issus d'un ancien modèle                        | ⚠️ Résidus à nettoyer                                       |

---

## 2. INVENTAIRE COMPLET

### 2.1 Onglets

| Onglet                                     | Rôle                                                                                                                   | Sources                                                                           | Éléments sensibles                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **CHANTIER** (sheetId 19)            | Fiche signalétique du chantier (adresse, contacts, contraintes techniques, accès, livraison)                          | Formules → table `CHANTIER` (BDD)                                              | Listes de validation (niveaux plans, normes, transport) ; graphique pie          |
| **LISTE PLANS** (sheetId 12)         | 📋**Onglet principal** — suivi de chaque plan/mobilier : indices, heures prévues/réalisées, fabrication, pose | Formules XLOOKUP/SUMIFS →`LISTEOF`, `H.OF`, `T.PASSES`, `NomenclatureOF` | 53 colonnes, lignes figées (5 lignes, 19 colonnes), zone d'impression dynamique |
| **LISTE QUESTIONS** (sheetId 8)      | Suivi des questions/réponses du chantier (Q&A avec avancement)                                                         | XLOOKUP →`ListePlans`                                                          | Compteurs Non traité / En cours / Terminé                                      |
| **C701_OuvraOF & C601** (sheetId 15) | Données brutes des OF (ouvrages) + en-tête chantier — alimenté par BDD                                              | Connexions `C701_OuvraOF` + `C601-Chantier en tête`                          | Zone de contrôle cachée (Y9) : compteurs de lignes, détection d'ajouts        |
| **C700-3-TachesCum** (sheetId 14)    | Heures MO cumulées par tâche/phase — alimenté par BDD                                                               | Connexion `C700-3-TachesCum`                                                    | Table `H.OF` — 9 colonnes, vide (modèle vierge)                              |
| **C701_MaterOF** (sheetId 11)        | Nomenclature matériaux des OF — alimenté par BDD                                                                     | Connexion `C701_MaterOF`                                                        | Table `NomenclatureOF` avec totaux, colonnes de remplacement                   |
| **C621_MODetail** (sheetId 20)       | Détail des pointages MO par salarié — alimenté par BDD                                                              | Connexion `C621_MODetail`                                                       | Table `T.PASSES` — 6 colonnes, vide                                           |

### 2.2 Tables structurées (Ctrl+T)

| Nom                | Onglet           | Plage | Colonnes clés                                            | Usage                           |
| ------------------ | ---------------- | ----- | --------------------------------------------------------- | ------------------------------- |
| `ListePlans`     | LISTE PLANS      | B5    | 53 colonnes (HK, OF, heures, dates indices, validation…) | Table maître de suivi          |
| `Tableau134`     | LISTE QUESTIONS  | B5    | HK, Questions, Réponses, Avancement                      | Q&A                             |
| `LISTEOF`        | C701_OuvraOF…   | B5    | NumLig, CodeOF, DocHK, Titre, Qte2…                      | Données brutes OF              |
| `CHANTIER`       | C701_OuvraOF…   | Y1    | 19 champs Héraklès (code, titre, adresses, dates…)     | En-tête chantier (1 ligne)     |
| `H.OF`           | C700-3-TachesCum | A1    | NumPhaseOF, PG, CodeTache, HeuresMoChantier               | Heures prévues par tâche      |
| `NomenclatureOF` | C701_MaterOF     | B5    | CODEARTICLE, Mt, Mt1, Mt2, colonnes remplacement          | Matériaux/coûts (avec totaux) |
| `T.PASSES`       | C621_MODetail    | A1    | CodePhase, CodeTache, Qte                                 | Heures réellement passées     |

### 2.3 Graphique

| Onglet   | Type                      | Source                                                                | Problème                                                                                                                                                                                        |
| -------- | ------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CHANTIER | **Pie (camembert)** | `Suivi de chantier.xlsm` (SharePoint externe) — cellules M13et L13 | ⚠️**Référence externe cassée** — pointe vers un autre classeur SharePoint, pas vers ce fichier. Affiche probablement le ratio réponses/non-réponses (60%/40% dans CHANTIERM13:M14) |

### 2.4 Segment (Slicer)

| Nom       | Caption | Table       | Colonne   | Usage                                                                  |
| --------- | ------- | ----------- | --------- | ---------------------------------------------------------------------- |
| `DocHK` | DocHK   | `LISTEOF` | `DocHK` | Filtrer les lignes OF par type de document (ex. « COMMANDE CLIENT ») |

### 2.5 Noms définis

**Noms fonctionnels (actifs) :**

| Nom                   | Référence                             | Usage                                                                  |
| --------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| `CodeChantier`      | `'C701_OuvraOF…'!$Z$9`               | Code du chantier courant — point d'entrée VBA                        |
| `nbrLigne1`         | `'C701_OuvraOF…'!$Z$10`              | Compteur articles CDE (=COUNTA des CodeOF_Ref)                         |
| `nbrLigne2`         | `'C701_OuvraOF…'!$Z$11`              | Compteur enregistré (comparé à nbrLigne1 pour détecter les ajouts) |
| `nomChantier`       | `'C701_OuvraOF…'!$I$1`               | Nom du chantier pour renommage fichier                                 |
| `delaiChantier`     | `'C701_OuvraOF…'!$J$3`               | Date de délai de fin de chantier                                      |
| `ZoneImpressionDyn` | `'LISTE PLANS'!$A$1:$BB$5;ListePlans` | Zone d'impression dynamique                                            |
| `Segment_DocHK`     | (vide)                                  | Slicer DocHK                                                           |

**⚠️ Noms cassés (#REF! / #N/A) — 20+ noms résidus à nettoyer :** `BringUserToAboutSheet`, `BringUserToCode`, `CalcGrille`, `CancelRegisterReceipt`, `DateDébut`, `EndSeller`, `FenêtreDateDébut`, `FenêtreDécalage`, `FenêtreJours`, `FindIt`, `listepanneaux`, `OkRegisterReceipt`, `OneStepChart`, `période_sélectionnée`, `PériodeDansPlan`, `PériodeDansRéel`, `Plan`, `PourcentageAccompli`, `PourcentageAccompliAuDelà`, `PrintRegisterReceipt`, `RailsJour`, `Réel`, `RéelAuDelà`, `RegisterReceipt`, `StartChart`, `TitreRégion..BO60`

→ Ces noms proviennent visiblement d'un **ancien modèle** (type planning Gantt ou suivi de réception) et sont  **inutilisés** . À supprimer pour alléger le classeur.

### 2.6 Validations / Listes de choix (onglet CHANTIER)

| Cellule                  | Liste déroulante    | Valeurs                                     |
| ------------------------ | -------------------- | ------------------------------------------- |
| CHANTIERC11              | Niveau de plan       | 1, 2, 3, 4, 5 (col M3)                      |
| CHANTIERC13–CHANTIERC16 | Normes, blocs portes | M1/M2/M3, Standard/CF 1/2h/CF 1h (col N, O) |
| CHANTIERC19              | Porte                | Oui/Oui doubles/Non (col Q)                 |
| CHANTIERC27              | Transport            | Semi-remorque, porteur, 20m² (col P)       |

---

## 3. CARTOGRAPHIE DES FLUX DE DONNÉES (Data Lineage)

`┌──────────────────────────────────────────────────────────────┐ │ SQL SERVER (SRV-SQL01\HERAKLES) │ │ Base : DQE │ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │ │ │C601-Chantier │ │C701_OuvraOF │ │C700-3-Taches │ │ │ │ en tête │ │ │ │ Cum │ │ │ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ │ │ ┌──────┴───────┐ ┌──────┴───────┐ │ │ │C701_MaterOF │ │C621_MODetail │ │ │ └──────┬───────┘ └──────┬───────┘ │ └─────────┼──────────────────┼─────────────────────────────────┘ │ OLEDB / SQL │ ▼ ▼ ┌──────────────────────────────────────────────────────────────┐ │ CLASSEUR EXCEL │ │ │ │ Table CHANTIER ──────────────► Onglet CHANTIER (affichage) │ │ (en-tête) │ │ │ │ Table LISTEOF ──► Slicer DocHK ──► VBA CopieNumeroLigne │ │ (articles OF) │ │ │ │ │ │ ▼ │ │ │ │ Table ListePlans (col HK) │ │ │ │ │ │ │ ▼ ▼ │ │ Table H.OF ────────► SUMIFS ──► ListePlans (heures prévues) │ │ (heures prévues) │ │ │ │ Table T.PASSES ─────► SUMIFS ──► ListePlans (heures réelles)│ │ (heures réalisées) │ │ │ │ Table NomenclatureOF ► SUMIFS ──► ListePlans (€ POSE STT) │ │ (matériaux/coûts) │ │ │ │ ListePlans ──► XLOOKUP ──► Tableau134 (LISTE QUESTIONS) │ │ │ └──────────────────────────────────────────────────────────────┘`### Rafraîchissement

* **Déclenchement** : Macro `MAJChantierHK` (bouton manuel) → `ActiveWorkbook.RefreshAll`
* **Ordre** : toutes les connexions se rafraîchissent en parallèle (BackgroundQuery = True)
* **Initialisation** : `Workbook_Open` exécute le refresh initial avec `CalculateUntilAsyncQueriesDone`
* **⚠️ Risque** : le refresh parallèle ne garantit pas l'ordre. Si `LISTEOF` se charge après que `ListePlans` essaie de résoudre ses XLOOKUP, des erreurs transitoires sont possibles.
* **Recommandation** : Passer `BackgroundQuery = False` pour les connexions critiques ou séquencer explicitement.

---

## 4. ANALYSE DES FORMULES

### 4.1 Top 20 formules structurantes

| #  | Onglet      | Colonne                  | Formule                                                                                                                                              | Rôle                                                                                      |
| -- | ----------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1  | LISTE PLANS | `NumPhase` (C6)        | `=LET(recherche,XLOOKUP([@HK],LISTEOF[NumLig],LISTEOF[N°phase calc CDE],""),IF(recherche=0,"",recherche))`                                        | Retrouver la phase depuis le N° de ligne HK                                               |
| 2  | LISTE PLANS | `numOrdre` (D6)        | `=LET(recherche,XLOOKUP([@HK],LISTEOF[NumLig],LISTEOF[numOrdre],""),IF(recherche=0,"",recherche))`                                                 | N° d'ordre de la pièce                                                                   |
| 3  | LISTE PLANS | `NumPhaseOF` (B6)      | `=XLOOKUP([@NumPhase],LISTEOF[NumPhase],LISTEOF[NumPhaseOF],"")`                                                                                   | Clé de jointure vers H.OF                                                                 |
| 4  | LISTE PLANS | `OF` (F6)              | `=XLOOKUP([@NumPhase],LISTEOF[N°phase calc CDE],LISTEOF[N°OF calc CDE],"")`                                                                      | N° d'OF                                                                                   |
| 5  | LISTE PLANS | `DESIGNATION` (P6)     | `=IF([@HK]="","",$XLOOKUP([@HK],LISTEOF[NumLig],LISTEOF[Titre],""))`                                                                               | Titre du mobilier                                                                          |
| 6  | LISTE PLANS | `Qté` (Q6)            | `=XLOOKUP([@NumPhase],LISTEOF[NumPhase],LISTEOF[Qte2],"")`                                                                                         | Quantité commandée                                                                       |
| 7  | LISTE PLANS | `Ind` (R6)             | `=IFERROR(TEXTAFTER(@INDEX(ListePlans[[#Headers],[date ind A]:[Dernier indice]],1,COUNTA(ListePlans[@[date ind A]:[Dernier indice]]))," ",-1),"")` | **Dernier indice de plan** — formule complexe qui trouve le dernier indice non vide |
| 8  | LISTE PLANS | `MOE prévues` (U6)    | `=SUMIFS(H.OF[HeuresMoChantier],H.OF[NumPhaseOF],[@NumPhaseOF],H.OF[PG],"MOE")`                                                                    | Heures MOE prévues                                                                        |
| 9  | LISTE PLANS | `DES prévus` (V6)     | `=SUMIFS(…,H.OF[CodeTache],"1MO/DES")`                                                                                                            | Heures dessin prévues                                                                     |
| 10 | LISTE PLANS | `DES effectués` (W6)  | `=SUMIFS(T.PASSES[Qte],…,"1MO/DES") / COUNTIF([OF],[@OF])`                                                                                        | Heures dessin réelles (réparties par OF)                                                 |
| 11 | LISTE PLANS | `MET prévues` (X6)    | `=SUMIFS(…,"1MO/MET")`                                                                                                                            | Heures métrés prévues                                                                   |
| 12 | LISTE PLANS | `MET effectuées` (Y6) | `=SUMIFS(T.PASSES…,"1MO/MET") / COUNTIF(…)`                                                                                                      | Heures métrés réelles                                                                   |
| 13 | LISTE PLANS | `H USINAGE` (AR6)      | `=SUMIFS(…,H.OF[PG],"MOU")`                                                                                                                       | Heures usinage prévues                                                                    |
| 14 | LISTE PLANS | `H FAB` (AT6)          | `=SUMIFS(…,H.OF[PG],"MOF")`                                                                                                                       | Heures fabrication prévues                                                                |
| 15 | LISTE PLANS | `H MANUTENTION` (AX6)  | `=SUMIFS(…,H.OF[PG],"MOP",…,"*MAN")`                                                                                                             | Heures manutention                                                                         |
| 16 | LISTE PLANS | `H POSE` (AY6)         | `=SUMIFS(…,H.OF[PG],"MOP",…,"*POS")`                                                                                                             | Heures pose                                                                                |
| 17 | LISTE PLANS | `€ POSE STT` (AZ6)    | `=SUMIFS(NomenclatureOF[Mt],…,"STTPOSE")`                                                                                                         | Coût sous-traitance pose                                                                  |
| 18 | LISTE PLANS | `H POSE NUIT` (BA6)    | `=SUMIFS(…,"*PON")`                                                                                                                               | Heures pose de nuit                                                                        |
| 19 | LISTE PLANS | `% dessin` (AD2)       | `=IFERROR(COUNTA(ListePlans[date ind A])/(COUNTA(ListePlans[Qté])-COUNTIF(…,"")),…)`                                                            | Indicateur d'avancement dessin                                                             |
| 20 | LISTE PLANS | `% validation` (AD3)   | `=IFERROR(COUNTA(ListePlans[VALIDATION])/(…))`                                                                                                    | Indicateur d'avancement validation                                                         |

### 4.2 Fonctions avancées utilisées

* **XLOOKUP** : utilisée massivement (7+ occurrences) — recherches entre tables
* **LET** : variables intermédiaires (colonnes C6, D6)
* **TEXTAFTER** : extraction du dernier indice (R6)
* **INDEX** avec @: référence implicite à la ligne courante
* **SUMIFS** avec wildcards (`"*MAN"`, `"*POS"`, `"*PON"`) : filtrage multi-critères
* **SUBTOTAL(109,…)** : sommes insensibles aux filtres (dans NomenclatureOF)
* **Références structurées** `[@colonne]` : partout — bonne pratique

### 4.3 Points d'attention

| Problème                         | Localisation                                     | Impact                                                                                                                             |
| --------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| ⚠️**Division COUNTIF**    | W6, Y6 (`DES effectués`, `MET effectuées`) | Si un OF n'apparaît qu'une fois → OK. Mais si `COUNTIF([OF],[@OF])` = 0 → `#DIV/0!` (protégé par IF mais pas par IFERROR) |
| ⚠️**SUMIFS wildcards**    | AX6, AY6, BA6                                    | Les codes tâche doivent contenir exactement "MAN", "POS", "PON" en fin de chaîne                                                 |
| ⚠️**Formule Ind (R6)**    | R6                                               | Formule complexe — fragile si les en-têtes changent                                                                              |
| ⚠️**Graphique externe**   | CHANTIER                                         | Référence vers `Suivi de chantier.xlsm` sur SharePoint — cassée dans ce classeur                                             |
| ⚠️**Noms _xleta / _xlfn** | Multiples                                        | Noms de compatibilité (XLOOKUP, LET, etc.) — normaux mais à vérifier si ouvert dans Excel ancien                               |

### 4.4 Recommandations formules

1. **Ajouter IFERROR** autour des divisions dans W6 et Y6
2. **Simplifier R6** : utiliser une formule moins fragile ou une colonne helper
3. **Supprimer le graphique pie cassé** ou le remplacer par un graphique local

---

## 5. ANALYSE POWER QUERY

**NON OBSERVABLE** — Aucune requête Power Query détectée dans ce classeur. Les données sont récupérées exclusivement via des **connexions OLEDB classiques** paramétrées en VBA.

---

## 6. ANALYSE DU MODÈLE DE DONNÉES / POWER PIVOT

**NON OBSERVABLE** — Pas de modèle de données Power Pivot détecté. Les relations entre tables sont gérées par des **formules XLOOKUP/SUMIFS** directement dans les feuilles.

---

## 7. ANALYSE DES MACROS VBA

### 7.1 `Workbook_Open()` — PROCÉDURE PRINCIPALE

| Attribut                         | Détail                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| **Déclencheur**           | Ouverture du classeur                                                                       |
| **Rôle**                  | Initialiser un nouveau chantier : saisie du code, connexion BDD, refresh, renommage fichier |
| **Condition d'exécution** | Si `CodeChantier` ≠ 0 → la macro ne fait rien (chantier déjà initialisé)             |

**Étapes détaillées :**

1. **Vérifie** si `CodeChantier` = 0 (classeur vierge)
2. **InputBox** → demande le code chantier à l'utilisateur
3. **Écrit** le code dans la cellule nommée `CodeChantier` (C701_OuvraOF & C601-Chantier enZ9)
4. **Détecte l'environnement** (SharePoint URL vs local) et cherche le dossier du chantier via `TrouverDossierLocal`
5. **Paramètre les 5 connexions OLEDB** avec des requêtes SQL `WHERE CodeChantier = '[code]'`
6. **RefreshAll** + `CalculateUntilAsyncQueriesDone`
7. **Appelle** `EnregistrerSousNouveauNom` → `SaveAs` sous `Liste plans - [code] - [nom].xlsm`
8. **Appelle** `CopieNumeroLigne` → copie les N° de ligne des `COMMANDE CLIENT` vers `ListePlans[HK]`
9. **Supprime l'ancien fichier** (`Kill`)
10. **MsgBox** de confirmation

### 7.2 `MAJChantierHK()`

| Attribut               | Détail                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Déclencheur** | Bouton (probablement un bouton sur une feuille)                                                                     |
| **Rôle**        | Rafraîchir les données et détecter les nouveaux articles                                                         |
| **Logique**      | `RefreshAll` → compare `nbrLigne1` vs `nbrLigne2` → affiche le nombre d'ajouts → met à jour `nbrLigne2` |

### 7.3 `CopieNumeroLigne()`

| Attribut             | Détail                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Rôle**      | Copier les N° de ligne des articles `COMMANDE CLIENT` de `LISTEOF` vers `ListePlans[HK]`             |
| **Tables**     | Source :`LISTEOF` (filtre `DocHK = "COMMANDE CLIENT"`) → Destination : `ListePlans[HK]`              |
| **Sécurité** | Gestion d'erreurs (`On Error GoTo`), `ScreenUpdating = False`, puis **supprime l'ancien fichier** |

### 7.4 `EnregistrerSousNouveauNom()`

| Attribut             | Détail                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Rôle**      | SaveAs sous le nom `Liste plans - [code] - [nom chantier].xlsm` dans le dossier local du chantier          |
| **Sécurité** | Vérifie existence dossier (FileSystemObject), supprime l'ancien fichier si existe,`DisplayAlerts = False` |

### 7.5 `TrouverDossierLocal()`

| Attribut          | Détail                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Rôle**   | Trouver le dossier local OneDrive correspondant au code chantier                                                                 |
| **Logique** | Parcourt `C:\Users\[user]\CAA AGENCEMENT\` et ses sous-dossiers (2 niveaux) pour trouver un dossier contenant le code chantier |

### 7.6 `ExtraireNomFichier()`

| Attribut        | Détail                                                            |
| --------------- | ------------------------------------------------------------------ |
| **Rôle** | Extraire le nom de fichier depuis un chemin complet (URL ou local) |

---

### 7.7 🔴 ALERTES DE SÉCURITÉ VBA

| Risque                                    | Gravité    | Localisation                                         | Détail                                                                                     |
| ----------------------------------------- | ----------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Mot de passe SQL en clair**       | 🔴 CRITIQUE | `Workbook_Open`, toutes les connexions             | `Password=toto` avec user `sa` (admin SQL Server) — visible par quiconque ouvre le VBA |
| **Compte sa utilisé**              | 🔴 CRITIQUE | Toutes les connexions                                | Le compte `sa` a les droits SYSADMIN → accès total à toute la base                     |
| **Suppression de fichier**          | 🟠 ÉLEVÉ  | `CopieNumeroLigne` + `EnregistrerSousNouveauNom` | `Kill ancienChemin` — si le SaveAs échoue avant le Kill, aucun fichier ne survit        |
| **SavePassword = True**             | 🟠 ÉLEVÉ  | Toutes les connexions                                | Le mot de passe est aussi sauvegardé dans les propriétés de connexion du classeur        |
| **On Error Resume Next** avant Kill | 🟡 MOYEN    | `CopieNumeroLigne`                                 | Les erreurs de suppression sont ignorées silencieusement                                   |
| **Application.Wait 5s**             | 🟡 MOYEN    | `CopieNumeroLigne`                                 | Attente arbitraire de 5 secondes avant le Kill — fragile                                   |
| **Pas de journalisation**           | 🟡 MOYEN    | Toutes les macros                                    | Aucun log des opérations effectuées                                                       |

### 7.8 Recommandations VBA

1. **Remplacer le compte `sa`** par un compte SQL dédié avec droits minimaux (lecture seule sur les vues nécessaires)
2. **Externaliser le mot de passe** dans une variable d'environnement ou un fichier de configuration protégé
3. **Sécuriser la séquence SaveAs/Kill** : vérifier que le SaveAs a réussi AVANT de supprimer l'ancien
4. **Ajouter un journal** (fichier texte ou onglet log) pour tracer les opérations
5. **Désactiver `SavePassword`** et utiliser l'authentification Windows si possible
6. **Remplacer `Application.Wait`** par une vérification d'existence du fichier cible

---

## 8. SYNTHÈSE EN 10 LIGNES

Ce classeur `.xlsm` est un **modèle vierge de suivi de plans de chantier** pour CAA AGENCEMENT. À l'ouverture, une macro VBA demande un code chantier, interroge la base SQL Server Héraklès (ERP) via 5 connexions OLEDB, récupère l'en-tête chantier, les ordres de fabrication, les heures prévues, la nomenclature matériaux et les pointages MO. Les données brutes alimentent des tables structurées dans 4 onglets « techniques ». L'onglet principal **LISTE PLANS** calcule automatiquement via XLOOKUP/SUMIFS les heures prévues vs réalisées pour chaque poste (dessin, métrés, usinage, fabrication, pose). L'onglet **CHANTIER** affiche les informations logistiques et techniques. L'onglet **LISTE QUESTIONS** gère le suivi Q&A du chantier. Le fichier se renomme automatiquement et se déplace dans le dossier OneDrive du chantier. Le risque principal est la **sécurité** : mot de passe admin SQL en clair dans le VBA. Les 20+ noms définis cassés sont des résidus d'un ancien modèle à nettoyer.

---

## 9. GUIDE D'UTILISATION (pas à pas)

### Pour un nouveau chantier :

1. **Ouvrir** le fichier `Liste plans - VIERGE.xlsm`
2. **Activer les macros** quand Excel le demande
3. **Saisir le code chantier** dans la boîte de dialogue qui apparaît
4. **Attendre** : le fichier se connecte à Héraklès, récupère toutes les données, se renomme et se déplace automatiquement
5. **Vérifier** l'onglet CHANTIER : les informations doivent être complètes
6. **Compléter** l'onglet CHANTIER : niveau de plan, matériaux, normes, accès, livraison (cellules jaunes)

### Suivi au quotidien :

1. **Onglet LISTE PLANS** : renseigner les colonnes manuelles (Dessinateur, Fabrication, dates indices, validation, usinage, etc.)
2. **Cliquer sur le bouton MAJ** (macro `MAJChantierHK`) pour rafraîchir les données depuis Héraklès → un message indique si de nouveaux articles ont été ajoutés
3. **Vérifier les indicateurs** en haut : % de dessin (LISTE PLANSAD2), % de validation (LISTE PLANSAD3), totaux heures (LISTE PLANSU4:BA4)
4. **Onglet LISTE QUESTIONS** : ajouter les questions, suivre l'avancement (Non traité → En cours → Terminé)

### Points de vigilance :

* ⚠️ Ne pas modifier les colonnes calculées (fond jaune clair avec formules)
* ⚠️ Ne pas renommer/déplacer les onglets techniques (C701, C700, C621)
* ⚠️ Le fichier doit rester dans le dossier OneDrive du chantier

---

## 10. GLOSSAIRE

| Terme                               | Définition                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| **OF**                        | Ordre de Fabrication — document de production dans l'ERP Héraklès                   |
| **MOE**                       | Main-d'Œuvre d'Études (heures d'études/conception)                                  |
| **DES**                       | Dessin — tâche de conception (code `1MO/DES`)                                      |
| **MET**                       | Métrés — tâche de relevé de mesures (code `1MO/MET`)                            |
| **MOU**                       | Main-d'Œuvre Usinage                                                                  |
| **MOF**                       | Main-d'Œuvre Fabrication                                                              |
| **MOP**                       | Main-d'Œuvre Pose (inclut MAN, POS, PON)                                              |
| **MAN/POS/PON**               | Manutention / Pose jour / Pose nuit                                                    |
| **PG**                        | Poste de Gestion (catégorie de coût MO)                                              |
| **HK**                        | Numéro de ligne Héraklès (clé de liaison entre tables)                             |
| **NumPhaseOF**                | Identifiant phase-OF (clé composite pour SUMIFS)                                      |
| **STTPOSE**                   | Sous-Traitance Pose (code article pour les coûts STT)                                 |
| **Ind / Indice**              | Version du plan (A, B, C…) — chaque colonne `date ind X` correspond à un indice   |
| **OLEDB**                     | Ole Database — technologie de connexion à SQL Server                                 |
| **XLOOKUP**                   | Fonction Excel de recherche avancée (remplace VLOOKUP)                                |
| **SUMIFS**                    | Somme conditionnelle multi-critères                                                   |
| **LET**                       | Fonction Excel permettant de nommer des variables intermédiaires                      |
| **TEXTAFTER**                 | Fonction Excel extrayant le texte après un délimiteur                                |
| **Slicer (Segment)**          | Bouton de filtre visuel cliquable appliqué à un tableau                              |
| **Références structurées** | Syntaxe `Table[Colonne]` ou `[@Colonne]` pour référencer des colonnes de tableau |
| **SUBTOTAL(109,…)**          | Fonction SUM qui ignore les lignes masquées/filtrées                                 |
| **SaveAs**                    | Enregistrement sous un nouveau nom/emplacement                                         |
| **Kill**                      | Instruction VBA pour supprimer un fichier du disque                                    |

## 📋 COMPLÉMENT D'AUDIT — Mises en forme conditionnelles & Validations de données

## 2.6 VALIDATIONS DE DONNÉES (complété)

D'après la capture, les cellules jaunes de l'onglet CHANTIER utilisent des **validations de type Liste** pointant vers des plages de la même feuille :

| Cellule(s)  | Type  | Source         | Valeurs possibles                    | Objectif                                                    |
| ----------- | ----- | -------------- | ------------------------------------ | ----------------------------------------------------------- |
| CHANTIERC11 | Liste | `=$M$3:$M$7` | 1, 2, 3, 4, 5                        | Niveau de plan souhaité                                    |
| CHANTIERC13 | Liste | `=$N$3:$N$6` | inexistant, M1, M2, M3               | Classification feux mobilier                                |
| CHANTIERC14 | Liste | `=$N$3:$N$6` | inexistant, M1, M2, M3               | Classification feux habillage muraux                        |
| CHANTIERC15 | Liste | `=$L$3:$L$4` | Oui, Non                             | Habillage muraux avec échelles                             |
| CHANTIERC16 | Liste | `=$O$3:$O$6` | inexistant, Standard, CF 1/2h, CF 1h | Norme bloc porte                                            |
| CHANTIERC19 | Liste | `=$Q$3:$Q$5` | Oui, Oui doubles, Non                | Porte                                                       |
| CHANTIERC20 | Liste | `=$L$3:$L$4` | Oui, Non                             | Rez de chaussée                                            |
| CHANTIERC27 | Liste | `=$P$3:$P$6` | Semi-remorque, semi, porteur, 20m²  | Type de camion                                              |
| CHANTIERC28 | Liste | `=$L$3:$L$4` | Oui, Non                             | (visible sur la capture — probablement "Besoins chantier") |
| CHANTIERC31 | Liste | `=$L$3:$L$4` | Oui, Non                             | Location d'engins                                           |

> **Point positif** : les listes de validation pointent vers des plages **internes** (colonnes L–Q de CHANTIER), ce qui évite les dépendances externes.
>
> **⚠️ Point d'attention** : les listes sources (L3
>
> , M3
>
> , etc.) sont en texte blanc sur fond blanc — elles sont **volontairement cachées visuellement** mais restent accessibles.

---

## 2.7 MISES EN FORME CONDITIONNELLES (section complète)

### A. Feuille CHANTIER — 25+ règles

Les règles contrôlent principalement la **visibilité dynamique** des champs du formulaire : les cellules s'affichent (fond jaune/blanc) ou se cachent (texte blanc sur blanc) selon les réponses données.

| #  | Type de règle | Condition                                 | S'applique à                     | Format                                          | Objectif                                                                  |
| -- | -------------- | ----------------------------------------- | --------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| 1  | Valeur = 0     | Cellule = 0                               | `$E$12`                         | Fond jaune                                      | Mettre en évidence si date fin non renseignée                           |
| 2  | Formule        | `=$C$20<>"NON"`                         | `$B$21:$J$23`                   | Texte blanc/fond blanc visible                  | Afficher les champs escalier/ascenseur/couloir SI rez-de-chaussée ≠ NON |
| 3  | Formule        | `=$C20<>"NON"`        | `$E$20:$F$20` | (visible)                         | Afficher détails étages si applicable         |                                                                           |
| 4  | Valeur = 0     | Cellule = 0                               | `$C$20` + `$F$20`             | Fond jaune                                      | Surligner si non renseigné                                               |
| 5  | Formule        | `=$C31<>"OUI"`        | `$E$31:$F$31` | Texte blanc                       | Masquer description location si pas de location |                                                                           |
| 6  | Valeur = 0     | Cellule = 0                               | `$F$31`, `$C$31`              | Fond jaune                                      | Surligner si non renseigné                                               |
| 7  | Valeur = 0     | Cellule = 0                               | `$C$28`, `$C$27`, `$C$15`   | Fond jaune                                      | Surligner les champs vides                                                |
| 8  | Formule        | `=$C$22<>"OUI"`                         | `$I$22:$J$22`                   | Masquer profondeur ascenseur                    | Si ascenseur ≠ OUI, cacher dimensions                                    |
| 9  | Formule        | `=$C$22<>"OUI"`                         | `$G$22:$H$22`                   | Masquer hauteur ascenseur                       | Idem                                                                      |
| 10 | Valeur = 0     | Cellule = 0                               | `$J$22`, `$H$22`              | Fond jaune                                      |                                                                           |
| 11 | Formule        | `=$C$19<>"OUI"`                         | `$G$19:$H$19` + `$E$21:$F$19` | Masquer dimensions porte/escalier               | Si pas de porte, cacher largeur/longueur                                  |
| 12 | Valeur = 0     | Cellule = 0                               | `$H$19`, `$F$19`, `$C$15`   | Fond jaune                                      |                                                                           |
| 13 | Formule        | `=$C$16="inexistant"`                   | `$B$16:$C$16`                   | Format spécial                                 | Si norme bloc porte = inexistant                                          |
| 14 | Formule        | `=$C$14="inexistant"`                   | `$B$15:$C$15`                   | Format spécial                                 | Si classif. muraux = inexistant                                           |
| 15 | Valeur = 0     | Cellule = 0                               | `$C$19`, `$C$14`, `$C$13`   | Fond jaune                                      |                                                                           |
| 16 | Valeur = 0     | Cellule = 0                               | `$C$11` + multi-cellules        | Fond jaune                                      |                                                                           |
| 17 | Formule        | `=$C$21=0`                              | `$M$2` + `$N$4:$N$6`          | Masquer listes                                  | Contrôle visuel masqué                                                  |

**Logique globale CHANTIER** : Le formulaire utilise un système de **« champs conditionnels »** — les sous-questions (dimensions porte, escalier, ascenseur, location engins) n'apparaissent que si la question parente est cochée « OUI ». Les cellules non renseignées sont surlignées en **jaune (fond #FFC000)** pour guider l'utilisateur.

---

### B. Tableau ListePlans (LISTE PLANS) — 15 règles

C'est le jeu de règles le plus riche, il pilote le **code couleur de l'avancement** du chantier.

| #  | Type de règle | Condition                                                           | S'applique à            | Format (couleur fond)                                | Objectif                                     |
| -- | -------------- | ------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------- | -------------------------------------------- |
| 1  | Formule        | `=ET(W6<>""; W6>V6)`                                              | `$W$6:$Y$6`            | **Vert**                                       | DES effectués > DES prévus → dépassement |
| 2  | Formule        | `=ET(W6<>""; W6>V6/100*80)`                                       | `$W$6:$Y$6`            | **Orange**                                     | DES effectués > 80% des prévus → alerte   |
| 3  | Contient texte | `"USIN"`                                                          | `$AQ$6`                | **Violet (#CC00CC)**                           | Statut usinage                               |
| 4  | Contient texte | `"PROGRAMMÉ"`                                                    | `$AQ$6`                | **Orange (#FFC000)**                           | Statut programmé                            |
| 5  | Contient texte | `"EN DEBIT"`                                                      | `$AQ$6`                | **Rouge**                                      | Statut en débit                             |
| 6  | Formule        | `=ET($Z6="A faire";F6<>0)`             | `$Z$6:$AM$6;$F$6:$R$6` | **Bleu (#00B0F0)** | État avancement = A faire → toute la ligne en bleu |                                              |
| 7  | Formule        | `=ET($Z6="A modifier";F6<>0)`                                     | idem                     | **Violet (#7030A0)**                           | A modifier                                   |
| 8  | Formule        | `=ET($Z6="En attente";F6<>0)`                                     | idem                     | **Orange (#FFC000)**                           | En attente                                   |
| 9  | Formule        | `=ET($Z6="Validé";F6<>0)`                                        | idem                     | **Vert (#70AD47)**                             | Validé ✅                                   |
| 10 | Formule        | `=ET($Z6="En cours";F6<>0)`                                       | idem                     | **Bleu clair (#00B0F0)**                       | En cours                                     |
| 11 | Formule        | `=ET($Z6="Diffusé à l'archi";F6<>0)`                            | idem                     | **Rose (#FF99FF)**                             | Diffusé à l'architecte                     |
| 12 | Formule        | `=ET($Z6="A diffuser";F6<>0)`                                     | idem                     | **Jaune (#FFFF00)**                            | A diffuser                                   |
| 13 | Formule        | `=$F6=""`                              | `$B$6:$BB$6`           | Fond blanc               | Ligne vide → pas de couleur                         |                                              |
| 14 | Formule        | `=$Z6="supprimé"`                     | `$N$6:$BB$6`           | **Gris hachuré**  | Plan supprimé → barré/gris                        |                                              |
| 15 | Formule        | `=$AO6<>0`                             | `$N$6:$AP$6`           | **Orange fond**    | Fiche fab présente → surligner                     |                                              |

**Correspondance avec la légende en-tête** (cellules LISTE PLANSAA1:AB4 et LISTE PLANSAQ1:AQ4) :

| Couleur             | État avancement (col Z) | État usinage (col AQ) |
| ------------------- | ------------------------ | ---------------------- |
| 🟡 Jaune            | A diffuser               | —                     |
| 🩷 Rose             | Diffusé à l'archi      | —                     |
| 🟠 Orange           | En attente               | —                     |
| 🔵 Bleu             | En cours / A faire       | —                     |
| 🟢 Vert             | Validé                  | —                     |
| 🟣 Violet           | A modifier               | —                     |
| ⬜ Gris hachuré    | Supprimé                | —                     |
| 🔴 Rouge            | —                       | EN DEBIT               |
| 🟠 Orange           | —                       | PROGRAMMÉ             |
| 🟣 Violet (#CC00CC) | —                       | USINÉ                 |

> **⚠️ Point d'attention** : la condition `F6<>0` (OF non vide) empêche la coloration si l'OF n'est pas encore attribué. C'est intentionnel pour éviter de colorier des lignes « fantômes ».

---

### C. Feuille LISTE QUESTIONS / Tableau134 — 4 règles

| # | Condition                  | S'applique à | Format                   | Objectif                        |
| - | -------------------------- | ------------- | ------------------------ | ------------------------------- |
| 1 | Contient « Non traité » | `$M$6`      | **Rouge** fond     | Question non traitée           |
| 2 | Contient « En cours »    | `$M$6`      | **Orange** fond    | Question en cours               |
| 3 | Contient « Terminé »    | `$M$6`      | **Vert** fond      | Question terminée              |
| 4 | Formule `=C6="Chap."`    | `$D$6`      | **Gras fond gris** | Ligne de chapitre (séparateur) |

> **Usage** : la colonne AVANCEMENT (M) utilise un code couleur rouge/orange/vert classique. La formule sur D6 permet d'identifier les lignes « chapitres » pour structurer la liste de questions.

---

### D. Feuille C701_MaterOF / Tableau NomenclatureOF — 1 règle

| # | Condition            | S'applique à | Format              | Objectif                                                                                 |
| - | -------------------- | ------------- | ------------------- | ---------------------------------------------------------------------------------------- |
| 1 | Formule `=R6=VRAI` | `$P$6:$U$6` | **Vert fond** | Si le remplacement est validé (R6 = VRAI), colorer les colonnes de remplacement en vert |

> **Usage** : indique visuellement que la substitution d'article a été confirmée. La même règle s'applique aux deux zones de remplacement (remplac1 et remplac2).

---

## MISE À JOUR DU RÉSUMÉ — Éléments ajoutés

### Statistiques des mises en forme conditionnelles

| Feuille/Tableau               | Nombre de règles     | Complexité                                  |
| ----------------------------- | --------------------- | -------------------------------------------- |
| CHANTIER                      | ~25                   | 🟠 Élevée — formulaire dynamique          |
| ListePlans                    | 15                    | 🔴 Très élevée — pilotage visuel complet |
| LISTE QUESTIONS / Tableau134  | 4                     | 🟢 Simple                                    |
| C701_MaterOF / NomenclatureOF | 1                     | 🟢 Simple                                    |
| **TOTAL**               | **~45 règles** |                                              |

### Recommandations supplémentaires

| # | Recommandation                                                                                                                                                                                                                              | Priorité   |
| - | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1 | **Documenter la légende des couleurs** de ListePlans dans un onglet dédié ou un encadré visible (actuellement en AA1, peu visible)                                                                                                | 🟡 Moyenne  |
| 2 | **Vérifier la cohérence** des règles CHANTIER : certaines conditions se chevauchent (ex : `$C20<>"NON"` vs `$C$20<>"NON"` — l'une est absolue, l'autre mixte)                                                                 | 🟠 Élevée |
| 3 | **Simplifier les règles ListePlans** : les 7 règles d'état avancement (A faire, A modifier, En attente, Validé, En cours, Diffusé, A diffuser) pourraient utiliser une seule règle avec `SWITCH` si Excel le supporte via MFC | 🟡 Moyenne  |
| 4 | **Ajouter « Interrompre si Vrai »** sur les premières règles de ListePlans pour éviter l'empilement de couleurs                                                                                                                  | 🟡 Moyenne  |
| 5 | La règle `=R6=VRAI` sur NomenclatureOF suppose que la cellule R6 contient un booléen — vérifier qu'un VRAI/FAUX est bien présent (et non du texte)                                                                                   | 🟢 Faible   |
