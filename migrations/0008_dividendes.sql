-- Les dividendes que les patrons se versent sur les benefices.
-- C est une sortie de caisse comme une autre, mais suivie a part pour qu on
-- voie ce qui part en benefices et ce qui part en frais.
CREATE TABLE IF NOT EXISTS dividendes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  beneficiaire TEXT    NOT NULL,
  montant      INTEGER NOT NULL DEFAULT 0,
  date         TEXT    NOT NULL,
  note         TEXT    NOT NULL DEFAULT '',
  saisi_par    TEXT    NOT NULL DEFAULT '',
  cree_le      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dividendes_date ON dividendes (date);
