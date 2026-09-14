import React, { useEffect, useMemo, useState } from "react";
import api from "./api.js";
import {
  C, u, Bouton, Champ, Etiquette, Alerte, Onglets, Entete, BoutonSupprimer,
  BoutonCopier, dateCourte,
} from "./ui.jsx";

const GRADES = ["Vendeur/Vendeuse", "Manager", "Co-patron", "Patron"];

const peutGerer = (grade) => ["Co-patron", "Patron"].includes(grade);
const peutModifier = (grade) => ["Manager", "Co-patron", "Patron"].includes(grade);

/** Repère les {{variables}} d'un corps de modèle. */
function trousDe(corps) {
  const out = new Set();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(corps || ""))) out.add(m[1]);
  return [...out];
}

function rendre(corps, valeurs) {
  return String(corps || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_t, cle) => {
    const v = valeurs[cle];
    return v === undefined || v === null || v === "" ? "____" : String(v);
  });
}

// ===========================================================================
// Écran principal
// ===========================================================================
export default function Contrats({ moi, isMobile }) {
  const [vue, setVue] = useState("emis");
  const [vuChoisie, setVuChoisie] = useState(false);
  const [modeles, setModeles] = useState([]);
  const [emis, setEmis] = useState([]);
  const [variables, setVariables] = useState([]);
  const [erreur, setErreur] = useState("");
  const [ouvert, setOuvert] = useState(null);

  async function recharger() {
    try {
      const [m, c, v] = await Promise.all([
        api.modelesContrat(),
        api.contrats(),
        api.variablesContrat(),
      ]);
      setModeles(m);
      setEmis(c);
      // Rien d'émis encore : on montre directement les modèles, sinon l'écran
      // paraît vide alors que les contrats de vente et de rachat existent.
      if (!vuChoisie && c.length === 0 && m.length > 0) setVue("modeles");
      setVariables(v.variables || []);
      setErreur("");
    } catch (err) {
      setErreur(err.message);
    }
  }

  useEffect(() => { recharger(); }, []);

  const categories = useMemo(() => {
    const set = new Set(modeles.map((m) => m.categorie));
    emis.forEach((c) => set.add(c.categorie));
    return [...set].filter(Boolean).sort();
  }, [modeles, emis]);

  return (
    <section>
      <Entete
        titre="Contrats"
        sous="Les contrats émis lors des ventes et des rachats, et les modèles qui servent à les générer."
      />
      <Alerte>{erreur}</Alerte>

      <Onglets
        valeur={vue}
        onChange={(v) => { setVuChoisie(true); setVue(v); }}
        items={[
          { cle: "emis", label: "Contrats émis", compte: emis.length },
          { cle: "modeles", label: "Modèles", compte: modeles.length },
        ]}
      />

      {vue === "emis" ? (
        <ContratsEmis
          contrats={emis}
          categories={categories}
          moi={moi}
          isMobile={isMobile}
          onOuvrir={setOuvert}
          onSupprimer={async (id) => {
            try { await api.supprimerContrat(id); recharger(); }
            catch (e) { setErreur(e.message); }
          }}
        />
      ) : (
        <Modeles
          modeles={modeles}
          variables={variables}
          moi={moi}
          isMobile={isMobile}
          onChange={recharger}
          onErreur={setErreur}
        />
      )}

      {ouvert && (
        <LecteurContrat
          contrat={ouvert}
          moi={moi}
          isMobile={isMobile}
          onFermer={() => setOuvert(null)}
          onEnregistre={() => { setOuvert(null); recharger(); }}
        />
      )}
    </section>
  );
}

