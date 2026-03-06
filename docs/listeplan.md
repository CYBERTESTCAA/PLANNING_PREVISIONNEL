Parfait, j'ai maintenant une vue complète de toute la structure. Voici le détail complet de tout ce que tu dois savoir :

---

## 📋 STRUCTURE COMPLÈTE DE LA FEUILLE "LISTE PLANS"

### 🔑 Principe général

Tu importes des **OF (Ordres de Fabrication)** depuis le Warehouse. Chaque OF contient  **un ou plusieurs articles** . Selon le nombre d'articles, tu crées **une ou plusieurs lignes de plan** pour chaque OF. Les données du Warehouse alimentent les onglets cachés (`C701_OuvraOF`, `C701_MaterOF`, `C700-3-TachesCum`, `C621_MODetail`) et les formules de la liste font le reste automatiquement.

---

### 📌 COLONNES À REMPLIR MANUELLEMENT vs AUTOMATIQUES

#### 🟢 Colonnes AUTOMATIQUES (formules, NE PAS TOUCHER)

| Colonne        | En-tête                        | Source                                      |
| -------------- | ------------------------------- | ------------------------------------------- |
| LISTE PLANSB5  | **NumPhaseOF**            | XLOOKUP vers LISTEOF                        |
| LISTE PLANSC5  | **NumPhase**              | XLOOKUP vers LISTEOF                        |
| LISTE PLANSD5  | **numOrdre**              | XLOOKUP vers LISTEOF                        |
| LISTE PLANSF5  | **OF**                    | XLOOKUP N° OF depuis LISTEOF               |
| LISTE PLANSO5  | **N°Article**            | XLOOKUP vers LISTEOF                        |
| LISTE PLANSP5  | **DESIGNATION MOBILIERS** | XLOOKUP du titre depuis LISTEOF             |
| LISTE PLANSQ5  | **Qté**                  | XLOOKUP quantité depuis LISTEOF            |
| LISTE PLANSR5  | **Ind** (indice courant)  | Calculé auto depuis les colonnes d'indices |
| LISTE PLANSU5  | **MOE prévues**          | SUMIFS depuis H.OF (heures MO)              |
| LISTE PLANSV5  | **dont DES prévus**      | SUMIFS filtre tâche "1MO/DES"              |
| LISTE PLANSW5  | **DES effectués**        | SUMIFS depuis T.PASSES                      |
| LISTE PLANSX5  | **dont MET prévues**     | SUMIFS filtre tâche "1MO/MET"              |
| LISTE PLANSY5  | **MET effectuées**       | SUMIFS depuis T.PASSES                      |
| LISTE PLANSAR5 | **H USINAGE**             | SUMIFS depuis H.OF (PG="MOU")               |
| LISTE PLANSAT5 | **H FAB**                 | SUMIFS depuis H.OF (PG="MOF")               |
| LISTE PLANSAX5 | **H MANUTENTION**         | SUMIFS depuis H.OF (PG="MOP", tâche MAN)   |
| LISTE PLANSAY5 | **H POSE**                | SUMIFS depuis H.OF (PG="MOP", tâche POS)   |
| LISTE PLANSAZ5 | **€ POSE STT**           | SUMIFS depuis NomenclatureOF                |
| LISTE PLANSBA5 | **H POSE NUIT**           | SUMIFS depuis H.OF (tâche PON)             |

---

#### 🔵 Colonnes À REMPLIR MANUELLEMENT

