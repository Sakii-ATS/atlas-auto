-- ----------------------------------------------------------------- images
-- Les photos de véhicules envoyées depuis le site. Stockées en base64 : pas
-- de service de stockage à activer, et le navigateur réduit l image avant
-- l envoi, donc chaque photo pèse une centaine de kilo-octets.
CREATE TABLE IF NOT EXISTS images (
  cle     TEXT PRIMARY KEY,
  type    TEXT NOT NULL,
  donnees TEXT NOT NULL,
  octets  INTEGER NOT NULL DEFAULT 0,
  cree_par TEXT NOT NULL DEFAULT '',
  cree_le TEXT NOT NULL DEFAULT (datetime('now'))
);