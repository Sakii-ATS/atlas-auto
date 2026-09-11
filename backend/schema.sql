-- ===========================================================================
-- Atlas Auto — schéma de la base
-- SQLite. Toutes les tables sont créées au démarrage si elles n'existent pas.
-- ===========================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- --------------------------------------------------------------- employés
-- Le patron saisit nom, prénom et grade. Le code à 5 chiffres est généré.
CREATE TABLE IF NOT EXISTS employes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nom        TEXT    NOT NULL,
  prenom     TEXT    NOT NULL,
  grade      TEXT    NOT NULL,              -- Vendeur/Vendeuse, Manager, Co-patron, Patron
  code       TEXT    NOT NULL UNIQUE,       -- 5 chiffres
  actif      INTEGER NOT NULL DEFAULT 1,
  connexions INTEGER NOT NULL DEFAULT 0,    -- compteur cumulé
  cree_le    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employes_identite
  ON employes (lower(nom), lower(prenom));

-- --------------------------------------------------------------- sessions
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT    PRIMARY KEY,
  employe_id INTEGER NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
  ouverte_le TEXT    NOT NULL DEFAULT (datetime('now')),
  vue_le     TEXT    NOT NULL DEFAULT (datetime('now')),
  fermee_le  TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_employe ON sessions (employe_id);

-- ------------------------------------------------------- heures de service
-- Saisie manuelle par le patron / co-patron.
CREATE TABLE IF NOT EXISTS heures_service (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  employe_id INTEGER NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
  date       TEXT    NOT NULL,              -- AAAA-MM-JJ
  minutes    INTEGER NOT NULL,
  note       TEXT    NOT NULL DEFAULT '',
  saisi_par  TEXT    NOT NULL DEFAULT '',
  cree_le    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_heures_employe ON heures_service (employe_id);

-- --------------------------------------------------------------- catalogue
CREATE TABLE IF NOT EXISTS catalogue (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nom       TEXT    NOT NULL,
  prix_base INTEGER NOT NULL,
  genre     TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_catalogue_nom ON catalogue (nom);

CREATE TABLE IF NOT EXISTS genres (
  id  INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT    NOT NULL UNIQUE
);

-- --------------------------------------------------------------- véhicules
CREATE TABLE IF NOT EXISTS vehicules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  modele      TEXT    NOT NULL,
  genre       TEXT    NOT NULL,
  categorie   TEXT    NOT NULL,             -- Occasion | Import
  image       TEXT    NOT NULL DEFAULT '',
  description TEXT    NOT NULL DEFAULT '',
  prix_base   INTEGER NOT NULL DEFAULT 0,
  reduction   INTEGER NOT NULL DEFAULT 0,   -- figée à l'enregistrement
  marge       INTEGER NOT NULL DEFAULT 0,   -- figée à l'enregistrement
  prix_achat  INTEGER NOT NULL DEFAULT 0,
  prix_vente  INTEGER NOT NULL DEFAULT 0,
  achete_par  TEXT    NOT NULL DEFAULT '',  -- visible Manager+
  statut      TEXT    NOT NULL DEFAULT 'stock',  -- stock | vendu
  cree_le     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_vehicules_statut ON vehicules (statut);

-- -------------------------------------------------- mouvements (ventes/achats)
-- type = 'vente'  : on vend un véhicule à un joueur
-- type = 'achat'  : on rachète un véhicule à un joueur
CREATE TABLE IF NOT EXISTS mouvements (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  type                TEXT    NOT NULL DEFAULT 'vente',
  vehicule_id         INTEGER REFERENCES vehicules(id) ON DELETE SET NULL,
  modele              TEXT    NOT NULL DEFAULT '',
  genre               TEXT    NOT NULL DEFAULT '',
  image               TEXT    NOT NULL DEFAULT '',
  prix_initial        INTEGER NOT NULL DEFAULT 0,
  km                  INTEGER NOT NULL DEFAULT 0,
  surcharge           INTEGER NOT NULL DEFAULT 0,
  surcharge_offerte   INTEGER NOT NULL DEFAULT 0,
  reduction_pct       INTEGER NOT NULL DEFAULT 0,
  reduction_montant   INTEGER NOT NULL DEFAULT 0,
  prix_final          INTEGER NOT NULL DEFAULT 0,
  client_nom          TEXT    NOT NULL DEFAULT '',
  client_prenom       TEXT    NOT NULL DEFAULT '',
  client_classe       TEXT    NOT NULL DEFAULT '',   -- A | B | C
  vendeur_nom         TEXT    NOT NULL DEFAULT '',
  vendeur_prenom      TEXT    NOT NULL DEFAULT '',
  employe_id          INTEGER REFERENCES employes(id) ON DELETE SET NULL,
  date                TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mouvements_type ON mouvements (type);
CREATE INDEX IF NOT EXISTS idx_mouvements_employe ON mouvements (employe_id);

-- ------------------------------------------------------- modèles de contrat
-- corps contient des variables {{nom_de_variable}} quand a_trous = 1.
-- visible_par : grades séparés par des virgules, vide = tout le monde connecté.
CREATE TABLE IF NOT EXISTS contrats_modeles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nom         TEXT    NOT NULL,
  categorie   TEXT    NOT NULL DEFAULT 'vente',   -- vente | achat | libre...
  corps       TEXT    NOT NULL DEFAULT '',
  a_trous     INTEGER NOT NULL DEFAULT 1,
  visible_par TEXT    NOT NULL DEFAULT '',
  cree_le     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- --------------------------------------------------------- contrats émis
CREATE TABLE IF NOT EXISTS contrats (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  numero       TEXT    NOT NULL UNIQUE,     -- ATL-2026-0001
  modele_id    INTEGER REFERENCES contrats_modeles(id) ON DELETE SET NULL,
  categorie    TEXT    NOT NULL DEFAULT 'vente',
  mouvement_id INTEGER REFERENCES mouvements(id) ON DELETE CASCADE,
  valeurs      TEXT    NOT NULL DEFAULT '{}',  -- JSON des trous remplis
  texte        TEXT    NOT NULL DEFAULT '',    -- texte final rendu
  cree_par     TEXT    NOT NULL DEFAULT '',
  cree_le      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contrats_mouvement ON contrats (mouvement_id);

-- --------------------------------------------------------------- dépenses
CREATE TABLE IF NOT EXISTS depenses (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  libelle   TEXT    NOT NULL,
  montant   INTEGER NOT NULL,
  categorie TEXT    NOT NULL DEFAULT 'Divers',
  date      TEXT    NOT NULL,
  note      TEXT    NOT NULL DEFAULT '',
  saisi_par TEXT    NOT NULL DEFAULT '',
  cree_le   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_depenses_date ON depenses (date);

-- -------------------------------------------------------------- paramètres
CREATE TABLE IF NOT EXISTS parametres (
  cle    TEXT PRIMARY KEY,
  valeur TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tranches_reduction (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  seuil   INTEGER NOT NULL,
  montant INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tranches_marge (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  seuil   INTEGER NOT NULL,
  montant INTEGER NOT NULL
);

-- --------------------------------------------------------------- compteurs
CREATE TABLE IF NOT EXISTS compteurs (
  cle    TEXT PRIMARY KEY,
  valeur INTEGER NOT NULL DEFAULT 0
);
