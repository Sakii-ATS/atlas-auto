import React, { useState, useEffect, useMemo, useCallback } from "react";
import api from "./api.js";
import Connexion from "./Connexion.jsx";
import Employes from "./Employes.jsx";
import Photos from "./Photos.jsx";
import Contrats from "./Contrats.jsx";
import Salaires from "./Salaires.jsx";
import Depenses from "./Depenses.jsx";
import Compta from "./Compta.jsx";
import VentesRealiseesApi from "./VentesRealisees.jsx";

/* Convertit une ligne de l'API vers la forme attendue par les composants
   existants : "type" = Occasion/Import, "categorie" = genre. */
const depuisApi = (v) => ({
  id: v.id,
  nom: v.modele,
  type: v.categorie,
  categorie: v.genre,
  classe: v.classe || "",
  image: v.image,
  description: v.description,
  prixBase: v.prix_base ?? v.prix_vente ?? 0,
  reduction: v.reduction ?? 0,
  marge: v.marge ?? 0,
  prixAchat: v.prix_achat ?? 0,
  prixVente: v.prix_vente ?? 0,
  achatPar: v.achete_par || "",
  statut: v.statut === "vendu" ? "Vendu" : "En stock",
});

/* ------------------------------------------------------------------
   PROTOTYPE — Site concession GTA RP
   Rôles simulés: Visiteur, Employé, Manager, Co-patron, Patron
   (dans la vraie version, le rôle vient du grade Discord du joueur)
------------------------------------------------------------------- */

const FONT_LINK_ID = "concession-fonts";
const MOBILE_BREAKPOINT = 760;
const TOUTES = "Toutes";
// Mets à true pendant que le bot Discord n'est pas branché, pour pouvoir
// tester les différents grades. Repasse à false (ou supprime le composant)
// une fois la vraie connexion Discord en place.
// Rôle utilisé quand la simulation est désactivée (avant la vraie connexion Discord).
const ROLE_PAR_DEFAUT = "Visiteur";
// Remplace par l'URL de ton logo une fois hébergé (ex : sur Discord, Imgur, etc.)
const LOGO_URL = "data:image/png;base64,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xrsfn3TuLzNf2DZfaKNRp1/ywaxPM3+5VCo1aezIyy+cnMmEwyf+eMuro7YpaW9BYWHBYYf0P3HUwSMH79u0qHCbz//PouW/vOauB554rc6vCI1PzjPDpwgBkqWysmrKc29Nee6tpkWFX9i310ED+uzRs+vu3Tt1KG1d0rxpYWHBunUVq8vWfTJv8YyP5z398rSX35yxoXrzTUeB3HIECwBobHKeGa7BAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIV5HoBAOykWrVo3n2XDl06tu3SsW2XjqVdO5Z26di2pHlxcdOi4qaFG/+3adOiVE1NecX6deXry9dXllesL6+oXL1m3YLFyxcsXvGfxcsXLl7xn8XL585fsra8Itf/QfC/BBYA9aRNq5J9+vTYt0+Pffr02Ldvj+5dO2znT2xR0KxFSbM0T6iurpk1d+G0D+a898GcaR/Mef/DuWVryyOWDHUksEiQi75+0tcmHb1DP+WEMy97d8bs7Cyn7gbsvfu91/0w16uo1Zcu+P1zr7wXNe37544/d/IxUdPS6z387KoN1Rv//5fGH3bpdyfWz+s2Aq++/cGE836dk5fOy8vbb6/dDjuk/+FD+u+9Z/csvUp+fl7vnl169+wybtTBqVRqQ3X12+/Neuqld555adqMmfOz9KKQhsAiKQoLC04ZPWRHf9akcSPe/cXsLCwHyEheXt7QA/uNOXLQoYP7t2vbsp5fvUl+/sD+vQf27/39r43/z6LlT7/07j2PvfzWezPreRnszAQWSXHsoV8obbPDfwqfcMRBl19956o1a7OxJKAOSlu3OHn00IljR/TYZXvPAGZV106l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LACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAgiUisG4+uyzXSwAAGokkdEXOAuuM60py9dIAwE4iV72RiCNYAACNSVICKwlH8wCAhi4hRZHLwHKWEADInhyWRlKOYKUSk5wAQAOVnJbIcWBtlpbJ+b4AAA3LZhWR2xNluT+CpbEAgAwlqq5SSQislMYCADKQtLpKpVJ5bXqPyPUa/seWXZWEbxAAkFiJjYcEBVaq9mNXCflmAQBJkPxgSFZgpZwfBADqJDl1lUrINVifl6jvDgDQICStHxJ3BGsTh7IAgG1KWlptlNzA2kRpAQCbSWZXbdIAAgsAoGFJ3DVYAAANncACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAgmsAAAggksAIBgAgsAIJjAAgAIJrAAAIIJLACAYAILACCYwAIACCawAACCCSwAgGACCwAgmMACAAj2/wFE5Yk0RYvuewAAAABJRU5ErkJggg==";
const NOM_ENTREPRISE = "ATLAS AUTO";

// Simulation de ce que le bot Discord renverrait (membres du serveur + leur rôle).
// Dans la vraie version, cette liste vient de l'API Discord, pas d'ici.
// depuisMinutes simule "connecté depuis X minutes" (juste pour la démo).

function genererCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Formate une durée en ms en "Xh YYmin" ou "Y min" pour l'affichage du temps
// passé sur le site.
function formatDuree(ms) {
  const minutesTotal = Math.max(0, Math.floor(ms / 60000));
  if (minutesTotal < 1) return "à l'instant";
  const heures = Math.floor(minutesTotal / 60);
  const minutes = minutesTotal % 60;
  if (heures === 0) return `${minutes} min`;
  return `${heures}h ${String(minutes).padStart(2, "0")}min`;
}

function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

