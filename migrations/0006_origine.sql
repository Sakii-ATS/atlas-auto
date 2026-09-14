-- D ou vient le modele : le catalogue du concessionnaire en jeu, ou l import.
ALTER TABLE catalogue ADD COLUMN origine TEXT NOT NULL DEFAULT 'concessionnaire';