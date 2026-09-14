import React, { useEffect, useMemo, useState } from "react";
import api from "./api.js";
import {
  C, u, Bouton, Champ, Etiquette, Alerte, Entete, BoutonSupprimer, argent, dateCourte,
} from "./ui.jsx";

const CATEGORIES = ["Local", "Stock", "Salaires", "Véhicules", "Publicité", "Taxes", "Divers"];

/** Dépenses de l'entreprise : saisie, total, répartition par catégorie. */
export default function Depenses({ isMobile }) {
  const [lignes, setLignes] = useState([]);
  const [total, setTotal] = useState(0);
  const [erreur, setErreur] = useState("");
  const [editionId, setEditionId] = useState(null);
  // Retour affiché sous le formulaire : le bandeau du haut est souvent hors écran.
  const [messageForm, setMessageForm] = useState(null);

  const vide = {
    libelle: "",
    montant: "",
    categorie: "Divers",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  };
  const [form, setForm] = useState(vide);

  async function recharger() {
    try {
      const d = await api.depenses();
      setLignes(d.lignes);
      setTotal(d.total);
      setErreur("");
    } catch (err) {
      setErreur(err.message);
    }
  }

  useEffect(() => { recharger(); }, []);

  async function enregistrer(e) {
    e.preventDefault();
    if (!form.libelle.trim()) {
      setMessageForm({ ton: "rouge", texte: "Donne un libellé à la dépense." });
      return;
    }
    if (!(Number(form.montant) > 0)) {
      setMessageForm({ ton: "rouge", texte: "Indique un montant supérieur à 0." });
      return;
    }
    try {
      if (editionId) await api.majDepense(editionId, form);
      else await api.ajouterDepense(form);
      const libelle = form.libelle.trim();
      setForm(vide);
      setEditionId(null);
      setMessageForm({
        ton: "vert",
        texte: (editionId ? "Dépense modifiée : " : "Dépense ajoutée : ") +
               libelle + " — " + argent(form.montant) + ".",
      });
      recharger();
    } catch (err) {
      setMessageForm({ ton: "rouge", texte: err.message });
    }
  }

  async function supprimer(id) {
    try { await api.supprimerDepense(id); recharger(); }
    catch (err) { setErreur(err.message); }
  }

  function charger(d) {
    setEditionId(d.id);
    setForm({
      libelle: d.libelle,
      montant: d.montant,
      categorie: d.categorie,
      date: d.date,
      note: d.note,
    });
  }

  const parCategorie = useMemo(() => {
    const m = new Map();
    for (const l of lignes) m.set(l.categorie, (m.get(l.categorie) || 0) + l.montant);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [lignes]);

  const ceMois = useMemo(() => {
    const p = new Date().toISOString().slice(0, 7);
    return lignes.filter((l) => String(l.date).startsWith(p)).reduce((s, l) => s + l.montant, 0);
  }, [lignes]);

  return (
    <section>
      <Entete
        titre="Dépenses"
        sous="Tout ce que l'entreprise sort : loyer du local, achats de stock, salaires versés, publicité."
      />
      <Alerte>{erreur}</Alerte>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {[
          ["Total dépensé", argent(total)],
          ["Ce mois-ci", argent(ceMois)],
          ["Lignes", lignes.length],
        ].map(([label, val]) => (
          <div key={label} style={{ ...u.carte, padding: 16 }}>
            <div style={{ fontSize: 10.5, color: C.texte3, letterSpacing: 0.5, marginBottom: 6 }}>
              {label.toUpperCase()}
            </div>
            <div style={{ fontFamily: C.titre, fontSize: 26, fontWeight: 800 }}>{val}</div>
          </div>
        ))}
      </div>

      {parCategorie.length > 0 && (
        <div style={{ ...u.carte, marginBottom: 18 }}>
          <h2 style={u.titreCarte}>Par catégorie</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {parCategorie.map(([cat, montant]) => {
              const part = total > 0 ? Math.round((montant / total) * 100) : 0;
              return (
                <div key={cat} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ minWidth: 100, fontSize: 13 }}>{cat}</div>
                  <div style={{ flex: 1, height: 8, background: "#101216", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${part}%`, height: "100%", background: C.ambre }} />
                  </div>
                  <div style={{ minWidth: 100, textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
                    {argent(montant)}
                  </div>
                  <div style={{ minWidth: 42, textAlign: "right", color: C.texte3, fontSize: 12 }}>{part} %</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ ...u.carte, marginBottom: 18 }}>
        <h2 style={u.titreCarte}>{editionId ? "Modifier la dépense" : "Nouvelle dépense"}</h2>
        <form onSubmit={enregistrer}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.6fr 0.9fr 1fr 1fr auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <Champ
              label="Libellé"
              value={form.libelle}
              onChange={(e) => setForm({ ...form, libelle: e.target.value })}
              placeholder="Loyer du local"
            />
            <Champ
              label="Montant"
              type="number"
              value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })}
              placeholder="12000"
            />
            <Champ label="Catégorie">
              <select
                value={form.categorie}
                onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                style={u.champ}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Champ>
            <Champ
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <Bouton type="submit">{editionId ? "Enregistrer" : "Ajouter"}</Bouton>
          </div>
          <div style={{ marginTop: 12 }}>
            <Champ
              label="Note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Facultatif"
            />
          </div>
          {editionId && (
            <Bouton ton="fantome" style={{ marginTop: 12 }} onClick={() => { setForm(vide); setEditionId(null); }}>
              Annuler la modification
            </Bouton>
          )}

          {messageForm && (
            <div style={{ marginTop: 12 }}>
              <Alerte ton={messageForm.ton}>{messageForm.texte}</Alerte>
            </div>
          )}
        </form>
      </div>

      <div style={u.carte}>
        <h2 style={u.titreCarte}>Historique</h2>
        {lignes.length === 0 ? (
          <div style={{ ...u.vide, marginTop: 12 }}>Aucune dépense enregistrée.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {lignes.map((d) => (
              <div key={d.id} style={u.ligne}>
                <div style={{ minWidth: 88, color: C.texte3, fontSize: 12.5 }}>{dateCourte(d.date)}</div>
                <Etiquette ton="gris">{d.categorie}</Etiquette>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{d.libelle}</div>
                  {d.note && <div style={{ fontSize: 11.5, color: C.texte3, marginTop: 2 }}>{d.note}</div>}
                </div>
                <div style={{ fontWeight: 700, color: C.rouge, fontVariantNumeric: "tabular-nums" }}>
                  − {argent(d.montant)}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Bouton ton="fantome" petit onClick={() => charger(d)}>Modifier</Bouton>
                  <BoutonSupprimer onConfirm={() => supprimer(d.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
