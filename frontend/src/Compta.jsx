import React, { useEffect, useState } from "react";
import api from "./api.js";
import {
  C, u, Bouton, Champ, Etiquette, Alerte, Entete, BoutonSupprimer, argent,
} from "./ui.jsx";
import { telechargerClasseur } from "./classeur.js";

// ------------------------------------------------------------------ semaines
// Sur GTA tout se compte à la semaine, du lundi au dimanche.

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const jour = (texte) => new Date(`${String(texte).slice(0, 10)}T00:00:00`);

/** La semaine (lundi → dimanche) qui contient cette date. */
function semaineDe(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // 0 = lundi
  const fin = new Date(d);
  fin.setDate(fin.getDate() + 6);
  return { debut: iso(d), fin: iso(fin) };
}

/** Décale la période de n semaines. */
function decaler(periode, n) {
  const d = jour(periode.debut);
  d.setDate(d.getDate() + n * 7);
  return semaineDe(d);
}

function libellePeriode({ debut, fin }) {
  const a = jour(debut);
  const b = jour(fin);
  const memeMois = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const gauche = memeMois ? `${a.getDate()}` : `${a.getDate()} ${MOIS[a.getMonth()]}`;
  return `${gauche} au ${b.getDate()} ${MOIS[b.getMonth()]} ${b.getFullYear()}`;
}

// -------------------------------------------------------------------- calculs

const TON_TYPE = {
  Vente: "vert", Rachat: "bleu", Dépense: "gris", Salaire: "gris", Dividende: "ambre",
};

const TYPES = ["Tout", "Vente", "Rachat", "Dépense", "Salaire", "Dividende"];

/**
 * Le catalogue des feuilles du classeur : pour chacune, son nom, le type de
 * ligne du journal qu elle contient, et ses colonnes. Tout part de là — la
 * fabrication du fichier comme les cases à cocher de l écran.
 */
const FEUILLES = [
  {
    cle: "Résumé",
    nom: "Résumé",
    colonnes: [
      { titre: "Poste", cle: "poste" },
      { titre: "Nombre", cle: "nombre", type: "nombre" },
      { titre: "Montant", cle: "montant", type: "argent" },
    ],
  },
  {
    cle: "Vente",
    nom: "Ventes",
    montant: "entree",
    colonnes: [
      { titre: "Date", cle: "date", type: "date" },
      { titre: "Véhicule", cle: "libelle" },
      { titre: "Client", cle: "detail" },
      { titre: "Vendu par", cle: "par" },
      { titre: "Encaissé", cle: "entree", type: "argent" },
    ],
  },
  {
    cle: "Rachat",
    nom: "Rachats",
    montant: "sortie",
    colonnes: [
      { titre: "Date", cle: "date", type: "date" },
      { titre: "Véhicule", cle: "libelle" },
      { titre: "Client", cle: "detail" },
      { titre: "Racheté par", cle: "par" },
      { titre: "Décaissé", cle: "sortie", type: "argent" },
    ],
  },
  {
    cle: "Dépense",
    nom: "Dépenses",
    montant: "sortie",
    colonnes: [
      { titre: "Date", cle: "date", type: "date" },
      { titre: "Libellé", cle: "libelle" },
      { titre: "Catégorie", cle: "detail" },
      { titre: "Saisi par", cle: "par" },
      { titre: "Montant", cle: "sortie", type: "argent" },
    ],
  },
  {
    cle: "Salaire",
    nom: "Salaires",
    montant: "sortie",
    colonnes: [
      { titre: "Date", cle: "date", type: "date" },
      { titre: "Employé", cle: "libelle" },
      { titre: "Détail", cle: "detail" },
      { titre: "Salaire", cle: "sortie", type: "argent" },
    ],
  },
  {
    cle: "Dividende",
    nom: "Dividendes",
    montant: "sortie",
    colonnes: [
      { titre: "Date", cle: "date", type: "date" },
      { titre: "Bénéficiaire", cle: "libelle" },
      { titre: "Motif", cle: "detail" },
      { titre: "Versé par", cle: "par" },
      { titre: "Montant", cle: "sortie", type: "argent" },
    ],
  },
  {
    cle: "Journal",
    nom: "Journal",
    journal: true,
    colonnes: [
      { titre: "Date", cle: "date", type: "date" },
      { titre: "Type", cle: "type" },
      { titre: "Libellé", cle: "libelle" },
      { titre: "Détail", cle: "detail" },
      { titre: "Par", cle: "par" },
      { titre: "Entrée", cle: "entree", type: "argent" },
      { titre: "Sortie", cle: "sortie", type: "argent" },
    ],
  },
];