| Colonne                        | En-tête                 | Ce qu'il faut saisir                                                                                                                                   |
| ------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LISTE PLANSE5                  | **HK**             | 🔴**Clé principale** — N° de ligne HK (identifiant unique de l'article dans le Warehouse). C'est LE champ qui déclenche toutes les formules. |
| LISTE PLANSG5 à LISTE PLANSM5 | **Cart1 à Cart7** | N° de cartouches (repères plans). Tu peux avoir jusqu'à 7 cartouches par ligne de plan.                                                             |
| LISTE PLANSN5                  | **N°Plans**       | Numéro de plan attribué                                                                                                                              |

---

### 👤 CHAMPS DESSINATEURS — Colonne LISTE PLANSS5

**En-tête** : `DESSINATEUR` (fond bleu 🔵)

**Ce qu'il faut saisir** : Le nom du dessinateur assigné à ce plan.

**Pour gérer la liste des dessinateurs** (ajouter/archiver) :

* **Format** : `Nom Prénom — SOCIÉTÉ` (ex. :  *Dupont Jean — ARCHI PLUS* )
* **Ajouter** un dessinateur = l'ajouter dans la liste de validation de données de cette colonne
* **Archiver** un dessinateur = le retirer de la liste active (mais garder l'historique sur les lignes existantes)

> 💡 La liste déroulante de validation doit être gérée (probablement via un onglet de paramétrage ou une plage nommée à créer).

---

### 🏭 CHAMPS FABRICATION — Colonne LISTE PLANST5

**En-tête** : `FABRICATION` (fond orange 🟠)

**Ce qu'il faut saisir** : Le lieu/mode de fabrication parmi :

* **FILIALE** (fabrication en interne, dans une filiale du groupe)
* **SOUS-TRAITANT** (fabrication externalisée)
* **LES DEUX** (fabrication mixte filiale + sous-traitant)

> 💡 Là aussi, idéalement une liste de validation de données avec ces 3 choix.

---

### 📐 INDICES — Colonnes LISTE PLANSAA5 à LISTE PLANSAL5

C'est le **suivi des indices de révision** du plan (de A à J + dernier indice) :

| Colonne                          | En-tête                       | Ce qu'il faut saisir                                     |
| -------------------------------- | ------------------------------ | -------------------------------------------------------- |
| LISTE PLANSAA5                   | **date PRÉVISIONNELLE** | Date prévue de diffusion                                |
| LISTE PLANSAB5                   | **date ind A**           | Date de diffusion de l'indice A                          |
| LISTE PLANSAC5                   | **date ind B**           | Date de diffusion de l'indice B                          |
| LISTE PLANSAD5                   | **date ind C**           | Date de l'indice C                                       |
| LISTE PLANSAE5 à LISTE PLANSAJ5 | **date ind D à J**      | Dates des indices suivants                               |
| LISTE PLANSAL5                   | **Dernier indice**       | Champ texte — ex. "A", "B", "C"... dernier indice émis |

**Format** : Champ **date** pour chaque indice + champ **texte** pour le dernier indice.

> Le "fameux en début de ligne" dont tu parles, c'est la colonne LISTE PLANSR5 **Ind** qui se calcule automatiquement depuis ces colonnes (elle extrait la dernière lettre d'indice renseignée).

---

### ⏱ TEMPS — Colonnes LISTE PLANSU5 à LISTE PLANSY5

Voici le détail avec les sources (WEB = interface web / HK = Warehouse HeraklesERP) :

| Colonne       | En-tête                    | Source         | Description                                 |
| ------------- | --------------------------- | -------------- | ------------------------------------------- |
| LISTE PLANSU5 | **MOE prévues**      | 🌐 WEB (total) | Heures MOE totales prévues sur l'OF        |
| LISTE PLANSV5 | **dont DES prévus**  | 📦 HK          | Heures Dessin prévues (tâche 1MO/DES)     |
| LISTE PLANSW5 | **DES effectués**    | 📦 HK          | Heures Dessin réellement passées          |
| LISTE PLANSX5 | **dont MET prévues** | 📦 HK          | Heures Méthodes/Gestion prévues (1MO/MET) |
| LISTE PLANSY5 | **MET effectuées**   | 📦 HK          | Heures Méthodes réellement passées       |

> **Tout est automatique via formules SUMIFS** qui pointent vers les tables `H.OF` et `T.PASSES`. Tu n'as rien à saisir ici.

Il te manquait dans ta liste le **% estimé** → c'est probablement la colonne LISTE PLANSZ5 **Etat avancement** qui doit être remplie manuellement.

---

### 📊 ÉTAT AVANCEMENT — Colonne LISTE PLANSZ5

**Ce qu'il faut saisir** — un code couleur/statut parmi la légende en haut de la feuille :

| Couleur       | Statut                        |
| ------------- | ----------------------------- |
| 🟡 Jaune      | **A diffuser**          |
| 🟣 Rose       | **Diffusé à l'archi** |
| 🟠 Orange     | **En attente**          |
| 🔵 Bleu clair | **En cours**            |
| ⬜ Gris       | **Supprimé**           |
| 🟢 Vert       | **Validé**             |
| 🟣 Violet     | **A modifier**          |
| 🔴 Rouge      | **A faire**             |

---

### 📋 AUTRES COLONNES À REMPLIR

| Colonne        | En-tête                         | Ce qu'il faut saisir                           |
| -------------- | -------------------------------- | ---------------------------------------------- |
| LISTE PLANSAM5 | **VALIDATION**             | Validation du plan (date ou statut)            |
| LISTE PLANSAN5 | **N° FICHE**              | Numéro de fiche fabrication                   |
| LISTE PLANSAO5 | **DATE FICHE FAB**         | Date de la fiche de fabrication                |
| LISTE PLANSAP5 | **SOUS TRAITANCE**         | Info sous-traitance liée                      |
| LISTE PLANSAQ5 | **USINAGE**                | État usinage : EN DEBIT / PROGRAMMÉ / USINÉ |
| LISTE PLANSAS5 | **RESPONSABLE MONTAGE**    | Nom du responsable montage                     |
| LISTE PLANSAU5 | **DATE DE DEPART ATELIER** | Date de départ de l'atelier                   |
| LISTE PLANSAV5 | **PALETISATION**           | Info palettisation                             |
| LISTE PLANSAW5 | **LIVRE SUR CHANTIER**     | Date/confirmation livraison chantier           |

---

### 📝 RÉSUMÉ — CHECKLIST DE SAISIE

**Pour chaque ligne de plan, tu dois remplir :**

1. ✅ **LISTE PLANSE5 — HK** (clé de liaison, OBLIGATOIRE)
2. ✅ **LISTE PLANSG5 — Cart1 à Cart7** (numéros de cartouches)
3. ✅ **LISTE PLANSN5 — N° Plans**
4. ✅ **LISTE PLANSS5 — DESSINATEUR** (Nom Prénom — SOCIÉTÉ)
5. ✅ **LISTE PLANST5 — FABRICATION** (Filiale / Sous-traitant / Les deux)
6. ✅ **LISTE PLANSZ5 — État avancement** (selon la légende couleur)
7. ✅ **LISTE PLANSAA5 — Dates d'indices** (date prévisionnelle + dates indices A à J)
8. ✅ **LISTE PLANSAL5 — Dernier indice** (texte : A, B, C...)
9. ✅ **LISTE PLANSAM5 — VALIDATION**
10. ✅ **LISTE PLANSAN5 — Fiches fab + sous-traitance**
11. ✅ **LISTE PLANSAQ5 — USINAGE** (EN DEBIT / PROGRAMMÉ / USINÉ)
12. ✅ **LISTE PLANSAS5 — Responsable montage**
13. ✅ **LISTE PLANSAU5 — Départ atelier / Palettisation / Livraison**

**Tout le reste se calcule automatiquement** grâce aux données importées du Warehouse ! 🎯



Parfait, j'ai maintenant la correspondance exacte entre les onglets Excel et tes tables Warehouse. Voici le guide complet adapté à ton stack.

---

## 🎯 ARCHITECTURE POUR TON STACK EXACT

**React + Node.js + TypeScript + SQLite (34 tables Warehouse)**

### Principe clé : tu ne dupliques PAS les données

Tes 34 tables SQLite **sont** ta source de vérité. Tu ajoutes juste **quelques tables complémentaires** pour les données qui n'existent PAS dans le Warehouse (dessinateurs, états d'avancement, indices, validation, etc.).