// ===========================================================================
// Liste des contrats émis
// ===========================================================================
function ContratsEmis({ contrats, categories, moi, isMobile, onOuvrir, onSupprimer }) {
  const [filtre, setFiltre] = useState("Tous");
  const liste = filtre === "Tous" ? contrats : contrats.filter((c) => c.categorie === filtre);

  return (
    <>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {["Tous", ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setFiltre(cat)}
            style={{
              background: filtre === cat ? C.ambre : "transparent",
              border: `1px solid ${filtre === cat ? C.ambre : C.bord2}`,
              color: filtre === cat ? "#14161A" : C.texte2,
              fontWeight: filtre === cat ? 700 : 600,
              fontSize: 12,
              padding: "6px 13px",
              borderRadius: 20,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {liste.length === 0 ? (
        <div style={u.vide}>
          Aucun contrat dans cette catégorie.
          <div style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.6 }}>
            Un contrat est créé automatiquement à chaque vente et à chaque
            rachat, déjà rempli avec le client, le véhicule, le prix et le
            vendeur. Tu le retrouves ici et dans la fiche du véhicule, onglet
            « Contrat » de Ventes réalisées.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {liste.map((c) => (
            <div key={c.id} style={u.ligne}>
              <div style={{ minWidth: 130 }}>
                <div style={{ ...u.code, letterSpacing: 1, fontSize: 13 }}>{c.numero}</div>
                <div style={{ fontSize: 11, color: C.texte3, marginTop: 2 }}>{dateCourte(c.cree_le)}</div>
              </div>
              <Etiquette ton={c.categorie === "achat" ? "bleu" : "ambre"}>{c.categorie}</Etiquette>
              <div style={{ flex: 1, minWidth: 160, fontSize: 13.5 }}>
                {c.valeurs?.vehicule || "—"}
                <span style={{ color: C.texte3 }}>
                  {" · "}
                  {c.valeurs?.client_prenom} {c.valeurs?.client_nom}
                  {c.valeurs?.client_classe ? ` (${c.valeurs.client_classe})` : ""}
                </span>
              </div>
              <div style={{ fontWeight: 700, color: C.ambre, fontSize: 14 }}>{c.valeurs?.prix || ""}</div>
              <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                <Bouton ton="fantome" petit onClick={() => onOuvrir(c)}>Ouvrir</Bouton>
                <BoutonCopier texte={c.texte} />
                {["Co-patron", "Patron"].includes(moi?.grade) && (
                  <BoutonSupprimer onConfirm={() => onSupprimer(c.id)} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ===========================================================================
// Lecteur / éditeur d'un contrat émis
// ===========================================================================
export function LecteurContrat({ contrat, moi, isMobile, onFermer, onEnregistre }) {
  const [texte, setTexte] = useState(contrat.texte || "");
  const [edition, setEdition] = useState(false);
  const [erreur, setErreur] = useState("");

  async function enregistrer() {
    try {
      await api.majContrat(contrat.id, { texte });
      onEnregistre?.();
    } catch (e) {
      setErreur(e.message);
    }
  }


  return (
    <div
      onClick={onFermer}
      style={{
        position: "fixed", inset: 0, background: "rgba(8,9,11,.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: isMobile ? 12 : 28, zIndex: 60,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...u.carte, width: "100%", maxWidth: 680, maxHeight: "90vh",
          overflowY: "auto", padding: isMobile ? 18 : 26,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
          <h2 style={{ ...u.titreCarte, margin: 0 }}>{contrat.numero}</h2>
          <Etiquette ton={contrat.categorie === "achat" ? "bleu" : "ambre"}>{contrat.categorie}</Etiquette>
          <Bouton ton="fantome" petit onClick={onFermer} style={{ marginLeft: "auto" }}>Fermer</Bouton>
        </div>
        <p style={u.aide}>
          Émis le {dateCourte(contrat.cree_le)} par {contrat.cree_par || "—"}.
        </p>

        <Alerte>{erreur}</Alerte>

        {edition ? (
          <textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            rows={18}
            style={u.zone}
          />
        ) : (
          <pre
            style={{
              ...u.zone,
              whiteSpace: "pre-wrap",
              margin: 0,
              minHeight: 200,
              color: C.texte,
            }}
          >
            {texte}
          </pre>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <BoutonCopier texte={texte} libelle="Copier le contrat" ton="principal" petit={false} />
          {peutModifier(moi?.grade) &&
            (edition ? (
              <>
                <Bouton ton="fantome" onClick={enregistrer}>Enregistrer</Bouton>
                <Bouton ton="fantome" onClick={() => { setTexte(contrat.texte); setEdition(false); }}>
                  Annuler
                </Bouton>
              </>
            ) : (
              <Bouton ton="fantome" onClick={() => setEdition(true)}>Modifier le texte</Bouton>
            ))}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Modèles de contrat
// ===========================================================================

/** Aperçu repliable du texte d'un modèle, pour le lire sans ouvrir l'éditeur. */
function ApercuModele({ corps }) {
  const [ouvert, setOuvert] = useState(false);
  const texte = String(corps || "").trim();
  if (!texte) return null;
  const lignes = texte.split("\n");
  const apercu = ouvert ? texte : lignes.slice(0, 4).join("\n");

  return (
    <div style={{ width: "100%" }}>
      <pre
        style={{
          ...u.zone,
          whiteSpace: "pre-wrap",
          margin: "4px 0 0",
          fontSize: 11.5,
          lineHeight: 1.55,
          color: C.texte2,
          maxHeight: ouvert ? 420 : 92,
          overflowY: ouvert ? "auto" : "hidden",
        }}
      >
        {apercu}
        {!ouvert && lignes.length > 4 ? "\n…" : ""}
      </pre>
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
        {lignes.length > 4 && (
          <Bouton ton="fantome" petit onClick={() => setOuvert((v) => !v)}>
            {ouvert ? "Replier" : "Voir tout le texte"}
          </Bouton>
        )}
        <BoutonCopier texte={texte} libelle="Copier le modèle" />
      </div>
    </div>
  );
}

function Modeles({ modeles, variables, moi, isMobile, onChange, onErreur }) {
  const vide = { nom: "", categorie: "vente", corps: "", aTrous: true, visiblePar: [] };
  const [form, setForm] = useState(vide);
  const [editionId, setEditionId] = useState(null);

  const gestion = peutGerer(moi?.grade);
  const trous = trousDe(form.corps);

  function charger(m) {
    setEditionId(m.id);
    setForm({
      nom: m.nom,
      categorie: m.categorie,
      corps: m.corps,
      aTrous: !!m.a_trous,
      visiblePar: (m.visible_par || "").split(",").map((s) => s.trim()).filter(Boolean),
    });
  }

  async function enregistrer(e) {
    e.preventDefault();
    if (!form.nom.trim()) { onErreur("Donne un nom au modèle."); return; }
    try {
      if (editionId) await api.majModeleContrat(editionId, form);
      else await api.creerModeleContrat(form);
      setForm(vide);
      setEditionId(null);
      onChange();
    } catch (err) {
      onErreur(err.message);
    }
  }

  async function supprimer(id) {
    try { await api.supprimerModeleContrat(id); onChange(); }
    catch (err) { onErreur(err.message); }
  }

  function inserer(v) {
    setForm((f) => ({ ...f, corps: f.corps + `{{${v}}}` }));
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile || !gestion ? "1fr" : "1fr 1fr",
        gap: 18,
        alignItems: "start",
      }}
    >
      {/* liste */}
      <div style={u.carte}>
        <h2 style={u.titreCarte}>Modèles existants</h2>
        <p style={u.aide}>
          Un modèle sert à générer un contrat. Ceux « à trous » se remplissent
          automatiquement avec les informations de la vente.
        </p>
        {modeles.length === 0 ? (
          <div style={u.vide}>Aucun modèle.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {modeles.map((m) => (
              <div key={m.id} style={{ ...u.ligne, alignItems: "flex-start", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 14.5 }}>{m.nom}</strong>
                  <Etiquette ton={m.categorie === "achat" ? "bleu" : "ambre"}>{m.categorie}</Etiquette>
                  <Etiquette ton={m.a_trous ? "vert" : "gris"}>
                    {m.a_trous ? `${(m.trous || []).length} trou${(m.trous || []).length > 1 ? "s" : ""}` : "texte fixe"}
                  </Etiquette>
                  {gestion && (
                    <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                      <Bouton ton="fantome" petit onClick={() => charger(m)}>Modifier</Bouton>
                      <BoutonSupprimer onConfirm={() => supprimer(m.id)} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: C.texte3 }}>
                  Visible par : {m.visible_par ? m.visible_par : "tous les employés connectés"}
                </div>
                <ApercuModele corps={m.corps} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* éditeur */}
      {gestion && (
        <form onSubmit={enregistrer} style={u.carte}>
          <h2 style={u.titreCarte}>{editionId ? "Modifier le modèle" : "Nouveau modèle"}</h2>
          <p style={u.aide}>
            Écris le texte du contrat. Pour un trou, insère une variable : elle sera
            remplacée automatiquement au moment de l'émission.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Champ
              label="Nom du modèle"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Contrat de vente"
            />
            <Champ
              label="Catégorie"
              value={form.categorie}
              onChange={(e) => setForm({ ...form, categorie: e.target.value })}
              placeholder="vente, achat, location…"
            />

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.texte2 }}>
              <input
                type="checkbox"
                checked={form.aTrous}
                onChange={(e) => setForm({ ...form, aTrous: e.target.checked })}
              />
              Modèle à trous (décoché = texte fixe, sans remplissage)
            </label>

            <div>
              <span style={u.label}>Visible par</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {GRADES.map((g) => {
                  const actif = form.visiblePar.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          visiblePar: actif
                            ? form.visiblePar.filter((x) => x !== g)
                            : [...form.visiblePar, g],
                        })
                      }
                      style={{
                        background: actif ? C.ambre : "transparent",
                        border: `1px solid ${actif ? C.ambre : C.bord2}`,
                        color: actif ? "#14161A" : C.texte2,
                        fontSize: 11.5, fontWeight: 600, padding: "5px 10px",
                        borderRadius: 20, cursor: "pointer",
                      }}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
              <p style={{ ...u.aide, margin: "6px 0 0" }}>
                Aucun grade sélectionné = visible par tous les employés connectés.
              </p>
            </div>

            {form.aTrous && (
              <div>
                <span style={u.label}>Variables disponibles — clique pour insérer</span>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {variables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => inserer(v)}
                      style={{
                        background: "transparent", border: `1px solid ${C.bord2}`,
                        color: trous.includes(v) ? C.vert : C.texte3,
                        fontFamily: "ui-monospace, monospace", fontSize: 11,
                        padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Champ label="Texte du contrat">
              <textarea
                value={form.corps}
                onChange={(e) => setForm({ ...form, corps: e.target.value })}
                rows={12}
                style={u.zone}
                placeholder={"CONTRAT DE VENTE — {{numero}}\n\nEntre {{entreprise}}…"}
              />
            </Champ>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <Bouton type="submit">{editionId ? "Enregistrer" : "Créer le modèle"}</Bouton>
            {editionId && (
              <Bouton ton="fantome" onClick={() => { setForm(vide); setEditionId(null); }}>
                Annuler
              </Bouton>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

// ===========================================================================
// Panneau d'émission, ouvert depuis une vente
// ===========================================================================
export function EmettreContrat({ mouvement, moi, isMobile, onFermer, onEmis }) {
  const [modeles, setModeles] = useState([]);
  const [modeleId, setModeleId] = useState(null);
  const [valeurs, setValeurs] = useState({});
  const [erreur, setErreur] = useState("");
  const [resultat, setResultat] = useState(null);

  useEffect(() => {
    api.modelesContrat()
      .then((m) => {
        const pertinents = m.filter((x) => x.categorie === (mouvement.type || "vente"));
        const liste = pertinents.length ? pertinents : m;
        setModeles(liste);
        if (liste[0]) setModeleId(liste[0].id);
      })
      .catch((e) => setErreur(e.message));
  }, [mouvement]);

  const modele = modeles.find((m) => m.id === modeleId);
  const trous = modele ? trousDe(modele.corps) : [];

  // Ce que le serveur remplira tout seul depuis le mouvement.
  const auto = {
    numero: "(généré)",
    date: dateCourte(mouvement.date),
    entreprise: "(paramètres)",
    vehicule: mouvement.modele,
    genre: mouvement.genre,
    prix: mouvement.prix_final,
    client_nom: mouvement.client_nom,
    client_prenom: mouvement.client_prenom,
    client_classe: mouvement.client_classe,
    vendeur_nom: mouvement.vendeur_nom,
    vendeur_prenom: mouvement.vendeur_prenom,
  };
  const manquants = trous.filter((t) => !auto[t] && auto[t] !== 0);

  async function emettre() {
    try {
      const c = await api.emettreContrat({
        modeleId,
        mouvementId: mouvement.id,
        valeurs,
      });
      setResultat(c);
      onEmis?.();
    } catch (e) {
      setErreur(e.message);
    }
  }

  if (resultat) {
    return (
      <LecteurContrat
        contrat={resultat}
        moi={moi}
        isMobile={isMobile}
        onFermer={onFermer}
        onEnregistre={onFermer}
      />
    );
  }

  return (
    <div
      onClick={onFermer}
      style={{
        position: "fixed", inset: 0, background: "rgba(8,9,11,.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: isMobile ? 12 : 28, zIndex: 60,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...u.carte, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ ...u.titreCarte, margin: 0 }}>Émettre un contrat</h2>
          <Bouton ton="fantome" petit onClick={onFermer} style={{ marginLeft: "auto" }}>Fermer</Bouton>
        </div>
        <p style={u.aide}>
          {mouvement.modele} — {mouvement.client_prenom} {mouvement.client_nom}
          {mouvement.client_classe ? ` (classe ${mouvement.client_classe})` : ""}
        </p>

        <Alerte>{erreur}</Alerte>

        <Champ label="Modèle">
          <select
            value={modeleId || ""}
            onChange={(e) => setModeleId(Number(e.target.value))}
            style={u.champ}
          >
            {modeles.map((m) => (
              <option key={m.id} value={m.id}>{m.nom} ({m.categorie})</option>
            ))}
          </select>
        </Champ>

        {modele && (
          <>
            <div style={{ marginTop: 14 }}>
              <span style={u.label}>Rempli automatiquement</span>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {trous.filter((t) => auto[t] || auto[t] === 0).map((t) => (
                  <Etiquette key={t} ton="vert">{t}</Etiquette>
                ))}
                {trous.length === 0 && <span style={{ fontSize: 12.5, color: C.texte3 }}>Texte fixe, rien à remplir.</span>}
              </div>
            </div>

            {manquants.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={u.label}>À compléter à la main</span>
                {manquants.map((t) => (
                  <Champ
                    key={t}
                    label={t}
                    value={valeurs[t] || ""}
                    onChange={(e) => setValeurs({ ...valeurs, [t]: e.target.value })}
                  />
                ))}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <span style={u.label}>Aperçu</span>
              <pre style={{ ...u.zone, whiteSpace: "pre-wrap", maxHeight: 220, overflowY: "auto", margin: 0 }}>
                {rendre(modele.corps, { ...auto, ...valeurs })}
              </pre>
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <Bouton onClick={emettre} disabled={!modeleId}>Émettre le contrat</Bouton>
          <Bouton ton="fantome" onClick={onFermer}>Annuler</Bouton>
        </div>
      </div>
    </div>
  );
}
