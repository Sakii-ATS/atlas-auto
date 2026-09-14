import React, { useEffect, useState } from "react";
import api from "./api.js";
import {
  C, u, Bouton, Champ, Etiquette, Alerte, Entete, BoutonSupprimer,
  argent, dureeDepuisMinutes, dateCourte,
} from "./ui.jsx";

const moisCourant = () => {
  const d = new Date();
  const debut = new Date(d.getFullYear(), d.getMonth(), 1);
  return {
    debut: debut.toISOString().slice(0, 10),
    fin: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
};

/**
 * Récapitulatif pour le patron et le co-patron : heures de service saisies
 * à la main, nombre de véhicules vendus et chiffre généré par employé.
 */
export default function Salaires({ moi, isMobile }) {
  const [periode, setPeriode] = useState(moisCourant());
  const [recap, setRecap] = useState(null);
  const [employes, setEmployes] = useState([]);
  const [heures, setHeures] = useState([]);
  const [erreur, setErreur] = useState("");
  // Message affiché sous le formulaire : le bandeau du haut est hors écran
  // quand on saisit des heures, on ne le voyait jamais.
  const [messageForm, setMessageForm] = useState(null);

  const [saisie, setSaisie] = useState({
    employeId: "",
    date: new Date().toISOString().slice(0, 10),
    h: "",
    min: "",
    note: "",
  });

  async function recharger() {
    try {
      const [r, e, h] = await Promise.all([
        api.salaires(periode.debut, periode.fin),
        api.employes(),
        api.heures(),
      ]);
      setRecap(r);
      setEmployes(e);
      setHeures(h);
      setErreur("");
    } catch (err) {
      setErreur(err.message);
    }
  }

  useEffect(() => { recharger(); }, [periode.debut, periode.fin]); // eslint-disable-line

  // Un seul employé dans l'entreprise : inutile de le choisir à chaque fois.
  useEffect(() => {
    if (saisie.employeId) return;
    const actifs = employes.filter((e) => e.actif);
    if (actifs.length === 1) setSaisie((s) => ({ ...s, employeId: String(actifs[0].id) }));
  }, [employes]); // eslint-disable-line

  async function ajouter(e) {
    e.preventDefault();
    const minutes = (Number(saisie.h) || 0) * 60 + (Number(saisie.min) || 0);
    if (!saisie.employeId) {
      setMessageForm({ ton: "rouge", texte: "Choisis d'abord un employé dans la liste." });
      return;
    }
    if (!minutes) {
      setMessageForm({ ton: "rouge", texte: "Indique une durée : des heures, des minutes, ou les deux." });
      return;
    }
    try {
      await api.ajouterHeures({
        employeId: Number(saisie.employeId),
        date: saisie.date,
        minutes,
        note: saisie.note,
      });
      const qui = employes.find((x) => String(x.id) === String(saisie.employeId));
      setSaisie({ ...saisie, h: "", min: "", note: "" });
      setMessageForm({
        ton: "vert",
        texte: dureeDepuisMinutes(minutes) + " ajouté" +
               (qui ? " à " + qui.prenom + " " + qui.nom : "") + ".",
      });
      recharger();
    } catch (err) {
      setMessageForm({ ton: "rouge", texte: err.message });
    }
  }

  async function supprimer(id) {
    try { await api.supprimerHeures(id); recharger(); }
    catch (err) { setErreur(err.message); }
  }

  const lignes = recap?.lignes || [];
  const totalMinutes = lignes.reduce((s, l) => s + l.minutes, 0);
  const totalVentes = lignes.reduce((s, l) => s + l.ventes, 0);
  const totalChiffre = lignes.reduce((s, l) => s + l.chiffre, 0);
  const masse = recap?.masseSalariale ?? lignes.reduce((s, l) => s + (l.salaire || 0), 0);
  const base = recap?.salaireBase ?? 0;
  const prime = recap?.primeParOperation ?? 0;

  return (
    <section>
      <Entete
        titre="Salaires"
        sous="Le temps de service que tu as saisi, ce que chacun a vendu, et la paie qui en découle sur la période choisie."
      />
      <Alerte>{erreur}</Alerte>

      {/* période */}
      <div style={{ ...u.carte, marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr auto", gap: 12, alignItems: "end" }}>
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
        </div>
      </div>

      {/* totaux */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {[
          ["Employés actifs", lignes.length],
          ["Heures cumulées", dureeDepuisMinutes(totalMinutes)],
          ["Véhicules vendus", totalVentes],
          ["Chiffre généré", argent(totalChiffre)],
          ["Masse salariale", argent(masse)],
        ].map(([label, val]) => (
          <div key={label} style={{ ...u.carte, padding: 16 }}>
            <div style={{ fontSize: 10.5, color: C.texte3, letterSpacing: 0.5, marginBottom: 6 }}>
              {label.toUpperCase()}
            </div>
            <div style={{ fontFamily: C.titre, fontSize: 26, fontWeight: 800 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* récap par employé */}
      <div style={{ ...u.carte, marginBottom: 18 }}>
        <h2 style={u.titreCarte}>Par employé</h2>
        <p style={u.aide}>
          Classé du plus grand nombre de ventes au plus petit. Paie ={" "}
          <strong style={{ color: C.texte2 }}>{argent(base)}</strong> de fixe
          {" + "}
          <strong style={{ color: C.texte2 }}>{argent(prime)}</strong> par opération
          (vente ou rachat). Ces deux montants se règlent dans l'onglet Paramètres.
        </p>
        {lignes.length === 0 ? (
          <div style={u.vide}>Aucun employé actif.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr>
                  {["Employé", "Grade", "Service", "Ventes", "Rachats", "Chiffre", "Salaire"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        textAlign: i > 1 ? "right" : "left",
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
                {lignes.map((l) => (
                  <tr key={l.id}>
                    <td style={{ padding: "10px", borderBottom: `1px solid ${C.bord}`, fontWeight: 600 }}>
                      {l.prenom} {l.nom}
                    </td>
                    <td style={{ padding: "10px", borderBottom: `1px solid ${C.bord}` }}>
                      <Etiquette ton={["Patron", "Co-patron"].includes(l.grade) ? "ambre" : l.grade === "Manager" ? "bleu" : "gris"}>
                        {l.grade}
                      </Etiquette>
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", borderBottom: `1px solid ${C.bord}`, fontVariantNumeric: "tabular-nums" }}>
                      {dureeDepuisMinutes(l.minutes)}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", borderBottom: `1px solid ${C.bord}`, fontWeight: 700, color: C.ambre }}>
                      {l.ventes}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", borderBottom: `1px solid ${C.bord}`, color: C.texte2 }}>
                      {l.achats}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", borderBottom: `1px solid ${C.bord}`, fontVariantNumeric: "tabular-nums" }}>
                      {argent(l.chiffre)}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        textAlign: "right",
                        borderBottom: `1px solid ${C.bord}`,
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                      title={`${argent(l.salaireBase)} de fixe + ${l.operations} opération(s) × ${argent(prime)}`}
                    >
                      {argent(l.salaire)}
                      {l.primes > 0 && (
                        <div style={{ fontSize: 10.5, color: C.texte3, fontWeight: 500 }}>
                          dont {argent(l.primes)} de primes
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* saisie des heures */}
      <div style={u.carte}>
        <h2 style={u.titreCarte}>Saisir du temps de service</h2>
        <p style={u.aide}>
          Ajoute les heures effectuées par un employé. Une ligne par service, ou un total
          par jour, comme tu préfères.
        </p>

        <form onSubmit={ajouter}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr 0.6fr 0.6fr 1.4fr auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <Champ label="Employé">
              <select
                value={saisie.employeId}
                onChange={(e) => setSaisie({ ...saisie, employeId: e.target.value })}
                style={u.champ}
              >
                <option value="">Choisir…</option>
                {employes.filter((e) => e.actif).map((e) => (
                  <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
                ))}
              </select>
            </Champ>
            <Champ
              label="Date"
              type="date"
              value={saisie.date}
              onChange={(e) => setSaisie({ ...saisie, date: e.target.value })}
            />
            <Champ
              label="Heures"
              type="number"
              min="0"
              value={saisie.h}
              onChange={(e) => setSaisie({ ...saisie, h: e.target.value })}
              placeholder="2"
            />
            <Champ
              label="Minutes"
              type="number"
              min="0"
              max="59"
              value={saisie.min}
              onChange={(e) => setSaisie({ ...saisie, min: e.target.value })}
              placeholder="30"
            />
            <Champ
              label="Note"
              value={saisie.note}
              onChange={(e) => setSaisie({ ...saisie, note: e.target.value })}
              placeholder="Service du soir"
            />
            <Bouton type="submit">Ajouter</Bouton>
          </div>

          {messageForm && (
            <div style={{ marginTop: 12 }}>
              <Alerte ton={messageForm.ton}>{messageForm.texte}</Alerte>
            </div>
          )}
        </form>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          {heures.length === 0 ? (
            <div style={u.vide}>Aucune heure saisie.</div>
          ) : (
            heures.slice(0, 40).map((h) => (
              <div key={h.id} style={{ ...u.ligne, padding: "9px 13px" }}>
                <div style={{ minWidth: 140, fontWeight: 600, fontSize: 13.5 }}>
                  {h.prenom} {h.nom}
                </div>
                <div style={{ color: C.texte3, fontSize: 12.5, minWidth: 90 }}>{dateCourte(h.date)}</div>
                <div style={{ color: C.ambre, fontWeight: 700, fontSize: 13.5, minWidth: 70 }}>
                  {dureeDepuisMinutes(h.minutes)}
                </div>
                <div style={{ color: C.texte3, fontSize: 12.5, flex: 1 }}>{h.note}</div>
                <BoutonSupprimer onConfirm={() => supprimer(h.id)} />
              </div>
            ))
          )}
          {heures.length > 40 && (
            <div style={{ fontSize: 12, color: C.texte3, textAlign: "center" }}>
              40 dernières lignes affichées sur {heures.length}.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