---

## 1. 📦 MAPPING TABLES WAREHOUSE → EXCEL

Voici la correspondance exacte entre tes onglets Excel et tes tables SQLite existantes :

| Onglet Excel                      | Table Warehouse probable                | Colonnes clés                                              |
| --------------------------------- | --------------------------------------- | ----------------------------------------------------------- |
| `C701_OuvraOF` (LISTEOF)        | **`T701` ou `OuvraOF`**       | NumLig, NumPhase, NumPhaseOF, CodeOF, Titre, Qte2, numOrdre |
| `C700-3-TachesCum` (H.OF)       | **`T700_3` ou `TachesCum`**   | NumPhaseOF, CodePhase, PG, CodeTache, HeuresMoChantier      |
| `C701_MaterOF` (NomenclatureOF) | **`T701_Mater` ou `MaterOF`** | NumPhaseOF, CodeOF, CODEARTICLE, Qté, Mt                   |
| `C621_MODetail` (T.PASSES)      | **`T621` ou `MODetail`**      | CodeChantier, CodePhase, CodeTache, Qte                     |
| `C601-Chantier`                 | **`T601` ou `Chantier`**      | Code chantier, Titre, Adresse, CP, Ville, délai...         |

---

## 2. 🗃️ TABLES À AJOUTER (ce qui n'existe pas dans le Warehouse)

```
-- ═══════════════════════════════════════════════════════
-- TABLES COMPLÉMENTAIRES (à ajouter à ta DB SQLite)
-- ═══════════════════════════════════════════════════════

-- ★ TABLE PRINCIPALE : les plans (une ligne = un plan pour un article d'un OF)
CREATE TABLE plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
  
    -- Lien vers le Warehouse (clés existantes)
    hk TEXT NOT NULL,                    -- NumLig du Warehouse = clé de liaison
    num_phase TEXT,                      -- Récupéré du WH
    num_phase_of TEXT,                   -- Récupéré du WH
    code_chantier TEXT NOT NULL,         -- FK vers ta table chantier WH
  
    -- Cartouches (saisie manuelle)
    num_plan TEXT,
    cart1 TEXT, cart2 TEXT, cart3 TEXT, cart4 TEXT,
    cart5 TEXT, cart6 TEXT, cart7 TEXT,
  
    -- Affectation (saisie manuelle)
    dessinateur_id INTEGER REFERENCES dessinateurs(id),
    fabrication_type TEXT CHECK (
        fabrication_type IN ('FILIALE', 'SOUS_TRAITANT', 'LES_DEUX')
    ),
  
    -- État d'avancement
    etat_avancement TEXT DEFAULT 'A_FAIRE' CHECK (etat_avancement IN (
        'A_DIFFUSER', 'DIFFUSE_ARCHI', 'EN_ATTENTE', 'EN_COURS',
        'SUPPRIME', 'VALIDE', 'A_MODIFIER', 'A_FAIRE'
    )),
  
    -- Validation
    date_validation DATE,
  
    -- Fiches fabrication
    num_fiche TEXT,
    date_fiche_fab DATE,
    sous_traitance TEXT,
  
    -- Usinage
    etat_usinage TEXT CHECK (
        etat_usinage IN ('EN_DEBIT', 'PROGRAMME', 'USINE')
    ),
  
    -- Montage & Livraison
    responsable_montage TEXT,
    date_depart_atelier DATE,
    paletisation TEXT,
    date_livraison_chantier DATE,
  
    -- Dates prévisionnelles
    date_previsionnelle DATE,
  
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- INDICES de révision (historique complet)
CREATE TABLE plan_indices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    indice TEXT NOT NULL,               -- 'A', 'B', 'C'...
    date_indice DATE NOT NULL,
    commentaire TEXT,                    -- Pourquoi cette révision
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, indice)             -- Un seul indice A par plan
);

-- DESSINATEURS (avec archivage)
CREATE TABLE dessinateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    societe TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,         -- 1=actif, 0=archivé
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- FABRICANTS (filiales et sous-traitants)
CREATE TABLE fabricants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('FILIALE', 'SOUS_TRAITANT')),
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Junction table si un plan a plusieurs fabricants
CREATE TABLE plan_fabricants (
    plan_id INTEGER REFERENCES plans(id) ON DELETE CASCADE,
    fabricant_id INTEGER REFERENCES fabricants(id),
    PRIMARY KEY (plan_id, fabricant_id)
);

-- INDEX pour les performances
CREATE INDEX idx_plans_hk ON plans(hk);
CREATE INDEX idx_plans_chantier ON plans(code_chantier);
CREATE INDEX idx_plans_etat ON plans(etat_avancement);
CREATE INDEX idx_plan_indices_plan ON plan_indices(plan_id);
```

