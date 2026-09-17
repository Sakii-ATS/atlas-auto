-- Un véhicule peut être « custom » : modifié, tuné, pièces non d origine.
ALTER TABLE vehicules ADD COLUMN custom INTEGER NOT NULL DEFAULT 0;
