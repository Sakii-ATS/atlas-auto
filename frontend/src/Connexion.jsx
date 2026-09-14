import React, { useState } from "react";
import api from "./api.js";
import { C, u, Bouton, Champ, Alerte } from "./ui.jsx";

/**
 * Écran de connexion : nom, prénom et code à 5 chiffres.
 * Les trois doivent correspondre à un employé actif.
 */
export default function Connexion({ onConnecte, logo, nomEntreprise, isMobile }) {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function valider(e) {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim() || !code.trim()) {
      setErreur("Remplis les trois champs.");
      return;
    }
    setEnCours(true);
    setErreur("");
    try {
      const employe = await api.connexion({ nom, prenom, code });
      onConnecte(employe);
    } catch (err) {
      setErreur(err.message);
      setEnCours(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.fond,
        color: C.texte,
        fontFamily: C.corps,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? 18 : 32,
      }}
    >
      <form
        onSubmit={valider}
        style={{ ...u.carte, width: "100%", maxWidth: 400, padding: isMobile ? 22 : 30 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          {logo && (
            <img
              src={logo}
              alt=""
              style={{ width: 44, height: 44, borderRadius: 8, objectFit: "contain" }}
            />
          )}
          <div>
            <div style={{ fontFamily: C.titre, fontWeight: 800, fontSize: 24, letterSpacing: 1 }}>
              {nomEntreprise}
            </div>
            <div style={{ fontSize: 11, color: C.texte3, letterSpacing: 1 }}>ESPACE ENTREPRISE</div>
          </div>
        </div>

        <p style={{ ...u.aide, marginBottom: 20 }}>
          Entre ton nom, ton prénom et le code à 5 chiffres que la direction t'a donné.
        </p>

        <Alerte>{erreur}</Alerte>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Champ
            label="Nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Petit"
            autoComplete="off"
          />
          <Champ
            label="Prénom"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            placeholder="Clovis"
            autoComplete="off"
          />
          <Champ
            label="Code d'accès"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="00000"
            inputMode="numeric"
            autoComplete="off"
            style={{ ...u.champ, letterSpacing: 6, fontSize: 18, textAlign: "center", fontWeight: 700 }}
          />
        </div>

        <Bouton type="submit" disabled={enCours} style={{ width: "100%", marginTop: 22 }}>
          {enCours ? "Connexion…" : "Se connecter"}
        </Bouton>

        <p style={{ ...u.aide, margin: "16px 0 0", textAlign: "center" }}>
          Code perdu ou oublié ? Demande à la direction de t'en générer un nouveau.
        </p>
      </form>
    </div>
  );
}