---

## 3. 🔌 BACKEND — API Node.js + TypeScript

### Structure du projet

`server/ ├── src/ │ ├── db/ │ │ ├── database.ts # Connexion SQLite (better-sqlite3) │ │ └── queries/ │ │ ├── plans.queries.ts # Requêtes plans │ │ ├── warehouse.queries.ts # Lecture tables WH │ │ └── dessinateurs.queries.ts │ ├── routes/ │ │ ├── plans.routes.ts │ │ ├── warehouse.routes.ts │ │ └── dessinateurs.routes.ts │ ├── types/ │ │ └── index.ts # Types partagés │ └── index.ts # Point d'entrée Express`### Types TypeScript partagés

```
// types/index.ts

// ═══ Ce qui vient du Warehouse (READ ONLY) ═══
export interface WarehouseOF {
  NumLig: string;          // = HK
  NumPhase: string;
  NumPhaseOF: string;
  CodeOF: string;
  numOrdre: string;
  Titre: string;           // Désignation mobilier
  Qte2: number;
  descriptifTechnique: string;
  typeLigne: string;
  Repere1: string;
  Repere2: string;
}

export interface WarehouseHeures {
  NumPhaseOF: string;
  CodePhase: string;
  PG: string;              // MOE, MOU, MOF, MOP
  CodeTache: string;       // 1MO/DES, 1MO/MET, etc.
  HeuresMoChantier: number;
}

export interface WarehouseTempsPass {
  CodeChantier: string;
  CodeSalarie: string;
  CodePhase: string;       // = N° OF
  CodeTache: string;
  Qte: number;             // Heures passées
}

export interface WarehouseNomenclature {
  NumPhaseOF: string;
  CodeOF: string;
  numLignePiece: string;
  CODEARTICLE: string;
  Titre: string;
  Mt: number;
}

// ═══ Ce qu'on ajoute nous (READ/WRITE) ═══
export type EtatAvancement =
  | 'A_DIFFUSER' | 'DIFFUSE_ARCHI' | 'EN_ATTENTE' | 'EN_COURS'
  | 'SUPPRIME' | 'VALIDE' | 'A_MODIFIER' | 'A_FAIRE';

export type EtatUsinage = 'EN_DEBIT' | 'PROGRAMME' | 'USINE';
export type FabricationType = 'FILIALE' | 'SOUS_TRAITANT' | 'LES_DEUX';

export interface Dessinateur {
  id: number;
  nom: string;
  prenom: string;
  societe: string;
  is_active: boolean;
  fullName?: string;       // Computed: "Dupont Jean — ARCHI+"
}

export interface PlanIndice {
  id: number;
  plan_id: number;
  indice: string;
  date_indice: string;
  commentaire?: string;
}

export interface Plan {
  id: number;
  hk: string;
  num_phase: string;
  num_phase_of: string;
  code_chantier: string;
  num_plan?: string;
  cartouches: string[];    // [cart1..cart7] filtrés
  dessinateur_id?: number;
  fabrication_type?: FabricationType;
  etat_avancement: EtatAvancement;
  date_previsionnelle?: string;
  date_validation?: string;
  num_fiche?: string;
  date_fiche_fab?: string;
  sous_traitance?: string;
  etat_usinage?: EtatUsinage;
  responsable_montage?: string;
  date_depart_atelier?: string;
  paletisation?: string;
  date_livraison_chantier?: string;
}

// ═══ Vue enrichie (Plan + données Warehouse calculées) ═══
export interface PlanComplet extends Plan {
  // Du Warehouse (lecture)
  of: string;
  designation: string;
  quantite: number;
  num_article: string;
  
  // Dessinateur (jointure)
  dessinateur?: Dessinateur;
  
  // Indices (jointure)
  indices: PlanIndice[];
  dernier_indice?: string;
  
  // Heures calculées depuis le Warehouse
  heures: {
    moe_prevues: number;
    des_prevu: number;
    des_effectue: number;
    met_prevu: number;
    met_effectue: number;
    h_usinage: number;
    h_fab: number;
    h_manutention: number;
    h_pose: number;
    euro_pose_stt: number;
    h_pose_nuit: number;
  };
}
```

### Requêtes principales (la magie)

