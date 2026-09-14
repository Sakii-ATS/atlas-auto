-- Classe A/B/C des vehicules, comme au PDM en jeu.
ALTER TABLE catalogue ADD COLUMN classe TEXT NOT NULL DEFAULT '';
ALTER TABLE vehicules ADD COLUMN classe TEXT NOT NULL DEFAULT '';