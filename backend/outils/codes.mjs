// ===========================================================================
// Récupération d'accès — à lancer depuis la machine qui héberge la base.
//
//   node codes.mjs                      liste les comptes et leurs codes
//   node codes.mjs --reset Petit Clovis  génère un nouveau code pour ce compte
//
// C'est le filet de sécurité du patron : personne au-dessus de lui ne peut
// lui regénérer un code depuis le site, donc ça se fait ici.
// ===========================================================================
import { tous, un, exec } from "../src/db.js";

const args = process.argv.slice(2);
const reset = args.indexOf("--reset");

if (reset === -1) {
  const comptes = tous("SELECT nom, prenom, grade, code, actif FROM employes ORDER BY id");
  if (comptes.length === 0) {
    console.log("Aucun compte en base.");
  } else {
    console.log("");
    for (const e of comptes) {
      console.log(
        "  " + (e.prenom + " " + e.nom).padEnd(24) +
        e.grade.padEnd(18) +
        "code " + e.code +
        (e.actif ? "" : "   (compte désactivé)"),
      );
    }
    console.log("\n  Connexion : nom + prénom + code, sur /entreprise.\n");
  }
  process.exit(0);
}

const nom = args[reset + 1];
const prenom = args[reset + 2];
if (!nom || !prenom) {
  console.error("Usage : node codes.mjs --reset <nom> <prenom>");
  process.exit(1);
}

const e = un(
  "SELECT * FROM employes WHERE lower(nom) = lower(?) AND lower(prenom) = lower(?)",
  nom, prenom,
);
if (!e) {
  console.error("Aucun compte au nom de " + prenom + " " + nom + ".");
  process.exit(1);
}

// Un code à 5 chiffres qui n'est pas déjà pris.
let code;
do {
  code = String(Math.floor(10000 + Math.random() * 90000));
} while (un("SELECT id FROM employes WHERE code = ?", code));

exec("UPDATE employes SET code = ?, actif = 1 WHERE id = ?", code, e.id);
console.log("\n  " + e.prenom + " " + e.nom + " (" + e.grade + ") — nouveau code : " + code + "\n");