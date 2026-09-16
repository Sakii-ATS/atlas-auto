// ===========================================================================
// Client de l'API Vapid Auto.
// Le jeton de session est gardé dans le navigateur : on reste connecté
// après un rafraîchissement de la page.
// ===========================================================================

// Par défaut on tape "/api" sur la même origine que le site : le serveur de
// développement Vite fait suivre vers le backend (voir vite.config.js).
// En production, définis VITE_API avec l'adresse complète de l'API.
const BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API) || "/api";

const CLE_TOKEN = "atlas-token";

let token = null;
try {
  token = localStorage.getItem(CLE_TOKEN);
} catch {
  token = null;
}

export function getToken() {
  return token;
}

function setToken(valeur) {
  token = valeur;
  try {
    if (valeur) localStorage.setItem(CLE_TOKEN, valeur);
    else localStorage.removeItem(CLE_TOKEN);
  } catch {
    /* stockage indisponible : on garde le jeton en mémoire */
  }
}

/** Erreur portant le code HTTP, pour distinguer un 401 d'une vraie panne. */
export class ErreurApi extends Error {
  constructor(message, statut) {
    super(message);
    this.statut = statut;
  }
}

async function appel(chemin, { methode = "GET", corps } = {}) {
  let reponse;
  try {
    reponse = await fetch(BASE + chemin, {
      method: methode,
      headers: {
        ...(corps ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corps ? JSON.stringify(corps) : undefined,
    });
  } catch {
    throw new ErreurApi(
      "Le serveur ne répond pas. Vérifie que l'API est lancée.",
      0,
    );
  }

  if (reponse.status === 204) return null;

  let donnees = null;
  try {
    donnees = await reponse.json();
  } catch {
    donnees = null;
  }

  // Une réponse qui n'est pas du JSON alors qu'on attendait l'API veut dire
  // qu'on ne parle pas à l'API du tout : l'hébergeur du site a répondu à sa
  // place. Typiquement un 405 ou un 404 renvoyé par Cloudflare Pages quand
  // VITE_API n'est pas renseignée et que /api ne pointe sur rien.
  if (donnees === null && [404, 405, 501].includes(reponse.status)) {
    throw new ErreurApi(
      "L'API n'est pas reliée à ce site. Elle doit tourner quelque part et " +
        "son adresse être renseignée dans VITE_API au moment du build.",
      reponse.status,
    );
  }

  if (!reponse.ok) {
    if (reponse.status === 401) setToken(null);
    throw new ErreurApi(
      donnees?.erreur || `Erreur ${reponse.status}.`,
      reponse.status,
    );
  }
  return donnees;
}

const get = (c) => appel(c);
const post = (c, corps) => appel(c, { methode: "POST", corps });
const patch = (c, corps) => appel(c, { methode: "PATCH", corps });
const put = (c, corps) => appel(c, { methode: "PUT", corps });
const del = (c) => appel(c, { methode: "DELETE" });

// ------------------------------------------------------------------- auth
export const api = {
  estConnecte: () => !!token,

  async connexion({ nom, prenom, code }) {
    const r = await post("/auth/login", { nom, prenom, code });
    setToken(r.token);
    return r.employe;
  },

  async deconnexion() {
    try {
      await post("/auth/logout");
    } catch {
      /* peu importe si le serveur a déjà oublié la session */
    }
    setToken(null);
  },

  moi: () => get("/auth/moi"),

  // -------------------------------------------------------------- employés
  employes: () => get("/employes"),
  creerEmploye: (e) => post("/employes", e),
  majEmploye: (id, e) => patch(`/employes/${id}`, e),
  regenererCode: (id) => post(`/employes/${id}/code`),
  supprimerEmploye: (id) => del(`/employes/${id}`),
  connexions: () => get("/connexions"),

  // ---------------------------------------------------------------- heures
  heures: () => get("/heures"),
  ajouterHeures: (h) => post("/heures", h),
  supprimerHeures: (id) => del(`/heures/${id}`),
  salaires: (debut, fin) => {
    const q = new URLSearchParams();
    if (debut) q.set("debut", debut);
    if (fin) q.set("fin", fin);
    const s = q.toString();
    return get("/salaires" + (s ? `?${s}` : ""));
  },

  // ---------------------------------------------------------------- compta
  compta: (debut, fin) => {
    const q = new URLSearchParams();
    if (debut) q.set("debut", debut);
    if (fin) q.set("fin", fin);
    const s = q.toString();
    return get("/compta" + (s ? `?${s}` : ""));
  },

  tresorerie: () => get("/tresorerie"),
  ventesManuelles: () => get("/compta/ventes"),
  ajouterVenteManuelle: (v) => post("/compta/ventes", v),
  supprimerVenteManuelle: (id) => del(`/compta/ventes/${id}`),
  archivesCompta: () => get("/compta/archives"),
  archiveCompta: (id) => get(`/compta/archives/${id}`),
  archiverCompta: (a) => post("/compta/archives", a),
  supprimerArchiveCompta: (id) => del(`/compta/archives/${id}`),

  // -------------------------------------------------------------- dépenses
  depenses: () => get("/depenses"),
  ajouterDepense: (d) => post("/depenses", d),
  majDepense: (id, d) => patch(`/depenses/${id}`, d),
  supprimerDepense: (id) => del(`/depenses/${id}`),

  // ------------------------------------------------------------ dividendes
  dividendes: () => get("/dividendes"),
  ajouterDividende: (d) => post("/dividendes", d),
  supprimerDividende: (id) => del(`/dividendes/${id}`),

  // ------------------------------------------------------- catalogue/genres
  catalogue: () => get("/catalogue"),
  ajouterModele: (m) => post("/catalogue", m),
  remplacerCatalogue: (lignes) => put("/catalogue", lignes),
  majModele: (id, m) => patch(`/catalogue/${id}`, m),
  supprimerModele: (id) => del(`/catalogue/${id}`),

  genres: () => get("/genres"),
  ajouterGenre: (nom) => post("/genres", { nom }),
  supprimerGenre: (id) => del(`/genres/${id}`),

  // ---------------------------------------------------------------- images
  /**
   * Réduit la photo dans le navigateur puis l envoie. On ne transmet jamais
   * l original : une photo d appareil fait plusieurs méga-octets, réduite à
   * 1280 pixels de large elle en fait cent fois moins, et à l écran ça ne se
   * voit pas. Les GIF passent tels quels, pour garder l animation.
   * Renvoie { url } — c est ce qu on met dans le champ image du véhicule.
   */
  async televerserImage(fichier) {
    const reduire = async () => {
      if (fichier.type === "image/gif") return { blob: fichier, type: fichier.type };
      try {
        const image = await createImageBitmap(fichier);
        const ratio = Math.min(1, 1280 / image.width);
        const largeur = Math.round(image.width * ratio);
        const hauteur = Math.round(image.height * ratio);
        const toile = document.createElement("canvas");
        toile.width = largeur;
        toile.height = hauteur;
        toile.getContext("2d").drawImage(image, 0, 0, largeur, hauteur);
        const blob = await new Promise((r) => toile.toBlob(r, "image/jpeg", 0.82));
        return blob ? { blob, type: "image/jpeg" } : { blob: fichier, type: fichier.type };
      } catch {
        return { blob: fichier, type: fichier.type };
      }
    };

    const { blob, type } = await reduire();
    const donnees = await new Promise((res, rej) => {
      const lecteur = new FileReader();
      lecteur.onload = () => res(String(lecteur.result).split(",")[1] || "");
      lecteur.onerror = () => rej(new ErreurApi("Lecture du fichier impossible.", 0));
      lecteur.readAsDataURL(blob);
    });

    return post("/images", { type, donnees });
  },

  photos: () => get("/images"),
  supprimerPhoto: (cle) => del(`/images/${cle}`),
  menagePhotos: () => post("/images/menage"),
  // ------------------------------------------------------------- véhicules
  vitrine: () => get("/vitrine"),
  vehicules: () => get("/vehicules"),
  creerVehicule: (v) => post("/vehicules", v),
  majVehicule: (id, v) => patch(`/vehicules/${id}`, v),
  supprimerVehicule: (id) => del(`/vehicules/${id}`),

  // ------------------------------------------------------------ mouvements
  mouvements: (type) => get("/mouvements" + (type ? `?type=${type}` : "")),
  creerMouvement: (m) => post("/mouvements", m),
  supprimerMouvement: (id) => del(`/mouvements/${id}`),

  // -------------------------------------------------------------- contrats
  variablesContrat: () => get("/contrats/variables"),
  modelesContrat: () => get("/contrats/modeles"),
  creerModeleContrat: (m) => post("/contrats/modeles", m),
  majModeleContrat: (id, m) => patch(`/contrats/modeles/${id}`, m),
  supprimerModeleContrat: (id) => del(`/contrats/modeles/${id}`),

  contrats: (mouvementId) =>
    get("/contrats" + (mouvementId ? `?mouvementId=${mouvementId}` : "")),
  emettreContrat: (c) => post("/contrats", c),
  majContrat: (id, c) => patch(`/contrats/${id}`, c),
  supprimerContrat: (id) => del(`/contrats/${id}`),

  // ------------------------------------------------------------ paramètres
  parametres: () => get("/parametres"),
  majParametres: (p) => put("/parametres", p),
  majTranchesReduction: (t) => put("/tranches/reduction", t),
  majTranchesMarge: (t) => put("/tranches/marge", t),
};

export default api;
