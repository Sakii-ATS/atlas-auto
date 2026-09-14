// Essai du rachat déclenché par l'ajout d'un véhicule d'occasion.
// On rejoue exactement ce que fait la route POST /vehicules, puis on nettoie.
import { un, exec, prochainCompteur } from "./src/db.js";
import { figerPrix, rendreContrat, valeursDepuisMouvement } from "./src/metier.js";

const employe = un("SELECT * FROM employes WHERE grade = 'Patron' LIMIT 1");
const fiche = un("SELECT * FROM catalogue WHERE lower(nom) = lower(?)", "Sultan RS");
const prix = figerPrix({ categorie: "Occasion", prixBase: fiche.prix_base });

const iv = exec(
  `INSERT INTO vehicules
     (modele, genre, categorie, image, description, prix_base, reduction, marge, prix_achat, prix_vente, achete_par)
   VALUES (?, ?, 'Occasion', '', '', ?, ?, ?, ?, ?, ?)`,
  fiche.nom, fiche.genre, prix.prixBase, prix.reduction, prix.marge,
  prix.prixAchat, prix.prixVente, `${employe.prenom} ${employe.nom}`,
);
const vehicule = un("SELECT * FROM vehicules WHERE id = ?", iv.lastInsertRowid);
console.log("vehicule : " + vehicule.modele + " — rachat " + vehicule.prix_achat + " $ / revente " + vehicule.prix_vente + " $");

const im = exec(
  `INSERT INTO mouvements
     (type, vehicule_id, modele, genre, image, prix_initial, km, surcharge,
      surcharge_offerte, reduction_pct, reduction_montant, prix_final,
      client_nom, client_prenom, client_classe, vendeur_nom, vendeur_prenom, employe_id)
   VALUES ('achat', ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?)`,
  vehicule.id, vehicule.modele, vehicule.genre, vehicule.image,
  vehicule.prix_achat, vehicule.prix_achat,
  "Dolan", "John", "C", employe.nom, employe.prenom, employe.id,
);
const mouvement = un("SELECT * FROM mouvements WHERE id = ?", im.lastInsertRowid);

const modele = un("SELECT * FROM contrats_modeles WHERE categorie = 'achat' ORDER BY id ASC LIMIT 1");
const annee = new Date().getFullYear();
const numero = `ATL-${annee}-${String(prochainCompteur(`contrat-${annee}`)).padStart(4, "0")}`;
const valeurs = valeursDepuisMouvement(mouvement, numero);
const texte = rendreContrat(modele.corps, valeurs);

console.log("\n" + "-".repeat(70));
console.log(texte);
console.log("-".repeat(70));
console.log("trous non remplis : " + (texte.match(/____/g) || []).length);

// nettoyage
exec("DELETE FROM mouvements WHERE id = ?", mouvement.id);
exec("DELETE FROM vehicules WHERE id = ?", vehicule.id);
console.log("\nessai nettoye — " +
  un("SELECT COUNT(*) n FROM vehicules").n + " vehicule(s), " +
  un("SELECT COUNT(*) n FROM mouvements").n + " mouvement(s), " +
  un("SELECT COUNT(*) n FROM contrats").n + " contrat(s) en base");