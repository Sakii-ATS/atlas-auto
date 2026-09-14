import crypto from "node:crypto";
import { tous, un, exec } from "./db.js";

export const GRADES = ["Vendeur/Vendeuse", "Manager", "Co-patron", "Patron"];

/** Hiérarchie : un grade donne accès à tout ce que permettent les grades en dessous. */
const RANG = { "Vendeur/Vendeuse": 1, Manager: 2, "Co-patron": 3, Patron: 4 };

export const rang = (grade) => RANG[grade] || 0;
export const auMoins = (grade, minimum) => rang(grade) >= rang(minimum);

/** Code à 5 chiffres, unique en base, jamais 00000. */
export function genererCode() {
  for (let essai = 0; essai < 200; essai++) {
    const code = String(crypto.randomInt(10000, 100000));
    if (!un("SELECT 1 FROM employes WHERE code = ?", code)) return code;
  }
  throw new Error("Impossible de générer un code libre");
}

const jeton = () => crypto.randomBytes(24).toString("hex");

const normaliser = (s) => String(s || "").trim();

/**
 * Connexion : nom + prénom + code, les trois doivent correspondre.
 * La comparaison du nom et du prénom ignore la casse et les espaces.
 */
export function connecter({ nom, prenom, code }) {
  const employe = un(
    `SELECT * FROM employes
      WHERE lower(nom) = lower(?) AND lower(prenom) = lower(?)
        AND code = ? AND actif = 1`,
    normaliser(nom),
    normaliser(prenom),
    normaliser(code),
  );
  if (!employe) return null;

  const token = jeton();
  exec("INSERT INTO sessions (token, employe_id) VALUES (?, ?)", token, employe.id);
  exec("UPDATE employes SET connexions = connexions + 1 WHERE id = ?", employe.id);

  return { token, employe: publier(employe) };
}

export function deconnecter(token) {
  exec("UPDATE sessions SET fermee_le = datetime('now') WHERE token = ?", token);
}

/** Retire les champs sensibles avant envoi au client. */
export function publier(e) {
  if (!e) return null;
  return {
    id: e.id,
    nom: e.nom,
    prenom: e.prenom,
    grade: e.grade,
    actif: !!e.actif,
    connexions: e.connexions,
    creeLe: e.cree_le,
  };
}

/** Middleware : place req.employe si le jeton est valide. */
export function attacherSession(req, _res, suite) {
  const entete = req.headers.authorization || "";
  const token = entete.startsWith("Bearer ") ? entete.slice(7) : null;
  if (token) {
    const ligne = un(
      `SELECT e.* FROM sessions s
         JOIN employes e ON e.id = s.employe_id
        WHERE s.token = ? AND s.fermee_le IS NULL AND e.actif = 1`,
      token,
    );
    if (ligne) {
      exec("UPDATE sessions SET vue_le = datetime('now') WHERE token = ?", token);
      req.employe = ligne;
      req.token = token;
    }
  }
  suite();
}

/** Middleware d'accès : exige d'être connecté, avec un grade minimum. */
export function exige(gradeMinimum) {
  return (req, res, suite) => {
    if (!req.employe) {
      return res.status(401).json({ erreur: "Connexion requise." });
    }
    if (gradeMinimum && !auMoins(req.employe.grade, gradeMinimum)) {
      return res.status(403).json({
        erreur: `Réservé aux grades ${gradeMinimum} et au-dessus.`,
      });
    }
    suite();
  };
}

/** Connexions en cours (une session ouverte par employé au maximum affichée). */
export function connexionsEnCours() {
  return tous(
    `SELECT e.id, e.nom, e.prenom, e.grade,
            MAX(s.ouverte_le) AS depuis,
            COUNT(s.token)    AS sessions_ouvertes,
            e.connexions      AS total
       FROM sessions s
       JOIN employes e ON e.id = s.employe_id
      WHERE s.fermee_le IS NULL
      GROUP BY e.id
      ORDER BY depuis DESC`,
  );
}
