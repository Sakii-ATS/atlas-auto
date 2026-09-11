import React from "react";

// ===========================================================================
// Palette et briques d'interface partagées par les nouveaux écrans.
// Reprend exactement les couleurs et les polices de App.jsx.
// ===========================================================================

export const C = {
  fond: "#14161A",
  panneau: "#1A1D22",
  panneau2: "#1D2027",
  bord: "#24272E",
  bord2: "#2A2D34",
  texte: "#E8E6E1",
  texte2: "#9CA0A8",
  texte3: "#71767F",
  ambre: "#F2A93B",
  bleu: "#5FA8D3",
  vert: "#6FBF8B",
  rouge: "#D2685F",
  titre: "'Big Shoulders Display', sans-serif",
  corps: "'Inter', sans-serif",
};

export const u = {
  carte: {
    background: C.panneau,
    border: `1px solid ${C.bord}`,
    borderRadius: 14,
    padding: 20,
  },
  titreCarte: {
    fontFamily: C.titre,
    fontSize: 22,
    fontWeight: 800,
    margin: "0 0 4px",
    letterSpacing: 0.5,
  },
  aide: { fontSize: 12.5, color: C.texte3, margin: "0 0 16px", lineHeight: 1.5 },
  label: {
    display: "block",
    fontSize: 11,
    color: C.texte3,
    fontWeight: 600,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  champ: {
    width: "100%",
    background: "#101216",
    border: `1px solid ${C.bord2}`,
    borderRadius: 8,
    color: C.texte,
    fontSize: 14,
    fontFamily: C.corps,
    padding: "9px 11px",
    boxSizing: "border-box",
  },
  zone: {
    width: "100%",
    background: "#101216",
    border: `1px solid ${C.bord2}`,
    borderRadius: 8,
    color: C.texte,
    fontSize: 13,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    padding: "11px 12px",
    lineHeight: 1.6,
    resize: "vertical",
    boxSizing: "border-box",
  },
  ligne: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    border: `1px solid ${C.bord}`,
    borderRadius: 10,
    background: "#16181D",
    flexWrap: "wrap",
  },
  vide: {
    padding: "34px 18px",
    textAlign: "center",
    color: C.texte3,
    fontSize: 13,
    border: `1px dashed ${C.bord2}`,
    borderRadius: 10,
  },
  code: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    letterSpacing: 2,
    fontSize: 15,
    color: C.ambre,
    fontWeight: 700,
  },
  grille2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
};

