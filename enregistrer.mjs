// À lancer une fois : enregistre /compta, /salaire et /maj, branche Discord sur le Worker et donne le lien d'invitation.
// Utilisation : node enregistrer.mjs https://vapid-auto.<ton-compte>.workers.dev
import { createInterface } from "node:readline/promises";
import { EMPLOYES_FIXES } from "./src/compta.js";

const url = process.argv[2];
if (!url) throw new Error("Donne l'adresse du Worker : node enregistrer.mjs https://vapid-auto.xxx.workers.dev");
const lecteur = createInterface({ input: process.stdin, output: process.stdout });
const question = "Colle le token du bot Discord (il ne s'affiche pas) : ";
// Le token ne doit pas s'afficher à l'écran : on n'écrit que la question, pas ce qui est collé
lecteur._writeToOutput = texte => { if (texte.includes(question)) process.stdout.write(question); };
const token = (await lecteur.question(question)).trim();
process.stdout.write("\n");
lecteur.close();

async function api(chemin, methode = "GET", corps) {
  const r = await fetch("https://discord.com/api/v10" + chemin, {
    method: methode,
    headers: { authorization: `Bot ${token}`, "content-type": "application/json" },
    body: corps && JSON.stringify(corps),
  });
  if (!r.ok) throw new Error(`Discord ${r.status} : ${await r.text()}`);
  return r.json();
}

const app = await api("/applications/@me");
await api(`/applications/${app.id}/commands`, "PUT", [
  { name: "compta", description: "Voir la compta de la semaine et supprimer des lignes", contexts: [0] },
  { name: "maj", description: "Mettre la compta à jour maintenant (sans clôturer la semaine)", contexts: [0] },
  {
    name: "salaire", description: "Ranger un virement de salaire dans l'onglet Salaires", contexts: [0],
    options: [
      { type: 6, name: "employe", description: "L'employé payé, s'il est sur le Discord" },
      { type: 4, name: "montant", description: "Le montant versé, en $ (35 000 par défaut pour Patron et Co-patron)", min_value: 1 },
      { type: 3, name: "nom", description: "L'employé payé, s'il n'est pas sur le Discord", choices: EMPLOYES_FIXES.map(([n]) => ({ name: n, value: n })) },
    ],
  },
]);
await api("/applications/@me", "PATCH", { interactions_endpoint_url: url });
console.log("✅ Commandes enregistrées, Discord est branché sur le Worker.");
// Voir les salons + lire l'historique des messages + ajouter une réaction (le 💵 de fin de semaine)
console.log(`Lien pour inviter le bot : https://discord.com/oauth2/authorize?client_id=${app.id}&scope=bot+applications.commands&permissions=66624`);
