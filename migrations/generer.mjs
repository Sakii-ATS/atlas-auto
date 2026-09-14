// Fusionne les deux relevés en un seul fichier, puis fabrique les UPDATE.
import fs from "node:fs";

const a = JSON.parse(fs.readFileSync("./migrations/classes.json", "utf8"));
const b = JSON.parse(fs.readFileSync("./migrations/classes2.json", "utf8"));
const classes = { ...a, ...b };

fs.writeFileSync("./migrations/classes.json", JSON.stringify(classes, null, 1), "utf8");
fs.rmSync("./migrations/classes2.json", { force: true });

const lignes = ["-- Classe A/B/C de chaque modèle, relevée sur le PDM en jeu."];
for (const [nom, classe] of Object.entries(classes)) {
  lignes.push(`UPDATE catalogue SET classe = '${classe}' WHERE nom = '${nom.replace(/'/g, "''")}';`);
}
fs.writeFileSync("./migrations/0005_classes_donnees.sql", lignes.join("\n") + "\n", "utf8");

const compte = (c) => Object.values(classes).filter((x) => x === c).length;
console.log(Object.keys(classes).length + " modeles : " +
  compte("C") + " en C, " + compte("B") + " en B, " + compte("A") + " en A");