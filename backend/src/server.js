import express from "express";
import cors from "cors";

import { db, tous, un, exec, amorcer, lireParametres, ecrireParametres, prochainCompteur } from "./db.js";
import {
  GRADES, auMoins, genererCode, connecter, deconnecter, publier,
  attacherSession, exige, connexionsEnCours,
} from "./auth.js";
import {
  figerPrix, calculerVente, tranchesReduction, tranchesMarge,
  VARIABLES_CONTRAT, trousDuModele, rendreContrat, valeursDepuisMouvement,
} from "./metier.js";

amorcer();

const app = express();
app.use(cors({ origin: process.env.ORIGINE || true }));
app.use(express.json({ limit: "2mb" }));
app.use(attacherSession);

const r = express.Router();
const ok = (res, data) => res.json(data);
const erreur = (res, code, message) => res.status(code).json({ erreur: message });

/** Enveloppe une route pour renvoyer une 500 lisible au lieu d'un crash. */
const route = (fn) => (req, res) => {
  try { fn(req, res); }
  catch (e) {
    console.error("[atlas]", req.method, req.path, e.message);
    erreur(res, 500, e.message || "Erreur interne.");
  }
};

// ===========================================================================
// AUTHENTIFICATION
// ===========================================================================

r.post("/auth/login", route((req, res) => {
  const { nom, prenom, code } = req.body || {};
  if (!nom || !prenom || !code) {
    return erreur(res, 400, "Nom, prénom et code sont tous les trois obligatoires.");
  }
  const session = connecter({ nom, prenom, code });
  if (!session) {
    return erreur(res, 401, "Nom, prénom ou code incorrect.");
  }
  ok(res, session);
}));

r.post("/auth/logout", exige(), route((req, res) => {
  deconnecter(req.token);
  ok(res, { fait: true });
}));

r.get("/auth/moi", exige(), route((req, res) => ok(res, publier(req.employe))));

// ===========================================================================
// EMPLOYÉS — saisie manuelle, code à 5 chiffres généré
// ===========================================================================

r.get("/employes", exige("Co-patron"), route((_req, res) => {
  ok(res, tous("SELECT * FROM employes ORDER BY actif DESC, nom, prenom").map((e) => ({
    ...publier(e),
    code: e.code,
  })));
}));

r.post("/employes", exige("Co-patron"), route((req, res) => {
  const { nom, prenom, grade } = req.body || {};
  if (!nom || !prenom) return erreur(res, 400, "Nom et prénom obligatoires.");
  if (!GRADES.includes(grade)) {
    return erreur(res, 400, `Grade inconnu. Attendu : ${GRADES.join(", ")}.`);
  }
  const existe = un(
    "SELECT 1 FROM employes WHERE lower(nom) = lower(?) AND lower(prenom) = lower(?)",
    String(nom).trim(), String(prenom).trim(),
  );
  if (existe) return erreur(res, 409, "Un employé porte déjà ce nom et ce prénom.");

  const code = genererCode();
  const info = exec(
    "INSERT INTO employes (nom, prenom, grade, code) VALUES (?, ?, ?, ?)",
    String(nom).trim(), String(prenom).trim(), grade, code,
  );
  const cree = un("SELECT * FROM employes WHERE id = ?", info.lastInsertRowid);
  ok(res, { ...publier(cree), code: cree.code });
}));

r.patch("/employes/:id", exige("Co-patron"), route((req, res) => {
  const e = un("SELECT * FROM employes WHERE id = ?", req.params.id);
  if (!e) return erreur(res, 404, "Employé introuvable.");

  const { nom, prenom, grade, actif } = req.body || {};
  if (grade && !GRADES.includes(grade)) return erreur(res, 400, "Grade inconnu.");

  exec(
    "UPDATE employes SET nom = ?, prenom = ?, grade = ?, actif = ? WHERE id = ?",
    nom !== undefined ? String(nom).trim() : e.nom,
    prenom !== undefined ? String(prenom).trim() : e.prenom,
    grade || e.grade,
    actif === undefined ? e.actif : (actif ? 1 : 0),
    e.id,
  );
  const maj = un("SELECT * FROM employes WHERE id = ?", e.id);
  ok(res, { ...publier(maj), code: maj.code });
}));

