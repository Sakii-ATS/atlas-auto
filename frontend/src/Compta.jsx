import React, { useEffect, useState } from "react";
import api from "./api.js";
import { C, u, Bouton, Champ, Etiquette, Alerte, Entete, argent } from "./ui.jsx";

const moisCourant = () => {
  const d = new Date();
  return {
    debut: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10),
    fin: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
};

const TON_TYPE = { Vente: "vert", Rachat: "bleu", Dépense: "ambre", Salaire: "gris" };

/** Échappe une valeur pour un CSV : guillemets doublés, tout entre guillemets. */
const champCsv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/**
 * La compta : ventes, rachats, dépenses et salaires au même endroit, sur la
 * période choisie, avec un export pour tableur.
 */
export default function Compta({ isMobile }) {
  const [periode, setPeriode] = useState(moisCourant());
  const [etat, setEtat] = useState(null);
  const [erreur, setErreur] = useState("");
  const [filtre, setFiltre] = useState("Tout");

  async function recharger() {
    try {
      setEtat(await api.compta(periode.debut, periode.fin));
      setErreur("");
    } catch (e) {
      setErreur(e.message);
    }
  }

  useEffect(() => { recharger(); }, [periode.debut, periode.fin]); // eslint-disable-line

  /** Export CSV : point-virgule et BOM, pour qu Excel en français l ouvre droit. */
  function exporter() {
    const entetes = ["Date", "Type", "Libellé", "Détail", "Par", "Entrée", "Sortie"];
    const corps = (etat?.lignes || []).map((l) =>
      [l.date, l.type, l.libelle, l.detail, l.par, l.entree || "", l.sortie || ""]
        .map(champCsv)
        .join(";"),
    );
    const totaux = [
      "",
      ["", "TOTAL ENTRÉES", "", "", "", etat.entrees, ""].map(champCsv).join(";"),
      ["", "TOTAL SORTIES", "", "", "", "", etat.sorties].map(champCsv).join(";"),
      ["", "RÉSULTAT", "", "", "", etat.resultat, ""].map(champCsv).join(";"),
    ];
    const csv =
      "﻿" + [entetes.map(champCsv).join(";"), ...corps, ...totaux].join("\r\n");

    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    lien.download = `compta-${periode.debut}-au-${periode.fin}.csv`;
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(lien.href);
  }

  const lignes = (etat?.lignes || []).filter((l) => filtre === "Tout" || l.type === filtre);
  const positif = (etat?.resultat ?? 0) >= 0;

  return (
    <section>
      <Entete
        titre="Compta"
        sous="Tout l'argent de l'entreprise sur la période : ce qui rentre, ce qui sort, et ce qu'il reste."
      />
      <Alerte>{erreur}</Alerte>

      {/* période + export */}
      <div style={{ ...u.carte, marginBottom: 18 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr auto auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <Champ
            label="Du"
            type="date"
            value={periode.debut}
            onChange={(e) => setPeriode({ ...periode, debut: e.target.value })}
          />
          <Champ
            label="Au"
            type="date"
            value={periode.fin}
            onChange={(e) => setPeriode({ ...periode, fin: e.target.value })}
          />
          <Bouton ton="fantome" onClick={() => setPeriode(moisCourant())}>Mois en cours</Bouton>
          <Bouton onClick={exporter} disabled={!etat?.lignes?.length}>
            Exporter en CSV
          </Bouton>
        </div>
        <p style={{ ...u.aide, margin: "10px 0 0" }}>
          Le fichier s'ouvre dans Excel, LibreOffice ou Google Sheets.
        </p>
      </div>

      {/* les quatre postes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {[
          ["Ventes", etat?.ventes, C.vert],
          ["Rachats", etat?.achats, C.texte2],
          ["Dépenses", etat?.depenses, C.texte2],
          ["Salaires", etat?.salaires, C.texte2],
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

      {/* le résultat */}
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
          {argent(etat?.entrees)} encaissés
          {"  −  "}
          {argent(etat?.sorties)} décaissés
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
            {positif ? "+" : ""}{argent(etat?.resultat)}
          </div>
        </div>
      </div>

      {/* le journal */}
      <div style={u.carte}>
        <h2 style={u.titreCarte}>Journal</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {["Tout", "Vente", "Rachat", "Dépense", "Salaire"].map((t) => (
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
          <div style={u.vide}>Rien sur cette période.</div>
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
    </section>
  );
}
