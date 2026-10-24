# vapid-conta

Le bot de compta de la concession Vapid. Il lit le salon **log-bancaire** et remplit le Google Sheet.

## Ce qu'il fait

- **Dimanche 23 h 00** : met la compta à jour.
- **Dimanche 23 h 01 à 23 h 57** : met un ✅ sur chaque message compté. Cloudflare gratuit limite le nombre d'actions, donc il en pose 40 par minute au plus.
- **Dimanche 23 h 58** : revérifie. Il ajoute les messages arrivés depuis 23 h et retire ceux qui ont une ❌ (leur ✅ part aussi).
- **Dimanche 23 h 59** : clôture la semaine. Il l'ajoute à l'onglet Historique (on garde tout) et à « 4 dernières semaines » (on garde les 4 dernières), puis vide les onglets de la semaine. Il met un 💵 sur le dernier message vu : la semaine suivante repart de là.

✅ = ce message est compté. Une ligne supprimée avec `/compta` perd aussi son ✅.

Comment il range les messages :

| Motif dans le salon | Onglet | Motif dans le tableau |
|---|---|---|
| Vente … | Ventes | Vente occasion |
| Commission import … | Ventes | Commission import |
| Rachat … | Rachats | Rachat occasion |
| autre chose, argent qui sort | Dépenses | Dépense |
| autre chose, argent qui rentre | Ventes | Entrée |

La colonne Véhicule contient la plaque. Il n'y a ni nom de client, ni nom de vendeur.

L'onglet **Employés** est refait à chaque passage, avec les membres du Discord qui ont le rôle Patron, Co-patron, Manager ou Vendeur/Vendeuse. **Louis Lemarquis** y est toujours, même s'il n'est pas sur le Discord. Pour en ajouter d'autres comme lui, demande à Claude : la liste est en haut de `src/compta.js` (`EMPLOYES_FIXES`).

## Les commandes (Patron et Co-patron seulement)

- `/compta` : voir la semaine et supprimer une ligne.
- `/salaire montant employe` : le bot retrouve la dépense du même montant et demande de confirmer. Elle passe alors dans Salaires. Pour quelqu'un qui n'est pas sur le Discord (Louis Lemarquis), utilise `nom` au lieu de `employe`. Maximum par semaine : 20 000 $ de fixe + 5 000 $ de primes pour les employés, 30 000 $ + 5 000 $ pour le Patron et le Co-patron. Le bot refuse un montant plus haut. Sans montant, il prend le maximum (35 000 $) pour le Patron et le Co-patron ; pour les autres, il faut le donner. Dans l'onglet Salaires, ce qui dépasse le fixe est compté en primes. **À faire avant dimanche 23 h 59.**
- `/maj` : mettre la compta à jour tout de suite, sans clôturer.

Une ❌ sur un message du salon = le bot ne le prend pas. La croix ne compte que si c'est le Patron ou le Co-patron qui l'a mise.

## À ne pas faire

- N'écris pas à la main dans Ventes, Rachats, Dépenses, Salaires, Résumé et Employés : le bot les réécrit en entier. (L'onglet Journal est enlevé au premier démarrage : il ne servait à rien.)
- Ne touche pas aux onglets cachés **Données** et **État** : c'est la mémoire du bot.
- Ne donne jamais à personne : le token Discord, le fichier `google.json`, le dossier `.cloudflare`.

## Installation (une seule fois)

### 1. La copie du tableau
Dans le Google Sheet : **Fichier → Créer une copie**. Son identifiant (la partie entre `/d/` et `/edit` dans le lien) ira dans le secret `SHEET_ID` à l'étape 4.

### 2. Google : donner au bot le droit d'écrire
1. Va sur console.cloud.google.com, avec le même compte Google que le tableau.
2. Crée un projet qui s'appelle `vapid-conta`.
3. Dans la barre de recherche, tape « Google Sheets API », puis clique sur **Activer**.
4. Menu ☰ → **IAM et administration → Comptes de service → Créer un compte de service**. Nom : `vapid-conta`. Clique sur OK, sans choisir de rôle.
5. Clique sur ce compte → onglet **Clés → Ajouter une clé → Créer une clé → JSON**. Un fichier se télécharge : renomme-le `google.json` et mets-le dans le dossier `vapid-conta`.
6. Copie l'adresse du compte de service (elle finit par `iam.gserviceaccount.com`). Dans la **copie** du tableau : **Partager** → colle l'adresse → **Éditeur** → Envoyer.

### 3. Discord : créer le bot
Le site est en anglais, voici les boutons :
1. discord.com/developers/applications → **New Application** → nom `vapid-conta`.
2. Page **General Information** : copie la **Public Key** (la clé publique).
3. Page **Bot** → **Reset Token** → copie le token. Ne le montre à personne.
4. Toujours sur la page **Bot**, partie *Privileged Gateway Intents* : active **Server Members Intent** et **Message Content Intent**, puis **Save Changes**.

### 4. Cloudflare : mettre le bot en ligne
Le code est sur GitHub, dans le dépôt **atlas-auto**. Cloudflare le met en ligne tout seul à chaque changement sur GitHub.

1. Sur dash.cloudflare.com, connecte-toi au **bon compte** : pas celui de Kana du soir.
2. Ouvre le Worker **vapid-conta** → **Paramètres → Build** : il doit être relié au dépôt `Sakii-ATS/atlas-auto`, branche `main`. Laisse la commande de build vide ; la commande de déploiement est `npx wrangler deploy`.
3. **Paramètres → Variables et secrets** → ajoute ces 4 éléments, chacun de type **Secret** :
   - `SHEET_ID` : l'identifiant de la copie du tableau.
   - `DISCORD_TOKEN` : le token du bot.
   - `DISCORD_PUBLIC_KEY` : la clé publique.
   - `GOOGLE_JSON` : tout le contenu du fichier `google.json`. Ouvre-le avec l'éditeur de texte, copie tout et colle.
4. Note l'adresse du Worker : `https://vapid-conta.….workers.dev`.

Le dépôt GitHub est public : le code se voit, mais aucune clé ni l'adresse du tableau ne sont dedans. Elles restent dans Cloudflare.

### 5. Brancher Discord sur le bot
```bash
node enregistrer.mjs https://vapid-conta.xxx.workers.dev
```
Remplace l'adresse par la tienne et colle le token quand il le demande. Le script affiche un lien : ouvre-le, choisis le serveur, puis **Autoriser**.

Si le salon log-bancaire est privé, donne au rôle du bot le droit de le voir, de lire l'historique et d'ajouter des réactions.

### 6. Tester
Sur Discord, tape `/maj`. Le bot lit le salon à partir de ton 💵, puis remplit la copie du tableau.
