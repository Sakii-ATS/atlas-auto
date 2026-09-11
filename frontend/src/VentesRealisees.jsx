import React, { useEffect, useMemo, useState } from "react";
import api from "./api.js";
import {
  C, u, Bouton, Etiquette, Alerte, Entete, Onglets, BoutonSupprimer, BoutonCopier,
  argent, dateCourte,
} from "./ui.jsx";
import { EmettreContrat, LecteurContrat } from "./Contrats.jsx";

/**
 * Historique complet : deux catégories, les ventes et les rachats.
 * La classe du client est affichée juste à côté de son nom, et un onglet en
 * bas de chaque fiche donne accès au contrat.
 */
export default function VentesRealisees({ moi, isMobile }) {
  const [type, setType] = useState("vente");
  const [mouvements, setMouvements] = useState([]);
  const [contrats, setContrats] = useState([]);
  const [erreur, setErreur] = useState("");
  const [emission, setEmission] = useState(null);
  const [lecture, setLecture] = useState(null);

  async function recharger() {
    try {
      const [m, c] = await Promise.all([api.mouvements(), api.contrats()]);
      setMouvements(m);
      setContrats(c);
      setErreur("");
    } catch (err) {
      setErreur(err.message);
    }
  }

  useEffect(() => { recharger(); }, []);

  const ventes = useMemo(() => mouvements.filter((m) => m.type === "vente"), [mouvements]);
  const achats = useMemo(() => mouvements.filter((m) => m.type === "achat"), [mouvements]);
  const liste = type === "vente" ? ventes : achats;

  const contratsDe = (mid) => contrats.filter((c) => c.mouvement_id === mid);

  async function supprimer(id) {
    try { await api.supprimerMouvement(id); recharger(); }
    catch (err) { setErreur(err.message); }
  }

  const totalVentes = ventes.reduce((s, m) => s + m.prix_final, 0);
  const totalAchats = achats.reduce((s, m) => s + m.prix_final, 0);

  return (
    <section>
      <Entete
        titre="Ventes réalisées"
        sous="Chaque vente et chaque rachat enregistré, avec le véhicule, le client et le contrat associé."
      />
      <Alerte>{erreur}</Alerte>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {[
          ["Ventes", ventes.length],
          ["Encaissé", argent(totalVentes)],
          ["Rachats", achats.length],
          ["Décaissé", argent(totalAchats)],
        ].map(([label, val]) => (
          <div key={label} style={{ ...u.carte, padding: 16 }}>
            <div style={{ fontSize: 10.5, color: C.texte3, letterSpacing: 0.5, marginBottom: 6 }}>
              {label.toUpperCase()}
            </div>
            <div style={{ fontFamily: C.titre, fontSize: 26, fontWeight: 800 }}>{val}</div>
          </div>
        ))}
      </div>

      <Onglets
        valeur={type}
        onChange={setType}
        items={[
          { cle: "vente", label: "Ventes", compte: ventes.length },
          { cle: "achat", label: "Rachats", compte: achats.length },
        ]}
      />

      {liste.length === 0 ? (
        <div style={u.vide}>
          {type === "vente" ? "Aucune vente enregistrée." : "Aucun rachat enregistré."}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {liste.map((m) => (
            <Fiche
              key={m.id}
              m={m}
              contrats={contratsDe(m.id)}
              moi={moi}
              onEmettre={() => setEmission(m)}
              onLire={setLecture}
              onSupprimer={() => supprimer(m.id)}
            />
          ))}
        </div>
      )}

      {emission && (
        <EmettreContrat
          mouvement={emission}
          moi={moi}
          isMobile={isMobile}
          onFermer={() => setEmission(null)}
          onEmis={recharger}
        />
      )}
      {lecture && (
        <LecteurContrat
          contrat={lecture}
          moi={moi}
          isMobile={isMobile}
          onFermer={() => setLecture(null)}
          onEnregistre={() => { setLecture(null); recharger(); }}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
function Fiche({ m, contrats, moi, onEmettre, onLire, onSupprimer }) {
  const [onglet, setOnglet] = useState("detail");
  const estVente = m.type === "vente";

  return (
    <div style={{ ...u.carte, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          height: 150,
          background: m.image
            ? `url(${m.image}) center/cover`
            : "linear-gradient(135deg,#1D2027,#14161A)",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(20,22,26,.25),rgba(20,22,26,.9))" }} />
        <div style={{ position: "absolute", top: 10, left: 10 }}>
          <Etiquette ton={estVente ? "ambre" : "bleu"}>{estVente ? "Vente" : "Rachat"}</Etiquette>
        </div>
        {contrats.length > 0 && (
          <div style={{ position: "absolute", top: 10, right: 10 }}>
            <Etiquette ton="vert">{contrats.length} contrat{contrats.length > 1 ? "s" : ""}</Etiquette>
          </div>
        )}
        <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
          <div style={{ fontFamily: C.titre, fontSize: 24, fontWeight: 800, letterSpacing: 0.5 }}>
            {m.modele || "—"}
          </div>
          <div style={{ fontSize: 11.5, color: C.texte3 }}>{m.genre}</div>
        </div>
      </div>

      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.bord}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 11, color: C.texte3 }}>
            {estVente
              ? m.reduction_pct > 0 ? `Prix (−${m.reduction_pct} %)` : "Prix de vente"
              : "Montant versé"}
          </span>
          <span style={{ fontFamily: C.titre, fontSize: 26, fontWeight: 800, color: C.ambre }}>
            {argent(m.prix_final)}
          </span>
        </div>
        {estVente && m.reduction_pct > 0 && (
          <div style={{ fontSize: 11, color: C.texte3, marginTop: 2 }}>
            Prix initial : {argent(m.prix_initial)}
          </div>
        )}
      </div>

      {/* onglets en bas de la fiche */}
      <div style={{ display: "flex", gap: 2, padding: "10px 12px 0" }}>
        {[
          { cle: "detail", label: "Détail" },
          { cle: "contrat", label: contrats.length ? `Contrat (${contrats.length})` : "Contrat" },
        ].map((t) => (
          <button
            key={t.cle}
            onClick={() => setOnglet(t.cle)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${onglet === t.cle ? C.ambre : "transparent"}`,
              color: onglet === t.cle ? C.ambre : C.texte3,
              fontWeight: 600,
              fontSize: 12.5,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 16px 16px", flex: 1 }}>
        {onglet === "detail" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Info label="Client">
              {m.client_prenom} {m.client_nom}{" "}
              {m.client_classe && <Etiquette ton="bleu">Classe {m.client_classe}</Etiquette>}
            </Info>
            <Info label={estVente ? "Vendeur" : "Racheté par"}>
              {m.vendeur_prenom} {m.vendeur_nom}
            </Info>
            {estVente && (
              <Info label="Kilométrage">
                {m.km ? `${new Intl.NumberFormat("fr-FR").format(m.km)} km` : "—"}
                {m.surcharge_offerte ? (
                  <span style={{ color: C.vert, fontSize: 11 }}> · offerts</span>
                ) : m.surcharge > 0 ? (
                  <span style={{ color: C.texte3, fontSize: 11 }}> · +{argent(m.surcharge)}</span>
                ) : null}
              </Info>
            )}
            <Info label="Date">{dateCourte(m.date)}</Info>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {contrats.length === 0 ? (
              <p style={{ ...u.aide, margin: 0 }}>
                Aucun contrat pour ce mouvement — utilise le bouton ci-dessous
                pour en émettre un.
              </p>
            ) : (
              contrats.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                    padding: "8px 10px", border: `1px solid ${C.bord}`, borderRadius: 8,
                    background: "#16181D",
                  }}
                >
                  <span style={{ ...u.code, fontSize: 12, letterSpacing: 1 }}>{c.numero}</span>
                  <Bouton ton="fantome" petit onClick={() => onLire(c)}>Ouvrir</Bouton>
                  <BoutonCopier texte={c.texte} />
                </div>
              ))
            )}
            <Bouton petit onClick={onEmettre} style={{ alignSelf: "flex-start", marginTop: 4 }}>
              Émettre un contrat
            </Bouton>
          </div>
        )}
      </div>

      {["Co-patron", "Patron"].includes(moi?.grade) && (
        <div style={{ padding: "0 16px 14px" }}>
          <BoutonSupprimer onConfirm={onSupprimer} libelle="Supprimer ce mouvement" />
        </div>
      )}
    </div>
  );
}

function Info({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.texte3, letterSpacing: 0.4, marginBottom: 3 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
}
