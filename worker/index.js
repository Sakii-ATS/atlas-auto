// ===========================================================================
// Atlas Auto — toute l'API dans un seul fichier, pour Cloudflare Workers.
//
// Le Worker ne répond qu'aux adresses commençant par /api (voir
// wrangler.jsonc, "run_worker_first"). Tout le reste est servi comme fichier
// statique par Cloudflare : c'est le site construit dans frontend/dist.
//
// La base est D1 — du SQLite, mais asynchrone : chaque lecture et chaque
// écriture s'attend avec await.
// ===========================================================================

const VERSION = 2;

// ---------------------------------------------------------------- outils bd

/** Les paramètres non renseignés doivent partir en NULL, pas en undefined. */
const propres = (args) => args.map((v) => (v === undefined ? null : v));

function bd(env) {
  const DB = env.DB;
  const prep = (sql, args) =>
    args.length ? DB.prepare(sql).bind(...propres(args)) : DB.prepare(sql);

  return {
    brut: DB,
    prep,
    /** Une ligne, ou null. */
    un: async (sql, ...args) => await prep(sql, args).first(),
    /** Toutes les lignes, toujours un tableau. */
    tous: async (sql, ...args) => (await prep(sql, args).all()).results || [],
    /** Écriture. Renvoie l'identifiant créé et le nombre de lignes touchées. */
    exec: async (sql, ...args) => {
      const r = await prep(sql, args).run();
      return { id: r.meta?.last_row_id, touchees: r.meta?.changes ?? 0 };
    },
    /** Plusieurs écritures d'un bloc : tout passe, ou rien. */
    lot: (instructions) => DB.batch(instructions),
  };
}

// ------------------------------------------------------------- aléatoire

const octets = (n) => crypto.getRandomValues(new Uint8Array(n));

/** Entier dans [min, max[ sans biais notable. */
const entierAleatoire = (min, max) => {
  const etendue = max - min;
  const [a, b, c, d] = octets(4);
  return min + (((a << 24) | (b << 16) | (c << 8) | d) >>> 0) % etendue;
};

const jeton = () =>
  [...octets(24)].map((o) => o.toString(16).padStart(2, "0")).join("");

// ------------------------------------------------------------------ erreurs

class Erreur extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
const refus = (code, message) => {
  throw new Erreur(code, message);
};

// ------------------------------------------------------------------- grades

const GRADES = ["Vendeur/Vendeuse", "Manager", "Co-patron", "Patron"];
const RANG = { "Vendeur/Vendeuse": 1, Manager: 2, "Co-patron": 3, Patron: 4 };
const rang = (grade) => RANG[grade] || 0;

// Classes de véhicule, comme au PDM en jeu : A est la plus haute. Un citoyen
// ne peut acheter que dans sa classe ou en dessous.
const CLASSES = ["C", "B", "A"];
const rangClasse = (c) => CLASSES.indexOf(String(c || "").toUpperCase()) + 1;
/** Classe inconnue d un côté ou de l autre : on laisse passer. */
const classeSuffit = (client, vehicule) => {
  const v = rangClasse(vehicule);
  const c = rangClasse(client);
  return v === 0 || c === 0 || c >= v;
};
const auMoins = (grade, minimum) => rang(grade) >= rang(minimum);

/** Retire le code et les champs internes avant envoi au navigateur. */
const publier = (e) =>
  e && {
    id: e.id,
    nom: e.nom,
    prenom: e.prenom,
    grade: e.grade,
    actif: !!e.actif,
    connexions: e.connexions,
    creeLe: e.cree_le,
  };

/** Code à 5 chiffres, libre en base. */
async function genererCode(db) {
  for (let essai = 0; essai < 200; essai++) {
    const code = String(entierAleatoire(10000, 100000));
    if (!(await db.un("SELECT 1 FROM employes WHERE code = ?", code))) return code;
  }
  refus(500, "Impossible de générer un code libre.");
}

// -------------------------------------------------------------- paramètres

const PARAMETRES_DEFAUT = {
  reductionMaxVente: "15",
  kmIntervalle: "10000",
  kmMontant: "500",
  nomEntreprise: "ATLAS AUTO",
  salaireBase: "3500",
  primeParOperation: "250",
};

async function lireParametres(db) {
  const lignes = await db.tous("SELECT cle, valeur FROM parametres");
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

async function ecrireParametres(db, patch) {
  const entrees = Object.entries(patch);
  if (entrees.length) {
    await db.lot(
      entrees.map(([cle, valeur]) =>
        db.prep(
          "INSERT INTO parametres (cle, valeur) VALUES (?, ?) " +
            "ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur",
          [cle, String(valeur)],
        ),
      ),
    );
  }
  return lireParametres(db);
}

async function prochainCompteur(db, cle) {
  await db.exec(
    "INSERT INTO compteurs (cle, valeur) VALUES (?, 1) " +
      "ON CONFLICT(cle) DO UPDATE SET valeur = valeur + 1",
    cle,
  );
  const r = await db.un("SELECT valeur FROM compteurs WHERE cle = ?", cle);
  return r?.valeur || 1;
}

// ----------------------------------------------------------------- métier

/**
 * Montant fixe selon la tranche : on prend la tranche dont le seuil est le plus
 * haut tout en restant sous le prix de base. Aucune tranche applicable = 0.
 */
function montantSelonTranche(prixBase, tranches) {
  let retenue = null;
  for (const t of tranches) {
    if (prixBase >= t.seuil && (retenue === null || t.seuil > retenue.seuil)) {
      retenue = t;
    }
  }
  return retenue ? retenue.montant : 0;
}

const tranchesReduction = (db) =>
  db.tous("SELECT seuil, montant FROM tranches_reduction ORDER BY seuil ASC");
const tranchesMarge = (db) =>
  db.tous("SELECT seuil, montant FROM tranches_marge ORDER BY seuil ASC");

/**
 * Fige réduction, marge, prix d'achat et prix de vente à l'enregistrement.
 * Occasion : achat = base − réduction ; vente = achat + marge, plafonné au
 *            prix catalogue.
 * Import   : vente = prix de base exactement, ni réduction ni marge.
 */
async function figerPrix(db, { categorie, prixBase }) {
  const base = Math.max(0, Math.round(Number(prixBase) || 0));
  if (categorie === "Import") {
    return { prixBase: base, reduction: 0, marge: 0, prixAchat: base, prixVente: base };
  }
  const reduction = montantSelonTranche(base, await tranchesReduction(db));
  const marge = montantSelonTranche(base, await tranchesMarge(db));
  const prixAchat = Math.max(0, base - reduction);
  return {
    prixBase: base,
    reduction,
    marge,
    prixAchat,
    prixVente: Math.min(prixAchat + marge, base),
  };
}

/**
 * Prix final d'une vente. Surcharge kilométrique = floor(km / intervalle) ×
 * montant. Si la réduction accordée dépasse la surcharge, les kilomètres sont
 * offerts et la surcharge tombe à zéro.
 */
async function calculerVente(db, { prixVente, km, reductionPct }) {
  const p = await lireParametres(db);
  const prix = Math.max(0, Math.round(Number(prixVente) || 0));
  const kilometres = Math.max(0, Math.round(Number(km) || 0));
  const pct = Math.min(
    Math.max(0, Math.round(Number(reductionPct) || 0)),
    p.reductionMaxVente,
  );
  const surchargeBrute =
    p.kmIntervalle > 0 ? Math.floor(kilometres / p.kmIntervalle) * p.kmMontant : 0;
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

// ----------------------------------------------------------------- contrats

const VARIABLES_CONTRAT = [
  "numero", "date", "entreprise",
  "vehicule", "genre", "prix",
  "client_nom", "client_prenom", "client_classe",
  "employe_nom", "employe_prenom", "employe_grade",
  "acheteur_nom", "acheteur_prenom", "acheteur_classe",
  "vendeur_nom", "vendeur_prenom", "vendeur_classe",
];

function trousDuModele(corps) {
  const trouves = new Set();
  const motif = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m;
  while ((m = motif.exec(corps || ""))) trouves.add(m[1]);
  return [...trouves];
}

function rendreContrat(corps, valeurs) {
  return String(corps || "").replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_tout, cle) => {
      const v = valeurs[cle];
      return v === undefined || v === null || v === "" ? "____" : String(v);
    },
  );
}

