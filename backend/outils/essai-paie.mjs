// Vérifie le calcul de paie tel que la route /salaires le renvoie.
import { un, tous, lireParametres } from "../src/db.js";

const p = lireParametres();
console.log("reglages : fixe " + p.salaireBase + " $ / prime " + p.primeParOperation + " $ par operation\n");

const bornes = ["0000-01-01", "9999-12-31"];
const lignes = tous(
  `SELECT e.id, e.nom, e.prenom, e.grade,
          COALESCE(h.minutes, 0)  AS minutes,
          COALESCE(v.ventes, 0)   AS ventes,
          COALESCE(v.chiffre, 0)  AS chiffre,
          COALESCE(a.achats, 0)   AS achats
     FROM employes e
     LEFT JOIN (SELECT employe_id, SUM(minutes) minutes FROM heures_service
                 WHERE date BETWEEN ? AND ? GROUP BY employe_id) h ON h.employe_id = e.id
     LEFT JOIN (SELECT employe_id, COUNT(*) ventes, SUM(prix_final) chiffre FROM mouvements
                 WHERE type = 'vente' AND date(date) BETWEEN ? AND ? GROUP BY employe_id) v ON v.employe_id = e.id
     LEFT JOIN (SELECT employe_id, COUNT(*) achats FROM mouvements
                 WHERE type = 'achat' AND date(date) BETWEEN ? AND ? GROUP BY employe_id) a ON a.employe_id = e.id
    WHERE e.actif = 1
    ORDER BY ventes DESC, e.nom`,
  ...bornes, ...bornes, ...bornes,
);

const argent = (n) => new Intl.NumberFormat("fr-FR").format(n) + " $";
let masse = 0;
for (const l of lignes) {
  const ops = l.ventes + l.achats;
  const primes = ops * p.primeParOperation;
  const salaire = p.salaireBase + primes;
  masse += salaire;
  console.log(
    "  " + (l.prenom + " " + l.nom).padEnd(20) +
    l.ventes + " vente(s) + " + l.achats + " rachat(s) = " + ops + " operations\n" +
    "  ".padEnd(22) + argent(p.salaireBase) + " + " + ops + " x " + argent(p.primeParOperation) +
    " = " + argent(salaire) + "\n",
  );
}
console.log("  masse salariale : " + argent(masse));