// Détection réelle de la largeur d'écran (fiable, pas juste du CSS déclaratif
// qui peut ne pas s'appliquer selon l'environnement de rendu).
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// Détecte le chemin de l'URL : /vitrine = vitrine publique uniquement,
// tout le reste (ex: /entreprise) = site complet avec connexion.
function useRoute() {
  const [path, setPath] = useState(
    typeof window !== "undefined" ? window.location.pathname : "/"
  );
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

const ROLES = ["Visiteur", "Vendeur/Vendeuse", "Manager", "Co-patron", "Patron"];
const CLASSES_CLIENT = ["A", "B", "C"];

// Classe des véhicules, comme au PDM en jeu : A est la plus haute. Un citoyen
// n achète que dans sa classe ou en dessous.
const RANG_CLASSE = { C: 1, B: 2, A: 3 };
const rangClasse = (c) => RANG_CLASSE[String(c || "").toUpperCase()] || 0;
const classeSuffit = (client, vehicule) => {
  const v = rangClasse(vehicule);
  const cl = rangClasse(client);
  return v === 0 || cl === 0 || cl >= v;
};
const TON_CLASSE = { A: "amber", B: "blue", C: "grey" };
const TYPES_VEHICULE = ["Occasion", "Import"];

const CAN_MANAGE_STOCK = ["Vendeur/Vendeuse", "Manager", "Co-patron", "Patron"];
const CAN_EDIT_VEHICLES = ["Vendeur/Vendeuse", "Manager", "Co-patron", "Patron"];
const CAN_SET_MARGES = ["Co-patron", "Patron"];
const CAN_MANAGE_CATALOGUE = ["Co-patron", "Patron"];
// Historique des ventes et rachats : les managers y ont accès.
const CAN_VIEW_SALES = ["Manager", "Co-patron", "Patron"];
// L'argent de l'entreprise (paie et dépenses) reste à la direction.
const CAN_VIEW_FINANCES = ["Co-patron", "Patron"];
// Seuls Manager/Co-patron/Patron voient le détail financier interne (réduction, marge)
// et la liste complète du stock avec ses prix — indépendant de qui peut enregistrer un rachat.
const CAN_VIEW_INTERNAL_PRICING = ["Manager", "Co-patron", "Patron"];
// Seuls Manager+ peuvent enregistrer un véhicule Import — les employés ne
// font que le rachat (Occasion).
const CAN_IMPORT_VEHICULES = ["Manager", "Co-patron", "Patron"];

const SEED_CATALOGUE = [
  { id: 1, nom: "Weevil", prixBase: 15000, genre: "Compacts" },
  { id: 2, nom: "Brioso 300", prixBase: 10000, genre: "Compacts" },
  { id: 3, nom: "Club", prixBase: 17500, genre: "Compacts" },
  { id: 4, nom: "Blista Kanjo", prixBase: 22500, genre: "Compacts" },
  { id: 5, nom: "Asbo", prixBase: 17500, genre: "Compacts" },
  { id: 6, nom: "Issi Classic", prixBase: 12500, genre: "Compacts" },
  { id: 7, nom: "Rhapsody", prixBase: 15000, genre: "Compacts" },
  { id: 8, nom: "Panto", prixBase: 7500, genre: "Compacts" },
  { id: 9, nom: "Prairie", prixBase: 16000, genre: "Compacts" },
  { id: 10, nom: "Dilettante", prixBase: 17500, genre: "Compacts" },
  { id: 11, nom: "Blista", prixBase: 15000, genre: "Compacts" },
  { id: 12, nom: "FR36", prixBase: 45000, genre: "Coupés" },
  { id: 13, nom: "Postlude", prixBase: 20000, genre: "Coupés" },
  { id: 14, nom: "Kanjo SJ", prixBase: 25000, genre: "Coupés" },
  { id: 15, nom: "Previon", prixBase: 30000, genre: "Coupés" },
  { id: 16, nom: "Zion Cabrio", prixBase: 37500, genre: "Coupés" },
  { id: 17, nom: "Zion", prixBase: 32500, genre: "Coupés" },
  { id: 18, nom: "Windsor Drop", prixBase: 85000, genre: "Coupés" },
  { id: 19, nom: "Sentinel XS", prixBase: 42500, genre: "Coupés" },
  { id: 20, nom: "Sentinel", prixBase: 47500, genre: "Coupés" },
  { id: 21, nom: "Oracle XS", prixBase: 35000, genre: "Coupés" },
  { id: 22, nom: "Oracle", prixBase: 32500, genre: "Coupés" },
  { id: 23, nom: "Jackal", prixBase: 30000, genre: "Coupés" },
  { id: 24, nom: "Felon GT", prixBase: 42500, genre: "Coupés" },
  { id: 25, nom: "Felon", prixBase: 37500, genre: "Coupés" },
  { id: 26, nom: "F620", prixBase: 37500, genre: "Coupés" },
  { id: 27, nom: "Exemplar", prixBase: 45000, genre: "Coupés" },
  { id: 28, nom: "Cognoscenti Cabrio", prixBase: 50000, genre: "Coupés" },
  { id: 29, nom: "Powersurge", prixBase: 60000, genre: "Motos" },
  { id: 30, nom: "Reever", prixBase: 65000, genre: "Motos" },
  { id: 31, nom: "Shinobi", prixBase: 82500, genre: "Motos" },
  { id: 32, nom: "Stryder", prixBase: 45000, genre: "Motos" },
  { id: 33, nom: "Sanchez", prixBase: 7500, genre: "Motos" },
  { id: 34, nom: "Zombie Chopper", prixBase: 32500, genre: "Motos" },
  { id: 35, nom: "Zombie Bobber", prixBase: 30000, genre: "Motos" },
  { id: 36, nom: "Wolfsbane", prixBase: 25000, genre: "Motos" },
  { id: 37, nom: "Vortex", prixBase: 42500, genre: "Motos" },
  { id: 38, nom: "Vindicator", prixBase: 40000, genre: "Motos" },
  { id: 39, nom: "Vader", prixBase: 20000, genre: "Motos" },
  { id: 40, nom: "Thrust", prixBase: 35000, genre: "Motos" },
  { id: 41, nom: "Sovereign", prixBase: 37500, genre: "Motos" },
  { id: 42, nom: "Ruffian", prixBase: 25000, genre: "Motos" },
  { id: 43, nom: "Rat Bike", prixBase: 20000, genre: "Motos" },
  { id: 44, nom: "PCJ 600", prixBase: 22500, genre: "Motos" },
  { id: 45, nom: "Nightblade", prixBase: 37500, genre: "Motos" },
  { id: 46, nom: "Nemesis", prixBase: 20000, genre: "Motos" },
  { id: 47, nom: "Manchez", prixBase: 25000, genre: "Motos" },
  { id: 48, nom: "Lectro", prixBase: 47500, genre: "Motos" },
  { id: 49, nom: "Innovation", prixBase: 32500, genre: "Motos" },
  { id: 50, nom: "Hexer", prixBase: 25000, genre: "Motos" },
  { id: 51, nom: "Hakuchou Drag", prixBase: 75000, genre: "Motos" },
  { id: 52, nom: "Hakuchou", prixBase: 55000, genre: "Motos" },
  { id: 53, nom: "Gargoyle", prixBase: 40000, genre: "Motos" },
  { id: 54, nom: "FCR 1000 Custom", prixBase: 45000, genre: "Motos" },
  { id: 55, nom: "FCR 1000", prixBase: 32500, genre: "Motos" },
  { id: 56, nom: "Faggio Sport", prixBase: 4500, genre: "Motos" },
  { id: 57, nom: "Faggio", prixBase: 3000, genre: "Motos" },
  { id: 58, nom: "Esskey", prixBase: 32500, genre: "Motos" },
  { id: 59, nom: "Enduro", prixBase: 20000, genre: "Motos" },
  { id: 60, nom: "Double-T", prixBase: 30000, genre: "Motos" },
  { id: 61, nom: "Diabolus Custom", prixBase: 42500, genre: "Motos" },
  { id: 62, nom: "Diabolus", prixBase: 32500, genre: "Motos" },
  { id: 63, nom: "Defiler", prixBase: 40000, genre: "Motos" },
  { id: 64, nom: "Daemon", prixBase: 30000, genre: "Motos" },
  { id: 65, nom: "Cliffhanger", prixBase: 35000, genre: "Motos" },
  { id: 66, nom: "Chimera", prixBase: 42500, genre: "Motos" },
  { id: 67, nom: "Carbon RS", prixBase: 35000, genre: "Motos" },
  { id: 68, nom: "BF400", prixBase: 27500, genre: "Motos" },
  { id: 69, nom: "Bati 801", prixBase: 32500, genre: "Motos" },
  { id: 70, nom: "Bagger", prixBase: 25000, genre: "Motos" },
  { id: 71, nom: "Avarus", prixBase: 30000, genre: "Motos" },
  { id: 72, nom: "Akuma", prixBase: 30000, genre: "Motos" },
  { id: 73, nom: "Sanctus", prixBase: 90000, genre: "Motos" },
  { id: 74, nom: "Brigham", prixBase: 52500, genre: "Muscle" },
  { id: 75, nom: "Buffalo EVX", prixBase: 102500, genre: "Muscle" },
  { id: 76, nom: "Clique Wagon", prixBase: 47500, genre: "Muscle" },
  { id: 77, nom: "Vigero ZX", prixBase: 87500, genre: "Muscle" },
  { id: 78, nom: "Ruiner ZZ-8", prixBase: 68750, genre: "Muscle" },
  { id: 79, nom: "Greenwood", prixBase: 47500, genre: "Muscle" },
  { id: 80, nom: "Buffalo STX", prixBase: 93750, genre: "Muscle" },
  { id: 81, nom: "Dominator GTT", prixBase: 56250, genre: "Muscle" },
  { id: 82, nom: "Dominator ASP", prixBase: 72500, genre: "Muscle" },
  { id: 83, nom: "Manana Custom", prixBase: 40000, genre: "Muscle" },
  { id: 84, nom: "Gauntlet Classic Custom", prixBase: 58750, genre: "Muscle" },
  { id: 85, nom: "Beater Dukes", prixBase: 21250, genre: "Muscle" },
  { id: 86, nom: "Drift Yosemite", prixBase: 68750, genre: "Muscle" },
  { id: 87, nom: "Peyote Gasser", prixBase: 52500, genre: "Muscle" },
  { id: 88, nom: "Gauntlet Hellfire", prixBase: 75000, genre: "Muscle" },
  { id: 89, nom: "Gauntlet Classic", prixBase: 43750, genre: "Muscle" },
  { id: 90, nom: "Vamos", prixBase: 37500, genre: "Muscle" },
  { id: 91, nom: "Deviant", prixBase: 50000, genre: "Muscle" },
  { id: 92, nom: "Tulip", prixBase: 40000, genre: "Muscle" },
  { id: 93, nom: "Clique", prixBase: 52500, genre: "Muscle" },
  { id: 94, nom: "Impaler", prixBase: 35000, genre: "Muscle" },
  { id: 95, nom: "Dominator GTX", prixBase: 56250, genre: "Muscle" },
  { id: 96, nom: "Ellie", prixBase: 47500, genre: "Muscle" },
  { id: 97, nom: "Sabre Turbo Custom", prixBase: 43750, genre: "Muscle" },
  { id: 98, nom: "Faction Custom", prixBase: 37500, genre: "Muscle" },
  { id: 99, nom: "Vigero", prixBase: 22500, genre: "Muscle" },
  { id: 100, nom: "Gauntlet", prixBase: 31250, genre: "Muscle" },
  { id: 101, nom: "Buccaneer", prixBase: 27500, genre: "Muscle" },
  { id: 102, nom: "Hustler", prixBase: 50000, genre: "Muscle" },
  { id: 103, nom: "Yosemite", prixBase: 37500, genre: "Muscle" },
  { id: 104, nom: "Hermes", prixBase: 43750, genre: "Muscle" },
  { id: 105, nom: "Voodoo Custom", prixBase: 35000, genre: "Muscle" },
  { id: 106, nom: "Voodoo", prixBase: 12500, genre: "Muscle" },
  { id: 107, nom: "Virgo Classic Custom", prixBase: 35000, genre: "Muscle" },
  { id: 108, nom: "Virgo Classic", prixBase: 22500, genre: "Muscle" },
  { id: 109, nom: "Virgo", prixBase: 25000, genre: "Muscle" },
  { id: 110, nom: "Tampa", prixBase: 30000, genre: "Muscle" },
  { id: 111, nom: "Stallion", prixBase: 27500, genre: "Muscle" },
  { id: 112, nom: "Slamvan", prixBase: 22500, genre: "Muscle" },
  { id: 113, nom: "Sabre Turbo", prixBase: 20000, genre: "Muscle" },
  { id: 114, nom: "Ruiner", prixBase: 27500, genre: "Muscle" },
  { id: 115, nom: "Pisswasser Dominator", prixBase: 37500, genre: "Muscle" },
  { id: 116, nom: "Picador", prixBase: 15000, genre: "Muscle" },
  { id: 117, nom: "Phoenix", prixBase: 25000, genre: "Muscle" },
  { id: 118, nom: "Nightshade", prixBase: 52500, genre: "Muscle" },
  { id: 119, nom: "Moonbeam Custom", prixBase: 35000, genre: "Muscle" },
  { id: 120, nom: "Moonbeam", prixBase: 18750, genre: "Muscle" },
  { id: 121, nom: "Lurcher", prixBase: 56250, genre: "Muscle" },
  { id: 122, nom: "Faction Custom Donk", prixBase: 50000, genre: "Muscle" },
  { id: 123, nom: "Faction", prixBase: 20000, genre: "Muscle" },
  { id: 124, nom: "Dukes", prixBase: 27500, genre: "Muscle" },
  { id: 125, nom: "Dominator", prixBase: 32500, genre: "Muscle" },
  { id: 126, nom: "Coquette BlackFin", prixBase: 60000, genre: "Muscle" },
  { id: 127, nom: "Chino Custom", prixBase: 35000, genre: "Muscle" },
  { id: 128, nom: "Chino", prixBase: 27500, genre: "Muscle" },
  { id: 129, nom: "Buccaneer Custom", prixBase: 40000, genre: "Muscle" },
  { id: 130, nom: "Blade", prixBase: 25000, genre: "Muscle" },
  { id: 131, nom: "Walton L35", prixBase: 47500, genre: "Tout-terrain" },
  { id: 132, nom: "MonstroCiti", prixBase: 70000, genre: "Tout-terrain" },
  { id: 133, nom: "Yosemite Rancher", prixBase: 42500, genre: "Tout-terrain" },
  { id: 134, nom: "Outlaw", prixBase: 47500, genre: "Tout-terrain" },
  { id: 135, nom: "Everon", prixBase: 60000, genre: "Tout-terrain" },
  { id: 136, nom: "Vagrant", prixBase: 80000, genre: "Tout-terrain" },
  { id: 137, nom: "Hellion", prixBase: 42500, genre: "Tout-terrain" },
  { id: 138, nom: "Caracara 4x4", prixBase: 55000, genre: "Tout-terrain" },
  { id: 139, nom: "Sandking SWB", prixBase: 30000, genre: "Tout-terrain" },
  { id: 140, nom: "Street Blazer", prixBase: 15000, genre: "Tout-terrain" },
  { id: 141, nom: "Sandking XL", prixBase: 35000, genre: "Tout-terrain" },
  { id: 142, nom: "Rebel", prixBase: 20000, genre: "Tout-terrain" },
  { id: 143, nom: "Rancher XL", prixBase: 22500, genre: "Tout-terrain" },
  { id: 144, nom: "Merryweather Mesa", prixBase: 32500, genre: "Tout-terrain" },
  { id: 145, nom: "Kalahari", prixBase: 17500, genre: "Tout-terrain" },
  { id: 146, nom: "Bodhi", prixBase: 20000, genre: "Tout-terrain" },
  { id: 147, nom: "Blazer", prixBase: 10000, genre: "Tout-terrain" },
  { id: 148, nom: "Rhinehart", prixBase: 90625, genre: "Berlines" },
  { id: 149, nom: "Cinquemila", prixBase: 100000, genre: "Berlines" },
  { id: 150, nom: "Warrener HKR", prixBase: 46875, genre: "Berlines" },
  { id: 151, nom: "Tailgater S", prixBase: 78125, genre: "Berlines" },
  { id: 152, nom: "Glendale Custom", prixBase: 43750, genre: "Berlines" },
  { id: 153, nom: "Stafford", prixBase: 87500, genre: "Berlines" },
  { id: 154, nom: "Romero Hearse", prixBase: 56250, genre: "Berlines" },
  { id: 155, nom: "Washington", prixBase: 31250, genre: "Berlines" },
  { id: 156, nom: "Warrener", prixBase: 28125, genre: "Berlines" },
  { id: 157, nom: "Tailgater", prixBase: 40625, genre: "Berlines" },
  { id: 158, nom: "Surge", prixBase: 31250, genre: "Berlines" },
  { id: 159, nom: "Super Diamond", prixBase: 87500, genre: "Berlines" },
  { id: 160, nom: "Stretch", prixBase: 68750, genre: "Berlines" },
  { id: 161, nom: "Stratum", prixBase: 25000, genre: "Berlines" },
  { id: 162, nom: "Stanier", prixBase: 28125, genre: "Berlines" },
  { id: 163, nom: "Schafter", prixBase: 46875, genre: "Berlines" },
  { id: 164, nom: "Regina", prixBase: 18750, genre: "Berlines" },
  { id: 165, nom: "Primo Custom", prixBase: 40625, genre: "Berlines" },
  { id: 166, nom: "Primo", prixBase: 21875, genre: "Berlines" },
  { id: 167, nom: "Premier", prixBase: 18750, genre: "Berlines" },
  { id: 168, nom: "Intruder", prixBase: 28125, genre: "Berlines" },
  { id: 169, nom: "Ingot", prixBase: 21875, genre: "Berlines" },
  { id: 170, nom: "Glendale", prixBase: 25000, genre: "Berlines" },
  { id: 171, nom: "Fugitive", prixBase: 31250, genre: "Berlines" },
  { id: 172, nom: "Emperor", prixBase: 15625, genre: "Berlines" },
  { id: 173, nom: "Cognoscenti 55", prixBase: 75000, genre: "Berlines" },
  { id: 174, nom: "Cognoscenti", prixBase: 81250, genre: "Berlines" },
  { id: 175, nom: "Asterope", prixBase: 25000, genre: "Berlines" },
  { id: 176, nom: "Asea", prixBase: 15625, genre: "Berlines" },
  { id: 177, nom: "Itali GTO Stinger TT", prixBase: 189000, genre: "Sportives" },
  { id: 178, nom: "Sentinel Classic Widebody", prixBase: 84000, genre: "Sportives" },
  { id: 179, nom: "10F Widebody", prixBase: 183750, genre: "Sportives" },
  { id: 180, nom: "10F", prixBase: 162750, genre: "Sportives" },
  { id: 181, nom: "SM722", prixBase: 178500, genre: "Sportives" },
  { id: 182, nom: "Corsita", prixBase: 173250, genre: "Sportives" },
  { id: 183, nom: "Comet S2 Cabrio", prixBase: 168000, genre: "Sportives" },
  { id: 184, nom: "Cypher", prixBase: 78750, genre: "Sportives" },
  { id: 185, nom: "Sultan RS Classic", prixBase: 94500, genre: "Sportives" },
  { id: 186, nom: "ZR350", prixBase: 78750, genre: "Sportives" },
  { id: 187, nom: "Remus", prixBase: 68250, genre: "Sportives" },
  { id: 188, nom: "RT3000", prixBase: 68250, genre: "Sportives" },
  { id: 189, nom: "Jester RR", prixBase: 99750, genre: "Sportives" },
  { id: 190, nom: "Futo GTX", prixBase: 57750, genre: "Sportives" },
  { id: 191, nom: "Euros", prixBase: 84000, genre: "Sportives" },
  { id: 192, nom: "Calico GTF", prixBase: 89250, genre: "Sportives" },
  { id: 193, nom: "Growler", prixBase: 115500, genre: "Sportives" },
  { id: 194, nom: "Vectre", prixBase: 94500, genre: "Sportives" },
  { id: 195, nom: "Comet S2", prixBase: 157500, genre: "Sportives" },
  { id: 196, nom: "Itali RSX", prixBase: 199500, genre: "Sportives" },
  { id: 197, nom: "Penumbra FF", prixBase: 57750, genre: "Sportives" },
  { id: 198, nom: "Coquette D10", prixBase: 152250, genre: "Sportives" },
  { id: 199, nom: "Sugoi", prixBase: 63000, genre: "Sportives" },
  { id: 200, nom: "V-STR", prixBase: 110250, genre: "Sportives" },
  { id: 201, nom: "Sultan Classic", prixBase: 73500, genre: "Sportives" },
  { id: 202, nom: "Imorgon", prixBase: 131250, genre: "Sportives" },
  { id: 203, nom: "Komoda", prixBase: 105000, genre: "Sportives" },
  { id: 204, nom: "Jugular", prixBase: 110250, genre: "Sportives" },
  { id: 205, nom: "Locust", prixBase: 115500, genre: "Sportives" },
  { id: 206, nom: "Neo", prixBase: 152250, genre: "Sportives" },
  { id: 207, nom: "Paragon R", prixBase: 120750, genre: "Sportives" },
  { id: 208, nom: "8F Drafter", prixBase: 94500, genre: "Sportives" },
  { id: 209, nom: "Schlagen GT", prixBase: 141750, genre: "Sportives" },
  { id: 210, nom: "Itali GTO", prixBase: 157500, genre: "Sportives" },
  { id: 211, nom: "Jester Classic", prixBase: 68250, genre: "Sportives" },
  { id: 212, nom: "Flash GT", prixBase: 78750, genre: "Sportives" },
  { id: 213, nom: "Surano", prixBase: 73500, genre: "Sportives" },
  { id: 214, nom: "Comet", prixBase: 63000, genre: "Sportives" },
  { id: 215, nom: "Alpha", prixBase: 57750, genre: "Sportives" },
  { id: 216, nom: "Comet SR", prixBase: 131250, genre: "Sportives" },
  { id: 217, nom: "Neon", prixBase: 126000, genre: "Sportives" },
  { id: 218, nom: "Sentinel Classic", prixBase: 57750, genre: "Sportives" },
  { id: 219, nom: "Raiden", prixBase: 115500, genre: "Sportives" },
  { id: 220, nom: "Pariah", prixBase: 152250, genre: "Sportives" },
  { id: 221, nom: "Verlierer", prixBase: 78750, genre: "Sportives" },
  { id: 222, nom: "Tropos Rallye", prixBase: 63000, genre: "Sportives" },
  { id: 223, nom: "Sultan", prixBase: 36750, genre: "Sportives" },
  { id: 224, nom: "Specter", prixBase: 84000, genre: "Sportives" },
  { id: 225, nom: "Seven-70", prixBase: 99750, genre: "Sportives" },
  { id: 226, nom: "Schwartzer", prixBase: 47250, genre: "Sportives" },
  { id: 227, nom: "Schafter V12", prixBase: 63000, genre: "Sportives" },
  { id: 228, nom: "Schafter LWB", prixBase: 63000, genre: "Sportives" },
  { id: 229, nom: "Ruston", prixBase: 78750, genre: "Sportives" },
  { id: 230, nom: "Rapid GT Cabrio", prixBase: 73500, genre: "Sportives" },
  { id: 231, nom: "Rapid GT", prixBase: 68250, genre: "Sportives" },
  { id: 232, nom: "Penumbra", prixBase: 31500, genre: "Sportives" },
  { id: 233, nom: "Massacro", prixBase: 94500, genre: "Sportives" },
  { id: 234, nom: "Kuruma", prixBase: 47250, genre: "Sportives" },
  { id: 235, nom: "Khamelion", prixBase: 57750, genre: "Sportives" },
  { id: 236, nom: "Jester", prixBase: 84000, genre: "Sportives" },
  { id: 237, nom: "Futo", prixBase: 26250, genre: "Sportives" },
  { id: 238, nom: "Fusilade", prixBase: 36750, genre: "Sportives" },
  { id: 239, nom: "Furore GT", prixBase: 78750, genre: "Sportives" },
  { id: 240, nom: "Feltzer", prixBase: 68250, genre: "Sportives" },
  { id: 241, nom: "Elegy RH8", prixBase: 52500, genre: "Sportives" },
  { id: 242, nom: "Coquette", prixBase: 63000, genre: "Sportives" },
  { id: 243, nom: "Carbonizzare", prixBase: 89250, genre: "Sportives" },
  { id: 244, nom: "Buffalo S", prixBase: 47250, genre: "Sportives" },
  { id: 245, nom: "Buffalo", prixBase: 31500, genre: "Sportives" },
  { id: 246, nom: "Blista Compact", prixBase: 23625, genre: "Sportives" },
  { id: 247, nom: "Bestia GTS", prixBase: 94500, genre: "Sportives" },
  { id: 248, nom: "Banshee", prixBase: 73500, genre: "Sportives" },
  { id: 249, nom: "9F Cabrio", prixBase: 84000, genre: "Sportives" },
  { id: 250, nom: "9F", prixBase: 78750, genre: "Sportives" },
  { id: 251, nom: "Peyote Custom", prixBase: 47250, genre: "Sports classiques" },
  { id: 252, nom: "Retinue Mk II", prixBase: 68250, genre: "Sports classiques" },
  { id: 253, nom: "Dynasty", prixBase: 31500, genre: "Sports classiques" },
  { id: 254, nom: "Zion Classic", prixBase: 57750, genre: "Sports classiques" },
  { id: 255, nom: "Nebula Turbo", prixBase: 36750, genre: "Sports classiques" },
  { id: 256, nom: "Swinger", prixBase: 131250, genre: "Sports classiques" },
  { id: 257, nom: "Michelli GT", prixBase: 44625, genre: "Sports classiques" },
  { id: 258, nom: "Cheburek", prixBase: 23625, genre: "Sports classiques" },
  { id: 259, nom: "Fagaloa", prixBase: 28875, genre: "Sports classiques" },
  { id: 260, nom: "190z", prixBase: 99750, genre: "Sports classiques" },
  { id: 261, nom: "GT500", prixBase: 94500, genre: "Sports classiques" },
  { id: 262, nom: "Retinue", prixBase: 42000, genre: "Sports classiques" },
  { id: 263, nom: "Rapid GT Classic", prixBase: 89250, genre: "Sports classiques" },
  { id: 264, nom: "Torero", prixBase: 141750, genre: "Sports classiques" },
  { id: 265, nom: "Cheetah Classic", prixBase: 162750, genre: "Sports classiques" },
  { id: 266, nom: "Z-Type", prixBase: 189000, genre: "Sports classiques" },
  { id: 267, nom: "Turismo Classic", prixBase: 157500, genre: "Sports classiques" },
  { id: 268, nom: "Tornado Custom", prixBase: 36750, genre: "Sports classiques" },
  { id: 269, nom: "Tornado Cabrio", prixBase: 31500, genre: "Sports classiques" },
  { id: 270, nom: "Tornado", prixBase: 21000, genre: "Sports classiques" },
  { id: 271, nom: "Stinger GT", prixBase: 152250, genre: "Sports classiques" },
  { id: 272, nom: "Stinger", prixBase: 141750, genre: "Sports classiques" },
  { id: 273, nom: "Roosevelt Valor", prixBase: 105000, genre: "Sports classiques" },
  { id: 274, nom: "Roosevelt", prixBase: 94500, genre: "Sports classiques" },
  { id: 275, nom: "Pigalle", prixBase: 42000, genre: "Sports classiques" },
  { id: 276, nom: "Peyote", prixBase: 26250, genre: "Sports classiques" },
  { id: 277, nom: "Monroe", prixBase: 126000, genre: "Sports classiques" },
  { id: 278, nom: "Manana", prixBase: 21000, genre: "Sports classiques" },
  { id: 279, nom: "Mamba", prixBase: 115500, genre: "Sports classiques" },
  { id: 280, nom: "Infernus Classic", prixBase: 168000, genre: "Sports classiques" },
  { id: 281, nom: "Coquette Classic", prixBase: 99750, genre: "Sports classiques" },
  { id: 282, nom: "Casco", prixBase: 89250, genre: "Sports classiques" },
  { id: 283, nom: "Torero XO", prixBase: 350000, genre: "Supercars" },
  { id: 284, nom: "Zeno", prixBase: 345000, genre: "Supercars" },
  { id: 285, nom: "Ignus", prixBase: 340000, genre: "Supercars" },
  { id: 286, nom: "Tigon", prixBase: 310000, genre: "Supercars" },
  { id: 287, nom: "Furia", prixBase: 320000, genre: "Supercars" },
  { id: 288, nom: "Zorrusso", prixBase: 270000, genre: "Supercars" },
  { id: 289, nom: "Krieger", prixBase: 350000, genre: "Supercars" },
  { id: 290, nom: "Emerus", prixBase: 345000, genre: "Supercars" },
  { id: 291, nom: "Thrax", prixBase: 315000, genre: "Supercars" },
  { id: 292, nom: "Deveste Eight", prixBase: 330000, genre: "Supercars" },
  { id: 293, nom: "Tyrant", prixBase: 305000, genre: "Supercars" },
  { id: 294, nom: "Tezeract", prixBase: 335000, genre: "Supercars" },
  { id: 295, nom: "Taipan", prixBase: 290000, genre: "Supercars" },
  { id: 296, nom: "Entity XXR", prixBase: 300000, genre: "Supercars" },
  { id: 297, nom: "Banshee 900R", prixBase: 150000, genre: "Supercars" },
  { id: 298, nom: "SC1", prixBase: 220000, genre: "Supercars" },
  { id: 299, nom: "Autarch", prixBase: 285000, genre: "Supercars" },
  { id: 300, nom: "Cyclone", prixBase: 255000, genre: "Supercars" },
  { id: 301, nom: "Visione", prixBase: 295000, genre: "Supercars" },
  { id: 302, nom: "XA-21", prixBase: 265000, genre: "Supercars" },
  { id: 303, nom: "Vagner", prixBase: 280000, genre: "Supercars" },
  { id: 304, nom: "Zentorno", prixBase: 230000, genre: "Supercars" },
  { id: 305, nom: "X80 Proto", prixBase: 325000, genre: "Supercars" },
  { id: 306, nom: "Voltic", prixBase: 130000, genre: "Supercars" },
  { id: 307, nom: "Vacca", prixBase: 145000, genre: "Supercars" },
  { id: 308, nom: "Turismo R", prixBase: 155000, genre: "Supercars" },
  { id: 309, nom: "Tempesta", prixBase: 220000, genre: "Supercars" },
  { id: 310, nom: "T20", prixBase: 245000, genre: "Supercars" },
  { id: 311, nom: "Sultan RS", prixBase: 125000, genre: "Supercars" },
  { id: 312, nom: "Reaper", prixBase: 235000, genre: "Supercars" },
  { id: 313, nom: "Penetrator", prixBase: 190000, genre: "Supercars" },
  { id: 314, nom: "Osiris", prixBase: 240000, genre: "Supercars" },
  { id: 315, nom: "Nero Custom", prixBase: 270000, genre: "Supercars" },
  { id: 316, nom: "Nero", prixBase: 245000, genre: "Supercars" },
  { id: 317, nom: "Itali GTB Custom", prixBase: 260000, genre: "Supercars" },
  { id: 318, nom: "Itali GTB", prixBase: 235000, genre: "Supercars" },
  { id: 319, nom: "Infernus", prixBase: 155000, genre: "Supercars" },
  { id: 320, nom: "GP1", prixBase: 210000, genre: "Supercars" },
  { id: 321, nom: "FMJ", prixBase: 230000, genre: "Supercars" },
  { id: 322, nom: "ETR1", prixBase: 220000, genre: "Supercars" },
  { id: 323, nom: "Entity XF", prixBase: 175000, genre: "Supercars" },
  { id: 324, nom: "Cheetah", prixBase: 170000, genre: "Supercars" },
  { id: 325, nom: "Bullet", prixBase: 140000, genre: "Supercars" },
  { id: 326, nom: "Adder", prixBase: 195000, genre: "Supercars" },
  { id: 327, nom: "811", prixBase: 205000, genre: "Supercars" },
  { id: 328, nom: "I-Wagen", prixBase: 95000, genre: "SUV" },
  { id: 329, nom: "Baller ST", prixBase: 90000, genre: "SUV" },
  { id: 330, nom: "Astron", prixBase: 110000, genre: "SUV" },
  { id: 331, nom: "Seminole Frontier", prixBase: 45000, genre: "SUV" },
  { id: 332, nom: "Landstalker XL", prixBase: 65000, genre: "SUV" },
  { id: 333, nom: "Rebla GTS", prixBase: 105000, genre: "SUV" },
  { id: 334, nom: "Novak", prixBase: 85000, genre: "SUV" },
  { id: 335, nom: "Toros", prixBase: 100000, genre: "SUV" },
  { id: 336, nom: "Patriot Stretch", prixBase: 70000, genre: "SUV" },
  { id: 337, nom: "Serrano", prixBase: 32500, genre: "SUV" },
  { id: 338, nom: "Patriot", prixBase: 35000, genre: "SUV" },
  { id: 339, nom: "Habanero", prixBase: 27500, genre: "SUV" },
  { id: 340, nom: "FQ2", prixBase: 25000, genre: "SUV" },
  { id: 341, nom: "BeeJay XL", prixBase: 22500, genre: "SUV" },
  { id: 342, nom: "XLS", prixBase: 55000, genre: "SUV" },
  { id: 343, nom: "Seminole", prixBase: 22500, genre: "SUV" },
  { id: 344, nom: "Rocoto", prixBase: 40000, genre: "SUV" },
  { id: 345, nom: "Radius", prixBase: 25000, genre: "SUV" },
  { id: 346, nom: "Mesa", prixBase: 27500, genre: "SUV" },
  { id: 347, nom: "Landstalker", prixBase: 30000, genre: "SUV" },
  { id: 348, nom: "Huntley S", prixBase: 60000, genre: "SUV" },
  { id: 349, nom: "Gresley", prixBase: 25000, genre: "SUV" },
  { id: 350, nom: "Granger", prixBase: 32500, genre: "SUV" },
  { id: 351, nom: "Dubsta 2", prixBase: 52500, genre: "SUV" },
  { id: 352, nom: "Dubsta", prixBase: 42500, genre: "SUV" },
  { id: 353, nom: "Contender", prixBase: 50000, genre: "SUV" },
  { id: 354, nom: "Cavalcade", prixBase: 35000, genre: "SUV" },
  { id: 355, nom: "Baller LE LWB", prixBase: 65000, genre: "SUV" },
  { id: 356, nom: "Baller LE", prixBase: 57500, genre: "SUV" },
  { id: 357, nom: "Baller (Old)", prixBase: 30000, genre: "SUV" },
  { id: 358, nom: "Bobcat XL", prixBase: 27500, genre: "SUV" },
  { id: 359, nom: "Bison", prixBase: 35000, genre: "SUV" },
  { id: 360, nom: "Youga Classic 4x4", prixBase: 55000, genre: "Vans" },
  { id: 361, nom: "Bugstars Burrito", prixBase: 27500, genre: "Vans" },
  { id: 362, nom: "Youga Classic", prixBase: 32500, genre: "Vans" },
  { id: 363, nom: "Youga", prixBase: 20000, genre: "Vans" },
  { id: 364, nom: "Surfer", prixBase: 17500, genre: "Vans" },
  { id: 365, nom: "Speedo", prixBase: 22500, genre: "Vans" },
  { id: 366, nom: "Rumpo Custom", prixBase: 45000, genre: "Vans" },
  { id: 367, nom: "Rumpo", prixBase: 25000, genre: "Vans" },
  { id: 368, nom: "Pony", prixBase: 20000, genre: "Vans" },
  { id: 369, nom: "Paradise", prixBase: 25000, genre: "Vans" },
  { id: 370, nom: "Minivan Custom", prixBase: 37500, genre: "Vans" },
  { id: 371, nom: "Minivan", prixBase: 20000, genre: "Vans" },
  { id: 372, nom: "Burrito", prixBase: 22500, genre: "Vans" },
];

const SEED_CATEGORIES = [
  "Compacts",
  "Coupés",
  "Motos",
  "Muscle",
  "Tout-terrain",
  "Berlines",
  "Sportives",
  "Sports classiques",
  "Supercars",
  "SUV",
  "Vans",
];

// Réglages globaux : la réduction ne s'applique qu'aux véhicules Occasion
// (rachat à un joueur) — les Imports n'ont pas de réduction, seulement une marge.
// reductionMaxVente = plafond de réduction que les employés peuvent accorder à un client.
// kmIntervalle / kmMontant = tous les X km au compteur, on ajoute Y$ au prix de vente.
const SEED_PARAMETRES = {
  reductionMaxVente: 15,
  kmIntervalle: 10000,
  kmMontant: 500,
  salaireBase: 3500,
  primeParOperation: 250,
};

// Tranches de réduction et de marge, en MONTANT FIXE ($) selon le prix de
// base (catalogue) du véhicule — plus la voiture est chère, plus la tranche
// appliquée peut être différente. Triées par seuil croissant ; on prend la
// tranche dont le seuil est le plus haut en restant ≤ au prix de base.
// Occasion uniquement — l'Import n'a ni réduction ni marge.
const SEED_REDUCTION_TIERS = [
  { id: 1, seuil: 0, montant: 5000 },
  { id: 2, seuil: 20000, montant: 8000 },
  { id: 3, seuil: 50000, montant: 15000 },
  { id: 4, seuil: 100000, montant: 25000 },
];

const SEED_MARGE_TIERS = [
  { id: 1, seuil: 0, montant: 2000 },
  { id: 2, seuil: 20000, montant: 2500 },
  { id: 3, seuil: 50000, montant: 4000 },
  { id: 4, seuil: 100000, montant: 6000 },
];

function montantSelonTranche(prixBase, tiers) {
  const trie = [...tiers].sort((a, b) => a.seuil - b.seuil);
  let montant = 0;
  for (const t of trie) {
    if (prixBase >= t.seuil) montant = t.montant;
  }
  return montant;
}

const SEED_VEHICLES = [
  {
    id: 1,
    nom: "Obey Tailgater S",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
    prixBase: 42000,
    reduction: 8000,
    marge: 2500,
    statut: "En stock",
    type: "Occasion",
    categorie: "Sportives",
  },
  {
    id: 2,
    nom: "Vapid Dominator GTX",
    image:
      "https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=800&q=80",
    prixBase: 68000,
    reduction: 15000,
    marge: 4000,
    statut: "En stock",
    type: "Occasion",
    categorie: "Muscle",
  },
  {
    id: 3,
    nom: "Pfister Comet SR",
    image:
      "https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?w=800&q=80",
    prixBase: 95000,
    reduction: 0,
    marge: 0,
    statut: "Vendu",
    type: "Import",
    categorie: "Supercars",
  },
  {
    id: 4,
    nom: "Bravado Buffalo STX",
    image:
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
    prixBase: 54000,
    reduction: 0,
    marge: 0,
    statut: "En stock",
    type: "Import",
    categorie: "Tout-terrain",
  },
];

const money = (n) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " $";

function computePrices(v) {
  // v.reduction et v.marge sont maintenant des MONTANTS FIXES ($), figés à
  // l'enregistrement du véhicule selon les tranches de prix en vigueur.
  const prixAchat = v.prixBase - (v.reduction || 0);
  const prixVenteCalcule = prixAchat + (v.marge || 0);
  // Garde-fou : un véhicule d'occasion ne doit jamais se revendre plus cher
  // que son prix catalogue (prix de base), même si la marge est mal réglée.
  const prixVente = Math.min(prixVenteCalcule, v.prixBase);
  return { prixAchat, prixVente };
}

/* ---------------------------- UI bits ---------------------------- */

function Badge({ children, tone = "amber" }) {
  const tones = {
    amber: { bg: "rgba(242,169,59,0.14)", fg: "#F2A93B" },
    green: { bg: "rgba(97,181,120,0.14)", fg: "#61B578" },
    red: { bg: "rgba(214,90,80,0.14)", fg: "#D65A50" },
    blue: { bg: "rgba(62,124,177,0.16)", fg: "#6FA8D8" },
    grey: { bg: "rgba(156,160,168,0.14)", fg: "#9CA0A8" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        background: t.bg,
        color: t.fg,
        padding: "3px 10px",
        borderRadius: 5,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.2,
      }}
    >
      {children}
    </span>
  );
}