```
// db/queries/plans.queries.ts
import Database from 'better-sqlite3';

export class PlanQueries {
  constructor(private db: Database.Database) {}

  // ★ LA REQUÊTE PRINCIPALE — équivalent de toute la feuille LISTE PLANS
  getPlansComplets(codeChantier: string): PlanComplet[] {
  
    // 1. Récupérer les plans avec données Warehouse jointes
    const plans = this.db.prepare(`
      SELECT 
        p.*,
      
        -- Données Warehouse (LISTEOF = ta table OuvraOF)
        wh.CodeOF as of,
        wh.Titre as designation,
        wh.Qte2 as quantite,
        wh.numOrdre as num_article,
      
        -- Dessinateur
        d.nom as dessinateur_nom,
        d.prenom as dessinateur_prenom,
        d.societe as dessinateur_societe,
      
        -- Dernier indice
        (SELECT indice FROM plan_indices 
         WHERE plan_id = p.id 
         ORDER BY date_indice DESC LIMIT 1) as dernier_indice,
       
        -- ═══ HEURES (équivalent des SUMIFS Excel) ═══
      
        -- MOE prévues = SUMIFS(H.OF[Heures], NumPhaseOF, PG="MOE")
        COALESCE((SELECT SUM(HeuresMoChantier) 
         FROM TachesCum WHERE NumPhaseOF = p.num_phase_of 
         AND PG = 'MOE'), 0) as moe_prevues,
      
        -- DES prévus = SUMIFS(H.OF[Heures], NumPhaseOF, CodeTache="1MO/DES")
        COALESCE((SELECT SUM(HeuresMoChantier) 
         FROM TachesCum WHERE NumPhaseOF = p.num_phase_of 
         AND CodeTache = '1MO/DES'), 0) as des_prevu,
      
        -- DES effectués = SUMIFS(T.PASSES[Qte], CodePhase=OF, CodeTache="1MO/DES") / nb plans dans OF
        COALESCE((SELECT SUM(Qte) FROM MODetail 
         WHERE CodePhase = wh.CodeOF 
         AND CodeTache = '1MO/DES'), 0) 
         / MAX(1, (SELECT COUNT(*) FROM plans WHERE code_chantier = p.code_chantier 
                   AND num_phase_of = p.num_phase_of)) as des_effectue,
      
        -- MET prévues
        COALESCE((SELECT SUM(HeuresMoChantier) 
         FROM TachesCum WHERE NumPhaseOF = p.num_phase_of 
         AND CodeTache = '1MO/MET'), 0) as met_prevu,
      
        -- MET effectuées
        COALESCE((SELECT SUM(Qte) FROM MODetail 
         WHERE CodePhase = wh.CodeOF 
         AND CodeTache = '1MO/MET'), 0)
         / MAX(1, (SELECT COUNT(*) FROM plans WHERE code_chantier = p.code_chantier 
                   AND num_phase_of = p.num_phase_of)) as met_effectue,
      
        -- H USINAGE (PG="MOU")
        COALESCE((SELECT SUM(HeuresMoChantier) 
         FROM TachesCum WHERE NumPhaseOF = p.num_phase_of 
         AND PG = 'MOU'), 0) as h_usinage,
      
        -- H FAB (PG="MOF")
        COALESCE((SELECT SUM(HeuresMoChantier) 
         FROM TachesCum WHERE NumPhaseOF = p.num_phase_of 
         AND PG = 'MOF'), 0) as h_fab,
      
        -- H MANUTENTION (PG="MOP", CodeTache LIKE "%MAN")
        COALESCE((SELECT SUM(HeuresMoChantier) 
         FROM TachesCum WHERE NumPhaseOF = p.num_phase_of 
         AND PG = 'MOP' AND CodeTache LIKE '%MAN'), 0) as h_manutention,
      
        -- H POSE (PG="MOP", CodeTache LIKE "%POS")
        COALESCE((SELECT SUM(HeuresMoChantier) 
         FROM TachesCum WHERE NumPhaseOF = p.num_phase_of 
         AND PG = 'MOP' AND CodeTache LIKE '%POS'), 0) as h_pose,
      
        -- € POSE STT
        COALESCE((SELECT SUM(Mt) FROM MaterOF 
         WHERE numLignePiece = p.hk 
         AND CODEARTICLE = 'STTPOSE'), 0) as euro_pose_stt,
      
        -- H POSE NUIT (PG="MOP", CodeTache LIKE "%PON")
        COALESCE((SELECT SUM(HeuresMoChantier) 
         FROM TachesCum WHERE NumPhaseOF = p.num_phase_of 
         AND PG = 'MOP' AND CodeTache LIKE '%PON'), 0) as h_pose_nuit

      FROM plans p
    
      -- Jointure Warehouse : LISTEOF
      LEFT JOIN OuvraOF wh ON wh.NumLig = p.hk
    
      -- Jointure Dessinateur
      LEFT JOIN dessinateurs d ON d.id = p.dessinateur_id
    
      WHERE p.code_chantier = ?
      ORDER BY p.hk ASC
    `).all(codeChantier);

    // 2. Charger les indices pour chaque plan
    const indicesStmt = this.db.prepare(`
      SELECT * FROM plan_indices WHERE plan_id = ? ORDER BY date_indice ASC
    `);

    return plans.map((plan: any) => ({
      ...plan,
      cartouches: [plan.cart1, plan.cart2, plan.cart3, plan.cart4, 
                   plan.cart5, plan.cart6, plan.cart7].filter(Boolean),
      dessinateur: plan.dessinateur_nom ? {
        id: plan.dessinateur_id,
        nom: plan.dessinateur_nom,
        prenom: plan.dessinateur_prenom,
        societe: plan.dessinateur_societe,
        fullName: `${plan.dessinateur_nom} ${plan.dessinateur_prenom} — ${plan.dessinateur_societe}`
      } : undefined,
      indices: indicesStmt.all(plan.id),
      heures: {
        moe_prevues: plan.moe_prevues,
        des_prevu: plan.des_prevu,
        des_effectue: plan.des_effectue,
        met_prevu: plan.met_prevu,
        met_effectue: plan.met_effectue,
        h_usinage: plan.h_usinage,
        h_fab: plan.h_fab,
        h_manutention: plan.h_manutention,
        h_pose: plan.h_pose,
        euro_pose_stt: plan.euro_pose_stt,
        h_pose_nuit: plan.h_pose_nuit,
      }
    }));
  }

  // Import OF : récupère les articles du Warehouse et crée les lignes de plans
  importOF(codeChantier: string, hks: string[]): Plan[] {
    const insertPlan = this.db.prepare(`
      INSERT INTO plans (hk, num_phase, num_phase_of, code_chantier)
      SELECT NumLig, NumPhase, NumPhaseOF, ?
      FROM OuvraOF
      WHERE NumLig = ?
      AND NumLig NOT IN (SELECT hk FROM plans WHERE code_chantier = ?)
    `);

    const transaction = this.db.transaction((hks: string[]) => {
      for (const hk of hks) {
        insertPlan.run(codeChantier, hk, codeChantier);
      }
    });

    transaction(hks);
    return this.getPlansComplets(codeChantier);
  }
}
```

