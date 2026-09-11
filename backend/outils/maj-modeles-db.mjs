// Met à jour les deux modèles de contrat déjà présents en base, sans toucher
// aux contrats déjà émis (leur texte est figé au moment de l'émission).
import fs from "node:fs";
import { db, tous, un, exec } from "./src/db.js";

const corps = (f) => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n").trimEnd();

const paires = [
  ["vente", "modele-vente.txt"],
  ["achat", "modele-rachat.txt"],
];

for (const [categorie, fichier] of paires) {
  const m = un(
    "SELECT * FROM contrats_modeles WHERE categorie = ? ORDER BY id ASC LIMIT 1",
    categorie,
  );
  if (!m) { console.log("aucun modele pour la categorie " + categorie); continue; }
  exec("UPDATE contrats_modeles SET corps = ? WHERE id = ?", corps(fichier), m.id);
  console.log("modele #" + m.id + " (" + m.nom + ") mis a jour");
}

for (const m of tous("SELECT id, nom, categorie, LENGTH(corps) n FROM contrats_modeles ORDER BY id")) {
  console.log("  [" + m.id + "] " + m.nom + " / " + m.categorie + " / " + m.n + " caracteres");
}