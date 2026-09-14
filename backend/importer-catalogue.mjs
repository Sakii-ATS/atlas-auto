// ===========================================================================
// Importe le catalogue de prix de base dans la base Atlas Auto.
// Les modeles sont lus dans src/App.jsx (tableau SEED_CATALOGUE), puis
// envoyes en une seule fois a l API : PUT /api/catalogue.
//
//   node importer-catalogue.mjs
//   node importer-catalogue.mjs --api http://localhost:3001/api
// ===========================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ici = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => {
  const i = process.argv.indexOf("--" + n);
  return i > -1 ? process.argv[i + 1] : d;
};

const API = arg("api", process.env.API_URL || "http://localhost:3001/api");
const SOURCE = arg("source", path.join(ici, "..", "frontend", "src", "App.jsx"));
const NOM = arg("nom", process.env.NOM_PATRON || "Petit");
const PRENOM = arg("prenom", process.env.PRENOM_PATRON || "Clovis");
const CODE = arg("code", process.env.CODE_PATRON || "10000");

// ------------------------------------------------------- lecture du tableau
const source = fs.readFileSync(SOURCE, "utf8");
const debut = source.indexOf("const SEED_CATALOGUE = [");
if (debut < 0) {
  console.error("SEED_CATALOGUE introuvable dans " + SOURCE);
  process.exit(1);
}
const fin = source.indexOf("\n];", debut);
const bloc = source.slice(debut, fin);

const lignes = [];
const motif = /nom:\s*"((?:[^"\\]|\\.)*)"\s*,\s*prixBase:\s*(\d+)\s*,\s*genre:\s*"((?:[^"\\]|\\.)*)"/g;
let m;
while ((m = motif.exec(bloc))) {
  lignes.push({
    nom: m[1].replace(/\\"/g, "\""),
    prixBase: Number(m[2]),
    genre: m[3],
  });
}
if (lignes.length === 0) {
  console.error("aucun modele lu");
  process.exit(1);
}
const genresUtilises = [...new Set(lignes.map((l) => l.genre))];
console.log(lignes.length + " modeles lus, " + genresUtilises.length + " genres");

// ------------------------------------------------------------------ envoi
const appel = async (chemin, methode, corps, token) => {
  const r = await fetch(API + chemin, {
    method: methode,
    headers: {
      ...(corps ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const texte = await r.text();
  let data = null;
  try { data = texte ? JSON.parse(texte) : null; } catch { data = texte; }
  if (!r.ok) throw new Error(methode + " " + chemin + " -> " + r.status + " " + texte);
  return data;
};

const connexion = await appel("/auth/login", "POST", { nom: NOM, prenom: PRENOM, code: CODE });
const token = connexion.token;
console.log("connecte : " + connexion.employe.prenom + " " + connexion.employe.nom + " (" + connexion.employe.grade + ")");

// Les genres manquants sont crees avant, sinon les modeles seraient orphelins.
const genresExistants = (await appel("/genres", "GET", null, token)).map((g) => g.nom);
for (const g of genresUtilises) {
  if (!genresExistants.includes(g)) {
    await appel("/genres", "POST", { nom: g }, token);
    console.log("genre ajoute : " + g);
  }
}

await appel("/catalogue", "PUT", { lignes }, token);
const apres = await appel("/catalogue", "GET", null, token);
console.log("catalogue en base : " + apres.length + " modeles");
console.log("exemple : " + apres[0].nom + " " + apres[0].prix_base + " $ (" + apres[0].genre + ")");