import { tous, un, lireParametres } from "./db.js";

/**
 * Montant fixe selon la tranche : on prend la tranche dont le seuil est le
 * plus haut tout en restant <= au prix de base. Aucune tranche applicable
 * renvoie 0.
 */
export function montantSelonTranche(prixBase, tranches) {
  let retenue = null;
  for (const t of tranches) {
    if (prixBase >= t.seuil && (retenue === null || t.seuil > retenue.seuil)) {
      retenue = t;
    }
  }
  return retenue ? retenue.montant : 0;
}

export function tranchesReduction() {
  return tous("SELECT seuil, montant FROM tranches_reduction ORDER BY seuil ASC");
}
export function tranchesMarge() {
  return tous("SELECT seuil, montant FROM tranches_marge ORDER BY seuil ASC");
}

/**
 * Calcule et fige réduction / marge / prix d'achat / prix de vente d'un
 * véhicule au moment de son enregistrement.
 *
 * Occasion : achat = base - réduction ; vente = achat + marge, plafonné au
 *            prix de base (un véhicule d'occasion ne se revend jamais plus
 *            cher que son prix catalogue).
 * Import   : vente = prix de base, exactement. Ni réduction ni marge.
 */
export function figerPrix({ categorie, prixBase }) {
  const base = Math.max(0, Math.round(Number(prixBase) || 0));

  if (categorie === "Import") {
    return { prixBase: base, reduction: 0, marge: 0, prixAchat: base, prixVente: base };
  }

  const reduction = montantSelonTranche(base, tranchesReduction());
  const marge = montantSelonTranche(base, tranchesMarge());
  const prixAchat = Math.max(0, base - reduction);
  const prixVente = Math.min(prixAchat + marge, base);

  return { prixBase: base, reduction, marge, prixAchat, prixVente };
}

/**
 * Calcule le prix final d'une vente.
 *
 * Surcharge kilométrique : floor(km / intervalle) * montant.
 * Réduction client : pourcentage du prix de vente, plafonné par les
 * paramètres.
 * Règle spéciale : si la réduction accordée dépasse la surcharge
 * kilométrique, les kilomètres sont offerts et la surcharge tombe à zéro.
 */
export function calculerVente({ prixVente, km, reductionPct }) {
  const p = lireParametres();
  const prix = Math.max(0, Math.round(Number(prixVente) || 0));
  const kilometres = Math.max(0, Math.round(Number(km) || 0));

  const pct = Math.min(
    Math.max(0, Math.round(Number(reductionPct) || 0)),
    p.reductionMaxVente,
  );

  const surchargeBrute =
    p.kmIntervalle > 0
      ? Math.floor(kilometres / p.kmIntervalle) * p.kmMontant
      : 0;

  const reductionMontant = Math.round((prix * pct) / 100);
  const offerte = reductionMontant > surchargeBrute;
  const surcharge = offerte ? 0 : surchargeBrute;

  return {
    prixInitial: prix,
    km: kilometres,
    reductionPct: pct,
    reductionMontant,
    surcharge,
    surchargeOfferte: offerte,
    prixFinal: Math.max(0, prix - reductionMontant + surcharge),
  };
}

/** Variables disponibles dans un modèle de contrat. */
export const VARIABLES_CONTRAT = [
  // le contrat lui-même
  "numero", "date", "entreprise",
  // le véhicule
  "vehicule", "genre", "prix",
  // le joueur en face, quel que soit le sens de l'opération
  "client_nom", "client_prenom", "client_classe",
  // notre employé, quel que soit le sens de l'opération
  "employe_nom", "employe_prenom", "employe_grade",
  // les deux rôles, attribués selon le sens : sur une vente l'acheteur est le
  // client et le vendeur c'est nous ; sur un rachat c'est l'inverse.
  "acheteur_nom", "acheteur_prenom", "acheteur_classe",
  "vendeur_nom", "vendeur_prenom", "vendeur_classe",
];

/** Repère les {{variables}} présentes dans un corps de modèle. */
export function trousDuModele(corps) {
  const trouves = new Set();
  const motif = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m;
  while ((m = motif.exec(corps || ""))) trouves.add(m[1]);
  return [...trouves];
}

/** Remplace les {{variables}} par les valeurs fournies. */
export function rendreContrat(corps, valeurs) {
  return String(corps || "").replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_tout, cle) => {
      const v = valeurs[cle];
      return v === undefined || v === null || v === "" ? `____` : String(v);
    },
  );
}

const argent = (n) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(Number(n) || 0)) + " $";

/** Construit le jeu de valeurs d'un contrat à partir d'un mouvement. */
export function valeursDepuisMouvement(mouvement, numero) {
  const p = lireParametres();

  // Le joueur d'en face.
  const client = {
    nom: mouvement.client_nom || "",
    prenom: mouvement.client_prenom || "",
    classe: mouvement.client_classe || "",
  };

  // Notre employé. Son grade n'est pas stocké sur le mouvement : on le relit.
  const employe = {
    nom: mouvement.vendeur_nom || "",
    prenom: mouvement.vendeur_prenom || "",
    grade: mouvement.employe_id
      ? un("SELECT grade FROM employes WHERE id = ?", mouvement.employe_id)?.grade || ""
      : "",
  };

  // Qui vend et qui achète dépend du sens de l'opération.
  const nous = { nom: employe.nom, prenom: employe.prenom, classe: "" };
  const vente = mouvement.type !== "achat";
  const vendeur = vente ? nous : client;
  const acheteur = vente ? client : nous;

  return {
    numero,
    date: new Date(mouvement.date || Date.now()).toLocaleDateString("fr-FR"),
    entreprise: p.nomEntreprise,
    vehicule: mouvement.modele || "",
    genre: mouvement.genre || "",
    prix: argent(mouvement.prix_final ?? mouvement.prixFinal ?? 0),

    client_nom: client.nom,
    client_prenom: client.prenom,
    client_classe: client.classe,

    employe_nom: employe.nom,
    employe_prenom: employe.prenom,
    employe_grade: employe.grade,

    vendeur_nom: vendeur.nom,
    vendeur_prenom: vendeur.prenom,
    vendeur_classe: vendeur.classe,

    acheteur_nom: acheteur.nom,
    acheteur_prenom: acheteur.prenom,
    acheteur_classe: acheteur.classe,
  };
}