// Barre de filtres par catégorie (Sport, Tout-terrain, etc. + "Toutes")
function CategoryFilter({ categories, selected, onSelect }) {
  const options = [TOUTES, ...categories];
  return (
    <div style={s.categoryFilter}>
      {options.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          style={{
            ...s.categoryChip,
            ...(selected === c ? s.categoryChipActive : {}),
          }}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

// v: véhicule
// showStatusBadge: afficher le badge En stock / Vendu (inutile dans les listes
// de vente employé puisqu'elles ne montrent déjà que les véhicules en stock)
// showTypeBadge: afficher le tag Occasion / Import
// showInternal: afficher le détail réduction/marge (Manager+)
// showBasePrice: afficher le prix de base en plus du prix de vente (Visiteur/Employé)
function VehicleCard({ v, showStatusBadge, showTypeBadge, showInternal, showBasePrice, clickable, onClick }) {
  const { prixAchat, prixVente } = computePrices(v);
  return (
    <div
      style={{ ...s.card, cursor: clickable ? "pointer" : "default" }}
      onClick={clickable ? onClick : undefined}
    >
      <div style={{ ...s.cardImage, backgroundImage: `url(${v.image})` }}>
        <div style={s.cardImageShade} />
        {showStatusBadge && (
          <div style={s.cardImageTopLeft}>
            <Badge tone={v.statut === "En stock" ? "green" : "red"}>{v.statut}</Badge>
          </div>
        )}
        {showTypeBadge && (
          <div style={s.cardImageTopRight}>
            <Badge tone={v.type === "Import" ? "blue" : "amber"}>{v.type}</Badge>
          </div>
        )}
      </div>
      <div style={s.cardBody}>
        <div style={s.cardTitleRow}>
          <div style={s.cardTitle}>{v.nom}</div>
          {v.classe && <Badge tone={TON_CLASSE[v.classe] || "grey"}>Classe {v.classe}</Badge>}
          {v.categorie && <Badge tone="grey">{v.categorie}</Badge>}
        </div>

        {showBasePrice ? (
          <div style={s.priceStack}>
            <div style={s.priceStackRow}>
              <span style={s.cardPriceLabel}>Prix de base</span>
              <span style={s.priceStackVal}>{money(v.prixBase)}</span>
            </div>
            <div style={s.priceStackRow}>
              <span style={s.cardPriceLabel}>Prix de vente</span>
              <span style={{ ...s.priceStackVal, color: "#F2A93B", fontSize: 17 }}>
                {money(prixVente)}
              </span>
            </div>
          </div>
        ) : (
          <div style={s.cardPriceRow}>
            <span style={s.cardPriceLabel}>Prix</span>
            <span style={s.cardPrice}>{money(prixVente)}</span>
          </div>
        )}

        {showInternal && (
          <div style={s.internalGrid}>
            <div>
              <div style={s.internalLabel}>Prix de base</div>
              <div style={s.internalVal}>{money(v.prixBase)}</div>
            </div>
            <div>
              <div style={s.internalLabel}>Réduction (-{money(v.reduction)})</div>
              <div style={s.internalVal}>{money(prixAchat)}</div>
            </div>
            <div>
              <div style={s.internalLabel}>Marge (+{money(v.marge)})</div>
              <div style={{ ...s.internalVal, color: "#F2A93B" }}>
                {money(prixVente)}
              </div>
            </div>
          </div>
        )}

        {v.description && <div style={s.cardDescription}>{v.description}</div>}

        {clickable && <div style={s.sellHint}>Cliquer pour vendre →</div>}
      </div>
    </div>
  );
}

/* ---------------------------- Sections ---------------------------- */

function Vitrine({ vehicles, categories, role, isMobile }) {
  const internal = CAN_VIEW_INTERNAL_PRICING.includes(role);
  // Un véhicule vendu ne doit plus apparaître pour les visiteurs et les
  // vendeurs — seuls Manager/Co-patron/Patron gardent une trace complète.
  const vehiculesVisibles = internal ? vehicles : vehicles.filter((v) => v.statut === "En stock");
  const [filtreType, setFiltreType] = useState(TOUTES);
  const [filtre, setFiltre] = useState(TOUTES);
  const parType =
    filtreType === TOUTES ? vehiculesVisibles : vehiculesVisibles.filter((v) => v.type === filtreType);
  const affiches = filtre === TOUTES ? parType : parType.filter((v) => v.categorie === filtre);

  return (
    <section>
      <div style={s.sectionHead}>
        <h1 style={{ ...s.h1, ...(isMobile ? s.h1Mobile : {}) }}>Nos véhicules</h1>
        <p style={s.subtitle}>
          Rachat et revente de véhicules — sélection contrôlée, prix
          affiché tout compris.
        </p>
      </div>
      <CategoryFilter categories={TYPES_VEHICULE} selected={filtreType} onSelect={setFiltreType} />
      <CategoryFilter categories={categories} selected={filtre} onSelect={setFiltre} />
      <div style={{ ...s.grid, ...(isMobile ? s.gridMobile : {}) }}>
        {affiches.map((v) => (
          <VehicleCard
            key={v.id}
            v={v}
            showStatusBadge
            showTypeBadge
            showInternal={internal}
            showBasePrice={!internal}
          />
        ))}
        {affiches.length === 0 && (
          <div style={s.emptyRow}>Aucun véhicule dans cette catégorie.</div>
        )}
      </div>
    </section>
  );
}

// Panneau latéral (pas une popup centrée) pour enregistrer une vente.
function PanneauVente({ vehicle, onClose, onConfirm, moi, isMobile, reductionMax, parametres }) {
  const { prixVente } = computePrices(vehicle);
  const [clientNom, setClientNom] = useState("");
  const [clientPrenom, setClientPrenom] = useState("");
  const [clientClasse, setClientClasse] = useState("A");
  const [reductionVente, setReductionVente] = useState(0);
  const [kilometrage, setKilometrage] = useState("");

  // Options du sélecteur : 0, 5, 10... jusqu'au plafond fixé par le patron/co-patron.
  const options = useMemo(() => {
    const opts = [];
    for (let v = 0; v < reductionMax; v += 5) opts.push(v);
    opts.push(reductionMax);
    return opts;
  }, [reductionMax]);

  const kmNum = parseFloat(kilometrage) || 0;
  const surchargeKm = Math.floor(kmNum / parametres.kmIntervalle) * parametres.kmMontant;
  const reductionMontant = prixVente * (reductionVente / 100);
  // Si la réduction accordée couvre à elle seule le montant de la surcharge
  // kilométrique, les km sont offerts (pas de double avantage cumulé).
  const kmOfferts = reductionVente > 0 && reductionMontant > surchargeKm;
  const venteAutorisee = classeSuffit(clientClasse, vehicle.classe);
  const surchargeEffective = kmOfferts ? 0 : surchargeKm;
  const prixFinal = prixVente - reductionMontant + surchargeEffective;

  function submit(e) {
    e.preventDefault();
    if (!clientNom.trim() || !venteAutorisee) return;
    onConfirm({
      clientNom,
      clientPrenom,
      clientClasse,
      prixVente,
      kilometrage: kmNum,
      surchargeKm: surchargeEffective,
      kmOfferts,
      reductionVente,
      prixFinal,
    });
  }

  return (
    <div style={s.panelOverlay} onClick={onClose}>
      <form
        style={{ ...s.panelCard, ...(isMobile ? s.panelCardMobile : {}) }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div style={s.panelVehiclePreview}>
          {vehicle.image ? (
              <img src={vehicle.image} alt="" style={s.panelVehicleImg} />
            ) : (
              <div style={{ ...s.panelVehicleImg, background: "#1D2027" }} />
            )}
          <div>
            <div style={s.formTitle}>{vehicle.nom}</div>
            <div style={s.cardPriceLabel}>Prix de vente</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#F2A93B" }}>
              {money(prixVente)}
            </div>
          </div>
        </div>

        <label style={s.label}>Kilométrage au compteur</label>
        <input
          style={s.input}
          type="number"
          min="0"
          value={kilometrage}
          onChange={(e) => setKilometrage(e.target.value)}
          placeholder="ex : 45000"
        />

        <label style={s.label}>Réduction accordée au client</label>
        <select
          style={s.input}
          value={reductionVente}
          onChange={(e) => setReductionVente(Number(e.target.value))}
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o === 0 ? "Aucune réduction" : `${o}%`}
            </option>
          ))}
        </select>

        {(surchargeKm > 0 || reductionVente > 0) && (
          <div style={s.previewBox}>
            <div style={s.previewRow}>
              <span>Prix de vente</span>
              <strong>{money(prixVente)}</strong>
            </div>
            {surchargeKm > 0 && (
              <div style={s.previewRow}>
                <span>Surcharge kilométrage ({kmNum} km)</span>
                {kmOfferts ? (
                  <strong style={{ color: "#61B578" }}>Offerte</strong>
                ) : (
                  <strong>+{money(surchargeKm)}</strong>
                )}
              </div>
            )}
            {reductionVente > 0 && (
              <div style={s.previewRow}>
                <span>Réduction ({reductionVente}%)</span>
                <strong>−{money(reductionMontant)}</strong>
              </div>
            )}
            <div style={{ ...s.previewRow, borderTop: "1px solid #2A2D34", marginTop: 6, paddingTop: 8 }}>
              <span>Prix final</span>
              <strong style={{ color: "#F2A93B" }}>{money(prixFinal)}</strong>
            </div>
          </div>
        )}

        <label style={s.label}>Nom du joueur (client)</label>
        <input
          style={s.input}
          value={clientNom}
          onChange={(e) => setClientNom(e.target.value)}
          placeholder="Dolan"
          autoFocus
        />

        <label style={s.label}>Prénom du client</label>
        <input
          style={s.input}
          value={clientPrenom}
          onChange={(e) => setClientPrenom(e.target.value)}
          placeholder="Paul"
        />
        <label style={s.label}>Classe du joueur</label>
        <select
          style={s.input}
          value={clientClasse}
          onChange={(e) => setClientClasse(e.target.value)}
        >
          {CLASSES_CLIENT.map((c) => (
            <option key={c} value={c}>
              Classe {c}
            </option>
          ))}
        </select>

        {/* Les deux classes face à face : celle du véhicule, celle du client. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            padding: "10px 12px",
            borderRadius: 8,
            marginBottom: 10,
            background: venteAutorisee ? "rgba(97,181,120,0.08)" : "rgba(214,90,80,0.10)",
            border: `1px solid ${venteAutorisee ? "rgba(97,181,120,0.35)" : "rgba(214,90,80,0.5)"}`,
          }}
        >
          <span style={{ fontSize: 12, color: "#9CA0A8" }}>
            Véhicule <strong style={{ color: "#E8E6E1" }}>classe {vehicle.classe || "—"}</strong>
            {"  ·  "}
            Client <strong style={{ color: "#E8E6E1" }}>classe {clientClasse}</strong>
          </span>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: venteAutorisee ? "#61B578" : "#D65A50",
            }}
          >
            {venteAutorisee ? "Vente autorisée" : "Vente impossible"}
          </span>
        </div>

        {!venteAutorisee && (
          <div style={{ ...s.previewHint, color: "#D65A50", marginTop: -4 }}>
            Un client de classe {clientClasse} ne peut pas acheter un véhicule de
            classe {vehicle.classe}. Il lui faut au moins la classe {vehicle.classe}.
          </div>
        )}

        <label style={s.label}>Vendeur</label>
        <input
          style={{ ...s.input, opacity: 0.6 }}
          value={moi ? `${moi.prenom} ${moi.nom} — ${moi.grade}` : "—"}
          disabled
        />
        <div style={s.previewHint}>
          C'est toi, le compte connecté, qui sera nommé comme vendeur sur le
          contrat. Rien à saisir.
        </div>

        <div style={s.modalActions}>
          <button type="button" style={s.cancelBtn} onClick={onClose}>
            Annuler
          </button>
          <button
            type="submit"
            style={{ ...s.submitBtn, ...(venteAutorisee ? {} : { opacity: 0.45, cursor: "not-allowed" }) }}
            disabled={!venteAutorisee}
          >
            {venteAutorisee ? "Valider la vente" : `Réservé à la classe ${vehicle.classe}`}
          </button>
        </div>
      </form>
    </div>
  );
}

// Espace de vente employé, filtré par type de véhicule (Occasion / Import).
function EspaceVente({ vehicles, categories, onRefresh, onErreur, moi, isMobile, type, titre, sousTitre, reductionMax, parametres }) {
  const [selected, setSelected] = useState(null);
  const [filtre, setFiltre] = useState(TOUTES);
  const enStock = vehicles.filter(
    (v) => v.statut === "En stock" && v.type === type && (filtre === TOUTES || v.categorie === filtre)
  );

  async function confirmerVente(vehicle, infos) {
    try {
      await api.creerMouvement({
        type: "vente",
        vehiculeId: vehicle.id,
        km: infos.kilometrage,
        reductionPct: infos.reductionVente,
        clientNom: infos.clientNom,
        clientPrenom: infos.clientPrenom,
        clientClasse: infos.clientClasse,
      });
      setSelected(null);
      onRefresh?.();
    } catch (e) {
      onErreur?.(e.message);
    }
  }

  return (
    <section>
      <div style={s.sectionHead}>
        <h1 style={{ ...s.h1, ...(isMobile ? s.h1Mobile : {}) }}>{titre}</h1>
        <p style={s.subtitle}>{sousTitre}</p>
      </div>
      <CategoryFilter categories={categories} selected={filtre} onSelect={setFiltre} />
      <div style={{ ...s.grid, ...(isMobile ? s.gridMobile : {}) }}>
        {enStock.map((v) => (
          <VehicleCard
            key={v.id}
            v={v}
            showStatusBadge={false}
            showTypeBadge={false}
            showInternal={false}
            showBasePrice
            clickable
            onClick={() => setSelected(v)}
          />
        ))}
        {enStock.length === 0 && (
          <div style={s.emptyRow}>Aucun véhicule {type.toLowerCase()} en stock dans cette catégorie.</div>
        )}
      </div>

      {selected && (
        <PanneauVente
          vehicle={selected}
          moi={moi}
          isMobile={isMobile}
          reductionMax={reductionMax}
          parametres={parametres}
          onClose={() => setSelected(null)}
          onConfirm={(infos) => confirmerVente(selected, infos)}
        />
      )}
    </section>
  );
}

// Vue "vitrine" des ventes réalisées, réservée aux co-patrons et au patron.
function VentesRealisees({ ventes, isMobile }) {
  return (
    <section>
      <div style={s.sectionHead}>
        <h1 style={{ ...s.h1, ...(isMobile ? s.h1Mobile : {}) }}>Ventes réalisées</h1>
        <p style={s.subtitle}>
          Chaque vente enregistrée par un employé, avec le véhicule concerné.
        </p>
      </div>
      <div style={{ ...s.grid, ...(isMobile ? s.gridMobile : {}) }}>
        {ventes.map((v) => (
          <div style={s.card} key={v.id}>
            <div style={{ ...s.cardImage, backgroundImage: `url(${v.vehiculeImage})` }}>
              <div style={s.cardImageShade} />
              <div style={s.cardImageTopLeft}>
                <Badge tone="blue">Classe {v.clientClasse}</Badge>
              </div>
              <div style={s.cardImageTopRight}>
                <Badge tone={v.type === "Import" ? "blue" : "amber"}>{v.type}</Badge>
              </div>
            </div>
            <div style={s.cardBody}>
              <div style={s.cardTitle}>{v.vehiculeNom}</div>
              <div style={s.cardPriceRow}>
                <span style={s.cardPriceLabel}>
                  Prix {v.reductionVente > 0 ? `(-${v.reductionVente}%)` : "de vente"}
                </span>
                <span style={s.cardPrice}>{money(v.prixFinal ?? v.prixVente)}</span>
              </div>
              {v.reductionVente > 0 && (
                <div style={{ fontSize: 11, color: "#71767F", marginTop: -6, marginBottom: 8 }}>
                  Prix initial : {money(v.prixVente)}
                </div>
              )}
              <div style={{ ...s.internalGrid, gridTemplateColumns: "repeat(2, 1fr)" }}>
                <div>
                  <div style={s.internalLabel}>Client</div>
                  <div style={s.internalVal}>{v.clientNom}</div>
                </div>
                <div>
                  <div style={s.internalLabel}>Vendeur</div>
                  <div style={s.internalVal}>{v.vendeur}</div>
                </div>
                <div>
                  <div style={s.internalLabel}>Kilométrage</div>
                  <div style={s.internalVal}>
                    {v.kilometrage
                      ? `${v.kilometrage} km${v.kmOfferts ? " (offerts)" : ""}`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div style={s.internalLabel}>Date</div>
                  <div style={{ ...s.internalVal, fontSize: 11 }}>{v.date}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {ventes.length === 0 && (
          <div style={s.emptyRow}>Aucune vente enregistrée pour l'instant.</div>
        )}
      </div>
    </section>
  );
}

function EspaceGestion({ vehicles, onRefresh, onErreur, role, catalogue, categories, parametres, reductionTiers, margeTiers, isMobile }) {
  const peutImporter = CAN_IMPORT_VEHICULES.includes(role);
  const peutVoirStockDetaille = CAN_VIEW_INTERNAL_PRICING.includes(role);
  const [form, setForm] = useState({
    modeleId: catalogue[0]?.id ?? "",
    type: "Occasion",
    categorie: catalogue[0]?.genre ?? "",
    image: "",
    description: "",
    clientNom: "",
    clientPrenom: "",
    clientClasse: "A",
  });
  const [rechercheModele, setRechercheModele] = useState(catalogue[0]?.nom ?? "");
  const [aSupprimer, setASupprimer] = useState(null);
  const [envoiImage, setEnvoiImage] = useState(false);
  const [suggestionsOuvertes, setSuggestionsOuvertes] = useState(false);

  const modele = catalogue.find((c) => c.id === Number(form.modeleId));
  const rachatAutorise = classeSuffit(form.clientClasse, modele?.classe);
  const prixBase = modele?.prixBase ?? 0;
  const suggestions = catalogue.filter((c) =>
    c.nom.toLowerCase().includes(rechercheModele.toLowerCase())
  );

  function choisirModele(c) {
    setForm({ ...form, modeleId: c.id, categorie: c.genre ?? "" });
    setRechercheModele(c.nom);
    setSuggestionsOuvertes(false);
  }
  // La réduction et la marge ne s'appliquent qu'à l'occasion (rachat à un
  // joueur). Un import n'a ni l'une ni l'autre — prix de vente = prix de base.
  const reductionApplicable = form.type === "Occasion" ? montantSelonTranche(prixBase, reductionTiers) : 0;
  const margeApplicable = form.type === "Occasion" ? montantSelonTranche(prixBase, margeTiers) : 0;

  const preview = useMemo(() => {
    const prixAchat = prixBase - reductionApplicable;
    const prixVenteCalcule = prixAchat + margeApplicable;
    const prixVente = Math.min(prixVenteCalcule, prixBase);
    return { prixAchat, prixVente };
  }, [prixBase, reductionApplicable, margeApplicable]);

  async function ajouterVehicule(e) {
    e.preventDefault();
    if (!modele) return;
    if (form.clientNom.trim() && !rachatAutorise) {
      onErreur?.(
        `Rachat impossible : ce véhicule est de classe ${modele.classe}, ` +
          `le vendeur est de classe ${form.clientClasse}.`,
      );
      return;
    }
    try {
      await api.creerVehicule({
        modele: modele.nom,
        categorie: form.type,
        image: form.image,
        description: form.description,
        clientNom: form.clientNom,
        clientPrenom: form.clientPrenom,
        clientClasse: form.clientClasse,
      });
      setForm({
        modeleId: catalogue[0]?.id ?? "",
        type: "Occasion",
        categorie: catalogue[0]?.genre ?? "",
        image: "",
        description: "",
        clientNom: "",
        clientPrenom: "",
        clientClasse: "A",
      });
      setRechercheModele(catalogue[0]?.nom ?? "");
      onRefresh?.();
    } catch (err) {
      onErreur?.(err.message);
    }
  }

  async function toggleStatut(id) {
    const v = vehicles.find((x) => x.id === id);
    if (!v) return;
    try {
      await api.majVehicule(id, { statut: v.statut === "En stock" ? "vendu" : "stock" });
      onRefresh?.();
    } catch (e) {
      onErreur?.(e.message);
    }
  }

  async function supprimerVehicule(id) {
    setASupprimer(null);
    try {
      await api.supprimerVehicule(id);
      onRefresh?.();
    } catch (e) {
      onErreur?.(e.message);
    }
  }

  return (
    <section>
      <div style={s.sectionHead}>
        <h1 style={{ ...s.h1, ...(isMobile ? s.h1Mobile : {}) }}>Gestion des véhicules</h1>
        <p style={s.subtitle}>
          {peutImporter
            ? "Enregistre un véhicule racheté (occasion) ou importé. La réduction et la marge viennent des réglages globaux (onglet \"Paramètres\")."
            : "Enregistre un véhicule racheté à un joueur. La réduction et la marge viennent des réglages globaux."}
        </p>
      </div>

      <div style={{ ...s.gestionLayout, ...((isMobile || !peutVoirStockDetaille) ? s.gestionLayoutMobile : {}) }}>
        <form onSubmit={ajouterVehicule} style={s.formCard}>
          <div style={s.formTitle}>Nouveau véhicule</div>

          <div style={s.previewHint}>
            Tout véhicule enregistré ici est un <strong>rachat à un joueur</strong>,
            donc une occasion. Les imports sont ajoutés au catalogue en amont : un
            import racheté redevient une occasion.
          </div>

          <label style={s.label}>Modèle du véhicule</label>
          {catalogue.length > 0 ? (
            <div style={s.autocompleteWrap}>
              <input
                style={s.input}
                value={rechercheModele}
                onChange={(e) => {
                  setRechercheModele(e.target.value);
                  setSuggestionsOuvertes(true);
                }}
                onFocus={() => setSuggestionsOuvertes(true)}
                onBlur={() => setTimeout(() => setSuggestionsOuvertes(false), 150)}
                placeholder="Tape le nom d'un véhicule..."
              />
              {suggestionsOuvertes && suggestions.length > 0 && (
                <div style={s.autocompleteList}>
                  {suggestions.map((c) => (
                    <div
                      key={c.id}
                      style={s.autocompleteItem}
                      onMouseDown={() => choisirModele(c)}
                    >
                      <span>{c.nom}</span>
                      <span style={{ color: "#71767F", fontSize: 12 }}>{money(c.prixBase)}</span>
                    </div>
                  ))}
                </div>
              )}
              {suggestionsOuvertes && suggestions.length === 0 && (
                <div style={s.autocompleteList}>
                  <div style={{ ...s.autocompleteItem, color: "#71767F", cursor: "default" }}>
                    Aucun modèle ne correspond.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={s.emptyRow}>
              Aucun modèle dans le catalogue — un co-patron ou le patron doit
              d'abord en configurer un.
            </div>
          )}

          <label style={s.label}>Classe du véhicule</label>
          <input
            style={{ ...s.input, opacity: 0.6 }}
            value={modele?.classe ? `Classe ${modele.classe}` : "—"}
            disabled
          />
          <div style={s.previewHint}>
            Reprise du catalogue avec le modèle. Seul un client de cette classe
            ou au-dessus pourra l'acheter.
          </div>

          <label style={s.label}>Genre du véhicule</label>
          {form.categorie ? (
            <input style={{ ...s.input, opacity: 0.6 }} value={form.categorie} disabled />
          ) : (
            <div style={s.emptyRow}>
              Ce modèle n'a pas de genre connu — ajoute-le dans l'onglet
              "Genres" et associe-le au catalogue si besoin.
            </div>
          )}

          <label style={s.label}>Photo du véhicule</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ ...s.input, padding: 8 }}
            disabled={envoiImage}
            onChange={async (e) => {
              const fichier = e.target.files?.[0];
              e.target.value = "";
              if (!fichier) return;
              setEnvoiImage(true);
              try {
                const r = await api.televerserImage(fichier);
                setForm((f) => ({ ...f, image: r.url }));
              } catch (err) {
                onErreur?.(err.message);
              } finally {
                setEnvoiImage(false);
              }
            }}
          />
          <div style={s.previewHint}>
            {envoiImage
              ? "Envoi en cours…"
              : form.image
                ? "Photo enregistrée. Elle reste en ligne, elle n expire pas."
                : "PNG, JPEG, WebP ou GIF. La photo est réduite automatiquement avant l envoi."}
          </div>

          {form.image && (
            <img
              src={form.image}
              alt=""
              style={{
                width: "100%", maxHeight: 150, objectFit: "cover",
                borderRadius: 8, border: "1px solid #2A2D34", marginBottom: 10,
              }}
            />
          )}

          <label style={s.label}>…ou adresse d une image</label>
          <input
            style={s.input}
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
            placeholder="/voitures/sultan.png ou https://..."
          />

          <label style={s.label}>Description</label>
          <textarea
            style={{ ...s.input, minHeight: 70, resize: "vertical", fontFamily: "inherit" }}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ex : état impeccable, jantes custom, intérieur cuir..."
          />

          {true && (
            <>
              <div style={s.formTitle2}>Le joueur qui nous vend le véhicule</div>

              <label style={s.label}>Nom du vendeur</label>
              <input
                style={s.input}
                value={form.clientNom}
                onChange={(e) => setForm({ ...form, clientNom: e.target.value })}
                placeholder="Dolan"
              />

              <label style={s.label}>Prénom du vendeur</label>
              <input
                style={s.input}
                value={form.clientPrenom}
                onChange={(e) => setForm({ ...form, clientPrenom: e.target.value })}
                placeholder="John"
              />

              <label style={s.label}>Classe du joueur</label>
              <select
                style={s.input}
                value={form.clientClasse}
                onChange={(e) => setForm({ ...form, clientClasse: e.target.value })}
              >
                {CLASSES_CLIENT.map((c) => (
                  <option key={c} value={c}>Classe {c}</option>
                ))}
              </select>

              {form.clientNom.trim() && modele?.classe && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    marginBottom: 10,
                    background: rachatAutorise ? "rgba(97,181,120,0.08)" : "rgba(214,90,80,0.10)",
                    border: `1px solid ${rachatAutorise ? "rgba(97,181,120,0.35)" : "rgba(214,90,80,0.5)"}`,
                    fontSize: 12.5,
                    color: rachatAutorise ? "#61B578" : "#D65A50",
                    fontWeight: 600,
                  }}
                >
                  {rachatAutorise
                    ? `Véhicule classe ${modele.classe} · vendeur classe ${form.clientClasse} — rachat possible`
                    : `Rachat impossible : un joueur de classe ${form.clientClasse} n'a pas pu acheter une ${modele.classe}.`}
                </div>
              )}

              <div style={s.previewHint}>
                Renseigné, le rachat est enregistré dans « Ventes réalisées »
                et son contrat est généré automatiquement à ton nom.
              </div>
            </>
          )}

          <label style={s.label}>Prix de base (fixé par le catalogue)</label>
          <input style={{ ...s.input, opacity: 0.6 }} value={money(prixBase)} disabled />

          <div style={s.previewBox}>
            <div style={s.previewRow}>
              <span>Réduction appliquée (selon tranche de prix)</span>
              <strong>
                {form.type === "Occasion" ? `-${money(reductionApplicable)}` : "— (import)"}
              </strong>
            </div>
            <div style={s.previewRow}>
              <span>Marge appliquée (selon tranche de prix)</span>
              <strong>{form.type === "Occasion" ? `+${money(margeApplicable)}` : "— (import)"}</strong>
            </div>
          </div>
          <div style={s.previewHint}>
            La réduction et la marge viennent des tranches de prix
            configurées dans l'onglet "Paramètres". Le kilométrage sera
            renseigné par le vendeur au moment de la vente.
          </div>

          <div style={s.previewBox}>
            <div style={s.previewRow}>
              <span>Prix d'achat</span>
              <strong>{money(preview.prixAchat)}</strong>
            </div>
            <div style={s.previewRow}>
              <span>Prix de vente</span>
              <strong style={{ color: "#F2A93B" }}>{money(preview.prixVente)}</strong>
            </div>
          </div>

          <button
            type="submit"
            style={{ ...s.submitBtn, ...(rachatAutorise ? {} : { opacity: 0.45, cursor: "not-allowed" }) }}
            disabled={!rachatAutorise && !!form.clientNom.trim()}
          >
            Enregistrer le véhicule
          </button>
        </form>

        {peutVoirStockDetaille && (
          <div style={s.stockList}>
            {vehicles.map((v) => {
              const { prixAchat, prixVente } = computePrices(v);
              return (
                <div style={{ ...s.stockRow, ...(isMobile ? s.stockRowMobile : {}) }} key={v.id}>
                  {v.image ? (
                    <img src={v.image} alt="" style={s.stockThumb} />
                  ) : (
                    <div style={{ ...s.stockThumb, background: "#1D2027" }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700 }}>{v.nom}</span>
                      <Badge tone={v.type === "Import" ? "blue" : "amber"}>{v.type}</Badge>
                      {v.categorie && <Badge tone="grey">{v.categorie}</Badge>}
                    </div>
                    <div style={s.stockMeta}>
                      Base {money(v.prixBase)} · Achat {money(prixAchat)} · Vente {money(prixVente)}
                      {v.achatPar && ` · Acheté par ${v.achatPar}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      style={{
                        ...s.statutBtn,
                        ...(v.statut === "En stock"
                          ? {}
                          : { background: "rgba(97,181,120,0.14)", color: "#61B578" }),
                      }}
                      onClick={() => toggleStatut(v.id)}
                    >
                      {v.statut}
                    </button>
                    <button
                      style={{
                        ...s.statutBtn,
                        ...(aSupprimer === v.id
                          ? { borderColor: "#D2685F", color: "#D2685F" }
                          : {}),
                      }}
                      onClick={() =>
                        aSupprimer === v.id ? supprimerVehicule(v.id) : setASupprimer(v.id)
                      }
                      onBlur={() => setASupprimer((x) => (x === v.id ? null : x))}
                    >
                      {aSupprimer === v.id ? "Confirmer ?" : "Supprimer"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function Catalogue({ catalogue, categories, onRefresh, onErreur, isMobile }) {
  const [form, setForm] = useState({ nom: "", prixBase: "", genre: "", classe: "C", origine: "concessionnaire" });
  const [recherche, setRecherche] = useState("");
  const [filtreGenre, setFiltreGenre] = useState("Tous");
  const [filtreOrigine, setFiltreOrigine] = useState("Tous");
  // Le prix tape reste local tant que le champ a le focus : on n envoie a
  // l API qu une fois, quand on quitte le champ.
  const [prixLocaux, setPrixLocaux] = useState({});
  const [aConfirmer, setAConfirmer] = useState(null);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    if (!form.genre && categories.length) setForm((f) => ({ ...f, genre: categories[0] }));
  }, [categories]); // eslint-disable-line

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return catalogue
      .filter((c) => (filtreGenre === "Tous" ? true : c.genre === filtreGenre))
      .filter((c) => (filtreOrigine === "Tous" ? true : c.origine === filtreOrigine))
      .filter((c) => (q ? (c.nom || "").toLowerCase().includes(q) : true));
  }, [catalogue, recherche, filtreGenre, filtreOrigine]);

  async function ajouterModele(e) {
    e.preventDefault();
    if (!form.nom.trim() || !form.prixBase) return;
    setOccupe(true);
    try {
      await api.ajouterModele({
        nom: form.nom.trim(),
        prixBase: Number(form.prixBase) || 0,
        genre: form.genre,
        classe: form.classe,
        origine: form.origine,
      });
      setForm({ nom: "", prixBase: "", genre: form.genre, classe: form.classe, origine: form.origine });
      await onRefresh?.();
    } catch (err) {
      onErreur?.(err.message);
    } finally {
      setOccupe(false);
    }
  }

  async function enregistrerPrix(c) {
    const saisi = prixLocaux[c.id];
    if (saisi === undefined) return;
    const valeur = Math.round(Number(saisi) || 0);
    setPrixLocaux((p) => {
      const n = { ...p };
      delete n[c.id];
      return n;
    });
    if (valeur === c.prixBase) return;
    try {
      await api.majModele(c.id, { prixBase: valeur });
      await onRefresh?.();
    } catch (err) {
      onErreur?.(err.message);
    }
  }

  async function changerGenre(c, genre) {
    try {
      await api.majModele(c.id, { genre });
      await onRefresh?.();
    } catch (err) {
      onErreur?.(err.message);
    }
  }

  async function supprimer(id) {
    setAConfirmer(null);
    try {
      await api.supprimerModele(id);
      await onRefresh?.();
    } catch (err) {
      onErreur?.(err.message);
    }
  }

  return (
    <section>
      <div style={s.sectionHead}>
        <h1 style={{ ...s.h1, ...(isMobile ? s.h1Mobile : {}) }}>Catalogue des prix de base</h1>
        <p style={s.subtitle}>
          Prix catalogue du concessionnaire par modèle (pas le prix payé au
          joueur). Il sera proposé automatiquement lors de l'enregistrement
          d'un véhicule, en occasion ou en import. Toute modification est
          enregistrée pour toute l'entreprise.
        </p>
      </div>

      <div style={{ ...s.gestionLayout, ...(isMobile ? s.gestionLayoutMobile : {}) }}>
        <form onSubmit={ajouterModele} style={s.formCard}>
          <div style={s.formTitle}>Ajouter un modèle</div>

          <label style={s.label}>Nom du modèle</label>
          <input
            style={s.input}
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            placeholder="ex : Ocelot Jugular"
          />

          <label style={s.label}>Genre</label>
          <select
            style={s.input}
            value={form.genre}
            onChange={(e) => setForm({ ...form, genre: e.target.value })}
          >
            {categories.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <label style={s.label}>Classe</label>
          <select
            style={s.input}
            value={form.classe}
            onChange={(e) => setForm({ ...form, classe: e.target.value })}
          >
            {["C", "B", "A"].map((c) => (
              <option key={c} value={c}>Classe {c}</option>
            ))}
          </select>

          <label style={s.label}>Provenance</label>
          <select
            style={s.input}
            value={form.origine}
            onChange={(e) => setForm({ ...form, origine: e.target.value })}
          >
            <option value="concessionnaire">Concessionnaire</option>
            <option value="import">Import</option>
          </select>

          <label style={s.label}>Prix de base</label>
          <input
            style={s.input}
            type="number"
            value={form.prixBase}
            onChange={(e) => setForm({ ...form, prixBase: e.target.value })}
            placeholder="ex : 120000"
          />

          <button type="submit" style={s.submitBtn} disabled={occupe}>
            {occupe ? "Enregistrement…" : "Ajouter au catalogue"}
          </button>
        </form>

        <div>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              style={{ ...s.input, flex: 1, minWidth: 180, margin: 0 }}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un modèle…"
            />
            <select
              style={{ ...s.input, width: isMobile ? "100%" : 170, margin: 0 }}
              value={filtreOrigine}
              onChange={(e) => setFiltreOrigine(e.target.value)}
            >
              <option value="Tous">Toutes provenances</option>
              <option value="concessionnaire">Concessionnaire</option>
              <option value="import">Import</option>
            </select>
            <select
              style={{ ...s.input, width: isMobile ? "100%" : 190, margin: 0 }}
              value={filtreGenre}
              onChange={(e) => setFiltreGenre(e.target.value)}
            >
              <option value="Tous">Tous les genres</option>
              {categories.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "#71767F", whiteSpace: "nowrap" }}>
              {visibles.length} / {catalogue.length} modèles
            </span>
          </div>

          <div style={{ ...s.stockList, maxHeight: 620, overflowY: "auto" }}>
            {visibles.map((c) => (
              <div style={{ ...s.stockRow, ...(isMobile ? s.stockRowMobile : {}) }} key={c.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{c.nom}</div>
                  <span style={{ fontSize: 11, color: "#71767F" }}>
                    {c.classe ? `Classe ${c.classe}` : "—"}
                    {c.origine === "import" ? " · Import" : ""}
                    {"  ·  "}
                  </span>
                  <select
                    value={c.genre || ""}
                    onChange={(e) => changerGenre(c, e.target.value)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#71767F",
                      fontSize: 11.5,
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    {categories.map((g) => (
                      <option key={g} value={g} style={{ background: "#1D2027", color: "#E8E6E1" }}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  style={{ ...s.input, width: 130 }}
                  type="number"
                  value={prixLocaux[c.id] ?? c.prixBase}
                  onChange={(e) =>
                    setPrixLocaux((p) => ({ ...p, [c.id]: e.target.value }))
                  }
                  onBlur={() => enregistrerPrix(c)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                />
                <button
                  style={{
                    ...s.statutBtn,
                    ...(aConfirmer === c.id
                      ? { borderColor: "#D2685F", color: "#D2685F" }
                      : {}),
                  }}
                  onClick={() =>
                    aConfirmer === c.id ? supprimer(c.id) : setAConfirmer(c.id)
                  }
                  onBlur={() => setAConfirmer((v) => (v === c.id ? null : v))}
                >
                  {aConfirmer === c.id ? "Confirmer ?" : "Retirer"}
                </button>
              </div>
            ))}
            {visibles.length === 0 && (
              <div style={s.emptyRow}>
                {catalogue.length === 0
                  ? "Aucun modèle configuré."
                  : "Aucun modèle ne correspond à la recherche."}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
// Gestion des genres/catégories personnalisées (Sport, Tout-terrain, etc.)
function Genres({ genres, onRefresh, onErreur, isMobile }) {
  const [nom, setNom] = useState("");
  const [aConfirmer, setAConfirmer] = useState(null);

  async function ajouter(e) {
    e.preventDefault();
    const val = nom.trim();
    if (!val || genres.some((g) => g.nom.toLowerCase() === val.toLowerCase())) return;
    try {
      await api.ajouterGenre(val);
      setNom("");
      await onRefresh?.();
    } catch (err) {
      onErreur?.(err.message);
    }
  }

  async function supprimer(id) {
    setAConfirmer(null);
    try {
      await api.supprimerGenre(id);
      await onRefresh?.();
    } catch (err) {
      onErreur?.(err.message);
    }
  }

  return (
    <section>
      <div style={s.sectionHead}>
        <h1 style={{ ...s.h1, ...(isMobile ? s.h1Mobile : {}) }}>Genres de véhicules</h1>
        <p style={s.subtitle}>
          Crée tes propres genres (Sport, Tout-terrain, Luxe...) pour classer
          les véhicules dans la vitrine et les espaces de vente.
        </p>
      </div>

      <div style={{ ...s.gestionLayout, ...(isMobile ? s.gestionLayoutMobile : {}) }}>
        <form onSubmit={ajouter} style={s.formCard}>
          <div style={s.formTitle}>Ajouter un genre</div>
          <label style={s.label}>Nom du genre</label>
          <input
            style={s.input}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="ex : Berline, Moto, Utilitaire..."
          />
          <button type="submit" style={s.submitBtn}>
            Ajouter
          </button>
        </form>

        <div style={s.stockList}>
          {genres.map((g) => (
            <div style={{ ...s.stockRow, ...(isMobile ? s.stockRowMobile : {}) }} key={g.id}>
              <div style={{ flex: 1, fontWeight: 700 }}>{g.nom}</div>
              <button
                style={{
                  ...s.statutBtn,
                  ...(aConfirmer === g.id ? { borderColor: "#D2685F", color: "#D2685F" } : {}),
                }}
                onClick={() => (aConfirmer === g.id ? supprimer(g.id) : setAConfirmer(g.id))}
                onBlur={() => setAConfirmer((v) => (v === g.id ? null : v))}
              >
                {aConfirmer === g.id ? "Confirmer ?" : "Retirer"}
              </button>
            </div>
          ))}
          {genres.length === 0 && (
            <div style={s.emptyRow}>Aucun genre configuré.</div>
          )}
        </div>
      </div>
    </section>
  );
}
// Réglages globaux de réduction/marge par défaut (Co-patron/Patron).
// Composant réutilisable pour gérer des tranches "à partir de X$ → montant Y$"
// (utilisé pour la réduction ET la marge, selon le prix catalogue).
function TranchesMontant({ titre, description, tiers, setTiers, onEnregistrer, isMobile }) {
  const [nouveauSeuil, setNouveauSeuil] = useState("");
  const [nouveauMontant, setNouveauMontant] = useState("");
  const [etat, setEtat] = useState("");

  // Les tranches viennent de l API sans identifiant : on travaille sur la
  // position dans la liste, et on enregistre l ensemble en une fois.
  const ordonnees = [...tiers].sort((a, b) => a.seuil - b.seuil);

  function ajouter(e) {
    e.preventDefault();
    const seuil = parseFloat(nouveauSeuil);
    const montant = parseFloat(nouveauMontant);
    if (isNaN(seuil) || isNaN(montant)) return;
    setTiers([...ordonnees, { seuil, montant }]);
    setNouveauSeuil("");
    setNouveauMontant("");
    setEtat("");
  }

  function majTranche(i, champ, valeur) {
    setTiers(ordonnees.map((t, k) => (k === i ? { ...t, [champ]: valeur } : t)));
    setEtat("");
  }

  function supprimerTranche(i) {
    setTiers(ordonnees.filter((_, k) => k !== i));
    setEtat("");
  }

  async function enregistrer() {
    setEtat("envoi");
    try {
      await onEnregistrer?.(ordonnees.map((t) => ({ seuil: t.seuil, montant: t.montant })));
      setEtat("ok");
    } catch (err) {
      setEtat("erreur");
    }
  }

  return (
    <div style={{ ...s.formCard, maxWidth: 480, marginTop: 20 }}>
      <div style={s.formTitle}>{titre}</div>
      <p style={{ ...s.subtitle, fontSize: 13, marginTop: 0, maxWidth: "none" }}>{description}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {ordonnees.map((t, i) => (
          <div key={i} style={{ ...s.stockRow, ...(isMobile ? s.stockRowMobile : {}) }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={s.previewHint}>À partir de</span>
              <input
                style={{ ...s.input, width: 110 }}
                type="number"
                value={t.seuil}
                onChange={(e) => majTranche(i, "seuil", parseFloat(e.target.value) || 0)}
              />
              <span style={s.previewHint}>$ →</span>
              <input
                style={{ ...s.input, width: 100 }}
                type="number"
                value={t.montant}
                onChange={(e) => majTranche(i, "montant", parseFloat(e.target.value) || 0)}
              />
              <span style={s.previewHint}>$</span>
            </div>
            <button style={s.statutBtn} onClick={() => supprimerTranche(i)}>
              Retirer
            </button>
          </div>
        ))}
        {ordonnees.length === 0 && (
          <div style={s.emptyRow}>Aucune tranche configurée — 0$ partout.</div>
        )}
      </div>

      <form onSubmit={ajouter} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={s.label}>À partir de ($)</label>
          <input
            style={s.input}
            type="number"
            value={nouveauSeuil}
            onChange={(e) => setNouveauSeuil(e.target.value)}
            placeholder="ex : 20000"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={s.label}>Montant ($)</label>
          <input
            style={s.input}
            type="number"
            value={nouveauMontant}
            onChange={(e) => setNouveauMontant(e.target.value)}
            placeholder="ex : 8000"
          />
        </div>
        <button type="submit" style={{ ...s.submitBtn, marginTop: 0, width: "auto", padding: "9px 16px" }}>
          Ajouter
        </button>
      </form>

      <button
        type="button"
        onClick={enregistrer}
        style={{ ...s.submitBtn, marginTop: 12 }}
        disabled={etat === "envoi"}
      >
        {etat === "envoi" ? "Enregistrement…" : etat === "ok" ? "Tranches enregistrées ✓" : "Enregistrer ces tranches"}
      </button>
      <div style={s.previewHint}>
        Les tranches ne sont appliquées aux prochains véhicules qu'une fois enregistrées.
      </div>
    </div>
  );
}
function Parametres({ parametres, setParametres, reductionTiers, setReductionTiers, margeTiers, setMargeTiers, moi, onRefresh, onErreur, isMobile }) {
  const [reductionMaxVente, setReductionMaxVente] = useState(String(parametres.reductionMaxVente));
  const [kmIntervalle, setKmIntervalle] = useState(String(parametres.kmIntervalle));
  const [kmMontant, setKmMontant] = useState(String(parametres.kmMontant));
  const [salaireBase, setSalaireBase] = useState(String(parametres.salaireBase ?? 3500));
  const [primeParOperation, setPrimeParOperation] = useState(String(parametres.primeParOperation ?? 250));

  const [etat, setEtat] = useState("");

  async function enregistrer(e) {
    e.preventDefault();
    const valeurs = {
      reductionMaxVente: Math.min(100, Math.max(0, parseFloat(reductionMaxVente) || 0)),
      kmIntervalle: Math.max(1, parseFloat(kmIntervalle) || 1),
      kmMontant: parseFloat(kmMontant) || 0,
      salaireBase: Math.max(0, parseFloat(salaireBase) || 0),
      primeParOperation: Math.max(0, parseFloat(primeParOperation) || 0),
    };
    setEtat("envoi");
    try {
      await api.majParametres(valeurs);
      setParametres(valeurs);
      await onRefresh?.();
      setEtat("ok");
    } catch (err) {
      setEtat("");
      onErreur?.(err.message);
    }
  }

  return (
    <section>
      <div style={s.sectionHead}>
        <h1 style={{ ...s.h1, ...(isMobile ? s.h1Mobile : {}) }}>Paramètres</h1>
        <p style={s.subtitle}>
          La réduction et la marge sont des montants fixes ($), qui dépendent
          de tranches de prix catalogue — pas un pourcentage. Occasion
          uniquement : un véhicule Import se vend exactement au prix de base.
        </p>
      </div>

      <form onSubmit={enregistrer} style={{ ...s.formCard, maxWidth: 340 }}>
        <div style={s.formTitle}>Marge de négociation employés</div>
        <label style={s.label}>Réduction max. autorisée à la vente (%)</label>
        <input
          style={s.input}
          type="number"
          min="0"
          max="100"
          value={reductionMaxVente}
          onChange={(e) => setReductionMaxVente(e.target.value)}
        />
        <div style={s.previewHint}>
          C'est le plafond que les employés pourront proposer à un client
          quand ils vendent un véhicule.
        </div>

        <div style={s.formTitle2}>Surcharge kilométrage</div>
        <div style={{ ...s.formRow2, ...(isMobile ? s.formRow2Mobile : {}) }}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Tous les X km</label>
            <input
              style={s.input}
              type="number"
              min="1"
              value={kmIntervalle}
              onChange={(e) => setKmIntervalle(e.target.value)}
              placeholder="ex : 10000"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Montant ajouté ($)</label>
            <input
              style={s.input}
              type="number"
              min="0"
              value={kmMontant}
              onChange={(e) => setKmMontant(e.target.value)}
              placeholder="ex : 500"
            />
          </div>
        </div>
        <div style={s.previewHint}>
          Ex. avec 10 000 km et 500 $ : un véhicule à 45 000 km au compteur
          ajoute 4 × 500 $ = 2 000 $ au prix de vente.
        </div>

        <div style={s.formTitle2}>Paie des employés</div>
        <label style={s.label}>Salaire de base ($ par employé et par période)</label>
        <input
          style={s.input}
          type="number"
          min="0"
          value={salaireBase}
          onChange={(e) => setSalaireBase(e.target.value)}
          placeholder="ex : 3500"
        />

        <label style={s.label}>Prime par opération ($)</label>
        <input
          style={s.input}
          type="number"
          min="0"
          value={primeParOperation}
          onChange={(e) => setPrimeParOperation(e.target.value)}
          placeholder="ex : 250"
        />
        <div style={s.previewHint}>
          Une vente et un rachat comptent pareil. Ex. avec 3 500 $ et 250 $ :
          un employé qui a fait 4 opérations touche 3 500 + 4 × 250 = 4 500 $.
          Le détail par employé est dans l'onglet "Salaires".
        </div>

        <button type="submit" style={s.submitBtn} disabled={etat === "envoi"}>
          {etat === "envoi" ? "Enregistrement…" : etat === "ok" ? "Réglages enregistrés ✓" : "Enregistrer les réglages"}
        </button>
      </form>

      <TranchesMontant
        titre="Réduction selon le prix catalogue"
        description="Ce que tu payes au joueur = prix de base − ce montant. Plus le prix catalogue est élevé, plus la tranche peut être différente."
        tiers={reductionTiers}
        setTiers={setReductionTiers}
        onEnregistrer={async (t) => { await api.majTranchesReduction({ tranches: t }); await onRefresh?.(); }}
        isMobile={isMobile}
      />

      <TranchesMontant
        titre="Marge selon le prix catalogue"
        description="Ajoutée au prix d'achat pour obtenir le prix de vente. Occasion uniquement — l'Import n'a jamais de marge."
        tiers={margeTiers}
        setTiers={setMargeTiers}
        onEnregistrer={async (t) => { await api.majTranchesMarge({ tranches: t }); await onRefresh?.(); }}
        isMobile={isMobile}
      />
      <Photos isMobile={isMobile} />
      <Employes moi={moi} isMobile={isMobile} />
    </section>
  );
}

function AccesRefuse() {
  return (
    <section style={s.deniedBox}>
      <div style={s.deniedTitle}>Accès réservé</div>
      <p style={s.deniedText}>
        Cette page est réservée à un grade supérieur sur le Discord de
        l'entreprise. Rejoins le serveur et demande ton rôle pour y accéder.
      </p>
    </section>
  );
}

/* ---------------------------- App ---------------------------- */

export default function App() {
  useFonts();
  const isMobile = useIsMobile();
  const path = useRoute();
  // Seule l'adresse /entreprise donne accès au site complet (connexion +
  // espaces internes). Tout le reste retombe sur la vitrine publique.
  const estRouteEntreprise = path.startsWith("/entreprise");

  const [moi, setMoi] = useState(null);
  const [verifie, setVerifie] = useState(false);
  const [erreur, setErreur] = useState("");
  const [tab, setTab] = useState("vitrine");

  const [vehicles, setVehicles] = useState([]);
  const [vitrinePub, setVitrinePub] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [categories, setCategories] = useState([]);
  const [genres, setGenres] = useState([]);
  const [parametres, setParametres] = useState(SEED_PARAMETRES);
  const [reductionTiers, setReductionTiers] = useState([]);
  const [margeTiers, setMargeTiers] = useState([]);

  const role = moi?.grade || "Visiteur";

  // ---------------------------------------------------------- chargement
  const chargerPublic = useCallback(async () => {
    try {
      const [v, g] = await Promise.all([api.vitrine(), api.genres()]);
      setVitrinePub(v.map(depuisApi));
      setGenres(g);
      setCategories(g.map((x) => x.nom));
    } catch (e) {
      setErreur(e.message);
    }
  }, []);

  const chargerInterne = useCallback(async () => {
    if (!api.estConnecte()) return;
    try {
      const [v, c, g, p] = await Promise.all([
        api.vehicules(),
        api.catalogue(),
        api.genres(),
        api.parametres(),
      ]);
      setVehicles(v.map(depuisApi));
      setCatalogue(c.map((m) => ({ id: m.id, nom: m.nom, prixBase: m.prix_base, genre: m.genre, classe: m.classe || "", origine: m.origine || "concessionnaire" })));
      setGenres(g);
      setCategories(g.map((x) => x.nom));
      setParametres({
        reductionMaxVente: p.reductionMaxVente,
        kmIntervalle: p.kmIntervalle,
        kmMontant: p.kmMontant,
        salaireBase: p.salaireBase,
        primeParOperation: p.primeParOperation,
      });
      setReductionTiers(p.tranchesReduction || []);
      setMargeTiers(p.tranchesMarge || []);
      setErreur("");
    } catch (e) {
      setErreur(e.message);
    }
  }, []);

  // Reprise de session au chargement de la page.
  useEffect(() => {
    let vivant = true;
    (async () => {
      if (api.estConnecte()) {
        try {
          const e = await api.moi();
          if (vivant) setMoi(e);
        } catch {
          /* jeton périmé : on retombe sur l'écran de connexion */
        }
      }
      if (vivant) setVerifie(true);
    })();
    return () => { vivant = false; };
  }, []);

  useEffect(() => { chargerPublic(); }, [chargerPublic]);
  useEffect(() => { if (moi) chargerInterne(); }, [moi, chargerInterne]);

  // Onglet par défaut selon le grade, et repli si le grade ne permet plus l'onglet.
  useEffect(() => {
    if (!moi) return;
    if (tab === "vitrine" && ["Vendeur/Vendeuse", "Manager"].includes(role)) setTab("occasion");
    if (["occasion", "import"].includes(tab) && !CAN_MANAGE_STOCK.includes(role)) setTab("vitrine");
    if (tab === "gestion" && !CAN_EDIT_VEHICLES.includes(role)) setTab("vitrine");
    if (["catalogue", "genres", "parametres"].includes(tab) && !CAN_MANAGE_CATALOGUE.includes(role)) setTab("vitrine");
    if (["salaires", "depenses", "compta"].includes(tab) && !CAN_VIEW_FINANCES.includes(role)) setTab("vitrine");
    if (tab === "ventes-realisees" && !CAN_VIEW_SALES.includes(role)) setTab("vitrine");
  }, [role, moi]); // eslint-disable-line

  async function deconnexion() {
    await api.deconnexion();
    setMoi(null);
    setVehicles([]);
    setTab("vitrine");
  }

  const Marque = () => (
    <div style={s.brand}>
      {LOGO_URL ? (
        <img src={LOGO_URL} alt={NOM_ENTREPRISE} style={s.brandLogoImg} />
      ) : (
        <span style={s.brandMark}>CA</span>
      )}
      <span style={s.brandName}>{NOM_ENTREPRISE}</span>
    </div>
  );

  // ---------------------------------------------------- vitrine publique
  if (!estRouteEntreprise) {
    return (
      <div style={s.app}>
        <header style={{ ...s.header, ...(isMobile ? s.headerMobile : {}) }}>
          <Marque />
        </header>
        <main style={{ ...s.main, ...(isMobile ? s.mainMobile : {}) }}>
          <Vitrine vehicles={vitrinePub} categories={categories} role="Visiteur" isMobile={isMobile} />
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------- connexion
  if (!verifie) {
    return (
      <div style={{ ...s.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#71767F" }}>Chargement…</span>
      </div>
    );
  }

  if (!moi) {
    return (
      <Connexion
        onConnecte={setMoi}
        logo={LOGO_URL}
        nomEntreprise={NOM_ENTREPRISE}
        isMobile={isMobile}
      />
    );
  }

  // ---------------------------------------------------------- espace interne
  const tabs = [
    { key: "vitrine", label: "Vitrine", visible: !["Vendeur/Vendeuse", "Manager"].includes(role) },
    { key: "occasion", label: "Occasion", visible: CAN_MANAGE_STOCK.includes(role) },
    { key: "import", label: "Import", visible: CAN_MANAGE_STOCK.includes(role) },
    { key: "gestion", label: "Gestion véhicules", visible: CAN_EDIT_VEHICLES.includes(role) },
    { key: "ventes-realisees", label: "Ventes réalisées", visible: CAN_VIEW_SALES.includes(role) },
    { key: "contrats", label: "Contrats", visible: true },
    { key: "compta", label: "Compta", visible: CAN_VIEW_FINANCES.includes(role) },
    { key: "salaires", label: "Salaires", visible: CAN_VIEW_FINANCES.includes(role) },
    { key: "depenses", label: "Dépenses", visible: CAN_VIEW_FINANCES.includes(role) },
    { key: "catalogue", label: "Catalogue prix", visible: CAN_MANAGE_CATALOGUE.includes(role) },
    { key: "genres", label: "Genres", visible: CAN_MANAGE_CATALOGUE.includes(role) },
    { key: "parametres", label: "Paramètres", visible: CAN_MANAGE_CATALOGUE.includes(role) },
  ];

  return (
    <div style={s.app}>
      <header style={{ ...s.header, ...(isMobile ? s.headerMobile : {}) }}>
        <Marque />
        <nav style={s.nav}>
          {tabs
            .filter((t) => t.visible)
            .map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{ ...s.navBtn, ...(tab === t.key ? s.navBtnActive : {}) }}
              >
                {t.label}
              </button>
            ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right", lineHeight: 1.25 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{moi.prenom} {moi.nom}</div>
            <div style={{ fontSize: 11, color: "#F2A93B" }}>{moi.grade}</div>
          </div>
          <button
            onClick={deconnexion}
            style={{
              background: "transparent",
              border: "1px solid #2A2D34",
              color: "#9CA0A8",
              fontSize: 12,
              padding: "6px 12px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main style={{ ...s.main, ...(isMobile ? s.mainMobile : {}) }}>
        {erreur && (
          <div
            style={{
              background: "rgba(210,104,95,.08)",
              border: "1px solid rgba(210,104,95,.4)",
              color: "#D2685F",
              borderRadius: 8,
              padding: "10px 13px",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {erreur}
          </div>
        )}

        {tab === "vitrine" && (
          <Vitrine vehicles={vehicles} categories={categories} role={role} isMobile={isMobile} />
        )}

        {tab === "occasion" &&
          (CAN_MANAGE_STOCK.includes(role) ? (
            <EspaceVente
              vehicles={vehicles}
              categories={categories}
              onRefresh={chargerInterne}
              onErreur={setErreur}
              moi={moi}
              isMobile={isMobile}
              type="Occasion"
              titre="Occasion"
              sousTitre="Véhicules rachetés à des joueurs, à vendre. Clique sur un véhicule pour enregistrer sa vente."
              reductionMax={parametres.reductionMaxVente}
              parametres={parametres}
            />
          ) : (
            <AccesRefuse />
          ))}

        {tab === "import" &&
          (CAN_MANAGE_STOCK.includes(role) ? (
            <EspaceVente
              vehicles={vehicles}
              categories={categories}
              onRefresh={chargerInterne}
              onErreur={setErreur}
              moi={moi}
              isMobile={isMobile}
              type="Import"
              titre="Import"
              sousTitre="Véhicules importés, à vendre. Clique sur un véhicule pour enregistrer sa vente."
              reductionMax={parametres.reductionMaxVente}
              parametres={parametres}
            />
          ) : (
            <AccesRefuse />
          ))}

        {tab === "gestion" &&
          (CAN_EDIT_VEHICLES.includes(role) ? (
            <EspaceGestion
              vehicles={vehicles}
              onRefresh={chargerInterne}
              onErreur={setErreur}
              role={role}
              catalogue={catalogue}
              categories={categories}
              parametres={parametres}
              reductionTiers={reductionTiers}
              margeTiers={margeTiers}
              isMobile={isMobile}
            />
          ) : (
            <AccesRefuse />
          ))}

        {tab === "ventes-realisees" &&
          (CAN_VIEW_SALES.includes(role) ? (
            <VentesRealiseesApi moi={moi} isMobile={isMobile} />
          ) : (
            <AccesRefuse />
          ))}

        {tab === "contrats" && <Contrats moi={moi} isMobile={isMobile} />}

        {tab === "compta" &&
          (CAN_VIEW_FINANCES.includes(role) ? <Compta isMobile={isMobile} /> : <AccesRefuse />)}

        {tab === "salaires" &&
          (CAN_VIEW_FINANCES.includes(role) ? <Salaires moi={moi} isMobile={isMobile} /> : <AccesRefuse />)}

        {tab === "depenses" &&
          (CAN_VIEW_FINANCES.includes(role) ? <Depenses isMobile={isMobile} /> : <AccesRefuse />)}

        {tab === "parametres" &&
          (CAN_MANAGE_CATALOGUE.includes(role) ? (
            <Parametres
              parametres={parametres}
              setParametres={setParametres}
              reductionTiers={reductionTiers}
              setReductionTiers={setReductionTiers}
              margeTiers={margeTiers}
              setMargeTiers={setMargeTiers}
              moi={moi}
              onRefresh={chargerInterne}
              onErreur={setErreur}
              isMobile={isMobile}
            />
          ) : (
            <AccesRefuse />
          ))}

        {tab === "catalogue" &&
          (CAN_MANAGE_CATALOGUE.includes(role) ? (
            <Catalogue
              catalogue={catalogue}
              categories={categories}
              onRefresh={chargerInterne}
              onErreur={setErreur}
              isMobile={isMobile}
            />
          ) : (
            <AccesRefuse />
          ))}

        {tab === "genres" &&
          (CAN_MANAGE_CATALOGUE.includes(role) ? (
            <Genres
              genres={genres}
              onRefresh={chargerInterne}
              onErreur={setErreur}
              isMobile={isMobile}
            />
          ) : (
            <AccesRefuse />
          ))}
      </main>
    </div>
  );
}

/* ---------------------------- Styles ---------------------------- */

const s = {
  app: {
    minHeight: "100vh",
    background: "#14161A",
    color: "#E8E6E1",
    fontFamily: "'Inter', sans-serif",
    paddingBottom: 60,
  },
  roleSwitcher: {
    background: "#0F1013",
    borderBottom: "1px solid #24272E",
    padding: "10px 24px",
    display: "flex",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  roleSwitcherLabel: { fontSize: 12, color: "#71767F", fontWeight: 500 },
  roleButtons: { display: "flex", gap: 6, flexWrap: "wrap" },
  roleBtn: {
    background: "transparent",
    border: "1px solid #2A2D34",
    color: "#9CA0A8",
    fontSize: 12,
    padding: "5px 12px",
    borderRadius: 20,
    cursor: "pointer",
  },
  roleBtnActive: { background: "#F2A93B", borderColor: "#F2A93B", color: "#14161A", fontWeight: 700 },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 32px",
    borderBottom: "1px solid #24272E",
    gap: 16,
    flexWrap: "wrap",
  },
  headerMobile: { flexDirection: "column", alignItems: "flex-start", padding: "16px 18px" },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: "#F2A93B",
    color: "#14161A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontFamily: "'Big Shoulders Display', sans-serif",
    fontSize: 15,
  },
  brandLogoImg: { width: 40, height: 40, borderRadius: 6, objectFit: "contain" },
  brandName: { fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: 1 },
  nav: { display: "flex", gap: 6, flexWrap: "wrap" },
  navBtn: {
    background: "transparent",
    border: "none",
    color: "#9CA0A8",
    fontSize: 14,
    fontWeight: 600,
    padding: "8px 16px",
    borderRadius: 8,
    cursor: "pointer",
  },
  navBtnActive: { background: "#1D2027", color: "#F2A93B" },
  roleTag: {},
  main: { padding: "36px 32px", maxWidth: 1100, margin: "0 auto" },
  mainMobile: { padding: "24px 16px" },
  sectionHead: { marginBottom: 20 },
  h1: {
    fontFamily: "'Big Shoulders Display', sans-serif",
    fontSize: 40,
    fontWeight: 800,
    margin: 0,
    letterSpacing: 0.5,
  },
  h1Mobile: { fontSize: 28 },
  subtitle: { color: "#9CA0A8", marginTop: 6, fontSize: 15, maxWidth: 520 },
  categoryFilter: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 },
  categoryChip: {
    background: "transparent",
    border: "1px solid #2A2D34",
    color: "#9CA0A8",
    fontSize: 13,
    fontWeight: 600,
    padding: "6px 14px",
    borderRadius: 20,
    cursor: "pointer",
  },
  categoryChipActive: { background: "#F2A93B", borderColor: "#F2A93B", color: "#14161A" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 20 },
  gridMobile: { gridTemplateColumns: "1fr" },
  card: { background: "#1B1E24", borderRadius: 14, overflow: "hidden", border: "1px solid #24272E" },
  cardImage: { height: 150, backgroundSize: "cover", backgroundPosition: "center", position: "relative" },
  cardImageShade: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)" },
  cardImageTopLeft: { position: "absolute", top: 10, left: 10 },
  cardImageTopRight: { position: "absolute", top: 10, right: 10 },
  cardBody: { padding: "14px 16px 18px" },
  cardTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 },
  cardTitle: { fontWeight: 700, fontSize: 16 },
  cardPriceRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  cardPriceLabel: { fontSize: 12, color: "#71767F" },
  cardPrice: { fontSize: 20, fontWeight: 800, color: "#F2A93B" },
  priceStack: { display: "flex", flexDirection: "column", gap: 4 },
  priceStackRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  priceStackVal: { fontSize: 14, fontWeight: 700 },
  internalGrid: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid #262A31",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
  },
  internalLabel: { fontSize: 10, color: "#71767F", marginBottom: 2 },
  internalVal: { fontSize: 13, fontWeight: 700 },
  sellHint: { marginTop: 10, fontSize: 12, fontWeight: 700, color: "#F2A93B" },
  cardDescription: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid #262A31",
    fontSize: 13,
    color: "#9CA0A8",
    lineHeight: 1.4,
  },
  emptyRow: { padding: 24, color: "#71767F", fontSize: 14, textAlign: "center" },
  gestionLayout: { display: "grid", gridTemplateColumns: "340px 1fr", gap: 24 },
  gestionLayoutMobile: { gridTemplateColumns: "1fr" },
  formCard: { background: "#1B1E24", border: "1px solid #24272E", borderRadius: 14, padding: 20, height: "fit-content" },
  formTitle: { fontWeight: 700, fontSize: 16, marginBottom: 14 },
  formTitle2: { fontWeight: 700, fontSize: 14, marginTop: 22, marginBottom: 4, paddingTop: 16, borderTop: "1px solid #24272E" },
  label: { display: "block", fontSize: 12, color: "#9CA0A8", marginBottom: 5, marginTop: 12 },
  input: {
    width: "100%",
    background: "#14161A",
    border: "1px solid #2A2D34",
    borderRadius: 8,
    padding: "9px 11px",
    color: "#E8E6E1",
    fontSize: 14,
    boxSizing: "border-box",
  },
  typeToggle: { display: "flex", gap: 8 },
  autocompleteWrap: { position: "relative" },
  autocompleteList: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "#14161A",
    border: "1px solid #2A2D34",
    borderRadius: 8,
    maxHeight: 220,
    overflowY: "auto",
    zIndex: 10,
  },
  autocompleteItem: {
    padding: "9px 11px",
    fontSize: 14,
    display: "flex",
    justifyContent: "space-between",
    cursor: "pointer",
    borderBottom: "1px solid #24272E",
  },
  typeToggleBtn: {
    flex: 1,
    background: "#14161A",
    border: "1px solid #2A2D34",
    color: "#9CA0A8",
    borderRadius: 8,
    padding: "9px 6px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  typeToggleBtnActive: { background: "#F2A93B", borderColor: "#F2A93B", color: "#14161A" },
  formRow2: { display: "flex", gap: 12 },
  formRow2Mobile: { flexDirection: "column" },
  previewBox: { marginTop: 16, background: "#14161A", border: "1px dashed #2A2D34", borderRadius: 10, padding: 12 },
  previewRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" },
  previewHint: { fontSize: 11, color: "#71767F", marginTop: 6 },
  submitBtn: {
    marginTop: 16,
    width: "100%",
    background: "#F2A93B",
    color: "#14161A",
    border: "none",
    borderRadius: 8,
    padding: "11px 0",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  cancelBtn: {
    marginTop: 16,
    width: "100%",
    background: "transparent",
    color: "#9CA0A8",
    border: "1px solid #2A2D34",
    borderRadius: 8,
    padding: "11px 0",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  modalActions: { display: "flex", gap: 10 },
  stockList: { display: "flex", flexDirection: "column", gap: 10 },
  stockRow: { display: "flex", alignItems: "center", gap: 14, background: "#1B1E24", border: "1px solid #24272E", borderRadius: 12, padding: 10 },
  stockRowMobile: { flexWrap: "wrap" },
  stockThumb: { width: 64, height: 48, objectFit: "cover", borderRadius: 8 },
  stockMeta: { fontSize: 12, color: "#9CA0A8", marginTop: 3 },
  statutBtn: {
    background: "rgba(214,90,80,0.14)",
    color: "#D65A50",
    border: "none",
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  deniedBox: { background: "#1B1E24", border: "1px solid #24272E", borderRadius: 14, padding: 40, textAlign: "center", maxWidth: 460, margin: "40px auto" },
  deniedTitle: { fontFamily: "'Big Shoulders Display', sans-serif", fontSize: 24, fontWeight: 800 },
  deniedText: { color: "#9CA0A8", marginTop: 10, fontSize: 14 },
  // Panneau de vente : sur le côté (desktop), plein écran (mobile)
  panelOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    justifyContent: "flex-end",
    zIndex: 50,
  },
  panelCard: {
    background: "#1B1E24",
    borderLeft: "1px solid #24272E",
    padding: 22,
    width: 380,
    maxWidth: "100%",
    height: "100%",
    overflowY: "auto",
    boxSizing: "border-box",
  },
  panelCardMobile: { width: "100%" },
  panelVehiclePreview: { display: "flex", gap: 12, alignItems: "center", marginBottom: 18 },
  panelVehicleImg: { width: 84, height: 60, objectFit: "cover", borderRadius: 8 },
};