### Routes Express

```
// routes/plans.routes.ts
import { Router } from 'express';
import { PlanQueries } from '../db/queries/plans.queries';

export function planRoutes(db: Database.Database): Router {
  const router = Router();
  const queries = new PlanQueries(db);

  // Liste complète des plans d'un chantier
  router.get('/chantiers/:code/plans', (req, res) => {
    const plans = queries.getPlansComplets(req.params.code);
    res.json(plans);
  });

  // OF disponibles dans le Warehouse (pas encore importés)
  router.get('/chantiers/:code/of-disponibles', (req, res) => {
    const ofs = db.prepare(`
      SELECT NumLig as hk, CodeOF, Titre, Qte2, NumPhaseOF
      FROM OuvraOF 
      WHERE NumLig NOT IN (SELECT hk FROM plans WHERE code_chantier = ?)
      ORDER BY CodeOF, NumLig
    `).all(req.params.code);
    res.json(ofs);
  });

  // Importer des OF → créer les lignes de plans
  router.post('/chantiers/:code/plans/import', (req, res) => {
    const { hks } = req.body; // ["HK001", "HK002", ...]
    const plans = queries.importOF(req.params.code, hks);
    res.json(plans);
  });

  // Modifier un plan (saisie manuelle)
  router.patch('/plans/:id', (req, res) => {
    const fields = req.body; // { dessinateur_id, etat_avancement, ... }
    const sets = Object.keys(fields)
      .map(k => `${k} = @${k}`)
      .join(', ');
  
    db.prepare(`
      UPDATE plans SET ${sets}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = @id
    `).run({ ...fields, id: req.params.id });
  
    res.json({ success: true });
  });

  // Ajouter un indice
  router.post('/plans/:id/indices', (req, res) => {
    const { indice, date_indice, commentaire } = req.body;
    const result = db.prepare(`
      INSERT INTO plan_indices (plan_id, indice, date_indice, commentaire)
      VALUES (?, ?, ?, ?)
    `).run(req.params.id, indice, date_indice, commentaire);
  
    res.json({ id: result.lastInsertRowid });
  });

  return router;
}

// routes/dessinateurs.routes.ts
export function dessinateurRoutes(db: Database.Database): Router {
  const router = Router();

  // Liste (actifs par défaut, ?all=true pour inclure archivés)
  router.get('/dessinateurs', (req, res) => {
    const where = req.query.all ? '' : 'WHERE is_active = 1';
    res.json(db.prepare(`SELECT * FROM dessinateurs ${where} ORDER BY nom`).all());
  });

  // Ajouter
  router.post('/dessinateurs', (req, res) => {
    const { nom, prenom, societe } = req.body;
    const result = db.prepare(
      'INSERT INTO dessinateurs (nom, prenom, societe) VALUES (?, ?, ?)'
    ).run(nom, prenom, societe);
    res.json({ id: result.lastInsertRowid });
  });

  // Archiver / Réactiver
  router.patch('/dessinateurs/:id/toggle-archive', (req, res) => {
    db.prepare(
      'UPDATE dessinateurs SET is_active = NOT is_active WHERE id = ?'
    ).run(req.params.id);
    res.json({ success: true });
  });

  return router;
}
```

---

## 4. 🎨 FRONTEND REACT — Composants principaux

### Structure

`client/src/ ├── pages/ │ └── ListePlans/ │ ├── ListePlansPage.tsx # Page principale │ ├── PlansTable.tsx # Tableau principal │ ├── ImportOFModal.tsx # Modal import OF │ ├── PlanEditDrawer.tsx # Panneau édition d'un plan │ ├── IndiceTimeline.tsx # Timeline des indices │ ├── HeuresBar.tsx # Barre de progression heures │ ├── EtatBadge.tsx # Badge état avancement │ └── StatsBar.tsx # Barre de stats en haut ├── components/ │ ├── DessinateursPanel.tsx │ └── FabricantSelector.tsx ├── hooks/ │ ├── usePlans.ts # React Query hook │ ├── useDessinateurs.ts │ └── useWarehouse.ts └── types/ └── index.ts # Types partagés (ceux du serveur)`### Page principale

