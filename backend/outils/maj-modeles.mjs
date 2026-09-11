// Remplace le corps des deux modèles de contrat dans src/db.js (amorçage).
// Les corps y sont écrits comme des tableaux de lignes joints par "\n".
import fs from "node:fs";

const lignesDe = (fichier) =>
  fs.readFileSync(fichier, "utf8").replace(/\r\n/g, "\n").trimEnd().split("\n");

const bloc = (lignes, indent) => {
  const i = " ".repeat(indent);
  return "[\n" + lignes.map((l) => i + "  " + JSON.stringify(l) + ",").join("\n") +
         "\n" + i + '].join("\\n")';
};

let s = fs.readFileSync("src/db.js", "utf8");
const avant = s.length;
let n = 0;

for (const [titre, fichier] of [
  ["CONTRAT DE VENTE", "modele-vente.txt"],
  ["CONTRAT DE RACHAT", "modele-rachat.txt"],
]) {
  const debut = s.indexOf('[\n        "' + titre);
  if (debut < 0) { console.error("ancre introuvable : " + titre); continue; }
  const marqueur = '].join("\\n")';
  const fin = s.indexOf(marqueur, debut);
  if (fin < 0) { console.error("fin introuvable : " + titre); continue; }
  s = s.slice(0, debut) + bloc(lignesDe(fichier), 6) + s.slice(fin + marqueur.length);
  n++;
}

if (n !== 2) { console.error("!! remplacements : " + n); process.exit(1); }
fs.writeFileSync("src/db.js", s);
console.log("db.js : " + avant + " -> " + s.length + " octets, " + n + " modeles remplaces");