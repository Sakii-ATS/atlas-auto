# Atlas Auto — API

Backend autonome pour le site Atlas Auto. Node + Express + SQLite.
Aucun service externe, aucune base à héberger : la base est un fichier.

## Démarrer

```bash
cd backend
npm install
npm start
```

L'API écoute sur `http://localhost:3001/api`.

Au tout premier démarrage, un compte Patron est créé et affiché dans la
console :

```
nom PATRON · prénom Compte · code 10000
```

Connecte-toi avec, puis crée les vrais comptes dans Paramètres et supprime
celui-là.

## Configuration

Variables d'environnement, toutes optionnelles :

| Variable      | Défaut                | Rôle                                        |
|---------------|-----------------------|---------------------------------------------|
| `PORT`        | `3001`                | Port d'écoute                               |
| `DB_FILE`     | `backend/data/atlas.db` | Emplacement du fichier de base             |
| `ORIGINE`     | tout autoriser        | Origine autorisée pour CORS (ton domaine)   |
| `CODE_PATRON` | `10000`               | Code du compte Patron créé au premier lancement |

En production, mets `ORIGINE` sur l'adresse exacte du site :

```bash
ORIGINE=https://atlas-auto.exemple.com PORT=3001 npm start
```

## Connexion

Pas de bot Discord. Le patron saisit **nom, prénom et grade** de chaque
employé ; l'API génère un **code à 5 chiffres**. L'employé se connecte en
donnant les trois : nom, prénom, code.

```
POST /api/auth/login   { nom, prenom, code }  →  { token, employe }
```

Toutes les autres routes attendent l'en-tête `Authorization: Bearer <token>`.

Régénérer le code d'un employé (`POST /api/employes/:id/code`) ferme ses
sessions ouvertes : c'est ce qu'il faut faire en cas de renvoi.

## Grades

Hiérarchiques — un grade donne tout ce que permettent les grades en dessous.

```
Vendeur/Vendeuse  <  Manager  <  Co-patron  <  Patron
```

| Route                         | Grade minimum     |
|-------------------------------|-------------------|
| `/api/vitrine`                | public            |
| `/api/vehicules` (lecture)    | connecté          |
| `POST /api/vehicules`         | Vendeur/Vendeuse  |
| Import à l'enregistrement     | Manager           |
| `PATCH`/`DELETE /api/vehicules` | Manager         |
| `POST /api/mouvements`        | Vendeur/Vendeuse  |
| `/api/mouvements` (lecture)   | Co-patron         |
| `/api/employes`, `/api/heures`, `/api/salaires`, `/api/depenses` | Co-patron |
| `DELETE /api/employes/:id`    | Patron            |

Le dernier compte Patron actif ne peut pas être supprimé.

## Calcul des prix

Montants fixes en dollars, par tranches — pas de pourcentage.

- **Occasion** : `achat = base − réduction`, puis `vente = achat + marge`,
  plafonné au prix catalogue. Réduction et marge sont **figées sur le
  véhicule** au moment de l'enregistrement : changer les tranches plus tard
  ne modifie pas les véhicules déjà saisis.
- **Import** : `vente = prix catalogue`. Ni réduction, ni marge, jamais.
- **Surcharge kilométrique** : `floor(km / intervalle) × montant`, saisie au
  moment de la vente.
- **Réduction client** : pourcentage du prix de vente, plafonné par les
  paramètres.
- **Règle des kilomètres offerts** : si la réduction accordée dépasse la
  surcharge kilométrique, la surcharge tombe à zéro.

## Contrats

Un **modèle** porte un nom, une catégorie (`vente`, `achat`, ou ce que tu
veux), un corps, et la liste des grades qui peuvent le voir.

Un modèle **à trous** contient des variables entre doubles accolades :

```
CONTRAT DE VENTE — {{numero}}
Entre {{entreprise}}, représentée par {{vendeur_prenom}} {{vendeur_nom}},
et {{client_prenom}} {{client_nom}}, citoyen de classe {{client_classe}}.
Montant : {{prix}}
```

Variables disponibles : `numero`, `date`, `entreprise`, `vehicule`, `genre`,
`prix`, `client_nom`, `client_prenom`, `client_classe`, `vendeur_nom`,
`vendeur_prenom`.

Un modèle **sans trous** est un texte fixe : mets `aTrous: false`.

Émettre un contrat (`POST /api/contrats`) avec un `mouvementId` remplit
automatiquement toutes les variables depuis la vente ou l'achat. Le numéro
est généré : `ATL-2026-0001`, `ATL-2026-0002`, et ainsi de suite.

Deux modèles sont créés au premier démarrage — contrat de vente et contrat
de rachat — modifiables depuis le site.

## Routes

```
POST   /api/auth/login              { nom, prenom, code }
POST   /api/auth/logout
GET    /api/auth/moi

GET    /api/employes                          Co-patron
POST   /api/employes                          Co-patron  { nom, prenom, grade }
PATCH  /api/employes/:id                      Co-patron
POST   /api/employes/:id/code                 Co-patron  régénère le code
DELETE /api/employes/:id                      Patron
GET    /api/connexions                        Co-patron

GET    /api/heures                            Co-patron
POST   /api/heures                            Co-patron  { employeId, date, minutes, note }
DELETE /api/heures/:id                        Co-patron
GET    /api/salaires?debut=&fin=              Co-patron  heures + ventes par employé

GET    /api/depenses                          Co-patron
POST   /api/depenses                          Co-patron  { libelle, montant, categorie, date, note }
PATCH  /api/depenses/:id                      Co-patron
DELETE /api/depenses/:id                      Co-patron

GET    /api/catalogue                         public
POST   /api/catalogue                         Co-patron
PUT    /api/catalogue                         Co-patron  remplacement en bloc
PATCH  /api/catalogue/:id                     Co-patron
DELETE /api/catalogue/:id                     Co-patron
GET    /api/genres                            public
POST   /api/genres                            Co-patron
DELETE /api/genres/:id                        Co-patron

GET    /api/vitrine                           public
GET    /api/vehicules                         connecté
POST   /api/vehicules                         Vendeur/Vendeuse
PATCH  /api/vehicules/:id                     Manager
DELETE /api/vehicules/:id                     Manager

GET    /api/mouvements?type=vente|achat       Co-patron
POST   /api/mouvements                        Vendeur/Vendeuse
DELETE /api/mouvements/:id                    Co-patron

GET    /api/contrats/variables                connecté
GET    /api/contrats/modeles                  connecté  (filtrés selon le grade)
POST   /api/contrats/modeles                  Co-patron
PATCH  /api/contrats/modeles/:id              Co-patron
DELETE /api/contrats/modeles/:id              Co-patron
GET    /api/contrats?mouvementId=             connecté
POST   /api/contrats                          Vendeur/Vendeuse
PATCH  /api/contrats/:id                      Manager
DELETE /api/contrats/:id                      Co-patron

GET    /api/parametres                        connecté
PUT    /api/parametres                        Co-patron
PUT    /api/tranches/reduction                Co-patron
PUT    /api/tranches/marge                    Co-patron
```

## Sauvegarde

Tout tient dans `backend/data/atlas.db`. Copie ce fichier, c'est ta
sauvegarde complète. Arrête le serveur avant de le remplacer.

## Importer les 372 véhicules

Le catalogue est vide au départ. Envoie-le en une fois :

```bash
curl -X PUT http://localhost:3001/api/catalogue \
  -H "Authorization: Bearer TON_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"nom":"Sultan RS","prixBase":98000,"genre":"Sportives"}]'
```

Ou depuis le site, une fois le front branché.