```
// pages/ListePlans/ListePlansPage.tsx
import { useState } from 'react';
import { usePlans } from '../../hooks/usePlans';
import { PlansTable } from './PlansTable';
import { ImportOFModal } from './ImportOFModal';
import { PlanEditDrawer } from './PlanEditDrawer';
import { StatsBar } from './StatsBar';
import type { PlanComplet, EtatAvancement } from '../../types';

export function ListePlansPage({ codeChantier }: { codeChantier: string }) {
  const { data: plans, isLoading, refetch } = usePlans(codeChantier);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanComplet | null>(null);
  
  // Filtres
  const [filtreEtat, setFiltreEtat] = useState<EtatAvancement | 'TOUS'>('TOUS');
  const [filtreDessinateur, setFiltreDessinateur] = useState<number | null>(null);
  const [recherche, setRecherche] = useState('');

  const plansFiltres = (plans ?? []).filter(p => {
    if (filtreEtat !== 'TOUS' && p.etat_avancement !== filtreEtat) return false;
    if (filtreDessinateur && p.dessinateur_id !== filtreDessinateur) return false;
    if (recherche) {
      const q = recherche.toLowerCase();
      return p.designation?.toLowerCase().includes(q) 
        || p.of?.toLowerCase().includes(q)
        || p.hk?.toLowerCase().includes(q)
        || p.num_plan?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col h-screen bg-gray-50">
    
      {/* ═══ EN-TÊTE CHANTIER ═══ */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Liste des Plans
          </h1>
          <p className="text-sm text-blue-600 font-medium">
            {/* Nom chantier récupéré du Warehouse */}
            Chantier {codeChantier}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setImportOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg
                       hover:bg-blue-700 flex items-center gap-2"
          >
            📥 Importer des OF
          </button>
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg
                             hover:bg-gray-200">
            📤 Exporter
          </button>
        </div>
      </header>

      {/* ═══ STATS RÉSUMÉ ═══ */}
      <StatsBar plans={plansFiltres} />

      {/* ═══ FILTRES ═══ */}
      <div className="px-6 py-3 bg-white border-b flex items-center gap-4">
        <input
          type="text"
          placeholder="🔍 Rechercher par désignation, OF, HK, n° plan..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <EtatFilter value={filtreEtat} onChange={setFiltreEtat} />
        <DessinateurFilter value={filtreDessinateur} onChange={setFiltreDessinateur} />
      </div>

      {/* ═══ TABLEAU PRINCIPAL ═══ */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <PlansTable 
          plans={plansFiltres}
          onRowClick={setSelectedPlan}
          onRefresh={refetch}
          isLoading={isLoading}
        />
      </div>

      {/* ═══ MODALES ═══ */}
      <ImportOFModal 
        open={importOpen} 
        onClose={() => setImportOpen(false)}
        codeChantier={codeChantier}
        onImported={refetch}
      />
    
      <PlanEditDrawer
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onSaved={refetch}
      />
    </div>
  );
}
```

### Composant EtatBadge (remplace les codes couleur Excel)

```
// pages/ListePlans/EtatBadge.tsx
import type { EtatAvancement } from '../../types';

const ETATS_CONFIG: Record<EtatAvancement, { 
  label: string; color: string; bg: string; icon: string 
}> = {
  A_FAIRE:       { label: 'À faire',        color: 'text-white',    bg: 'bg-red-500',     icon: '📋' },
  EN_COURS:      { label: 'En cours',        color: 'text-white',    bg: 'bg-sky-500',     icon: '🔵' },
  A_DIFFUSER:    { label: 'À diffuser',      color: 'text-gray-800', bg: 'bg-yellow-300',  icon: '📤' },
  DIFFUSE_ARCHI: { label: 'Diffusé archi',   color: 'text-white',    bg: 'bg-fuchsia-400', icon: '📐' },
  EN_ATTENTE:    { label: 'En attente',      color: 'text-gray-800', bg: 'bg-orange-400',  icon: '⏳' },
  A_MODIFIER:    { label: 'À modifier',      color: 'text-white',    bg: 'bg-purple-600',  icon: '✏️' },
  VALIDE:        { label: 'Validé',          color: 'text-white',    bg: 'bg-green-600',   icon: '✅' },
  SUPPRIME:      { label: 'Supprimé',        color: 'text-gray-500', bg: 'bg-gray-300',    icon: '🗑️' },
};

export function EtatBadge({ 
  etat, 
  onClick,
  size = 'sm' 
}: { 
  etat: EtatAvancement; 
  onClick?: () => void;
  size?: 'sm' | 'md';
}) {
  const config = ETATS_CONFIG[etat];
  
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${config.bg} ${config.color}
        ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
        ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
        transition-opacity
      `}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </button>
  );
}

