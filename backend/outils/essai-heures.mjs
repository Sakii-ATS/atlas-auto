// Vérifie que des heures saisies remontent bien dans le récapitulatif salaires.
import { un, exec, tous } from "../src/db.js";

const e = un("SELECT * FROM employes WHERE grade = 'Patron' LIMIT 1");
const jour = new Date().toISOString().slice(0, 10);

const i = exec(
  "INSERT INTO heures_service (employe_id, date, minutes, note, saisi_par) VALUES (?, ?, ?, ?, ?)",
  e.id, jour, 150, "ESSAI", `${e.prenom} ${e.nom}`,
);
console.log("heures inserees : 150 min (2 h 30) le " + jour);

// meme calcul que la route /salaires
const l = un(
  `SELECT COALESCE(SUM(minutes),0) m FROM heures_service
    WHERE employe_id = ? AND date BETWEEN ? AND ?`,
  e.id, jour, jour,
);
console.log("recap sur la periode : " + l.m + " min  -> " +
            Math.floor(l.m / 60) + " h " + String(l.m % 60).padStart(2, "0"));

const liste = tous(
  `SELECT h.minutes, h.note, e.prenom, e.nom FROM heures_service h
     JOIN employes e ON e.id = h.employe_id ORDER BY h.id DESC`,
);
console.log("lignes en base : " + liste.length +
            (liste[0] ? "  (derniere : " + liste[0].prenom + " " + liste[0].nom + ", " + liste[0].minutes + " min)" : ""));

exec("DELETE FROM heures_service WHERE id = ?", i.lastInsertRowid);
console.log("essai nettoye — " + un("SELECT COUNT(*) n FROM heures_service").n + " ligne(s) restante(s)");