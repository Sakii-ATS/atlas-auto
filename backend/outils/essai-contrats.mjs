// Essai des deux contrats : on vérifie qui est nommé vendeur, qui est nommé
// acheteur, et que la classe affichée est bien celle du joueur.
import { un } from "./src/db.js";
import { rendreContrat, valeursDepuisMouvement } from "./src/metier.js";

const employe = un("SELECT * FROM employes WHERE grade = 'Patron' LIMIT 1");

const faux = (type) => ({
  id: 999,
  type,
  modele: "Sultan RS",
  genre: "Supercars",
  prix_final: type === "vente" ? 104400 : 88000,
  client_nom: "Vidal",
  client_prenom: "Victor",
  client_classe: "B",
  vendeur_nom: employe.nom,
  vendeur_prenom: employe.prenom,
  employe_id: employe.id,
  date: "2026-09-11 18:00:00",
});

for (const type of ["vente", "achat"]) {
  const modele = un(
    "SELECT * FROM contrats_modeles WHERE categorie = ? ORDER BY id ASC LIMIT 1",
    type,
  );
  const v = valeursDepuisMouvement(faux(type), "ATL-2026-TEST");
  console.log("=".repeat(70));
  console.log("  " + type.toUpperCase() + "  —  vendeur = " + v.vendeur_prenom + " " + v.vendeur_nom +
              "  |  acheteur = " + v.acheteur_prenom + " " + v.acheteur_nom);
  console.log("=".repeat(70));
  console.log(rendreContrat(modele.corps, v));
  const restants = (rendreContrat(modele.corps, v).match(/____/g) || []).length;
  console.log("\n>> trous non remplis : " + restants);
}