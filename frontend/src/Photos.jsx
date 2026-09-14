import React, { useEffect, useState } from "react";
import api from "./api.js";
import { C, u, Bouton, Etiquette, Alerte } from "./ui.jsx";

const poids = (o) => {
  const n = Number(o) || 0;
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
};

const jour = (d) => {
  if (!d) return "—";
  const dt = new Date(String(d).replace(" ", "T"));
  return isNaN(dt) ? String(d) : dt.toLocaleDateString("fr-FR");
};

/**
 * Les photos envoyées depuis le site. Réservé au patron et au co-patron :
 * les employés peuvent en ajouter une sur un véhicule, pas faire le ménage.
 */
export default function Photos({ isMobile }) {
  const [etat, setEtat] = useState(null);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);
  const [occupe, setOccupe] = useState(false);

  async function recharger() {
    try {
      setEtat(await api.photos());
      setErreur("");
    } catch (e) {
      setErreur(e.message);
    }
  }

  useEffect(() => { recharger(); }, []);

  async function supprimer(cle) {
    setASupprimer(null);
    try {
      await api.supprimerPhoto(cle);
      setMessage({ ton: "vert", texte: "Photo supprimée." });
      recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: e.message });
    }
  }

  async function menage() {
    setOccupe(true);
    try {
      const r = await api.menagePhotos();
      setMessage({
        ton: "vert",
        texte: r.supprimees
          ? `${r.supprimees} photo${r.supprimees > 1 ? "s" : ""} supprimée${r.supprimees > 1 ? "s" : ""}.`
          : "Rien à supprimer, toutes les photos servent.",
      });
      recharger();
    } catch (e) {
      setMessage({ ton: "rouge", texte: e.message });
    } finally {
      setOccupe(false);
    }
  }

  const photos = etat?.photos || [];

  return (
    <div style={{ ...u.carte, marginTop: 20 }}>
      <h2 style={u.titreCarte}>Photos des véhicules</h2>
      <p style={u.aide}>
        Les images envoyées depuis le formulaire véhicule. Une photo « non
        utilisée » n'est affichée par aucun véhicule ni aucune vente — c'est
        souvent une photo remplacée, ou celle d'un véhicule supprimé.
      </p>

      <Alerte>{erreur}</Alerte>
      {message && <Alerte ton={message.ton}>{message.texte}</Alerte>}

      <div
        style={{
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 13, color: C.texte2 }}>
          <strong style={{ fontFamily: C.titre, fontSize: 20 }}>{etat?.total ?? 0}</strong>
          {" photo"}{(etat?.total ?? 0) > 1 ? "s" : ""}
          {" · "}
          <strong>{poids(etat?.octets)}</strong> au total
        </span>
        {(etat?.inutilisees ?? 0) > 0 && (
          <Bouton ton="danger" onClick={menage} disabled={occupe}>
            {occupe
              ? "Suppression…"
              : `Supprimer les ${etat.inutilisees} photo${etat.inutilisees > 1 ? "s" : ""} inutilisée${etat.inutilisees > 1 ? "s" : ""}`}
          </Bouton>
        )}
      </div>

      {photos.length === 0 ? (
        <div style={u.vide}>
          Aucune photo envoyée depuis le site pour l'instant.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr 1fr"
              : "repeat(auto-fill, minmax(170px, 1fr))",
            gap: 12,
          }}
        >
          {photos.map((p) => (
            <div
              key={p.cle}
              style={{
                border: `1px solid ${p.utilisee ? C.bord : "rgba(210,104,95,.45)"}`,
                borderRadius: 10,
                overflow: "hidden",
                background: "#16181D",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <img
                src={p.url}
                alt=""
                loading="lazy"
                style={{
                  width: "100%",
                  height: 100,
                  objectFit: "cover",
                  background: "#1D2027",
                  display: "block",
                }}
              />
              <div style={{ padding: "9px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                <Etiquette ton={p.utilisee ? "vert" : "gris"}>
                  {p.utilisee ? "utilisée" : "non utilisée"}
                </Etiquette>
                <div style={{ fontSize: 11, color: C.texte3 }}>
                  {poids(p.octets)} · {jour(p.cree_le)}
                </div>
                {p.cree_par && (
                  <div style={{ fontSize: 11, color: C.texte3 }}>par {p.cree_par}</div>
                )}
                <Bouton
                  ton="danger"
                  petit
                  onClick={() => (aSupprimer === p.cle ? supprimer(p.cle) : setASupprimer(p.cle))}
                  onBlur={() => setASupprimer((v) => (v === p.cle ? null : v))}
                >
                  {aSupprimer === p.cle
                    ? "Confirmer ?"
                    : p.utilisee
                      ? "Supprimer quand même"
                      : "Supprimer"}
                </Bouton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