// Sélecteur d'état (dropdown cliquable avec les pastilles)
export function EtatSelector({ 
  value, 
  onChange 
}: { 
  value: EtatAvancement; 
  onChange: (e: EtatAvancement) => void;
}) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative">
      <EtatBadge etat={value} onClick={() => setOpen(!open)} />
      {open && (
        <div className="absolute z-50 mt-1 bg-white shadow-lg rounded-lg 
                        border p-2 min-w-[180px]">
          {Object.entries(ETATS_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => { onChange(key as EtatAvancement); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 
                         rounded hover:bg-gray-50 text-sm"
            >
              <span className={`w-3 h-3 rounded-full ${config.bg}`} />
              <span>{config.icon} {config.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Timeline des indices (remplace les 12 colonnes Excel)

```
// pages/ListePlans/IndiceTimeline.tsx
import type { PlanIndice } from '../../types';

export function IndiceTimeline({ 
  indices,
  datePrevisionnelle,
  onAddIndice 
}: { 
  indices: PlanIndice[];
  datePrevisionnelle?: string;
  onAddIndice: (indice: string, date: string, comment?: string) => void;
}) {
  const nextIndice = String.fromCharCode(
    65 + indices.length  // A=65, B=66, etc.
  );

  return (
    <div className="space-y-3">
      {/* Ligne de temps visuelle */}
      <div className="flex items-center gap-1">
        {datePrevisionnelle && (
          <div className="flex flex-col items-center mr-4">
            <span className="text-[10px] text-gray-400">Prévu</span>
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center 
                            justify-center text-xs font-bold text-gray-500">
              📅
            </div>
            <span className="text-[10px] text-gray-500 mt-1">
              {new Date(datePrevisionnelle).toLocaleDateString('fr-FR', { 
                day: '2-digit', month: 'short' 
              })}
            </span>
          </div>
        )}
      
        {indices.map((ind, i) => (
          <div key={ind.id} className="flex items-center">
            {i > 0 && <div className="w-6 h-0.5 bg-green-400" />}
            <div className="flex flex-col items-center group relative">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white 
                              flex items-center justify-center text-xs font-bold
                              group-hover:ring-2 ring-green-300 transition-all">
                {ind.indice}
              </div>
              <span className="text-[10px] text-gray-600 mt-1">
                {new Date(ind.date_indice).toLocaleDateString('fr-FR', { 
                  day: '2-digit', month: 'short' 
                })}
              </span>
            
              {/* Tooltip au hover */}
              {ind.commentaire && (
                <div className="hidden group-hover:block absolute bottom-full mb-2 
                                bg-gray-800 text-white text-xs rounded px-2 py-1 
                                whitespace-nowrap">
                  {ind.commentaire}
                </div>
              )}
            </div>
          </div>
        ))}
      
        {/* Bouton ajouter prochain indice */}
        <div className="flex items-center">
          {indices.length > 0 && <div className="w-6 h-0.5 bg-gray-300 border-dashed" />}
          <button
            onClick={() => {/* ouvrir modal ajout */}}
            className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 
                       flex items-center justify-center text-xs font-bold 
                       text-gray-400 hover:border-blue-400 hover:text-blue-500
                       transition-colors"
          >
            {nextIndice}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Barre de progression des heures

```
// pages/ListePlans/HeuresBar.tsx
export function HeuresBar({ 
  prevu, 
  effectue, 
  label,
  color = 'blue' 
}: { 
  prevu: number; 
  effectue: number; 
  label: string;
  color?: 'blue' | 'red' | 'orange' | 'purple';
}) {
  const pct = prevu > 0 ? Math.min(100, (effectue / prevu) * 100) : 0;
  const colors = {
    blue:   { bar: 'bg-blue-500',   bg: 'bg-blue-100',   text: 'text-blue-700' },
    red:    { bar: 'bg-red-500',    bg: 'bg-red-100',    text: 'text-red-700' },
    orange: { bar: 'bg-orange-500', bg: 'bg-orange-100', text: 'text-orange-700' },
    purple: { bar: 'bg-purple-500', bg: 'bg-purple-100', text: 'text-purple-700' },
  };
  const c = colors[color];
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-gray-600">{label}</span>
        <span className={c.text}>
          {effectue.toFixed(1)}h / {prevu.toFixed(1)}h 
          ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className={`h-2 rounded-full ${c.bg}`}>
        <div
          className={`h-full rounded-full ${c.bar} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

---

## 5. 🔄 HOOK REACT QUERY

```
// hooks/usePlans.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PlanComplet, EtatAvancement } from '../types';

const API = '/api';

export function usePlans(codeChantier: string) {
  return useQuery({
    queryKey: ['plans', codeChantier],
    queryFn: () => 
      fetch(`${API}/chantiers/${codeChantier}/plans`)
        .then(r => r.json()) as Promise<PlanComplet[]>,
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; [key: string]: any }) =>
      fetch(`${API}/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });
}

export function useImportOF(codeChantier: string) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (hks: string[]) =>
      fetch(`${API}/chantiers/${codeChantier}/plans/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hks }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });
}

export function useAddIndice() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: ({ planId, indice, date_indice, commentaire }: {
      planId: number; indice: string; date_indice: string; commentaire?: string;
    }) =>
      fetch(`${API}/plans/${planId}/indices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indice, date_indice, commentaire }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });
}
```

---

## 📋 RÉSUMÉ — CE QUE TU GAGNES vs EXCEL

| Aspect                    | Excel actuel                   | App Web                                    |
| ------------------------- | ------------------------------ | ------------------------------------------ |
| **Import OF**       | Copier-coller depuis Warehouse | 📥 Un clic, sélection visuelle            |
| **Dessinateurs**    | Taper à la main               | 👤 Dropdown + gestion ajout/archivage      |
| **Fabrication**     | Texte libre                    | 🏭 Badges cliquables FILIALE / STT / MIXTE |
| **Indices**         | 12 colonnes date illisibles    | 📐 Timeline visuelle avec commentaires     |
| **États**          | Couleurs de fond mystérieuses | 🎨 Pastilles colorées + labels clairs     |
| **Heures**          | Chiffres bruts                 | 📊 Barres de progression %                 |
| **Filtres**         | Filtres Excel basiques         | 🔍 Recherche temps réel + multi-filtres   |
| **Stats**           | Formules SUBTOTAL              | 📈 Dashboard en temps réel en haut        |
| **Multi-user**      | Un seul fichier partagé       | 👥 Accès concurrent, temps réel          |
| **Temps calculés** | SUMIFS complexes               | ⚡ Calculés par SQL, instantané          |