// Les feuilles qu on peut retirer du fichier (le Résumé reste toujours).
const POSTES = FEUILLES.filter((f) => f.cle !== "Résumé");

// Le choix des feuilles et des colonnes est gardé dans le navigateur : changer
// d onglet démonte l écran, sans ça tout se recocherait sans prévenir.
const CLE_REGLAGE = "vapid-export";

function lireReglage(nom) {
  try {
    return JSON.parse(localStorage.getItem(CLE_REGLAGE) || "{}")[nom] || {};
  } catch {
    return {};
  }
}

function ecrireReglage(nom, valeur) {
  try {
    const tout = JSON.parse(localStorage.getItem(CLE_REGLAGE) || "{}");
    localStorage.setItem(CLE_REGLAGE, JSON.stringify({ ...tout, [nom]: valeur }));
  } catch {
    // navigateur qui refuse le stockage : tant pis, on perd juste le choix
  }
}

/**
 * Fabrique les feuilles du classeur.
 *
 * `inclus`   : quelles feuilles partent dans le fichier.
 * `colonnes` : quelles colonnes de chaque feuille, sous la forme
 *              { Vente: { par: false } } pour sortir « Vendu par » des ventes.
 *
 * Une feuille décochée disparaît partout — son onglet, sa ligne du résumé, et
 * elle ne compte plus dans les totaux. Dans ce cas on retire aussi le solde du
 * compte : il ne voudrait plus rien dire si on a mis des sorties de côté.
 */
function feuillesDu(etat, inclus = {}, colonnes = {}) {
  const veut = (cle) => inclus[cle] !== false;
  const veutCol = (feuille, col) => colonnes[feuille]?.[col] !== false;

  const toutes = etat.lignes || [];
  const lignes = toutes.filter((l) => veut(l.type));
  const de = (type) => (veut(type) ? lignes.filter((l) => l.type === type) : []);
  const total = (l, champ) => l.reduce((s, x) => s + (Number(x[champ]) || 0), 0);

  const entrees = total(lignes, "entree");
  const sorties = total(lignes, "sortie");

  // Seuls les postes qui portent de l argent changent les totaux. Retirer le
  // Journal ne fausse rien : c est juste une autre vue des mêmes lignes.
  const exclus = POSTES.filter((f) => f.montant && !veut(f.cle)).map((f) => f.nom);
  const complet = exclus.length === 0;

  return FEUILLES.map((f) => {
    if (f.cle !== "Résumé" && !veut(f.cle)) return null;

    const cols = f.colonnes.filter((c) => veutCol(f.cle, c.cle));
    if (cols.length === 0) return null; // tout décoché : pas de feuille vide

    // ------------------------------------------------------------- le résumé
    if (f.cle === "Résumé") {
      const ligne = (cle, label, champ) => {
        if (!veut(cle)) return null;
        const l = de(cle);
        return { poste: label, nombre: l.length, montant: total(l, champ) };
      };
      return {
        nom: f.nom,
        colonnes: cols,
        lignes: [
          ligne("Vente", "Ventes (encaissé)", "entree"),
          ligne("Rachat", "Rachats (décaissé)", "sortie"),
          ligne("Dépense", "Dépenses (décaissé)", "sortie"),
          ligne("Salaire", "Salaires (décaissé)", "sortie"),
          ligne("Dividende", "Dividendes (décaissé)", "sortie"),
        ].filter(Boolean),
        // Les décaissés sont en négatif : la colonne s additionne de haut en
        // bas et tombe juste sur le solde final.
        pied: [
          { poste: "Total encaissé", montant: entrees },
          { poste: "Total décaissé", montant: -sorties },
          { poste: "Résultat de la semaine", montant: entrees - sorties },
          ...(complet
            ? [
                { poste: "Sur le compte avant", montant: etat.soldeAvant || 0 },
                { poste: "SUR LE COMPTE APRÈS", montant: etat.soldeApres || 0 },
              ]
            : [{ poste: `Export partiel — hors ${exclus.join(", ").toLowerCase()}` }]),
        ],
      };
    }

    // ------------------------------------------------- le journal et le reste
    const contenu = f.journal
      ? // les zéros restent vides dans le journal, c'est plus lisible
        lignes.map((l) => ({ ...l, entree: l.entree || "", sortie: l.sortie || "" }))
      : de(f.cle);

    // La ligne TOTAL : le mot dans la première colonne de texte visible, la
    // somme dans la colonne d argent.
    const pied = {};
    const texte = cols.find((c) => !c.type);
    if (texte) pied[texte.cle] = "TOTAL";
    if (f.journal) {
      if (veutCol(f.cle, "entree")) pied.entree = entrees;
      if (veutCol(f.cle, "sortie")) pied.sortie = sorties;
    } else if (veutCol(f.cle, f.montant)) {
      pied[f.montant] = total(de(f.cle), f.montant);
    }

    return { nom: f.nom, colonnes: cols, lignes: contenu, pied: [pied] };
  }).filter(Boolean);
}