/** Régénère le code d'un employé : l'ancien ne fonctionne plus. */
r.post("/employes/:id/code", exige("Co-patron"), route((req, res) => {
  const e = un("SELECT * FROM employes WHERE id = ?", req.params.id);
  if (!e) return erreur(res, 404, "Employé introuvable.");
  const code = genererCode();
  exec("UPDATE employes SET code = ? WHERE id = ?", code, e.id);
  exec("UPDATE sessions SET fermee_le = datetime('now') WHERE employe_id = ? AND fermee_le IS NULL", e.id);
  ok(res, { ...publier(e), code });
}));

r.delete("/employes/:id", exige("Patron"), route((req, res) => {
  const e = un("SELECT * FROM employes WHERE id = ?", req.params.id);
  if (!e) return erreur(res, 404, "Employé introuvable.");
  const patrons = un("SELECT COUNT(*) n FROM employes WHERE grade = 'Patron' AND actif = 1").n;
  if (e.grade === "Patron" && patrons <= 1) {
    return erreur(res, 400, "Impossible de supprimer le dernier compte Patron.");
  }
  exec("DELETE FROM employes WHERE id = ?", e.id);
  ok(res, { fait: true });
}));

r.get("/connexions", exige("Co-patron"), route((_req, res) => ok(res, connexionsEnCours())));

// ===========================================================================
// HEURES DE SERVICE — saisie manuelle par le patron / co-patron
// ===========================================================================

r.get("/heures", exige("Co-patron"), route((_req, res) => {
  ok(res, tous(
    `SELECT h.*, e.nom, e.prenom, e.grade
       FROM heures_service h JOIN employes e ON e.id = h.employe_id
      ORDER BY h.date DESC, h.id DESC`,
  ));
}));

r.post("/heures", exige("Co-patron"), route((req, res) => {
  const { employeId, date, minutes, note } = req.body || {};
  if (!un("SELECT 1 FROM employes WHERE id = ?", employeId)) {
    return erreur(res, 400, "Employé inconnu.");
  }
  const m = Math.round(Number(minutes) || 0);
  if (m === 0) return erreur(res, 400, "Indique une durée (en minutes).");

  const info = exec(
    "INSERT INTO heures_service (employe_id, date, minutes, note, saisi_par) VALUES (?, ?, ?, ?, ?)",
    employeId,
    date || new Date().toISOString().slice(0, 10),
    m,
    String(note || ""),
    `${req.employe.prenom} ${req.employe.nom}`,
  );
  ok(res, un("SELECT * FROM heures_service WHERE id = ?", info.lastInsertRowid));
}));

r.delete("/heures/:id", exige("Co-patron"), route((req, res) => {
  exec("DELETE FROM heures_service WHERE id = ?", req.params.id);
  ok(res, { fait: true });
}));

/** Récapitulatif salaires : heures saisies + véhicules vendus, par employé. */
r.get("/salaires", exige("Co-patron"), route((req, res) => {
  const { debut, fin } = req.query;
  const bornes = [debut || "0000-01-01", fin || "9999-12-31"];

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

  // Paie = un fixe par employé + une prime par opération, vente ou rachat.
  const p = lireParametres();
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

  ok(res, {
    debut: bornes[0],
    fin: bornes[1],
    salaireBase: base,
    primeParOperation: prime,
    masseSalariale: avecPaie.reduce((s, l) => s + l.salaire, 0),
    lignes: avecPaie,
  });
}));

// ===========================================================================
// DÉPENSES
// ===========================================================================

r.get("/depenses", exige("Co-patron"), route((_req, res) => {
  const lignes = tous("SELECT * FROM depenses ORDER BY date DESC, id DESC");
  const total = lignes.reduce((s, d) => s + d.montant, 0);
  ok(res, { lignes, total });
}));

r.post("/depenses", exige("Co-patron"), route((req, res) => {
  const { libelle, montant, categorie, date, note } = req.body || {};
  if (!libelle) return erreur(res, 400, "Un libellé est obligatoire.");
  const info = exec(
    "INSERT INTO depenses (libelle, montant, categorie, date, note, saisi_par) VALUES (?, ?, ?, ?, ?, ?)",
    String(libelle).trim(),
    Math.round(Number(montant) || 0),
    String(categorie || "Divers"),
    date || new Date().toISOString().slice(0, 10),
    String(note || ""),
    `${req.employe.prenom} ${req.employe.nom}`,
  );
  ok(res, un("SELECT * FROM depenses WHERE id = ?", info.lastInsertRowid));
}));

