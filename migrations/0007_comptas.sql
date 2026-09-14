-- Une semaine de compta figee : on la garde pour l historique et on passe
-- a la suivante. Les totaux sont recopies pour qu ils ne bougent plus.
CREATE TABLE IF NOT EXISTS comptas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  debut     TEXT    NOT NULL,
  fin       TEXT    NOT NULL,
  entrees   INTEGER NOT NULL DEFAULT 0,
  sorties   INTEGER NOT NULL DEFAULT 0,
  resultat  INTEGER NOT NULL DEFAULT 0,
  donnees   TEXT    NOT NULL DEFAULT '{}',
  note      TEXT    NOT NULL DEFAULT '',
  cree_par  TEXT    NOT NULL DEFAULT '',
  cree_le   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comptas_periode ON comptas (debut, fin);