const argent = (n) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(Number(n) || 0)) + " $";

/** Jeu de valeurs d'un contrat, déduit d'une vente ou d'un rachat. */
async function valeursDepuisMouvement(db, mouvement, numero) {
  const p = await lireParametres(db);

  const client = {
    nom: mouvement.client_nom || "",
    prenom: mouvement.client_prenom || "",
    classe: mouvement.client_classe || "",
  };

  // Notre employé. Son grade n'est pas stocké sur le mouvement : on le relit.
  const grade = mouvement.employe_id
    ? (await db.un("SELECT grade FROM employes WHERE id = ?", mouvement.employe_id))?.grade || ""
    : "";
  const employe = {
    nom: mouvement.vendeur_nom || "",
    prenom: mouvement.vendeur_prenom || "",
    grade,
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
    prix: argent(mouvement.prix_final ?? 0),

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

/** Un contrat sans restriction est lisible par tous ; sinon par les grades
 *  cochés sur son modèle. La direction voit toujours tout. */
const peutVoirContrat = (visiblePar, grade) => {
  if (auMoins(grade, "Co-patron")) return true;
  const grades = String(visiblePar || "").split(",").map((x) => x.trim()).filter(Boolean);
  return grades.length === 0 || grades.includes(grade);
};

/** Fabrique un contrat : émission manuelle, ou automatique après une opération. */
async function fabriquerContrat(db, { modele, mouvement, valeurs, employe }) {
  const annee = new Date().getFullYear();
  const numero = `ATL-${annee}-${String(await prochainCompteur(db, `contrat-${annee}`)).padStart(4, "0")}`;

  const base = mouvement
    ? await valeursDepuisMouvement(db, mouvement, numero)
    : {
        numero,
        date: new Date().toLocaleDateString("fr-FR"),
        entreprise: (await lireParametres(db)).nomEntreprise,
      };

  const finales = { ...base, ...(valeurs || {}), numero };
  const texte = rendreContrat(modele.corps, finales);

  const { id } = await db.exec(
    `INSERT INTO contrats (numero, modele_id, categorie, mouvement_id, valeurs, texte, cree_par)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    numero, modele.id, modele.categorie, mouvement?.id ?? null,
    JSON.stringify(finales), texte,
    `${employe.prenom} ${employe.nom}`,
  );
  const cree = await db.un("SELECT * FROM contrats WHERE id = ?", id);
  return { ...cree, valeurs: JSON.parse(cree.valeurs) };
}

/** Contrat automatique après une opération. N'interrompt jamais l'opération. */
async function contratAutomatique(db, { type, mouvement, employe }) {
  const modele = await db.un(
    "SELECT * FROM contrats_modeles WHERE categorie = ? ORDER BY id ASC LIMIT 1",
    type,
  );
  if (!modele) return null;
  try {
    return await fabriquerContrat(db, { modele, mouvement, employe });
  } catch (e) {
    console.error("[atlas] contrat automatique impossible :", e.message);
    return null;
  }
}

// ------------------------------------------------------------------ routeur

const ROUTES = [];

/** on("GET", "/employes/:id", "Co-patron", handler) */
function on(methode, chemin, grade, fn) {
  const noms = [];
  const motif = new RegExp(
    "^" +
      chemin.replace(/:[a-zA-Z]+/g, (m) => {
        noms.push(m.slice(1));
        return "([^/]+)";
      }) +
      "$",
  );
  ROUTES.push({ methode, motif, noms, grade, fn });
}

// Le grade passé à on() : undefined = accès libre, null = connexion seule,
// une chaîne = ce grade au minimum.
const LIBRE = undefined;
const CONNECTE = null;

// ===========================================================================
// AUTHENTIFICATION
// ===========================================================================

on("POST", "/auth/login", LIBRE, async (c) => {
  const { nom, prenom, code } = c.corps;
  if (!nom || !prenom || !code) {
    refus(400, "Nom, prénom et code sont tous les trois obligatoires.");
  }
  const net = (s) => String(s || "").trim();
  const employe = await c.db.un(
    `SELECT * FROM employes
      WHERE lower(nom) = lower(?) AND lower(prenom) = lower(?)
        AND code = ? AND actif = 1`,
    net(nom), net(prenom), net(code),
  );
  if (!employe) refus(401, "Nom, prénom ou code incorrect.");

  const token = jeton();
  await c.db.lot([
    c.db.prep("INSERT INTO sessions (token, employe_id) VALUES (?, ?)", [token, employe.id]),
    c.db.prep("UPDATE employes SET connexions = connexions + 1 WHERE id = ?", [employe.id]),
  ]);
  return { token, employe: publier(employe) };
});

on("POST", "/auth/logout", CONNECTE, async (c) => {
  await c.db.exec("UPDATE sessions SET fermee_le = datetime('now') WHERE token = ?", c.token);
  return { fait: true };
});

on("GET", "/auth/moi", CONNECTE, async (c) => publier(c.employe));

// ===========================================================================
// EMPLOYÉS
// ===========================================================================

on("GET", "/employes", "Co-patron", async (c) => {
  const lignes = await c.db.tous("SELECT * FROM employes ORDER BY actif DESC, nom, prenom");
  return lignes.map((e) => ({ ...publier(e), code: e.code }));
});

on("POST", "/employes", "Co-patron", async (c) => {
  const { nom, prenom, grade } = c.corps;
  if (!nom || !prenom) refus(400, "Nom et prénom obligatoires.");
  if (!GRADES.includes(grade)) refus(400, `Grade inconnu. Attendu : ${GRADES.join(", ")}.`);

  const existe = await c.db.un(
    "SELECT 1 FROM employes WHERE lower(nom) = lower(?) AND lower(prenom) = lower(?)",
    String(nom).trim(), String(prenom).trim(),
  );
  if (existe) refus(409, "Un employé porte déjà ce nom et ce prénom.");

  const code = await genererCode(c.db);
  const { id } = await c.db.exec(
    "INSERT INTO employes (nom, prenom, grade, code) VALUES (?, ?, ?, ?)",
    String(nom).trim(), String(prenom).trim(), grade, code,
  );
  const cree = await c.db.un("SELECT * FROM employes WHERE id = ?", id);
  return { ...publier(cree), code: cree.code };
});

on("PATCH", "/employes/:id", "Co-patron", async (c) => {
  const e = await c.db.un("SELECT * FROM employes WHERE id = ?", c.params.id);
  if (!e) refus(404, "Employé introuvable.");

  const { nom, prenom, grade, actif } = c.corps;
  if (grade && !GRADES.includes(grade)) refus(400, "Grade inconnu.");

  await c.db.exec(
    "UPDATE employes SET nom = ?, prenom = ?, grade = ?, actif = ? WHERE id = ?",
    nom !== undefined ? String(nom).trim() : e.nom,
    prenom !== undefined ? String(prenom).trim() : e.prenom,
    grade || e.grade,
    actif === undefined ? e.actif : actif ? 1 : 0,
    e.id,
  );
  const maj = await c.db.un("SELECT * FROM employes WHERE id = ?", e.id);
  return { ...publier(maj), code: maj.code };
});

/** Nouveau code : l'ancien cesse de fonctionner et les sessions sont fermées. */
on("POST", "/employes/:id/code", "Co-patron", async (c) => {
  const e = await c.db.un("SELECT * FROM employes WHERE id = ?", c.params.id);
  if (!e) refus(404, "Employé introuvable.");
  const code = await genererCode(c.db);
  await c.db.lot([
    c.db.prep("UPDATE employes SET code = ? WHERE id = ?", [code, e.id]),
    c.db.prep(
      "UPDATE sessions SET fermee_le = datetime('now') WHERE employe_id = ? AND fermee_le IS NULL",
      [e.id],
    ),
  ]);
  return { ...publier(e), code };
});

on("DELETE", "/employes/:id", "Patron", async (c) => {
  const e = await c.db.un("SELECT * FROM employes WHERE id = ?", c.params.id);
  if (!e) refus(404, "Employé introuvable.");
  const { n } = await c.db.un(
    "SELECT COUNT(*) n FROM employes WHERE grade = 'Patron' AND actif = 1",
  );
  if (e.grade === "Patron" && n <= 1) {
    refus(400, "Impossible de supprimer le dernier compte Patron.");
  }
  await c.db.exec("DELETE FROM employes WHERE id = ?", e.id);
  return { fait: true };
});

on("GET", "/connexions", "Co-patron", async (c) =>
  c.db.tous(
    `SELECT e.id, e.nom, e.prenom, e.grade,
            MAX(s.ouverte_le) AS depuis,
            COUNT(s.token)    AS sessions_ouvertes,
            e.connexions      AS total
       FROM sessions s
       JOIN employes e ON e.id = s.employe_id
      WHERE s.fermee_le IS NULL
      GROUP BY e.id
      ORDER BY depuis DESC`,
  ));

// ===========================================================================
// HEURES DE SERVICE ET SALAIRES
// ===========================================================================

on("GET", "/heures", "Co-patron", async (c) =>
  c.db.tous(
    `SELECT h.*, e.nom, e.prenom, e.grade
       FROM heures_service h JOIN employes e ON e.id = h.employe_id
      ORDER BY h.date DESC, h.id DESC`,
  ));

on("POST", "/heures", "Co-patron", async (c) => {
  const { employeId, date, minutes, note } = c.corps;
  if (!(await c.db.un("SELECT 1 FROM employes WHERE id = ?", employeId))) {
    refus(400, "Employé inconnu.");
  }
  const m = Math.round(Number(minutes) || 0);
  if (m === 0) refus(400, "Indique une durée (en minutes).");

  const { id } = await c.db.exec(
    "INSERT INTO heures_service (employe_id, date, minutes, note, saisi_par) VALUES (?, ?, ?, ?, ?)",
    employeId,
    date || new Date().toISOString().slice(0, 10),
    m,
    String(note || ""),
    `${c.employe.prenom} ${c.employe.nom}`,
  );
  return c.db.un("SELECT * FROM heures_service WHERE id = ?", id);
});

on("DELETE", "/heures/:id", "Co-patron", async (c) => {
  await c.db.exec("DELETE FROM heures_service WHERE id = ?", c.params.id);
  return { fait: true };
});

/** Récapitulatif : heures saisies, opérations réalisées, et la paie qui en découle. */
on("GET", "/salaires", "Co-patron", async (c) => {
  const debut = c.query.get("debut") || "0000-01-01";
  const fin = c.query.get("fin") || "9999-12-31";
  const b = [debut, fin];

  const lignes = await c.db.tous(
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
    ...b, ...b, ...b,
  );

  // Paie = un fixe par employé + une prime par opération, vente ou rachat.
  const p = await lireParametres(c.db);
  const base = Math.round(Number(p.salaireBase) || 0);
  const prime = Math.round(Number(p.primeParOperation) || 0);

  const avecPaie = lignes.map((l) => {
    const operations = l.ventes + l.achats;
    return {
      ...l,
      operations,
      salaireBase: base,
      primes: operations * prime,
      salaire: base + operations * prime,
    };
  });

  return {
    debut, fin,
    salaireBase: base,
    primeParOperation: prime,
    masseSalariale: avecPaie.reduce((s, l) => s + l.salaire, 0),
    lignes: avecPaie,
  };
});

// ===========================================================================
// COMPTA — tout l argent de l entreprise au même endroit
// ===========================================================================

/**
 * Ventes, rachats, dépenses et salaires sur une période, avec le résultat.
 * `lignes` est un journal unifié : une entrée par opération, prête à exporter.
 */
on("GET", "/compta", "Co-patron", async (c) => {
  const debut = c.query.get("debut") || "0000-01-01";
  const fin = c.query.get("fin") || "9999-12-31";

  const mouvements = await c.db.tous(
    `SELECT type, modele, genre, prix_final, date,
            client_nom, client_prenom, client_classe, vendeur_nom, vendeur_prenom
       FROM mouvements WHERE date(date) BETWEEN ? AND ? ORDER BY date`,
    debut, fin,
  );
  const depenses = await c.db.tous(
    `SELECT libelle, categorie, montant, date, note, saisi_par
       FROM depenses WHERE date BETWEEN ? AND ? ORDER BY date`,
    debut, fin,
  );

  // Salaires : le même calcul que l onglet Salaires, sur la même période.
  const p = await lireParametres(c.db);
  const base = Math.round(Number(p.salaireBase) || 0);
  const prime = Math.round(Number(p.primeParOperation) || 0);
  const employes = await c.db.tous(
    `SELECT e.id, e.nom, e.prenom, e.grade,
            COALESCE(v.ventes, 0) AS ventes,
            COALESCE(a.achats, 0) AS achats
       FROM employes e
       LEFT JOIN (SELECT employe_id, COUNT(*) ventes FROM mouvements
                   WHERE type = 'vente' AND date(date) BETWEEN ? AND ? GROUP BY employe_id) v
              ON v.employe_id = e.id
       LEFT JOIN (SELECT employe_id, COUNT(*) achats FROM mouvements
                   WHERE type = 'achat' AND date(date) BETWEEN ? AND ? GROUP BY employe_id) a
              ON a.employe_id = e.id
      WHERE e.actif = 1
      ORDER BY e.nom`,
    debut, fin, debut, fin,
  );
  const salaires = employes.map((e) => {
    const operations = e.ventes + e.achats;
    return { ...e, operations, salaire: base + operations * prime };
  });

  const ventes = mouvements.filter((m) => m.type === "vente");
  const achats = mouvements.filter((m) => m.type === "achat");
  const somme = (liste, champ) => liste.reduce((s, x) => s + (x[champ] || 0), 0);

  const totalVentes = somme(ventes, "prix_final");
  const totalAchats = somme(achats, "prix_final");
  const totalDepenses = somme(depenses, "montant");
  const totalSalaires = somme(salaires, "salaire");

  // Le journal, dans l ordre chronologique. Entrée = ce qui rentre en caisse.
  const jour = (d) => String(d || "").slice(0, 10);
  const lignes = [
    ...ventes.map((m) => ({
      date: jour(m.date),
      type: "Vente",
      libelle: m.modele,
      detail: `${m.client_prenom} ${m.client_nom}`.trim() +
              (m.client_classe ? ` (classe ${m.client_classe})` : ""),
      par: `${m.vendeur_prenom} ${m.vendeur_nom}`.trim(),
      entree: m.prix_final,
      sortie: 0,
    })),
    ...achats.map((m) => ({
      date: jour(m.date),
      type: "Rachat",
      libelle: m.modele,
      detail: `${m.client_prenom} ${m.client_nom}`.trim() +
              (m.client_classe ? ` (classe ${m.client_classe})` : ""),
      par: `${m.vendeur_prenom} ${m.vendeur_nom}`.trim(),
      entree: 0,
      sortie: m.prix_final,
    })),
    ...depenses.map((d) => ({
      date: jour(d.date),
      type: "Dépense",
      libelle: d.libelle,
      detail: d.categorie,
      par: d.saisi_par,
      entree: 0,
      sortie: d.montant,
    })),
    ...salaires
      .filter((s) => s.salaire > 0)
      .map((s) => ({
        // Sans date de fin choisie, le salaire est daté d aujourd hui.
        date: jour(fin === "9999-12-31" ? new Date().toISOString() : fin),
        type: "Salaire",
        libelle: `${s.prenom} ${s.nom}`,
        detail: `${s.grade} — ${s.operations} opération(s)`,
        par: "",
        entree: 0,
        sortie: s.salaire,
      })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return {
    debut, fin,
    ventes: { nombre: ventes.length, total: totalVentes },
    achats: { nombre: achats.length, total: totalAchats },
    depenses: { nombre: depenses.length, total: totalDepenses },
    salaires: { nombre: salaires.length, total: totalSalaires, lignes: salaires },
    entrees: totalVentes,
    sorties: totalAchats + totalDepenses + totalSalaires,
    resultat: totalVentes - totalAchats - totalDepenses - totalSalaires,
    lignes,
  };
});
// ===========================================================================
// DÉPENSES
// ===========================================================================

on("GET", "/depenses", "Co-patron", async (c) => {
  const lignes = await c.db.tous("SELECT * FROM depenses ORDER BY date DESC, id DESC");
  return { lignes, total: lignes.reduce((s, d) => s + d.montant, 0) };
});

on("POST", "/depenses", "Co-patron", async (c) => {
  const { libelle, montant, categorie, date, note } = c.corps;
  if (!libelle) refus(400, "Un libellé est obligatoire.");
  const { id } = await c.db.exec(
    "INSERT INTO depenses (libelle, montant, categorie, date, note, saisi_par) VALUES (?, ?, ?, ?, ?, ?)",
    String(libelle).trim(),
    Math.round(Number(montant) || 0),
    String(categorie || "Divers"),
    date || new Date().toISOString().slice(0, 10),
    String(note || ""),
    `${c.employe.prenom} ${c.employe.nom}`,
  );
  return c.db.un("SELECT * FROM depenses WHERE id = ?", id);
});

on("PATCH", "/depenses/:id", "Co-patron", async (c) => {
  const d = await c.db.un("SELECT * FROM depenses WHERE id = ?", c.params.id);
  if (!d) refus(404, "Dépense introuvable.");
  const b = c.corps;
  await c.db.exec(
    "UPDATE depenses SET libelle = ?, montant = ?, categorie = ?, date = ?, note = ? WHERE id = ?",
    b.libelle ?? d.libelle,
    b.montant === undefined ? d.montant : Math.round(Number(b.montant) || 0),
    b.categorie ?? d.categorie,
    b.date ?? d.date,
    b.note ?? d.note,
    d.id,
  );
  return c.db.un("SELECT * FROM depenses WHERE id = ?", d.id);
});

on("DELETE", "/depenses/:id", "Co-patron", async (c) => {
  await c.db.exec("DELETE FROM depenses WHERE id = ?", c.params.id);
  return { fait: true };
});

// ===========================================================================
// CATALOGUE ET GENRES
// ===========================================================================

on("GET", "/catalogue", LIBRE, async (c) =>
  c.db.tous("SELECT * FROM catalogue ORDER BY nom"));

on("POST", "/catalogue", "Co-patron", async (c) => {
  const { nom, prixBase, genre, classe, origine } = c.corps;
  if (!nom) refus(400, "Nom du modèle obligatoire.");
  const { id } = await c.db.exec(
    "INSERT INTO catalogue (nom, prix_base, genre, classe, origine) VALUES (?, ?, ?, ?, ?)",
    String(nom).trim(), Math.round(Number(prixBase) || 0), String(genre || ""),
    String(classe || "").toUpperCase(),
    origine === "import" ? "import" : "concessionnaire",
  );
  return c.db.un("SELECT * FROM catalogue WHERE id = ?", id);
});

/** Remplacement en bloc — sert à importer les 372 modèles d'un coup. */
on("PUT", "/catalogue", "Co-patron", async (c) => {
  const lignes = Array.isArray(c.corps) ? c.corps : c.corps?.lignes;
  if (!Array.isArray(lignes)) refus(400, "Envoie un tableau de modèles.");

  const instructions = [c.db.prep("DELETE FROM catalogue", [])];
  for (const l of lignes) {
    instructions.push(
      c.db.prep(
        "INSERT INTO catalogue (nom, prix_base, genre, classe, origine) VALUES (?, ?, ?, ?, ?)",
        [
          String(l.nom || "").trim(),
          Math.round(Number(l.prixBase ?? l.prix_base) || 0),
          String(l.genre || ""),
          String(l.classe || "").toUpperCase(),
          l.origine === "import" ? "import" : "concessionnaire",
        ],
      ),
    );
  }
  // D1 limite la taille d'un lot : on découpe.
  for (let i = 0; i < instructions.length; i += 50) {
    await c.db.lot(instructions.slice(i, i + 50));
  }
  return c.db.tous("SELECT * FROM catalogue ORDER BY nom");
});

on("PATCH", "/catalogue/:id", "Co-patron", async (c) => {
  const m = await c.db.un("SELECT * FROM catalogue WHERE id = ?", c.params.id);
  if (!m) refus(404, "Modèle introuvable.");
  const b = c.corps;
  await c.db.exec(
    "UPDATE catalogue SET nom = ?, prix_base = ?, genre = ?, classe = ?, origine = ? WHERE id = ?",
    b.nom ?? m.nom,
    b.prixBase === undefined ? m.prix_base : Math.round(Number(b.prixBase) || 0),
    b.genre ?? m.genre,
    b.classe === undefined ? m.classe : String(b.classe || "").toUpperCase(),
    b.origine === undefined ? m.origine : (b.origine === "import" ? "import" : "concessionnaire"),
    m.id,
  );
  return c.db.un("SELECT * FROM catalogue WHERE id = ?", m.id);
});

on("DELETE", "/catalogue/:id", "Co-patron", async (c) => {
  await c.db.exec("DELETE FROM catalogue WHERE id = ?", c.params.id);
  return { fait: true };
});

on("GET", "/genres", LIBRE, async (c) => c.db.tous("SELECT * FROM genres ORDER BY nom"));

on("POST", "/genres", "Co-patron", async (c) => {
  const nom = String(c.corps?.nom || "").trim();
  if (!nom) refus(400, "Nom du genre obligatoire.");
  if (await c.db.un("SELECT 1 FROM genres WHERE lower(nom) = lower(?)", nom)) {
    refus(409, "Ce genre existe déjà.");
  }
  const { id } = await c.db.exec("INSERT INTO genres (nom) VALUES (?)", nom);
  return c.db.un("SELECT * FROM genres WHERE id = ?", id);
});

on("DELETE", "/genres/:id", "Co-patron", async (c) => {
  await c.db.exec("DELETE FROM genres WHERE id = ?", c.params.id);
  return { fait: true };
});

// ===========================================================================
// VÉHICULES
// ===========================================================================

/** Vitrine publique : le stock, sans aucun détail financier interne. */
on("GET", "/vitrine", LIBRE, async (c) =>
  c.db.tous(
    `SELECT id, modele, genre, classe, categorie, image, description, prix_vente
       FROM vehicules WHERE statut = 'stock' ORDER BY id DESC`,
  ));

on("GET", "/vehicules", CONNECTE, async (c) => {
  const complet = auMoins(c.employe.grade, "Manager");
  return c.db.tous(
    complet
      ? "SELECT * FROM vehicules ORDER BY id DESC"
      : `SELECT id, modele, genre, classe, categorie, image, description, prix_vente, statut
           FROM vehicules WHERE statut = 'stock' ORDER BY id DESC`,
  );
});

on("POST", "/vehicules", "Vendeur/Vendeuse", async (c) => {
  const { modele, categorie, image, description,
          clientNom, clientPrenom, clientClasse } = c.corps;
  if (!modele) refus(400, "Choisis un modèle.");
  if (!["Occasion", "Import"].includes(categorie)) {
    refus(400, "Catégorie attendue : Occasion ou Import.");
  }
  if (categorie === "Import" && !auMoins(c.employe.grade, "Manager")) {
    refus(403, "L'enregistrement d'un Import est réservé aux Managers et au-dessus.");
  }

  const fiche = await c.db.un(
    "SELECT * FROM catalogue WHERE lower(nom) = lower(?)",
    String(modele).trim(),
  );
  if (!fiche) refus(400, "Ce modèle n'est pas au catalogue de prix.");

  // On ne rachète qu à quelqu un qui pouvait posséder le véhicule : sa classe
  // doit être au moins celle de la voiture.
  if (
    categorie === "Occasion" &&
    String(clientNom || "").trim() &&
    !classeSuffit(clientClasse, fiche.classe)
  ) {
    refus(
      403,
      `Rachat impossible : ce véhicule est de classe ${fiche.classe}, ` +
        `le vendeur est de classe ${String(clientClasse || "—").toUpperCase()}. ` +
        `Il n a pas pu l acheter.`,
    );
  }

  const prix = await figerPrix(c.db, { categorie, prixBase: fiche.prix_base });
  const { id } = await c.db.exec(
    `INSERT INTO vehicules
       (modele, genre, classe, categorie, image, description, prix_base, reduction, marge, prix_achat, prix_vente, achete_par)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    fiche.nom, fiche.genre, fiche.classe || "", categorie,
    String(image || ""), String(description || ""),
    prix.prixBase, prix.reduction, prix.marge, prix.prixAchat, prix.prixVente,
    `${c.employe.prenom} ${c.employe.nom}`,
  );
  const vehicule = await c.db.un("SELECT * FROM vehicules WHERE id = ?", id);

  // Un véhicule d'occasion vient forcément d'un joueur : on enregistre le
  // rachat, ce qui produit aussi son contrat. Un import n'a pas de vendeur.
  let mouvement = null;
  let contrat = null;
  if (categorie === "Occasion" && String(clientNom || "").trim()) {
    const r = await c.db.exec(
      `INSERT INTO mouvements
         (type, vehicule_id, modele, genre, image, prix_initial, km, surcharge,
          surcharge_offerte, reduction_pct, reduction_montant, prix_final,
          client_nom, client_prenom, client_classe, vendeur_nom, vendeur_prenom, employe_id)
       VALUES ('achat', ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?)`,
      vehicule.id, vehicule.modele, vehicule.genre, vehicule.image,
      vehicule.prix_achat, vehicule.prix_achat,
      String(clientNom).trim(), String(clientPrenom || "").trim(), String(clientClasse || ""),
      c.employe.nom, c.employe.prenom, c.employe.id,
    );
    mouvement = await c.db.un("SELECT * FROM mouvements WHERE id = ?", r.id);
    contrat = await contratAutomatique(c.db, { type: "achat", mouvement, employe: c.employe });
  }

  return { ...vehicule, mouvement, contrat };
});

on("PATCH", "/vehicules/:id", "Manager", async (c) => {
  const v = await c.db.un("SELECT * FROM vehicules WHERE id = ?", c.params.id);
  if (!v) refus(404, "Véhicule introuvable.");
  const b = c.corps;
  await c.db.exec(
    "UPDATE vehicules SET image = ?, description = ?, statut = ? WHERE id = ?",
    b.image ?? v.image, b.description ?? v.description, b.statut ?? v.statut, v.id,
  );
  return c.db.un("SELECT * FROM vehicules WHERE id = ?", v.id);
});

on("DELETE", "/vehicules/:id", "Manager", async (c) => {
  const v = await c.db.un("SELECT image FROM vehicules WHERE id = ?", c.params.id);
  await c.db.exec("DELETE FROM vehicules WHERE id = ?", c.params.id);

  // La photo part avec le véhicule — sauf si une vente ou un autre véhicule
  // l affiche encore, sinon on trouerait un historique.
  let photoSupprimee = false;
  const cle = String(v?.image || "").startsWith("/api/images/")
    ? v.image.slice("/api/images/".length)
    : null;
  if (cle) {
    const encore = await c.db.un(
      `SELECT
         (SELECT COUNT(*) FROM vehicules  WHERE image = ?) +
         (SELECT COUNT(*) FROM mouvements WHERE image = ?) AS n`,
      v.image, v.image,
    );
    if (!encore?.n) {
      await c.db.exec("DELETE FROM images WHERE cle = ?", cle);
      photoSupprimee = true;
    }
  }
  return { fait: true, photoSupprimee };
});

// ===========================================================================
// MOUVEMENTS — ventes et rachats
// ===========================================================================

on("GET", "/mouvements", "Manager", async (c) => {
  const type = c.query.get("type");
  return type
    ? c.db.tous("SELECT * FROM mouvements WHERE type = ? ORDER BY id DESC", type)
    : c.db.tous("SELECT * FROM mouvements ORDER BY id DESC");
});

on("POST", "/mouvements", "Vendeur/Vendeuse", async (c) => {
  const b = c.corps;
  const type = b.type === "achat" ? "achat" : "vente";

  let vehicule = null;
  if (b.vehiculeId) {
    vehicule = await c.db.un("SELECT * FROM vehicules WHERE id = ?", b.vehiculeId);
    if (!vehicule) refus(404, "Véhicule introuvable.");
    if (type === "vente" && vehicule.statut === "vendu") {
      refus(409, "Ce véhicule est déjà vendu.");
    }
    // Un citoyen n achète que dans sa classe ou en dessous, comme au PDM.
    if (type === "vente" && !classeSuffit(b.clientClasse, vehicule.classe)) {
      refus(
        403,
        `Vente impossible : ce véhicule est de classe ${vehicule.classe}, ` +
          `le client est de classe ${String(b.clientClasse || "—").toUpperCase()}.`,
      );
    }
  }

  const montantAchat = Math.round(Number(b.prixAchat ?? vehicule?.prix_achat ?? 0));
  const calcul =
    type === "vente"
      ? await calculerVente(c.db, {
          prixVente: b.prixVente ?? vehicule?.prix_vente ?? 0,
          km: b.km,
          reductionPct: b.reductionPct,
        })
      : {
          prixInitial: montantAchat,
          km: Math.round(Number(b.km) || 0),
          reductionPct: 0, reductionMontant: 0,
          surcharge: 0, surchargeOfferte: false,
          prixFinal: montantAchat,
        };

  const { id } = await c.db.exec(
    `INSERT INTO mouvements
       (type, vehicule_id, modele, genre, image, prix_initial, km, surcharge,
        surcharge_offerte, reduction_pct, reduction_montant, prix_final,
        client_nom, client_prenom, client_classe, vendeur_nom, vendeur_prenom, employe_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    type,
    vehicule?.id ?? null,
    b.modele ?? vehicule?.modele ?? "",
    b.genre ?? vehicule?.genre ?? "",
    b.image ?? vehicule?.image ?? "",
    calcul.prixInitial, calcul.km, calcul.surcharge,
    calcul.surchargeOfferte ? 1 : 0,
    calcul.reductionPct, calcul.reductionMontant, calcul.prixFinal,
    String(b.clientNom || ""), String(b.clientPrenom || ""), String(b.clientClasse || ""),
    c.employe.nom, c.employe.prenom, c.employe.id,
  );

  if (type === "vente" && vehicule) {
    await c.db.exec("UPDATE vehicules SET statut = 'vendu' WHERE id = ?", vehicule.id);
  }

  const mouvement = await c.db.un("SELECT * FROM mouvements WHERE id = ?", id);

  // Toute vente et tout rachat repart avec son contrat déjà rempli. Si le
  // contrat échoue, l'opération reste enregistrée.
  const contrat =
    b.contrat === false
      ? null
      : await contratAutomatique(c.db, { type, mouvement, employe: c.employe });

  return { ...mouvement, contrat };
});

on("DELETE", "/mouvements/:id", "Co-patron", async (c) => {
  await c.db.exec("DELETE FROM mouvements WHERE id = ?", c.params.id);
  return { fait: true };
});

// ===========================================================================
// CONTRATS
// ===========================================================================

on("GET", "/contrats/variables", CONNECTE, async () => ({ variables: VARIABLES_CONTRAT }));

on("GET", "/contrats/modeles", CONNECTE, async (c) => {
  const lignes = await c.db.tous("SELECT * FROM contrats_modeles ORDER BY categorie, nom");
  return lignes
    .filter((m) => peutVoirContrat(m.visible_par, c.employe.grade))
    .map((m) => ({ ...m, trous: trousDuModele(m.corps) }));
});

on("POST", "/contrats/modeles", "Co-patron", async (c) => {
  const { nom, categorie, corps, aTrous, visiblePar } = c.corps;
  if (!nom) refus(400, "Donne un nom au modèle.");
  const { id } = await c.db.exec(
    "INSERT INTO contrats_modeles (nom, categorie, corps, a_trous, visible_par) VALUES (?, ?, ?, ?, ?)",
    String(nom).trim(),
    String(categorie || "libre").trim(),
    String(corps || ""),
    aTrous === false ? 0 : 1,
    Array.isArray(visiblePar) ? visiblePar.join(",") : String(visiblePar || ""),
  );
  return c.db.un("SELECT * FROM contrats_modeles WHERE id = ?", id);
});

on("PATCH", "/contrats/modeles/:id", "Co-patron", async (c) => {
  const m = await c.db.un("SELECT * FROM contrats_modeles WHERE id = ?", c.params.id);
  if (!m) refus(404, "Modèle introuvable.");
  const b = c.corps;
  await c.db.exec(
    "UPDATE contrats_modeles SET nom = ?, categorie = ?, corps = ?, a_trous = ?, visible_par = ? WHERE id = ?",
    b.nom ?? m.nom,
    b.categorie ?? m.categorie,
    b.corps ?? m.corps,
    b.aTrous === undefined ? m.a_trous : b.aTrous ? 1 : 0,
    b.visiblePar === undefined
      ? m.visible_par
      : Array.isArray(b.visiblePar) ? b.visiblePar.join(",") : String(b.visiblePar),
    m.id,
  );
  return c.db.un("SELECT * FROM contrats_modeles WHERE id = ?", m.id);
});

on("DELETE", "/contrats/modeles/:id", "Co-patron", async (c) => {
  await c.db.exec("DELETE FROM contrats_modeles WHERE id = ?", c.params.id);
  return { fait: true };
});

on("GET", "/contrats", CONNECTE, async (c) => {
  const mouvementId = c.query.get("mouvementId");
  const requete =
    "SELECT c.*, m.visible_par FROM contrats c" +
    " LEFT JOIN contrats_modeles m ON m.id = c.modele_id";
  const lignes = mouvementId
    ? await c.db.tous(requete + " WHERE c.mouvement_id = ? ORDER BY c.id DESC", mouvementId)
    : await c.db.tous(requete + " ORDER BY c.id DESC");
  return lignes
    .filter((x) => peutVoirContrat(x.visible_par, c.employe.grade))
    .map((x) => ({ ...x, valeurs: JSON.parse(x.valeurs || "{}") }));
});

on("POST", "/contrats", "Vendeur/Vendeuse", async (c) => {
  const { modeleId, mouvementId, valeurs } = c.corps;
  const modele = await c.db.un("SELECT * FROM contrats_modeles WHERE id = ?", modeleId);
  if (!modele) refus(404, "Modèle de contrat introuvable.");

  let mouvement = null;
  if (mouvementId) {
    mouvement = await c.db.un("SELECT * FROM mouvements WHERE id = ?", mouvementId);
    if (!mouvement) refus(404, "Mouvement introuvable.");
  }
  return fabriquerContrat(c.db, { modele, mouvement, valeurs, employe: c.employe });
});

on("PATCH", "/contrats/:id", "Manager", async (c) => {
  const ct = await c.db.un("SELECT * FROM contrats WHERE id = ?", c.params.id);
  if (!ct) refus(404, "Contrat introuvable.");
  const b = c.corps;
  const valeurs = b.valeurs
    ? { ...JSON.parse(ct.valeurs || "{}"), ...b.valeurs }
    : JSON.parse(ct.valeurs || "{}");
  const modele = await c.db.un("SELECT * FROM contrats_modeles WHERE id = ?", ct.modele_id);
  const texte =
    b.texte !== undefined ? b.texte : rendreContrat(modele?.corps || ct.texte, valeurs);

  await c.db.exec(
    "UPDATE contrats SET valeurs = ?, texte = ? WHERE id = ?",
    JSON.stringify(valeurs), texte, ct.id,
  );
  const maj = await c.db.un("SELECT * FROM contrats WHERE id = ?", ct.id);
  return { ...maj, valeurs: JSON.parse(maj.valeurs) };
});

on("DELETE", "/contrats/:id", "Co-patron", async (c) => {
  await c.db.exec("DELETE FROM contrats WHERE id = ?", c.params.id);
  return { fait: true };
});

// ===========================================================================
// IMAGES — envoyées depuis le site, rangées dans la base
// ===========================================================================
// Pas de service de stockage à activer : la photo est gardée en base64 dans
// D1. Le navigateur la réduit avant l envoi, donc elle pèse peu.

const TYPES_IMAGE = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const TAILLE_MAX = 700 * 1024;

on("POST", "/images", "Vendeur/Vendeuse", async (c) => {
  const { type, donnees } = c.corps;
  if (!TYPES_IMAGE.includes(type)) refus(415, "Format accepté : PNG, JPEG, WebP ou GIF.");
  if (typeof donnees !== "string" || !donnees) refus(400, "Image vide.");

  // base64 : 4 caractères pour 3 octets.
  const octetsEstimes = Math.floor((donnees.length * 3) / 4);
  if (octetsEstimes > TAILLE_MAX) {
    refus(413, "Image trop lourde même après réduction. Essaie une photo plus petite.");
  }

  const suffixe = [...octets(6)].map((o) => o.toString(16).padStart(2, "0")).join("");
  const extension = type.split("/")[1].replace("jpeg", "jpg");
  const cle = `${Date.now().toString(36)}-${suffixe}.${extension}`;

  await c.db.exec(
    "INSERT INTO images (cle, type, donnees, octets, cree_par) VALUES (?, ?, ?, ?, ?)",
    cle, type, donnees, octetsEstimes, `${c.employe.prenom} ${c.employe.nom}`,
  );
  return { cle, url: `/api/images/${cle}`, octets: octetsEstimes };
});

/** Sert une image. Publique : la vitrine doit pouvoir l afficher sans compte. */
on("GET", "/images/:cle", LIBRE, async (c) => {
  const img = await c.db.un("SELECT type, donnees FROM images WHERE cle = ?", c.params.cle);
  if (!img) refus(404, "Image introuvable.");

  // base64 -> octets
  const binaire = atob(img.donnees);
  const tableau = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) tableau[i] = binaire.charCodeAt(i);

  return new Response(tableau, {
    headers: {
      "Content-Type": img.type,
      // Le nom du fichier ne change jamais : le navigateur peut la garder.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

/** Une photo est « utilisée » si un véhicule ou un mouvement l affiche. */
const REQUETE_USAGE =
  `SELECT i.cle, i.type, i.octets, i.cree_le, i.cree_par,
          (SELECT COUNT(*) FROM vehicules v  WHERE v.image = '/api/images/' || i.cle) AS vehicules,
          (SELECT COUNT(*) FROM mouvements m WHERE m.image = '/api/images/' || i.cle) AS mouvements
     FROM images i
    ORDER BY i.cree_le DESC, i.rowid DESC`;

/** Inventaire des photos — réservé à la direction. */
on("GET", "/images", "Co-patron", async (c) => {
  const lignes = await c.db.tous(REQUETE_USAGE);
  const photos = lignes.map((i) => ({
    ...i,
    url: `/api/images/${i.cle}`,
    utilisee: i.vehicules + i.mouvements > 0,
  }));
  return {
    photos,
    total: photos.length,
    octets: photos.reduce((s, p) => s + (p.octets || 0), 0),
    inutilisees: photos.filter((p) => !p.utilisee).length,
  };
});

/** Supprime d un coup toutes les photos que plus rien n affiche. */
on("POST", "/images/menage", "Co-patron", async (c) => {
  const { touchees } = await c.db.exec(
    `DELETE FROM images WHERE cle NOT IN (
       SELECT replace(image, '/api/images/', '') FROM vehicules
        WHERE image LIKE '/api/images/%'
       UNION
       SELECT replace(image, '/api/images/', '') FROM mouvements
        WHERE image LIKE '/api/images/%'
     )`,
  );
  return { supprimees: touchees };
});

on("DELETE", "/images/:cle", "Co-patron", async (c) => {
  await c.db.exec("DELETE FROM images WHERE cle = ?", c.params.cle);
  return { fait: true };
});
// ===========================================================================
// PARAMÈTRES ET TRANCHES
// ===========================================================================

on("GET", "/parametres", CONNECTE, async (c) => ({
  ...(await lireParametres(c.db)),
  tranchesReduction: await tranchesReduction(c.db),
  tranchesMarge: await tranchesMarge(c.db),
  grades: GRADES,
}));

on("PUT", "/parametres", "Co-patron", async (c) => {
  const b = c.corps || {};
  const patch = {};
  for (const cle of [
    "reductionMaxVente", "kmIntervalle", "kmMontant", "nomEntreprise",
    "salaireBase", "primeParOperation",
  ]) {
    if (b[cle] !== undefined) patch[cle] = b[cle];
  }
  return ecrireParametres(c.db, patch);
});

const remplacerTranches = (table) => async (c) => {
  const lignes = Array.isArray(c.corps) ? c.corps : c.corps?.tranches;
  if (!Array.isArray(lignes)) refus(400, "Envoie un tableau de tranches.");

  const instructions = [c.db.prep(`DELETE FROM ${table}`, [])];
  for (const l of lignes) {
    instructions.push(
      c.db.prep(`INSERT INTO ${table} (seuil, montant) VALUES (?, ?)`, [
        Math.round(Number(l.seuil) || 0),
        Math.round(Number(l.montant) || 0),
      ]),
    );
  }
  await c.db.lot(instructions);
  return c.db.tous(`SELECT seuil, montant FROM ${table} ORDER BY seuil ASC`);
};

on("PUT", "/tranches/reduction", "Co-patron", remplacerTranches("tranches_reduction"));
on("PUT", "/tranches/marge", "Co-patron", remplacerTranches("tranches_marge"));

// ===========================================================================
// POINT D'ENTRÉE
// ===========================================================================

const json = (donnees, code = 200) =>
  new Response(JSON.stringify(donnees), {
    status: code,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Tout ce qui n'est pas /api est un fichier du site.
    if (!url.pathname.startsWith("/api")) return env.ASSETS.fetch(request);

    const chemin = url.pathname.slice(4) || "/";
    if (chemin === "/") return json({ service: "Atlas Auto", version: VERSION });

    const db = bd(env);

    try {
      const route = ROUTES.find(
        (r) => r.methode === request.method && r.motif.test(chemin),
      );
      if (!route) {
        // Bonne adresse, mauvaise méthode : on le dit clairement.
        const autre = ROUTES.find((r) => r.motif.test(chemin));
        refus(autre ? 405 : 404, autre ? "Méthode non autorisée." : "Route inconnue.");
      }

      // Session : le jeton est passé en en-tête Authorization.
      const entete = request.headers.get("authorization") || "";
      const token = entete.startsWith("Bearer ") ? entete.slice(7) : null;
      let employe = null;
      if (token) {
        employe = await db.un(
          `SELECT e.* FROM sessions s
             JOIN employes e ON e.id = s.employe_id
            WHERE s.token = ? AND s.fermee_le IS NULL AND e.actif = 1`,
          token,
        );
        if (employe) {
          await db.exec("UPDATE sessions SET vue_le = datetime('now') WHERE token = ?", token);
        }
      }

      // Contrôle d'accès : undefined = libre, null = connecté, sinon grade mini.
      if (route.grade !== undefined) {
        if (!employe) refus(401, "Connexion requise.");
        if (route.grade && !auMoins(employe.grade, route.grade)) {
          refus(403, `Réservé aux grades ${route.grade} et au-dessus.`);
        }
      }

      const bruts = chemin.match(route.motif).slice(1);
      const params = {};
      route.noms.forEach((n, i) => (params[n] = decodeURIComponent(bruts[i])));

      // Le corps n est décodé en JSON que si c en est. Un envoi de fichier
      // arrive en binaire : la route le lit elle-même depuis c.request.
      let corps = {};
      const typeCorps = request.headers.get("content-type") || "";
      if (
        ["POST", "PUT", "PATCH"].includes(request.method) &&
        typeCorps.includes("application/json")
      ) {
        try {
          corps = (await request.json()) ?? {};
        } catch {
          corps = {};
        }
      }

      const resultat = await route.fn({
        db, env, params, corps, employe, token,
        query: url.searchParams,
        request,
      });
      // Une route peut renvoyer sa propre réponse — une image, par exemple.
      if (resultat instanceof Response) return resultat;
      return json(resultat ?? { fait: true });
    } catch (e) {
      if (e instanceof Erreur) return json({ erreur: e.message }, e.code);
      console.error("[atlas]", request.method, chemin, e?.stack || e);
      return json({ erreur: e?.message || "Erreur interne." }, 500);
    }
  },
};