export function Bouton({ children, ton = "principal", petit, style, ...reste }) {
  const tons = {
    principal: { background: C.ambre, border: `1px solid ${C.ambre}`, color: "#14161A", fontWeight: 700 },
    fantome: { background: "transparent", border: `1px solid ${C.bord2}`, color: C.texte2, fontWeight: 600 },
    danger: { background: "transparent", border: `1px solid ${C.rouge}`, color: C.rouge, fontWeight: 600 },
  };
  return (
    <button
      {...reste}
      style={{
        borderRadius: 8,
        cursor: reste.disabled ? "not-allowed" : "pointer",
        opacity: reste.disabled ? 0.5 : 1,
        fontFamily: C.corps,
        fontSize: petit ? 12 : 13.5,
        padding: petit ? "6px 10px" : "10px 16px",
        ...tons[ton],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Champ({ label, children, ...reste }) {
  return (
    <label style={{ display: "block" }}>
      {label && <span style={u.label}>{label}</span>}
      {children || <input {...reste} style={{ ...u.champ, ...(reste.style || {}) }} />}
    </label>
  );
}

export function Etiquette({ children, ton = "ambre" }) {
  const couleurs = { ambre: C.ambre, bleu: C.bleu, vert: C.vert, rouge: C.rouge, gris: C.texte3 };
  const c = couleurs[ton] || C.ambre;
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        color: c,
        background: `${c}1F`,
        border: `1px solid ${c}55`,
        borderRadius: 20,
        padding: "3px 9px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function Onglets({ valeur, onChange, items }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
      {items.map((it) => (
        <button
          key={it.cle}
          onClick={() => onChange(it.cle)}
          style={{
            background: valeur === it.cle ? C.panneau2 : "transparent",
            border: `1px solid ${valeur === it.cle ? C.ambre : C.bord2}`,
            color: valeur === it.cle ? C.ambre : C.texte2,
            fontWeight: 600,
            fontSize: 13,
            padding: "7px 14px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {it.label}
          {it.compte !== undefined && (
            <span style={{ color: C.texte3, fontWeight: 500 }}> · {it.compte}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Entete({ titre, sous }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontFamily: C.titre, fontSize: 40, fontWeight: 800, margin: 0, letterSpacing: 0.5 }}>
        {titre}
      </h1>
      {sous && <p style={{ color: C.texte3, fontSize: 13.5, margin: "6px 0 0", maxWidth: "70ch" }}>{sous}</p>}
    </div>
  );
}

export function Alerte({ children, ton = "rouge" }) {
  if (!children) return null;
  const c = ton === "rouge" ? C.rouge : ton === "vert" ? C.vert : C.ambre;
  return (
    <div
      style={{
        background: `${c}14`,
        border: `1px solid ${c}44`,
        color: c,
        borderRadius: 8,
        padding: "10px 13px",
        fontSize: 13,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

/** Bouton de suppression qui demande confirmation en deux temps. */
export function BoutonSupprimer({ onConfirm, libelle = "Supprimer", petit = true }) {
  const [arme, setArme] = React.useState(false);
  React.useEffect(() => {
    if (!arme) return;
    const t = setTimeout(() => setArme(false), 4000);
    return () => clearTimeout(t);
  }, [arme]);
  return (
    <Bouton
      ton="danger"
      petit={petit}
      onClick={() => (arme ? (setArme(false), onConfirm()) : setArme(true))}
    >
      {arme ? "Confirmer ?" : libelle}
    </Bouton>
  );
}


export const argent = (n) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(Number(n) || 0)) + " $";

export const dureeDepuisMinutes = (m) => {
  const min = Math.max(0, Math.round(Number(m) || 0));
  const h = Math.floor(min / 60);
  const r = min % 60;
  if (!h) return `${r} min`;
  return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`;
};

export const dateCourte = (d) => {
  if (!d) return "—";
  const dt = new Date(String(d).replace(" ", "T"));
  return isNaN(dt) ? String(d) : dt.toLocaleDateString("fr-FR");
};

/**
 * Copie un texte dans le presse-papiers. navigator.clipboard n existe que sur
 * les pages sécurisées (localhost ou https) : on garde une méthode de secours
 * par zone de texte cachée, pour que le copier-coller marche partout, y
 * compris si le site est ouvert depuis une autre machine du réseau.
 */
export async function copierTexte(texte) {
  const valeur = String(texte ?? "");
  if (!valeur) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(valeur);
      return true;
    }
  } catch {
    /* refus du navigateur : on tente la méthode de secours */
  }
  try {
    const zone = document.createElement("textarea");
    zone.value = valeur;
    zone.setAttribute("readonly", "");
    zone.style.position = "fixed";
    zone.style.top = "-1000px";
    zone.style.opacity = "0";
    document.body.appendChild(zone);
    zone.select();
    zone.setSelectionRange(0, valeur.length);
    const fait = document.execCommand("copy");
    document.body.removeChild(zone);
    return fait;
  } catch {
    return false;
  }
}

/** Bouton « Copier » avec retour visuel, et repli explicite si le navigateur refuse. */
export function BoutonCopier({ texte, libelle = "Copier", petit = true, ton = "fantome", style }) {
  const [etat, setEtat] = React.useState("");
  React.useEffect(() => {
    if (!etat) return;
    const t = setTimeout(() => setEtat(""), 2200);
    return () => clearTimeout(t);
  }, [etat]);
  return (
    <Bouton
      ton={etat === "echec" ? "danger" : ton}
      petit={petit}
      style={style}
      onClick={async () => setEtat((await copierTexte(texte)) ? "ok" : "echec")}
    >
      {etat === "ok" ? "Copié ✓" : etat === "echec" ? "Copie refusée" : libelle}
    </Bouton>
  );
}