// Exporte la base actuelle vers un fichier SQL importable dans D1.
// Les sessions ne sont pas reprises : chacun se reconnecte, c est tout.
import fs from "node:fs";
import { tous } from "../src/db.js";

const TABLES = [
  "employes", "genres", "catalogue", "contrats_modeles",
  "parametres", "tranches_reduction", "tranches_marge", "compteurs",
  "vehicules", "mouvements", "contrats", "heures_service", "depenses",
];

const litteral = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
};

const morceaux = [
  "-- Données Vapid Auto exportées depuis la base locale.",
  "-- À appliquer APRÈS 0001_schema.sql.",
  "",
];
let total = 0;

for (const table of TABLES) {
  let lignes;
  try { lignes = tous(`SELECT * FROM ${table}`); }
  catch { continue; }
  if (!lignes.length) continue;

  morceaux.push(`-- ${table} (${lignes.length})`);
  morceaux.push(`DELETE FROM ${table};`);
  const colonnes = Object.keys(lignes[0]);
  for (const l of lignes) {
    morceaux.push(
      `INSERT INTO ${table} (${colonnes.join(", ")}) VALUES (` +
        colonnes.map((c) => litteral(l[c])).join(", ") + ");",
    );
  }
  morceaux.push("");
  total += lignes.length;
  console.log(`  ${table.padEnd(20)} ${lignes.length}`);
}

fs.writeFileSync("../../migrations/0002_donnees.sql", morceaux.join("\n"), "utf8");
console.log(`\n${total} lignes ecrites dans migrations/0002_donnees.sql`);