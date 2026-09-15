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

/** Les feuilles du classeur : un vrai tableau par catégorie. */
function feuillesDu(etat) {
  const lignes = etat.lignes || [];
  const de = (type) => lignes.filter((l) => l.type === type);
  const total = (l, champ) => l.reduce((s, x) => s + (Number(x[champ]) || 0), 0);

  const ventes = de("Vente");
  const rachats = de("Rachat");
  const depenses = de("Dépense");
  const salaires = de("Salaire");
  const dividendes = de("Dividende");

  const colDate = { titre: "Date", cle: "date", type: "date" };

  return [
    {
      nom: "Résumé",
      colonnes: [
        { titre: "Poste", cle: "poste" },
        { titre: "Nombre", cle: "nombre", type: "nombre" },
        { titre: "Montant", cle: "montant", type: "argent" },
      ],
      lignes: [
        { poste: "Ventes (encaissé)", nombre: ventes.length, montant: total(ventes, "entree") },
        { poste: "Rachats (décaissé)", nombre: rachats.length, montant: total(rachats, "sortie") },
        { poste: "Dépenses (décaissé)", nombre: depenses.length, montant: total(depenses, "sortie") },
        { poste: "Salaires (décaissé)", nombre: salaires.length, montant: total(salaires, "sortie") },
        { poste: "Dividendes (décaissé)", nombre: dividendes.length, montant: total(dividendes, "sortie") },
      ],
      // Les décaissés sont en négatif : la colonne s additionne de haut en bas
      // et tombe juste sur le solde final.
      pied: [
        { poste: "Total encaissé", montant: etat.entrees || 0 },
        { poste: "Total décaissé", montant: -(etat.sorties || 0) },
        { poste: "Résultat de la semaine", montant: etat.resultat || 0 },
        { poste: "Sur le compte avant", montant: etat.soldeAvant || 0 },
        { poste: "SUR LE COMPTE APRÈS", montant: etat.soldeApres || 0 },
      ],
    },
    {
      nom: "Ventes",
      colonnes: [
        colDate,
        { titre: "Véhicule", cle: "libelle" },
        { titre: "Client", cle: "detail" },
        { titre: "Vendu par", cle: "par" },
        { titre: "Encaissé", cle: "entree", type: "argent" },
      ],
      lignes: ventes,
      pied: [{ libelle: "TOTAL", entree: total(ventes, "entree") }],
    },
    {
      nom: "Rachats",
      colonnes: [
        colDate,
        { titre: "Véhicule", cle: "libelle" },
        { titre: "Client", cle: "detail" },
        { titre: "Racheté par", cle: "par" },
        { titre: "Décaissé", cle: "sortie", type: "argent" },
      ],
      lignes: rachats,
      pied: [{ libelle: "TOTAL", sortie: total(rachats, "sortie") }],
    },
    {
      nom: "Dépenses",
      colonnes: [
        colDate,
        { titre: "Libellé", cle: "libelle" },
        { titre: "Catégorie", cle: "detail" },
        { titre: "Saisi par", cle: "par" },
        { titre: "Montant", cle: "sortie", type: "argent" },
      ],
      lignes: depenses,
      pied: [{ libelle: "TOTAL", sortie: total(depenses, "sortie") }],
    },
    {
      nom: "Salaires",
      colonnes: [
        colDate,
        { titre: "Employé", cle: "libelle" },
        { titre: "Détail", cle: "detail" },
        { titre: "Salaire", cle: "sortie", type: "argent" },
      ],
      lignes: salaires,
      pied: [{ libelle: "TOTAL", sortie: total(salaires, "sortie") }],
    },
    {
      nom: "Dividendes",
      colonnes: [
        colDate,
        { titre: "Bénéficiaire", cle: "libelle" },
        { titre: "Motif", cle: "detail" },
        { titre: "Versé par", cle: "par" },
        { titre: "Montant", cle: "sortie", type: "argent" },
      ],
      lignes: dividendes,
      pied: [{ libelle: "TOTAL", sortie: total(dividendes, "sortie") }],
    },
    {
      nom: "Journal",
      colonnes: [
        colDate,
        { titre: "Type", cle: "type" },
        { titre: "Libellé", cle: "libelle" },
        { titre: "Détail", cle: "detail" },
        { titre: "Par", cle: "par" },
        { titre: "Entrée", cle: "entree", type: "argent" },
        { titre: "Sortie", cle: "sortie", type: "argent" },
      ],
      // les zéros restent vides, c'est plus lisible
      lignes: lignes.map((l) => ({ ...l, entree: l.entree || "", sortie: l.sortie || "" })),
      pied: [{ type: "TOTAL", entree: etat.entrees || 0, sortie: etat.sorties || 0 }],
    },
  ];
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
  const [form, setForm] = useState({ beneficiaire: "", montant: "", date: "", note: "" });

  async function recharger() {
    try {
      const [c, a, d, t] = await Promise.all([
        api.compta(periode.debut, periode.fin),
        api.archivesCompta(),
        api.dividendes(),
        api.tresorerie(),
      ]);
      setEtat(c);
      setArchives(a);
      setDividendes(d.lignes || []);
      setTresorerie(t);
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
      telechargerClasseur(`compta-${vuePeriode.debut}-au-${vuePeriode.fin}.xlsx`, feuillesDu(vue));
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

        <p style={{ ...u.aide, margin: "10px 0 0" }}>
          L'export est un classeur Excel avec une feuille par catégorie : Résumé, Ventes,
          Rachats, Dépenses, Salaires, Dividendes et le Journal complet.
        </p>
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
