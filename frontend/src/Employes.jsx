import React, { useEffect, useState } from "react";
import api from "./api.js";
import {
  C, u, Bouton, Champ, Etiquette, Alerte, BoutonSupprimer,
} from "./ui.jsx";

const GRADES = ["Vendeur/Vendeuse", "Manager", "Co-patron", "Patron"];
const TON_GRADE = { Patron: "ambre", "Co-patron": "ambre", Manager: "bleu", "Vendeur/Vendeuse": "gris" };

/**
 * Remplace l'ancien bloc « Comptes & connexions » + « Synchronisation Discord ».
 * Le patron saisit nom, prénom et grade ; le code à 5 chiffres est généré ici.
 */
export default function Employes({ moi, isMobile }) {
  const [employes, setEmployes] = useState([]);
  const [connectes, setConnectes] = useState([]);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [grade, setGrade] = useState("Vendeur/Vendeuse");
  const [dernierCode, setDernierCode] = useState(null);

  async function recharger() {
    try {
      const [e, c] = await Promise.all([api.employes(), api.connexions()]);
      setEmployes(e);
      setConnectes(c);
      setErreur("");
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { recharger(); }, []);

  async function creer(e) {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim()) {
      setErreur("Nom et prénom sont obligatoires.");
      return;
    }
    try {
      const cree = await api.creerEmploye({ nom: nom.trim(), prenom: prenom.trim(), grade });
      setDernierCode(cree);
      setNom("");
      setPrenom("");
      setGrade("Vendeur/Vendeuse");
      setErreur("");
      recharger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function regenerer(emp) {
    try {
      const maj = await api.regenererCode(emp.id);
      setDernierCode({ ...emp, code: maj.code });
      recharger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function changerGrade(emp, nouveau) {
    try {
      await api.majEmploye(emp.id, { grade: nouveau });
      recharger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function supprimer(emp) {
    try {
      await api.supprimerEmploye(emp.id);
      recharger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  const enLigne = (id) => connectes.find((c) => c.id === id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Alerte>{erreur}</Alerte>

      {/* ------------------------------------------------ création */}
      <div style={u.carte}>
        <h2 style={u.titreCarte}>Embaucher</h2>
        <p style={u.aide}>
          Saisis le nom, le prénom et le grade. Le code à 5 chiffres est généré tout de suite —
          c'est ce code, avec son nom et son prénom, que l'employé utilisera pour se connecter.
        </p>

        <form onSubmit={creer}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1.2fr auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <Champ label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Petit" />
            <Champ label="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Clovis" />
            <Champ label="Grade">
              <select value={grade} onChange={(e) => setGrade(e.target.value)} style={u.champ}>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Champ>
            <Bouton type="submit">Créer le compte</Bouton>
          </div>
        </form>

        {dernierCode && (
          <div
            style={{
              marginTop: 16,
              padding: "14px 16px",
              borderRadius: 10,
              background: `${C.ambre}14`,
              border: `1px solid ${C.ambre}55`,
            }}
          >
            <div style={{ fontSize: 12.5, color: C.texte2, marginBottom: 6 }}>
              Code de <strong style={{ color: C.texte }}>{dernierCode.prenom} {dernierCode.nom}</strong> —
              transmets-le-lui, il ne sera plus mis en avant après.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ ...u.code, fontSize: 26 }}>{dernierCode.code}</span>
              <Bouton
                ton="fantome"
                petit
                onClick={() => navigator.clipboard?.writeText(dernierCode.code)}
              >
                Copier
              </Bouton>
              <Bouton ton="fantome" petit onClick={() => setDernierCode(null)}>Masquer</Bouton>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------ liste */}
      <div style={u.carte}>
        <h2 style={u.titreCarte}>Comptes &amp; connexions</h2>
        <p style={u.aide}>
          Le point vert signale une session ouverte en ce moment. Le compteur est le nombre
          total de connexions depuis la création du compte.
        </p>

        {chargement ? (
          <div style={u.vide}>Chargement…</div>
        ) : employes.length === 0 ? (
          <div style={u.vide}>Aucun compte pour l'instant.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {employes.map((e) => {
              const session = enLigne(e.id);
              return (
                <div key={e.id} style={{ ...u.ligne, opacity: e.actif ? 1 : 0.5 }}>
                  <span
                    title={session ? "Connecté" : "Hors ligne"}
                    style={{
                      width: 8, height: 8, borderRadius: "50%", flex: "none",
                      background: session ? C.vert : C.bord2,
                    }}
                  />
                  <div style={{ minWidth: 150, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {e.prenom} {e.nom}{" "}
                      {moi?.id === e.id && <span style={{ color: C.texte3, fontWeight: 400, fontSize: 12 }}>· toi</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.texte3, marginTop: 2 }}>
                      Code <span style={u.code}>{e.code}</span> · {e.connexions} connexion{e.connexions > 1 ? "s" : ""}
                    </div>
                  </div>

                  <select
                    value={e.grade}
                    onChange={(ev) => changerGrade(e, ev.target.value)}
                    style={{ ...u.champ, width: "auto", fontSize: 12, padding: "6px 8px" }}
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <Etiquette ton={TON_GRADE[e.grade] || "gris"}>{e.grade}</Etiquette>

                  <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                    <Bouton ton="fantome" petit onClick={() => navigator.clipboard?.writeText(e.code)}>
                      Copier
                    </Bouton>
                    <Bouton ton="fantome" petit onClick={() => regenerer(e)}>
                      Nouveau code
                    </Bouton>
                    {moi?.id !== e.id && (
                      <BoutonSupprimer onConfirm={() => supprimer(e)} libelle="Renvoyer" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