r.patch("/depenses/:id", exige("Co-patron"), route((req, res) => {
  const d = un("SELECT * FROM depenses WHERE id = ?", req.params.id);
  if (!d) return erreur(res, 404, "Dépense introuvable.");
  const b = req.body || {};
  exec(
    "UPDATE depenses SET libelle = ?, montant = ?, categorie = ?, date = ?, note = ? WHERE id = ?",
    b.libelle ?? d.libelle,
    b.montant === undefined ? d.montant : Math.round(Number(b.montant) || 0),
    b.categorie ?? d.categorie,
    b.date ?? d.date,
    b.note ?? d.note,
    d.id,
  );
  ok(res, un("SELECT * FROM depenses WHERE id = ?", d.id));
}));

r.delete("/depenses/:id", exige("Co-patron"), route((req, res) => {
  exec("DELETE FROM depenses WHERE id = ?", req.params.id);
  ok(res, { fait: true });
}));

// ===========================================================================
// CATALOGUE ET GENRES
// ===========================================================================

r.get("/catalogue", route((_req, res) =>
  ok(res, tous("SELECT * FROM catalogue ORDER BY nom"))));

r.post("/catalogue", exige("Co-patron"), route((req, res) => {
  const { nom, prixBase, genre } = req.body || {};
  if (!nom) return erreur(res, 400, "Nom du modèle obligatoire.");
  const info = exec(
    "INSERT INTO catalogue (nom, prix_base, genre) VALUES (?, ?, ?)",
    String(nom).trim(), Math.round(Number(prixBase) || 0), String(genre || ""),
  );
  ok(res, un("SELECT * FROM catalogue WHERE id = ?", info.lastInsertRowid));
}));

/** Remplacement en bloc du catalogue — pratique pour importer les 372 modèles. */
r.put("/catalogue", exige("Co-patron"), route((req, res) => {
  const lignes = Array.isArray(req.body) ? req.body : req.body?.lignes;
  if (!Array.isArray(lignes)) return erreur(res, 400, "Envoie un tableau de modèles.");
  const stmt = db.prepare("INSERT INTO catalogue (nom, prix_base, genre) VALUES (?, ?, ?)");
  const tx = db.transaction(() => {
    exec("DELETE FROM catalogue");
    for (const l of lignes) {
      stmt.run(String(l.nom || "").trim(), Math.round(Number(l.prixBase ?? l.prix_base) || 0), String(l.genre || ""));
    }
  });
  tx();
  ok(res, tous("SELECT * FROM catalogue ORDER BY nom"));
}));

r.patch("/catalogue/:id", exige("Co-patron"), route((req, res) => {
  const c = un("SELECT * FROM catalogue WHERE id = ?", req.params.id);
  if (!c) return erreur(res, 404, "Modèle introuvable.");
  const b = req.body || {};
  exec(
    "UPDATE catalogue SET nom = ?, prix_base = ?, genre = ? WHERE id = ?",
    b.nom ?? c.nom,
    b.prixBase === undefined ? c.prix_base : Math.round(Number(b.prixBase) || 0),
    b.genre ?? c.genre,
    c.id,
  );
  ok(res, un("SELECT * FROM catalogue WHERE id = ?", c.id));
}));

r.delete("/catalogue/:id", exige("Co-patron"), route((req, res) => {
  exec("DELETE FROM catalogue WHERE id = ?", req.params.id);
  ok(res, { fait: true });
}));

r.get("/genres", route((_req, res) =>
  ok(res, tous("SELECT * FROM genres ORDER BY nom"))));

r.post("/genres", exige("Co-patron"), route((req, res) => {
  const nom = String(req.body?.nom || "").trim();
  if (!nom) return erreur(res, 400, "Nom du genre obligatoire.");
  if (un("SELECT 1 FROM genres WHERE lower(nom) = lower(?)", nom)) {
    return erreur(res, 409, "Ce genre existe déjà.");
  }
  const info = exec("INSERT INTO genres (nom) VALUES (?)", nom);
  ok(res, un("SELECT * FROM genres WHERE id = ?", info.lastInsertRowid));
}));

