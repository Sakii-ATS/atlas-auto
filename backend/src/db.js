import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.resolve(ici, "..");

const CHEMIN_DB = process.env.DB_FILE || path.join(racine, "data", "atlas.db");

fs.mkdirSync(path.dirname(CHEMIN_DB), { recursive: true });

export const db = new Database(CHEMIN_DB);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// --------------------------------------------------------------- migration
db.exec(fs.readFileSync(path.join(racine, "schema.sql"), "utf8"));

// --------------------------------------------------------------- helpers
export const tous = (sql, ...args) => db.prepare(sql).all(...args);
export const un = (sql, ...args) => db.prepare(sql).get(...args);
export const exec = (sql, ...args) => db.prepare(sql).run(...args);

/** Incrémente un compteur nommé et renvoie sa nouvelle valeur. */
export function prochainCompteur(cle) {
  const tx = db.transaction(() => {
    exec(
      "INSERT INTO compteurs (cle, valeur) VALUES (?, 0) ON CONFLICT(cle) DO NOTHING",
      cle,
    );
    exec("UPDATE compteurs SET valeur = valeur + 1 WHERE cle = ?", cle);
    return un("SELECT valeur FROM compteurs WHERE cle = ?", cle).valeur;
  });
  return tx();
}

// --------------------------------------------------------------- paramètres
const PARAMETRES_DEFAUT = {
  reductionMaxVente: "15",
  kmIntervalle: "10000",
  kmMontant: "500",
  nomEntreprise: "VAPID AUTO",
  // Paie : un fixe par employé sur la période, plus une prime par opération
  // (une vente ou un rachat comptent pareil).
  salaireBase: "3500",
  primeParOperation: "250",
};

export function lireParametres() {
  const lignes = tous("SELECT cle, valeur FROM parametres");
  const out = { ...PARAMETRES_DEFAUT };
  for (const l of lignes) out[l.cle] = l.valeur;
  return {
    reductionMaxVente: Number(out.reductionMaxVente),
    kmIntervalle: Number(out.kmIntervalle),
    kmMontant: Number(out.kmMontant),
    nomEntreprise: out.nomEntreprise,
    salaireBase: Number(out.salaireBase),
    primeParOperation: Number(out.primeParOperation),
  };
}

export function ecrireParametres(patch) {
  const stmt = db.prepare(
    "INSERT INTO parametres (cle, valeur) VALUES (?, ?) " +
      "ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur",
  );
  const tx = db.transaction((entrees) => {
    for (const [cle, valeur] of entrees) stmt.run(cle, String(valeur));
  });
  tx(Object.entries(patch));
  return lireParametres();
}

// --------------------------------------------------------------- amorçage
/**
 * Premier démarrage : un compte Patron, les genres de base, des tranches
 * de départ et deux modèles de contrat. Rien n'est écrasé si la base
 * contient déjà des données.
 */
export function amorcer() {
  const nbEmployes = un("SELECT COUNT(*) n FROM employes").n;
  if (nbEmployes === 0) {
    // Pas de code fixe par défaut : en ligne, "10000" voudrait dire que le
    // premier visiteur venu entre en patron. À défaut de CODE_PATRON, on en
    // tire un au hasard et on l affiche dans les journaux au démarrage.
    const code =
      process.env.CODE_PATRON ||
      String(crypto.randomInt(10000, 100000));
    const nom = process.env.NOM_PATRON || "Petit";
    const prenom = process.env.PRENOM_PATRON || "Clovis";
    exec(
      "INSERT INTO employes (nom, prenom, grade, code) VALUES (?, ?, ?, ?)",
      nom,
      prenom,
      "Patron",
      code,
    );
    console.log(`[vapid] compte patron créé — ${prenom} ${nom}, code ${code}`);
    console.log("[vapid] change-le depuis Paramètres dès la première connexion.");
  }

  if (un("SELECT COUNT(*) n FROM genres").n === 0) {
    const g = db.prepare("INSERT INTO genres (nom) VALUES (?)");
    for (const nom of [
      "Compacts", "Coupés", "Motos", "Muscle", "Tout-terrain", "Berlines",
      "Sportives", "Sports classiques", "Supercars", "SUV", "Vans",
    ]) g.run(nom);
  }

  if (un("SELECT COUNT(*) n FROM tranches_reduction").n === 0) {
    const t = db.prepare("INSERT INTO tranches_reduction (seuil, montant) VALUES (?, ?)");
    for (const [s, m] of [[0, 2000], [15000, 5000], [50000, 15000], [150000, 40000]]) t.run(s, m);
  }

  if (un("SELECT COUNT(*) n FROM tranches_marge").n === 0) {
    const t = db.prepare("INSERT INTO tranches_marge (seuil, montant) VALUES (?, ?)");
    for (const [s, m] of [[0, 1000], [15000, 2500], [50000, 6000], [150000, 15000]]) t.run(s, m);
  }

  if (un("SELECT COUNT(*) n FROM contrats_modeles").n === 0) {
    const m = db.prepare(
      "INSERT INTO contrats_modeles (nom, categorie, corps, a_trous, visible_par) VALUES (?, ?, ?, 1, ?)",
    );
    m.run(
      "Contrat de vente",
      "vente",
      [
        "CONTRAT DE VENTE — {{numero}}",
        "{{entreprise}} — le {{date}}",
        "",
        "LE VENDEUR",
        "{{entreprise}}, représentée par {{employe_prenom}} {{employe_nom}} ({{employe_grade}}).",
        "",
        "L'ACHETEUR",
        "{{client_prenom}} {{client_nom}} — citoyen de classe {{client_classe}}.",
        "",
        "VÉHICULE",
        "Modèle : {{vehicule}} ({{genre}})",
        "Prix de vente : {{prix}}",
        "",
        "Le véhicule est cédé en l'état. L'acheteur reconnaît en avoir pris possession",
        "et s'être acquitté de la totalité du montant. Le présent contrat vaut preuve",
        "d'achat et de propriété.",
        "",
        "Fait à Los Santos, le {{date}}.",
        "",
        "Le vendeur — {{employe_prenom}} {{employe_nom}}, pour {{entreprise}}",
        "L'acheteur — {{client_prenom}} {{client_nom}} (classe {{client_classe}})",
      ].join("\n"),
      "",
    );
    m.run(
      "Contrat de rachat",
      "achat",
      [
        "CONTRAT DE RACHAT — {{numero}}",
        "{{entreprise}} — le {{date}}",
        "",
        "LE VENDEUR",
        "{{client_prenom}} {{client_nom}} — citoyen de classe {{client_classe}}.",
        "",
        "L'ACHETEUR",
        "{{entreprise}}, représentée par {{employe_prenom}} {{employe_nom}} ({{employe_grade}}).",
        "",
        "VÉHICULE",
        "Modèle : {{vehicule}} ({{genre}})",
        "Montant versé au vendeur : {{prix}}",
        "",
        "Le vendeur déclare être le propriétaire légitime du véhicule et le céder libre",
        "de toute dette et de tout litige. {{entreprise}} en devient propriétaire à",
        "compter de la signature, et le montant ci-dessus lui a été intégralement versé.",
        "",
        "Fait à Los Santos, le {{date}}.",
        "",
        "Le vendeur — {{client_prenom}} {{client_nom}} (classe {{client_classe}})",
        "L'acheteur — {{employe_prenom}} {{employe_nom}}, pour {{entreprise}}",
      ].join("\n"),
      "",
    );
  }
}