/** Recalcule les postes à partir du journal (utile pour les archives). */
function postes(lignes = []) {
  const poste = (type, champ) => {
    const l = lignes.filter((x) => x.type === type);
    return { nombre: l.length, total: l.reduce((s, x) => s + (Number(x[champ]) || 0), 0) };
  };
  return {
    ventes: poste("Vente", "entree"),
    achats: poste("Rachat", "sortie"),
    depenses: poste("Dépense", "sortie"),
    salaires: poste("Salaire", "sortie"),
    dividendes: poste("Dividende", "sortie"),
  };
}


// ---------------------------------------------------------------- le composant

/**
 * La compta de la semaine : ventes, rachats, dépenses et salaires au même
 * endroit. On enregistre la semaine quand elle est finie, et on passe à la
 * suivante. L'export est un vrai classeur Excel, une feuille par catégorie.
 */
export default function Compta({ isMobile }) {
  const [periode, setPeriode] = useState(() => semaineDe(new Date()));
  const [libre, setLibre] = useState(false);
  const [etat, setEtat] = useState(null);
  const [archives, setArchives] = useState([]);
  const [ouverte, setOuverte] = useState(null); // semaine figée en cours de lecture
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [filtre, setFiltre] = useState("Tout");
  const [occupe, setOccupe] = useState(false);
  const [dividendes, setDividendes] = useState([]);
  const [tresorerie, setTresorerie] = useState(null);
  const [detailSolde, setDetailSolde] = useState(false);
  // Tout est coché par défaut ; décocher sort la feuille ou la colonne du
  // fichier. On le garde dans le navigateur : sinon changer d onglet remet
  // tout à zéro sans prévenir, et l export repart complet.
  const [inclus, setInclus] = useState(() => lireReglage("inclus"));
  const [colonnes, setColonnes] = useState(() => lireReglage("colonnes"));

  useEffect(() => { ecrireReglage("inclus", inclus); }, [inclus]);
  useEffect(() => { ecrireReglage("colonnes", colonnes); }, [colonnes]);
  const [form, setForm] = useState({ beneficiaire: "", montant: "", date: "", note: "" });
  const [ventesM, setVentesM] = useState([]);
  const [formVente, setFormVente] = useState({
    modele: "", montant: "", date: "", clientNom: "", clientPrenom: "",
  });

  async function recharger() {
    try {
      const [c, a, d, t, vm] = await Promise.all([
        api.compta(periode.debut, periode.fin),
        api.archivesCompta(),
        api.dividendes(),
        api.tresorerie(),
        api.ventesManuelles(),
      ]);
      setEtat(c);
      setArchives(a);
      setDividendes(d.lignes || []);
      setTresorerie(t);
      setVentesM(vm);
      setErreur("");
    } catch (e) {
      setErreur(e.message);
    }
  }

  useEffect(() => {
    if (!ouverte) recharger();
  }, [periode.debut, periode.fin, ouverte]); // eslint-disable-line

  // ce qu'on affiche : la semaine en direct, ou la semaine figée ouverte
  const vue = ouverte
    ? {
        ...postes(ouverte.donnees?.lignes),
        entrees: ouverte.entrees,
        sorties: ouverte.sorties,
        resultat: ouverte.resultat,
        soldeAvant: ouverte.donnees?.soldeAvant ?? 0,
        soldeApres: ouverte.donnees?.soldeApres ?? 0,
        lignes: ouverte.donnees?.lignes || [],
      }
    : etat;

  const vuePeriode = ouverte ? { debut: ouverte.debut, fin: ouverte.fin } : periode;
  const dejaEnregistree = archives.find(
    (a) => a.debut === periode.debut && a.fin === periode.fin,
  );

  function aller(n) {
    setOuverte(null);
    setInfo("");
    setPeriode(decaler(periode, n));
  }

  function exporter() {
    try {
      telechargerClasseur(
        `compta-${vuePeriode.debut}-au-${vuePeriode.fin}.xlsx`,
        feuillesDu(vue, inclus, colonnes),
      );
    } catch (e) {
      setErreur(e.message);
    }
  }

  /** Les dividendes versées sur la semaine affichée. */
  const dividendesSemaine = dividendes.filter(
    (d) => d.date >= periode.debut && d.date <= periode.fin,
  );

  async function verser(e) {
    e.preventDefault();
    try {
      await api.ajouterDividende({
        beneficiaire: form.beneficiaire,
        montant: form.montant,
        date: form.date || periode.fin,
        note: form.note,
      });
      setForm({ beneficiaire: "", montant: "", date: "", note: "" });
      setErreur("");
      recharger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  /** Les ventes saisies à la main qui tombent dans la semaine affichée. */
  const ventesSemaine = ventesM.filter((v) => {
    const j = String(v.date || "").slice(0, 10);
    return j >= periode.debut && j <= periode.fin;
  });

  async function ajouterVente(e) {
    e.preventDefault();
    try {
      await api.ajouterVenteManuelle({
        modele: formVente.modele,
        montant: formVente.montant,
        date: formVente.date || periode.fin,
        clientNom: formVente.clientNom,
        clientPrenom: formVente.clientPrenom,
      });
      setFormVente({ modele: "", montant: "", date: "", clientNom: "", clientPrenom: "" });
      setErreur("");
      recharger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function retirerVente(v) {
    try {
      await api.supprimerVenteManuelle(v.id);
      recharger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function annulerDividende(d) {
    try {
      await api.supprimerDividende(d.id);
      recharger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  /** Fige la semaine puis enchaîne sur la suivante. */
  async function enregistrer() {
    setOccupe(true);
    try {
      await api.archiverCompta({
        debut: periode.debut,
        fin: periode.fin,
        entrees: etat.entrees,
        sorties: etat.sorties,
        resultat: etat.resultat,
        soldeAvant: etat.soldeAvant,
        soldeApres: etat.soldeApres,
        lignes: etat.lignes,
      });
      const finie = libellePeriode(periode);
      setPeriode(decaler(periode, 1));
      setErreur("");
      setInfo(`Semaine du ${finie} enregistrée. Tu es passé à la suivante — la flèche ← te ramène dessus.`);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setOccupe(false);
    }
  }

  async function ouvrir(a) {
    try {
      setOuverte(await api.archiveCompta(a.id));
      setInfo("");
      setErreur("");
    } catch (e) {
      setErreur(e.message);
    }
  }

  async function supprimerArchive(a) {
    try {
      await api.supprimerArchiveCompta(a.id);
      if (ouverte?.id === a.id) setOuverte(null);
      setArchives(await api.archivesCompta());
    } catch (e) {
      setErreur(e.message);
    }
  }

  const lignes = (vue?.lignes || []).filter((l) => filtre === "Tout" || l.type === filtre);
  const positif = (vue?.resultat ?? 0) >= 0;

  return (
    <section>
      <Entete
        titre="Compta"
        sous="Tout l'argent de l'entreprise sur la semaine : ce qui rentre, ce qui sort, ce qu'il reste. Une fois la semaine finie, tu l'enregistres et tu passes à la suivante."
      />
      <Alerte>{erreur}</Alerte>
      <Alerte ton="vert">{info}</Alerte>

      {/* ------------------------------------------------- le compte entreprise */}
      <div
        style={{
          ...u.carte,
          marginBottom: 18,
          borderColor: (tresorerie?.solde ?? 0) >= 0 ? `${C.ambre}66` : "rgba(210,104,95,.5)",
          background: `${C.ambre}0A`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 10.5, color: C.texte3, letterSpacing: 0.5 }}>
              COMPTE DE L'ENTREPRISE
            </div>
            <div
              style={{
                fontFamily: C.titre,
                fontSize: isMobile ? 32 : 42,
                fontWeight: 800,
                color: (tresorerie?.solde ?? 0) >= 0 ? C.ambre : C.rouge,
                lineHeight: 1.1,
              }}
            >
              {argent(tresorerie?.solde)}
            </div>
            <div style={{ fontSize: 11.5, color: C.texte3, marginTop: 4 }}>
              Depuis le début, toutes semaines confondues.
            </div>
          </div>
          <Bouton ton="fantome" petit onClick={() => setDetailSolde(!detailSolde)}>
            {detailSolde ? "Masquer le détail" : "D'où vient ce chiffre ?"}
          </Bouton>
        </div>

        {detailSolde && tresorerie && (
          <div style={{ marginTop: 16, borderTop: `1px solid ${C.bord}`, paddingTop: 14 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {[
                  ["Solde de départ", tresorerie.depart, null],
                  ["Ventes encaissées", tresorerie.ventes, "+"],
                  ["Rachats payés", tresorerie.achats, "−"],
                  ["Dépenses", tresorerie.depenses, "−"],
                  ["Dividendes versées", tresorerie.dividendes, "−"],
                  [
                    `Salaires (${tresorerie.semainesPayees} semaine${tresorerie.semainesPayees > 1 ? "s" : ""} enregistrée${tresorerie.semainesPayees > 1 ? "s" : ""})`,
                    tresorerie.salaires,
                    "−",
                  ],
                ].map(([label, valeur, signe]) => (
                  <tr key={label}>
                    <td style={{ padding: "6px 0", color: C.texte2 }}>{label}</td>
                    <td
                      style={{
                        padding: "6px 0",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        color: signe === "−" ? C.rouge : signe === "+" ? C.vert : C.texte,
                      }}
                    >
                      {signe || ""}{signe ? " " : ""}{argent(valeur)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: "10px 0 0", fontWeight: 700, borderTop: `1px solid ${C.bord}` }}>
                    Sur le compte
                  </td>
                  <td
                    style={{
                      padding: "10px 0 0",
                      textAlign: "right",
                      fontWeight: 800,
                      borderTop: `1px solid ${C.bord}`,
                      fontVariantNumeric: "tabular-nums",
                      color: C.ambre,
                    }}
                  >
                    {argent(tresorerie.solde)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p style={{ ...u.aide, margin: "12px 0 0" }}>
              Les salaires ne sortent de la caisse qu'au moment où tu enregistres la
              semaine — c'est là que tu les payes. Le solde de départ se règle dans
              l'onglet Paramètres.
            </p>
          </div>
        )}
      </div>

      {/* ----------------------------------------------- la semaine + actions */}
      <div style={{ ...u.carte, marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!libre && (
              <Bouton ton="fantome" petit onClick={() => aller(-1)} title="Semaine précédente">
                ←
              </Bouton>
            )}
            <div>
              <div style={{ fontSize: 10.5, color: C.texte3, letterSpacing: 0.5 }}>
                {libre ? "PÉRIODE" : "SEMAINE"}
              </div>
              <div style={{ fontFamily: C.titre, fontSize: isMobile ? 16 : 19, fontWeight: 800 }}>
                Du {libellePeriode(periode)}
              </div>
            </div>
            {!libre && (
              <Bouton ton="fantome" petit onClick={() => aller(1)} title="Semaine suivante">
                →
              </Bouton>
            )}
            {dejaEnregistree && !ouverte && <Etiquette ton="vert">Enregistrée</Etiquette>}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Bouton
              ton="fantome"
              petit
              onClick={() => {
                setOuverte(null);
                setLibre(false);
                setPeriode(semaineDe(new Date()));
              }}
            >
              Cette semaine
            </Bouton>
            <Bouton ton="fantome" petit onClick={() => setLibre(!libre)}>
              {libre ? "Revenir aux semaines" : "Période libre"}
            </Bouton>
            {!ouverte && (
              <Bouton
                onClick={enregistrer}
                disabled={occupe || !!dejaEnregistree || !etat?.lignes?.length}
                title={
                  dejaEnregistree
                    ? "Cette semaine est déjà enregistrée."
                    : "Fige les totaux et passe à la semaine suivante."
                }
              >
                Enregistrer la semaine
              </Bouton>
            )}
            <Bouton ton="fantome" onClick={exporter} disabled={!vue?.lignes?.length}>
              Exporter en Excel
            </Bouton>
          </div>
        </div>

        {libre && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 12,
              marginTop: 14,
            }}
          >
            <Champ
              label="Du"
              type="date"
              value={periode.debut}
              onChange={(e) => { setOuverte(null); setPeriode({ ...periode, debut: e.target.value }); }}
            />
            <Champ
              label="Au"
              type="date"
              value={periode.fin}
              onChange={(e) => { setOuverte(null); setPeriode({ ...periode, fin: e.target.value }); }}
            />
          </div>
        )}

        <div style={{ marginTop: 14, borderTop: `1px solid ${C.bord}`, paddingTop: 12 }}>
          <div style={{ fontSize: 10.5, color: C.texte3, letterSpacing: 0.5, marginBottom: 8 }}>
            À METTRE DANS LE FICHIER EXCEL
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FEUILLES.map((f) => {
              const toujours = f.cle === "Résumé"; // le résumé reste toujours
              const on = toujours || inclus[f.cle] !== false;
              return (
                <div
                  key={f.cle}
                  style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}
                >
                  <button
                    onClick={() => !toujours && setInclus({ ...inclus, [f.cle]: !on })}
                    disabled={toujours}
                    title={
                      toujours
                        ? "Le résumé est toujours dans le fichier"
                        : on
                          ? `La feuille ${f.nom} sera dans le fichier`
                          : `La feuille ${f.nom} est exclue du fichier`
                    }
                    style={{
                      background: on ? `${C.ambre}22` : "transparent",
                      border: `1px solid ${on ? C.ambre : C.bord2}`,
                      color: on ? C.texte : C.texte3,
                      fontWeight: 700,
                      fontSize: 12,
                      padding: "6px 12px",
                      borderRadius: 20,
                      cursor: toujours ? "default" : "pointer",
                      textDecoration: on ? "none" : "line-through",
                      minWidth: 112,
                      textAlign: "left",
                      opacity: toujours ? 0.75 : 1,
                    }}
                  >
                    {on ? "✓ " : ""}{f.nom}
                  </button>

                  {on &&
                    f.colonnes.map((c) => {
                      const vu = colonnes[f.cle]?.[c.cle] !== false;
                      return (
                        <button
                          key={c.cle}
                          onClick={() =>
                            setColonnes({
                              ...colonnes,
                              [f.cle]: { ...(colonnes[f.cle] || {}), [c.cle]: !vu },
                            })
                          }
                          title={
                            vu
                              ? `Colonne « ${c.titre} » gardée`
                              : `Colonne « ${c.titre} » retirée`
                          }
                          style={{
                            background: "transparent",
                            border: `1px solid ${vu ? C.bord2 : "transparent"}`,
                            color: vu ? C.texte2 : C.texte3,
                            fontWeight: 600,
                            fontSize: 11.5,
                            padding: "4px 9px",
                            borderRadius: 14,
                            cursor: "pointer",
                            textDecoration: vu ? "none" : "line-through",
                            opacity: vu ? 1 : 0.55,
                          }}
                        >
                          {c.titre}
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </div>
          <p style={{ ...u.aide, margin: "12px 0 0" }}>
            La grosse pastille, c'est la feuille ; les petites à côté, ses colonnes.
            Tout ce que tu éteins sort du fichier. Une feuille décochée sort aussi des
            totaux — pratique pour donner une compta sans les salaires. Dans ce cas le
            solde du compte est retiré du résumé, il ne voudrait plus rien dire.
          </p>
        </div>
      </div>

      {/* ------------------------------------------- bandeau semaine enregistrée */}
      {ouverte && (
        <div
          style={{
            ...u.carte,
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            borderColor: `${C.ambre}66`,
            background: `${C.ambre}0E`,
          }}
        >
          <div style={{ fontSize: 13 }}>
            Tu lis la semaine figée <strong>du {libellePeriode(ouverte)}</strong>
            {ouverte.cree_par ? ` — enregistrée par ${ouverte.cree_par}` : ""}. Ces chiffres ne
            bougeront plus.
          </div>
          <Bouton ton="fantome" petit onClick={() => setOuverte(null)}>
            Revenir à la semaine en cours
          </Bouton>
        </div>
      )}

      {/* ------------------------------------------------------ les quatre postes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {[
          ["Ventes", vue?.ventes, C.vert],
          ["Rachats", vue?.achats, C.texte2],
          ["Dépenses", vue?.depenses, C.texte2],
          ["Salaires", vue?.salaires, C.texte2],
          ["Dividendes", vue?.dividendes, C.ambre],
        ].map(([label, poste, couleur]) => (
          <div key={label} style={{ ...u.carte, padding: 16 }}>
            <div style={{ fontSize: 10.5, color: C.texte3, letterSpacing: 0.5, marginBottom: 6 }}>
              {label.toUpperCase()}
            </div>
            <div style={{ fontFamily: C.titre, fontSize: 24, fontWeight: 800, color: couleur }}>
              {argent(poste?.total)}
            </div>
            <div style={{ fontSize: 11, color: C.texte3, marginTop: 2 }}>
              {poste?.nombre ?? 0} ligne{(poste?.nombre ?? 0) > 1 ? "s" : ""}
            </div>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------ le résultat */}
      <div
        style={{
          ...u.carte,
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          borderColor: positif ? "rgba(97,181,120,.4)" : "rgba(210,104,95,.45)",
        }}
      >
        <div style={{ fontSize: 13, color: C.texte3 }}>
          <div>
            {argent(vue?.entrees)} encaissés
            {"  −  "}
            {argent(vue?.sorties)} décaissés
          </div>
          <div style={{ marginTop: 6, fontSize: 12.5 }}>
            Compte : <strong style={{ color: C.texte2 }}>{argent(vue?.soldeAvant)}</strong> avant
            {" → "}
            <strong style={{ color: C.texte2 }}>{argent(vue?.soldeApres)}</strong> après
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10.5, color: C.texte3, letterSpacing: 0.5 }}>RÉSULTAT</div>
          <div
            style={{
              fontFamily: C.titre,
              fontSize: 34,
              fontWeight: 800,
              color: positif ? C.vert : C.rouge,
            }}
          >
            {positif ? "+" : ""}{argent(vue?.resultat)}
          </div>
        </div>
      </div>

      {/* --------------------------------------------- ventes saisies à la main */}
      {!ouverte && (
        <div style={{ ...u.carte, marginBottom: 18 }}>
          <h2 style={u.titreCarte}>Ajouter une vente à la main</h2>
          <p style={u.aide}>
            Pour ce qui s'est vendu en dehors du site. La ligne entre dans la compta
            comme une vraie vente : elle encaisse, elle part dans l'export et dans
            « Ventes réalisées ».
          </p>

          <form onSubmit={ajouterVente}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1.3fr 0.9fr 1fr 1fr 1fr auto",
                gap: 12,
                alignItems: "end",
              }}
            >
              <Champ
                label="Véhicule"
                value={formVente.modele}
                onChange={(e) => setFormVente({ ...formVente, modele: e.target.value })}
                placeholder="Elegy RH8"
              />
              <Champ
                label="Montant"
                type="number"
                value={formVente.montant}
                onChange={(e) => setFormVente({ ...formVente, montant: e.target.value })}
                placeholder="145000"
              />
              <Champ
                label="Date"
                type="date"
                value={formVente.date || periode.fin}
                onChange={(e) => setFormVente({ ...formVente, date: e.target.value })}
              />
              <Champ
                label="Nom du client"
                value={formVente.clientNom}
                onChange={(e) => setFormVente({ ...formVente, clientNom: e.target.value })}
                placeholder="Facultatif"
              />
              <Champ
                label="Prénom"
                value={formVente.clientPrenom}
                onChange={(e) => setFormVente({ ...formVente, clientPrenom: e.target.value })}
                placeholder="Facultatif"
              />
              <Bouton type="submit">Ajouter</Bouton>
            </div>
          </form>

          {ventesSemaine.length === 0 ? (
            <div style={{ ...u.vide, marginTop: 14 }}>
              Aucune vente saisie à la main cette semaine.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              {ventesSemaine.map((v) => (
                <div key={v.id} style={u.ligne}>
                  <div style={{ minWidth: 150, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{v.modele}</div>
                    <div style={{ fontSize: 11.5, color: C.texte3, marginTop: 2 }}>
                      {String(v.date).slice(0, 10)}
                      {`${v.client_prenom || ""} ${v.client_nom || ""}`.trim()
                        ? ` · ${`${v.client_prenom || ""} ${v.client_nom || ""}`.trim()}`
                        : ""}
                      {v.vendeur_nom ? ` · saisie par ${v.vendeur_prenom} ${v.vendeur_nom}` : ""}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: C.titre,
                      fontWeight: 800,
                      fontSize: 17,
                      color: C.vert,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {argent(v.prix_final)}
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <BoutonSupprimer onConfirm={() => retirerVente(v)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------ dividendes */}
      {!ouverte && (
        <div style={{ ...u.carte, marginBottom: 18 }}>
          <h2 style={u.titreCarte}>Dividendes de la semaine</h2>
          <p style={u.aide}>
            Ce que les patrons se versent sur les bénéfices. C'est décaissé comme le
            reste : ça descend le résultat de la semaine et ça part dans l'export.
          </p>

          <form onSubmit={verser}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1.3fr 0.9fr 1fr 1.4fr auto",
                gap: 12,
                alignItems: "end",
              }}
            >
              <Champ
                label="Bénéficiaire"
                value={form.beneficiaire}
                onChange={(e) => setForm({ ...form, beneficiaire: e.target.value })}
                placeholder="Clovis Petit"
              />
              <Champ
                label="Montant"
                type="number"
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: e.target.value })}
                placeholder="50000"
              />
              <Champ
                label="Date"
                type="date"
                value={form.date || periode.fin}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <Champ
                label="Motif"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Facultatif"
              />
              <Bouton type="submit">Verser</Bouton>
            </div>
          </form>

          {dividendesSemaine.length === 0 ? (
            <div style={{ ...u.vide, marginTop: 14 }}>
              Aucune dividende versée cette semaine.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              {dividendesSemaine.map((d) => (
                <div key={d.id} style={u.ligne}>
                  <div style={{ minWidth: 150, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{d.beneficiaire}</div>
                    <div style={{ fontSize: 11.5, color: C.texte3, marginTop: 2 }}>
                      {d.date}
                      {d.note ? ` · ${d.note}` : ""}
                      {d.saisi_par ? ` · versé par ${d.saisi_par}` : ""}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: C.titre,
                      fontWeight: 800,
                      fontSize: 17,
                      color: C.ambre,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {argent(d.montant)}
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <BoutonSupprimer onConfirm={() => annulerDividende(d)} libelle="Annuler" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------- le journal */}
      <div style={{ ...u.carte, marginBottom: 18 }}>
        <h2 style={u.titreCarte}>Journal</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFiltre(t)}
              style={{
                background: filtre === t ? C.ambre : "transparent",
                border: `1px solid ${filtre === t ? C.ambre : C.bord2}`,
                color: filtre === t ? "#14161A" : C.texte2,
                fontWeight: filtre === t ? 700 : 600,
                fontSize: 12,
                padding: "6px 13px",
                borderRadius: 20,
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {lignes.length === 0 ? (
          <div style={u.vide}>Rien sur cette semaine.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Date", "Type", "Libellé", "Détail", "Entrée", "Sortie"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        textAlign: i > 3 ? "right" : "left",
                        padding: "8px 10px",
                        fontSize: 10.5,
                        color: C.texte3,
                        letterSpacing: 0.5,
                        borderBottom: `1px solid ${C.bord}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={i}>
                    <td style={{ padding: "9px 10px", borderBottom: `1px solid ${C.bord}`, whiteSpace: "nowrap", color: C.texte3 }}>
                      {l.date}
                    </td>
                    <td style={{ padding: "9px 10px", borderBottom: `1px solid ${C.bord}` }}>
                      <Etiquette ton={TON_TYPE[l.type] || "gris"}>{l.type}</Etiquette>
                    </td>
                    <td style={{ padding: "9px 10px", borderBottom: `1px solid ${C.bord}`, fontWeight: 600 }}>
                      {l.libelle}
                    </td>
                    <td style={{ padding: "9px 10px", borderBottom: `1px solid ${C.bord}`, color: C.texte3 }}>
                      {l.detail}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right", borderBottom: `1px solid ${C.bord}`, color: C.vert, fontVariantNumeric: "tabular-nums" }}>
                      {l.entree ? argent(l.entree) : ""}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "right", borderBottom: `1px solid ${C.bord}`, color: C.rouge, fontVariantNumeric: "tabular-nums" }}>
                      {l.sortie ? argent(l.sortie) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------- semaines enregistrées */}
      <div style={u.carte}>
        <h2 style={u.titreCarte}>Semaines enregistrées</h2>
        <p style={u.aide}>
          Les totaux sont figés au moment de l'enregistrement : même si une vente est
          modifiée après coup, la semaine archivée ne bouge pas.
        </p>

        {archives.length === 0 ? (
          <div style={u.vide}>Aucune semaine enregistrée pour l'instant.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {archives.map((a) => {
              const gagnante = a.resultat >= 0;
              return (
                <div
                  key={a.id}
                  style={{
                    ...u.ligne,
                    borderColor: ouverte?.id === a.id ? `${C.ambre}88` : undefined,
                  }}
                >
                  <div style={{ minWidth: 170, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                      Du {libellePeriode(a)}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.texte3, marginTop: 2 }}>
                      {argent(a.entrees)} encaissés · {argent(a.sorties)} décaissés
                      {a.cree_par ? ` · par ${a.cree_par}` : ""}
                    </div>
                  </div>

                  <div
                    style={{
                      fontFamily: C.titre,
                      fontWeight: 800,
                      fontSize: 17,
                      color: gagnante ? C.vert : C.rouge,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {gagnante ? "+" : ""}{argent(a.resultat)}
                  </div>

                  <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
                    <Bouton ton="fantome" petit onClick={() => ouvrir(a)}>
                      {ouverte?.id === a.id ? "Ouverte" : "Ouvrir"}
                    </Bouton>
                    <BoutonSupprimer onConfirm={() => supprimerArchive(a)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