r.delete("/genres/:id", exige("Co-patron"), route((req, res) => {
  exec("DELETE FROM genres WHERE id = ?", req.params.id);
  ok(res, { fait: true });
}));

// ===========================================================================
// VÉHICULES
// ===========================================================================

/** Vitrine publique : uniquement ce qui est en stock, sans détail financier. */
r.get("/vitrine", route((_req, res) => {
  ok(res, tous(
    `SELECT id, modele, genre, categorie, image, description, prix_vente
       FROM vehicules WHERE statut = 'stock' ORDER BY id DESC`,
  ));
}));

r.get("/vehicules", exige(), route((req, res) => {
  const complet = ["Manager", "Co-patron", "Patron"].includes(req.employe.grade);
  const lignes = tous(
    complet
      ? "SELECT * FROM vehicules ORDER BY id DESC"
      : "SELECT id, modele, genre, categorie, image, description, prix_vente, statut FROM vehicules WHERE statut = 'stock' ORDER BY id DESC",
  );
  ok(res, lignes);
}));

r.post("/vehicules", exige("Vendeur/Vendeuse"), route((req, res) => {
  const { modele, genre, categorie, image, description,
          clientNom, clientPrenom, clientClasse } = req.body || {};
  if (!modele) return erreur(res, 400, "Choisis un modèle.");
  if (!["Occasion", "Import"].includes(categorie)) {
    return erreur(res, 400, "Catégorie attendue : Occasion ou Import.");
  }
  if (categorie === "Import" && !["Manager", "Co-patron", "Patron"].includes(req.employe.grade)) {
    return erreur(res, 403, "L'enregistrement d'un Import est réservé aux Managers et au-dessus.");
  }

  const fiche = un("SELECT * FROM catalogue WHERE lower(nom) = lower(?)", String(modele).trim());
  if (!fiche) return erreur(res, 400, "Ce modèle n'est pas au catalogue de prix.");

  const prix = figerPrix({ categorie, prixBase: fiche.prix_base });
  const info = exec(
    `INSERT INTO vehicules
       (modele, genre, categorie, image, description, prix_base, reduction, marge, prix_achat, prix_vente, achete_par)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    fiche.nom, fiche.genre, categorie,
    String(image || ""), String(description || ""),
    prix.prixBase, prix.reduction, prix.marge, prix.prixAchat, prix.prixVente,
    `${req.employe.prenom} ${req.employe.nom}`,
  );
  const vehicule = un("SELECT * FROM vehicules WHERE id = ?", info.lastInsertRowid);

  // Un véhicule d'occasion a forcément été racheté à un joueur : on enregistre
  // le rachat, ce qui produit du même coup son contrat. Un import n'a pas de
  // vendeur en face, donc pas de mouvement d'achat.
  let mouvement = null;
  let contrat = null;
  if (categorie === "Occasion" && String(clientNom || "").trim()) {
    const infoMv = exec(
      `INSERT INTO mouvements
         (type, vehicule_id, modele, genre, image, prix_initial, km, surcharge,
          surcharge_offerte, reduction_pct, reduction_montant, prix_final,
          client_nom, client_prenom, client_classe, vendeur_nom, vendeur_prenom, employe_id)
       VALUES ('achat', ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?)`,
      vehicule.id, vehicule.modele, vehicule.genre, vehicule.image,
      vehicule.prix_achat, vehicule.prix_achat,
      String(clientNom).trim(), String(clientPrenom || "").trim(), String(clientClasse || ""),
      req.employe.nom, req.employe.prenom, req.employe.id,
    );
    mouvement = un("SELECT * FROM mouvements WHERE id = ?", infoMv.lastInsertRowid);

    const modeleContrat = un(
      "SELECT * FROM contrats_modeles WHERE categorie = 'achat' ORDER BY id ASC LIMIT 1",
    );
    if (modeleContrat) {
      try {
        contrat = fabriquerContrat({ modele: modeleContrat, mouvement, employe: req.employe });
      } catch (e) {
        console.error("[atlas] contrat de rachat impossible :", e.message);
      }
    }
  }

  ok(res, { ...vehicule, mouvement, contrat });
}));

r.patch("/vehicules/:id", exige("Manager"), route((req, res) => {
  const v = un("SELECT * FROM vehicules WHERE id = ?", req.params.id);
  if (!v) return erreur(res, 404, "Véhicule introuvable.");
  const b = req.body || {};
  exec(
    "UPDATE vehicules SET image = ?, description = ?, statut = ? WHERE id = ?",
    b.image ?? v.image, b.description ?? v.description, b.statut ?? v.statut, v.id,
  );
  ok(res, un("SELECT * FROM vehicules WHERE id = ?", v.id));
}));

r.delete("/vehicules/:id", exige("Manager"), route((req, res) => {
  exec("DELETE FROM vehicules WHERE id = ?", req.params.id);
  ok(res, { fait: true });
}));

// ===========================================================================
// MOUVEMENTS — ventes et achats
// ===========================================================================

r.get("/mouvements", exige("Manager"), route((req, res) => {
  const type = req.query.type;
  const lignes = type
    ? tous("SELECT * FROM mouvements WHERE type = ? ORDER BY id DESC", type)
    : tous("SELECT * FROM mouvements ORDER BY id DESC");
  ok(res, lignes);
}));

r.post("/mouvements", exige("Vendeur/Vendeuse"), route((req, res) => {
  const b = req.body || {};
  const type = b.type === "achat" ? "achat" : "vente";

  let vehicule = null;
  if (b.vehiculeId) {
    vehicule = un("SELECT * FROM vehicules WHERE id = ?", b.vehiculeId);
    if (!vehicule) return erreur(res, 404, "Véhicule introuvable.");
    if (type === "vente" && vehicule.statut === "vendu") {
      return erreur(res, 409, "Ce véhicule est déjà vendu.");
    }
  }

  const calcul =
    type === "vente"
      ? calculerVente({
          prixVente: b.prixVente ?? vehicule?.prix_vente ?? 0,
          km: b.km,
          reductionPct: b.reductionPct,
        })
      : {
          prixInitial: Math.round(Number(b.prixAchat ?? vehicule?.prix_achat ?? 0)),
          km: Math.round(Number(b.km) || 0),
          reductionPct: 0, reductionMontant: 0,
          surcharge: 0, surchargeOfferte: false,
          prixFinal: Math.round(Number(b.prixAchat ?? vehicule?.prix_achat ?? 0)),
        };

  const tx = db.transaction(() => {
    const info = exec(
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
      req.employe.nom, req.employe.prenom, req.employe.id,
    );
    if (type === "vente" && vehicule) {
      exec("UPDATE vehicules SET statut = 'vendu' WHERE id = ?", vehicule.id);
    }
    return info.lastInsertRowid;
  });

  const id = tx();
  const mouvement = un("SELECT * FROM mouvements WHERE id = ?", id);

  // Contrat automatique : toute vente et tout rachat repart avec son contrat
  // déjà rempli. Le modèle utilisé est le plus ancien de la catégorie. Si le
  // contrat échoue, la vente reste enregistrée — on ne perd jamais l'opération.
  let contrat = null;
  if (b.contrat !== false) {
    const modele = un(
      "SELECT * FROM contrats_modeles WHERE categorie = ? ORDER BY id ASC LIMIT 1",
      type,
    );
    if (modele) {
      try {
        contrat = fabriquerContrat({ modele, mouvement, employe: req.employe });
      } catch (e) {
        console.error("[atlas] contrat automatique impossible :", e.message);
      }
    }
  }

  ok(res, { ...mouvement, contrat });
}));

r.delete("/mouvements/:id", exige("Co-patron"), route((req, res) => {
  exec("DELETE FROM mouvements WHERE id = ?", req.params.id);
  ok(res, { fait: true });
}));

// ===========================================================================
// CONTRATS
// ===========================================================================

r.get("/contrats/variables", exige(), route((_req, res) =>
  ok(res, { variables: VARIABLES_CONTRAT })));

r.get("/contrats/modeles", exige(), route((req, res) => {
  const lignes = tous("SELECT * FROM contrats_modeles ORDER BY categorie, nom")
    .filter((m) => !m.visible_par || m.visible_par.split(",").map((s) => s.trim()).includes(req.employe.grade))
    .map((m) => ({ ...m, trous: trousDuModele(m.corps) }));
  ok(res, lignes);
}));

r.post("/contrats/modeles", exige("Co-patron"), route((req, res) => {
  const { nom, categorie, corps, aTrous, visiblePar } = req.body || {};
  if (!nom) return erreur(res, 400, "Donne un nom au modèle.");
  const info = exec(
    "INSERT INTO contrats_modeles (nom, categorie, corps, a_trous, visible_par) VALUES (?, ?, ?, ?, ?)",
    String(nom).trim(),
    String(categorie || "libre").trim(),
    String(corps || ""),
    aTrous === false ? 0 : 1,
    Array.isArray(visiblePar) ? visiblePar.join(",") : String(visiblePar || ""),
  );
  ok(res, un("SELECT * FROM contrats_modeles WHERE id = ?", info.lastInsertRowid));
}));

r.patch("/contrats/modeles/:id", exige("Co-patron"), route((req, res) => {
  const m = un("SELECT * FROM contrats_modeles WHERE id = ?", req.params.id);
  if (!m) return erreur(res, 404, "Modèle introuvable.");
  const b = req.body || {};
  exec(
    "UPDATE contrats_modeles SET nom = ?, categorie = ?, corps = ?, a_trous = ?, visible_par = ? WHERE id = ?",
    b.nom ?? m.nom,
    b.categorie ?? m.categorie,
    b.corps ?? m.corps,
    b.aTrous === undefined ? m.a_trous : (b.aTrous ? 1 : 0),
    b.visiblePar === undefined
      ? m.visible_par
      : (Array.isArray(b.visiblePar) ? b.visiblePar.join(",") : String(b.visiblePar)),
    m.id,
  );
  ok(res, un("SELECT * FROM contrats_modeles WHERE id = ?", m.id));
}));

r.delete("/contrats/modeles/:id", exige("Co-patron"), route((req, res) => {
  exec("DELETE FROM contrats_modeles WHERE id = ?", req.params.id);
  ok(res, { fait: true });
}));

/**
 * Un contrat sans restriction est visible par tout le monde ; sinon seuls les
 * grades cochés sur son modèle peuvent le lire. La direction voit toujours tout.
 */
const peutVoirContrat = (visiblePar, grade) => {
  if (auMoins(grade, "Co-patron")) return true;
  const grades = String(visiblePar || "").split(",").map((x) => x.trim()).filter(Boolean);
  return grades.length === 0 || grades.includes(grade);
};

/**
 * Fabrique un contrat à partir d'un modèle. Sert à la fois à l'émission
 * manuelle et à l'émission automatique déclenchée par une vente ou un rachat.
 */
function fabriquerContrat({ modele, mouvement, valeurs, employe }) {
  const annee = new Date().getFullYear();
  const numero = `ATL-${annee}-${String(prochainCompteur(`contrat-${annee}`)).padStart(4, "0")}`;

  const base = mouvement
    ? valeursDepuisMouvement(mouvement, numero)
    : {
        numero,
        date: new Date().toLocaleDateString("fr-FR"),
        entreprise: lireParametres().nomEntreprise,
      };

  const finales = { ...base, ...(valeurs || {}), numero };
  const texte = rendreContrat(modele.corps, finales);

  const info = exec(
    `INSERT INTO contrats (numero, modele_id, categorie, mouvement_id, valeurs, texte, cree_par)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    numero, modele.id, modele.categorie, mouvement?.id ?? null,
    JSON.stringify(finales), texte,
    `${employe.prenom} ${employe.nom}`,
  );
  const cree = un("SELECT * FROM contrats WHERE id = ?", info.lastInsertRowid);
  return { ...cree, valeurs: JSON.parse(cree.valeurs) };
}
r.get("/contrats", exige(), route((req, res) => {
  const { mouvementId } = req.query;
  const requete =
    "SELECT c.*, m.visible_par FROM contrats c" +
    " LEFT JOIN contrats_modeles m ON m.id = c.modele_id";
  const lignes = mouvementId
    ? tous(requete + " WHERE c.mouvement_id = ? ORDER BY c.id DESC", mouvementId)
    : tous(requete + " ORDER BY c.id DESC");
  ok(
    res,
    lignes
      .filter((c) => peutVoirContrat(c.visible_par, req.employe.grade))
      .map((c) => ({ ...c, valeurs: JSON.parse(c.valeurs || "{}") })),
  );
}));

/**
 * Émet un contrat. Si un mouvementId est fourni, les variables connues sont
 * pré-remplies depuis la vente ou l'achat ; les valeurs envoyées dans le
 * corps de la requête écrasent celles-là.
 */
r.post("/contrats", exige("Vendeur/Vendeuse"), route((req, res) => {
  const { modeleId, mouvementId, valeurs } = req.body || {};
  const modele = un("SELECT * FROM contrats_modeles WHERE id = ?", modeleId);
  if (!modele) return erreur(res, 404, "Modèle de contrat introuvable.");

  let mouvement = null;
  if (mouvementId) {
    mouvement = un("SELECT * FROM mouvements WHERE id = ?", mouvementId);
    if (!mouvement) return erreur(res, 404, "Mouvement introuvable.");
  }

  ok(res, fabriquerContrat({ modele, mouvement, valeurs, employe: req.employe }));
}));

r.patch("/contrats/:id", exige("Manager"), route((req, res) => {
  const c = un("SELECT * FROM contrats WHERE id = ?", req.params.id);
  if (!c) return erreur(res, 404, "Contrat introuvable.");
  const b = req.body || {};
  const valeurs = b.valeurs ? { ...JSON.parse(c.valeurs || "{}"), ...b.valeurs } : JSON.parse(c.valeurs || "{}");
  const modele = un("SELECT * FROM contrats_modeles WHERE id = ?", c.modele_id);
  const texte = b.texte !== undefined ? b.texte : rendreContrat(modele?.corps || c.texte, valeurs);
  exec(
    "UPDATE contrats SET valeurs = ?, texte = ? WHERE id = ?",
    JSON.stringify(valeurs), texte, c.id,
  );
  const maj = un("SELECT * FROM contrats WHERE id = ?", c.id);
  ok(res, { ...maj, valeurs: JSON.parse(maj.valeurs) });
}));

r.delete("/contrats/:id", exige("Co-patron"), route((req, res) => {
  exec("DELETE FROM contrats WHERE id = ?", req.params.id);
  ok(res, { fait: true });
}));

// ===========================================================================
// PARAMÈTRES ET TRANCHES
// ===========================================================================

r.get("/parametres", exige(), route((_req, res) => ok(res, {
  ...lireParametres(),
  tranchesReduction: tranchesReduction(),
  tranchesMarge: tranchesMarge(),
  grades: GRADES,
})));

r.put("/parametres", exige("Co-patron"), route((req, res) => {
  const b = req.body || {};
  const patch = {};
  for (const cle of [
    "reductionMaxVente", "kmIntervalle", "kmMontant", "nomEntreprise",
    "salaireBase", "primeParOperation",
  ]) {
    if (b[cle] !== undefined) patch[cle] = b[cle];
  }
  ok(res, ecrireParametres(patch));
}));

const remplacerTranches = (table) => (req, res) => {
  const lignes = Array.isArray(req.body) ? req.body : req.body?.tranches;
  if (!Array.isArray(lignes)) return erreur(res, 400, "Envoie un tableau de tranches.");
  const stmt = db.prepare(`INSERT INTO ${table} (seuil, montant) VALUES (?, ?)`);
  const tx = db.transaction(() => {
    exec(`DELETE FROM ${table}`);
    for (const l of lignes) {
      stmt.run(Math.round(Number(l.seuil) || 0), Math.round(Number(l.montant) || 0));
    }
  });
  tx();
  ok(res, tous(`SELECT seuil, montant FROM ${table} ORDER BY seuil ASC`));
};

r.put("/tranches/reduction", exige("Co-patron"), route(remplacerTranches("tranches_reduction")));
r.put("/tranches/marge", exige("Co-patron"), route(remplacerTranches("tranches_marge")));

// ===========================================================================

app.use("/api", r);
app.get("/api", (_req, res) => res.json({ service: "Atlas Auto", version: 1 }));
app.use((_req, res) => res.status(404).json({ erreur: "Route inconnue." }));

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`[atlas] API sur http://localhost:${PORT}/api`));
