# Atlas Auto

Le site de la concession, en deux morceaux indépendants.

    sitegta/
      frontend/   le site (React + Vite)   -> http://localhost:5173
      backend/    l API et la base         -> http://localhost:3001/api

## Démarrer

Deux terminaux, un par dossier.

    cd backend
    npm start

    cd frontend
    npm run dev

Puis ouvrir **http://localhost:5173/entreprise**. L adresse sans `/entreprise`
affiche la vitrine publique, sans connexion.

Le site ne parle jamais directement au port 3001 : Vite fait suivre tout ce qui
commence par `/api` vers le backend (voir `frontend/vite.config.js`). Le
navigateur ne voit donc qu une seule origine — pas de CORS, et rien qu une
extension puisse prendre pour une requête tierce.

## Se connecter

Nom + prénom + code à 5 chiffres. Les codes se gèrent depuis
**Paramètres > Comptes & connexions**.

Code perdu, ou patron enfermé dehors :

    cd backend/outils
    node codes.mjs                        liste les comptes et leurs codes
    node codes.mjs --reset Petit Clovis   génère un nouveau code

Ça ne marche que depuis la machine où se trouve la base.

## Le reste

- `backend/README.md` — les routes de l API, les règles de prix, les contrats.
- `backend/data/atlas.db` — la base SQLite. C est tout l état de l entreprise :
  la sauvegarder, c est copier ce fichier.
- `backend/importer-catalogue.mjs` — recharge les 372 véhicules de base dans le
  catalogue de prix.
- `backend/outils/` — scripts ponctuels (essais, mise à jour des modèles de
  contrat, récupération d accès).

## Mettre en ligne

Le site est statique, il va sur Cloudflare Pages sans problème. L API, non :
Cloudflare fait tourner des isolats V8, pas Node, et `better-sqlite3` est un
module natif avec un fichier sur disque. Il faut donc l héberger ailleurs
(ta machine derrière un Cloudflare Tunnel, ou un hébergeur Node).

### Le site, sur Cloudflare Pages

Dans les réglages du projet Pages :

| Réglage              | Valeur          |
| -------------------- | --------------- |
| Root directory       | `frontend`      |
| Build command        | `npm run build` |
| Build output         | `dist`          |

Et une variable d environnement :

    VITE_API = https://adresse-de-ton-api/api

Elle est lue **au moment du build**, pas à l exécution : après l avoir changée,
il faut relancer un déploiement.

`frontend/public/_redirects` renvoie toutes les adresses vers `index.html`.
Sans lui, ouvrir directement `/entreprise` donnerait une 404.

### L API

À lancer avec ces variables (voir `backend/.env.example`) :

    ORIGINE=https://adresse-exacte-du-site     # sinon l API accepte tout le monde
    CODE_PATRON=                               # laisse vide au 1er démarrage

Au tout premier lancement, la base est créée et le compte patron avec. Si
`CODE_PATRON` est vide, un code à 5 chiffres est tiré au hasard et écrit dans
les journaux — récupère-le là, ou avec `node backend/outils/codes.mjs`.

### Ce qui ne doit jamais partir sur GitHub

`backend/data/` est ignoré par git, et doit le rester : `atlas.db` contient les
codes de connexion de tous les employés en clair. Git garde l historique, donc
un fichier publié une fois reste récupérable même après suppression.