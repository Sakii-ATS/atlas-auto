// Fait tourner le Worker en entier avec un faux Discord et un faux Google Sheet en mémoire.
import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { tourner, miseEnForme } from "../src/index.js";
import { embed } from "./aide.js";

const sous = crypto.subtle;

// ---------- Faux Google Sheet ----------
const feuille = {
  "Ventes": [["vieux"]], "Rachats": [], "Dépenses": [], "Salaires": [["vieux salaire"]], "Journal": [],
  "Résumé": [[], [], [], [], [], [], [], [], ["% déduit (taxes payées)", 50]],
  "Historique": [
    ["Semaine du", "au", "Chiffre d'affaires", "Consommations intermédiaires", "Bénéfice brut", "% déduit", "Bénéfice net", "Établi par"],
    [46307, 46313, 338379, -298608, 39771, 50, 19886, "Clovis Petit"],
    ["TOTAL", "", 338379, -298608, 39771, "", 19886],
  ],
  "4 dernières semaines": [
    ["Date", "Type", "Libellé", "Détail", "Par", "Entrée", "Sortie"],
    ...["21/09 AU 27/09", "28/09 AU 04/10", "05/10 AU 11/10", "12/10 AU 18/10"].flatMap((s, i) => [
      ["SEMAINE DU " + s], [46286 + 7 * i, "Vente", "m3e36", "Jenna Clark", "Clovis Petit", 100], ["", "Total de la semaine", "", "", "", 100, ""], [],
    ]),
    ["TOTAL 4 SEMAINES", "", "", "", "", 400, ""],
  ],
  "employer": [["vieux"]],
};
const caches = new Set();
const col = s => [...s].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
function plage(r) {
  const m = r.match(/^'((?:[^']|'')+)'(?:!([A-Z]+)(\d+)(?::([A-Z]+)(\d+)?)?)?$/);
  return {
    nom: m[1].replace(/''/g, "'"),
    c0: m[2] ? col(m[2]) : 0, r0: m[3] ? m[3] - 1 : 0,
    c1: m[4] ? col(m[4]) : m[2] ? col(m[2]) : 99,
    r1: m[5] ? m[5] - 1 : m[4] || !m[3] ? Infinity : m[3] - 1,
  };
}
function lirePlage(r) {
  const p = plage(r);
  if (!(p.nom in feuille)) return null;
  const rows = feuille[p.nom].slice(p.r0, p.r1 + 1).map(row => {
    const x = row.slice(p.c0, p.c1 + 1);
    while (x.length && (x.at(-1) === "" || x.at(-1) === undefined)) x.pop();
    return x;
  });
  while (rows.length && !rows.at(-1).length) rows.pop();
  return rows;
}

// ---------- Faux Discord ----------
const roles = [{ id: "rp", name: "Patron" }, { id: "rv", name: "Vendeur/Vendeuse" }];
const membres = [
  { user: { id: "u1", username: "clovis" }, nick: "Clovis Petit", roles: ["rp"], joined_at: "2026-09-10T10:00:00Z" },
  { user: { id: "u2", username: "rodrigo" }, nick: "Rodrigo bella", roles: ["rv"], joined_at: "2026-09-12T10:00:00Z" },
];
const messages = [
  embed("1000", "2026-10-21T10:00:00Z", "+999 $", "Vente AVANT [occas:1]"), // avant le dollar : ignoré
  { ...embed("1001", "2026-10-21T22:37:00Z", "-500 $", "Synchronisation fd_banking"), reactions: [{ emoji: { name: "💵" }, count: 1 }] },
  embed("1002", "2026-10-23T18:06:00Z", "-24326 $", "Rachat LG32764 [occas:240]"),
  { id: "1003", timestamp: "2026-10-23T19:00:00Z", content: "un message normal", embeds: [] },
  embed("1004", "2026-10-23T19:32:00Z", "+6200 $", "Vente IMP51497 [occas:241]"),
  embed("1005", "2026-10-23T21:16:00Z", "+42899 $", "Commission import IMP19762 [occas:243]"),
];
const reponses = [];
const compteur = { discord: 0, google: 0 };
const croixPar = {}; // id du message → utilisateurs qui ont mis ❌
const reactionsBot = []; // « PUT /channels/… » ou « DELETE /channels/… »
const limite = { prochain429: false };

function fauxDiscord(url, init) {
  compteur.discord++;
  const u = new URL(url), chemin = u.pathname.replace("/api/v10", "");
  if (init.method === "PATCH") { reponses.push(JSON.parse(init.body)); return {}; }
  if (init.method === "PUT" || init.method === "DELETE") {
    if (limite.prochain429) { limite.prochain429 = false; return { status: 429, retry_after: 0.01 }; }
    const [, id, emoji] = decodeURIComponent(chemin).match(/messages\/(\d+)\/reactions\/(.+)\/@me$/);
    const m = messages.find(x => x.id === id);
    m.reactions = (m.reactions || []).filter(r => !(r.emoji.name === emoji && r.me));
    if (init.method === "PUT") m.reactions.push({ emoji: { name: emoji }, count: 1, me: true });
    reactionsBot.push(`${init.method} ${decodeURIComponent(chemin)}`);
    return { status: 204 };
  }
  const croix = chemin.match(/^\/channels\/c1\/messages\/(\d+)\/reactions\//);
  if (croix) return (croixPar[croix[1]] || []).map(id => ({ id }));
  if (chemin === "/users/@me/guilds") return [{ id: "g1" }];
  if (chemin === "/guilds/g1/channels") return [{ id: "c0", name: "général" }, { id: "c1", name: "log-bancaire" }];
  if (chemin === "/guilds/g1/roles") return roles;
  if (chemin === "/guilds/g1/members") return membres;
  if (chemin.startsWith("/guilds/g1/members/")) return membres.find(m => m.user.id === chemin.split("/").pop());
  if (chemin === "/channels/c1/messages") {
    const apres = u.searchParams.get("after"), avant = u.searchParams.get("before"), n = Number(u.searchParams.get("limit"));
    let liste = [...messages];
    if (apres) liste = liste.filter(m => BigInt(m.id) > BigInt(apres)).slice(0, n);
    else liste = liste.filter(m => !avant || BigInt(m.id) < BigInt(avant)).slice(-n);
    return liste.reverse();
  }
  throw new Error("Discord inattendu : " + chemin);
}

function fauxGoogle(url, init) {
  compteur.google++;
  const u = new URL(url);
  if (u.hostname === "oauth2.googleapis.com") return { access_token: "jeton", expires_in: 3600 };
  const corps = init.body && JSON.parse(init.body);
  if (u.pathname.endsWith("/values:batchGet")) {
    const valueRanges = u.searchParams.getAll("ranges").map(r => ({ range: r, values: lirePlage(r) }));
    if (valueRanges.some(v => v.values === null)) return { status: 400, texte: "Unable to parse range" };
    return { valueRanges };
  }
  if (u.pathname.endsWith("/values:batchClear")) { for (const r of corps.ranges) feuille[plage(r).nom] = []; return {}; }
  if (u.pathname.endsWith("/values:batchUpdate")) {
    for (const { range, values } of corps.data) {
      const p = plage(range), g = feuille[p.nom];
      values.forEach((row, i) => row.forEach((v, j) => {
        g[p.r0 + i] ??= [];
        g[p.r0 + i][p.c0 + j] = v;
      }));
      for (let i = 0; i < g.length; i++) g[i] ??= [];
    }
    return {};
  }
  if (u.pathname.endsWith(":batchUpdate")) {
    const parId = Object.keys(feuille); // les numéros d'onglets donnés juste avant par « onglets() »
    for (const r of corps.requests) {
      if (r.deleteSheet) delete feuille[parId[r.deleteSheet.sheetId]];
      if (r.addSheet) { feuille[r.addSheet.properties.title] = []; if (r.addSheet.properties.hidden) caches.add(r.addSheet.properties.title); }
      if (r.updateSheetProperties?.properties.title) {
        const ancien = parId[r.updateSheetProperties.properties.sheetId];
        feuille[r.updateSheetProperties.properties.title] = feuille[ancien];
        delete feuille[ancien];
      }
    }
    return {};
  }
  if (u.search.includes("fields=sheets")) return { sheets: Object.keys(feuille).map((title, sheetId) => ({ properties: { title, sheetId } })) };
  throw new Error("Google inattendu : " + url);
}

globalThis.fetch = async (url, init = {}) => {
  const r = String(url).includes("discord.com") ? fauxDiscord(url, init) : fauxGoogle(url, init);
  const status = r?.status ?? 200;
  return { ok: status < 400, status, json: async () => (status === 204 ? null : r), text: async () => r?.texte ?? JSON.stringify(r) };
};

// ---------- Clés ----------
const hexa = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
const cleDiscord = await sous.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const cleGoogle = await sous.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign"]);
const pkcs8 = Buffer.from(await sous.exportKey("pkcs8", cleGoogle.privateKey)).toString("base64");
const env = {
  SHEET_ID: "feuille", DISCORD_TOKEN: "x",
  DISCORD_PUBLIC_KEY: hexa(await sous.exportKey("raw", cleDiscord.publicKey)),
  GOOGLE_JSON: JSON.stringify({ client_email: "bot@x.iam.gserviceaccount.com", private_key: `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----\n` }),
};

async function interaction(corps, signer = true) {
  const texte = JSON.stringify(corps), ts = "1700000000";
  const sig = signer ? hexa(await sous.sign("Ed25519", cleDiscord.privateKey, new TextEncoder().encode(ts + texte))) : "00".repeat(64);
  const attentes = [];
  const r = await worker.fetch(new Request("https://vapid.workers.dev/", {
    method: "POST", body: texte, headers: { "x-signature-ed25519": sig, "x-signature-timestamp": ts },
  }), env, { waitUntil: p => attentes.push(p) });
  await Promise.all(attentes);
  return r;
}
const base = { application_id: "app", token: "tok", guild_id: "g1", member: { roles: ["rp"] } };
const colonne = (nom, i) => feuille[nom].map(r => r[i]);

const programme = async iso => {
  const attentes = [];
  await worker.scheduled({ scheduledTime: Date.parse(iso) }, env, { waitUntil: p => attentes.push(p) });
  await Promise.all(attentes);
  return attentes.length;
};

test("parcours complet : lecture du salon, /salaire, /compta, croix, clôture du dimanche", async () => {
  // 1. Premier passage : crée les onglets, part du message au dollar (inclus)
  await tourner(env, new Date("2026-10-24T10:00:00Z"));
  assert.ok(caches.has("Données") && caches.has("État"));
  assert.ok("Employés" in feuille && !("employer" in feuille));
  assert.deepEqual(colonne("Données", 0).slice(1), ["1001", "1002", "1004", "1005"]);
  assert.deepEqual(feuille["État"].slice(0, 2), [["Dernier message", "1005"], ["Début semaine", "1000"]]);
  assert.deepEqual(feuille["Ventes"].map(r => r.slice(1, 3)), [["Véhicule", "Motif"], ["IMP51497", "Vente occasion"], ["IMP19762", "Commission import"], ["TOTAL", ""]]);
  assert.deepEqual(feuille["Ventes"].at(-1), ["", "TOTAL", "", 49099]);
  assert.deepEqual(feuille["Rachats"][1].slice(1), ["LG32764", "Rachat occasion", 24326]);
  assert.ok(!("Journal" in feuille), "l'onglet Journal est enlevé");
  assert.deepEqual(feuille["Salaires"], [["Date", "Employé", "Grade", "Fixe", "Primes", "Total versé"], ["", "TOTAL", "", 0, 0, 0]]);
  assert.deepEqual(feuille["Résumé"][7], ["BÉNÉFICE BRUT", "", 49099 - 24326 - 500]);
  assert.deepEqual(feuille["Employés"].map(r => r[1]), ["Nom", "Clovis Petit", "Louis Lemarquis", "Rodrigo bella"]);
  // « 4 dernières semaines » passe tout de suite à 5 colonnes, sans attendre la clôture
  assert.deepEqual(feuille["4 dernières semaines"][0].filter(Boolean), ["Date", "Type", "Libellé", "Entrée", "Sortie"]);
  assert.equal(feuille["4 dernières semaines"].filter(r => String(r[0] ?? "").startsWith("SEMAINE DU")).length, 4);

  // 2. Le cron ne fait rien en dehors du dimanche 23 h / 23 h 58 / 23 h 59 (heure de Paris)
  assert.equal(await programme("2026-10-24T21:00:00Z"), 0); // samedi
  assert.equal(await programme("2026-10-25T21:00:00Z"), 0); // dimanche 22 h à Paris (heure d'hiver)

  // 3. Un virement de salaire arrive ; passage de dimanche 23 h
  messages.push(embed("1006", "2026-10-25T19:00:00Z", "-25000 $", "Synchronisation fd_banking"));
  assert.equal(await programme("2026-10-25T22:00:00Z"), 1);
  assert.equal(feuille["Dépenses"].length, 4); // entête, 2 dépenses, total

  // 4. /salaire Rodrigo : plus que le maximum refusé, puis 25 000 → le bot propose la dépense, on clique
  await interaction({ ...base, type: 2, data: { name: "salaire", options: [{ name: "employe", value: "u2" }, { name: "montant", value: 30000 }], resolved: { members: { u2: { nick: "Rodrigo bella", roles: ["rv"] } }, users: { u2: { id: "u2", username: "rodrigo" } } } } });
  assert.match(reponses.at(-1).content, /ne peut pas dépasser \*\*25 000 \$\*\* : 20 000 \$ de fixe \+ 5 000 \$ de primes/);
  await interaction({ ...base, type: 2, data: { name: "salaire", options: [{ name: "employe", value: "u2" }, { name: "montant", value: 25000 }], resolved: { members: { u2: { nick: "Rodrigo bella", roles: ["rv"] } }, users: { u2: { id: "u2", username: "rodrigo" } } } } });
  const boutonSalaire = reponses.at(-1).components[0].components[0];
  assert.equal(boutonSalaire.custom_id, "sal:1006:u2");
  await interaction({ ...base, type: 3, data: { custom_id: boutonSalaire.custom_id } });
  assert.match(reponses.at(-1).content, /Salaire noté : \*\*Rodrigo bella\*\* \(Vendeur\/Vendeuse\), 25 000 \$/);
  assert.deepEqual(feuille["Salaires"][1].slice(1), ["Rodrigo bella", "Vendeur/Vendeuse", 20000, 5000, 25000]);
  assert.equal(feuille["Dépenses"].length, 3);

  // 5. Un vendeur n'a pas le droit
  await interaction({ ...base, member: { roles: ["rv"] }, type: 2, data: { name: "compta" } });
  assert.match(reponses.at(-1).content, /Seuls le Patron et le Co-patron/);

  // 6. /compta, choisir la dépense de -500 $, confirmer la suppression
  await interaction({ ...base, type: 2, data: { name: "compta" } });
  const menu = reponses.at(-1).components[0].components[0];
  assert.equal(menu.options.length, 5);
  await interaction({ ...base, type: 3, data: { custom_id: menu.custom_id, values: ["1001"] } });
  assert.match(reponses.at(-1).content, /Supprimer cette ligne/);
  await interaction({ ...base, type: 3, data: { custom_id: reponses.at(-1).components[0].components[0].custom_id } });
  assert.match(reponses.at(-1).embeds[0].description, /Ligne supprimée/);
  assert.ok(!colonne("Données", 0).includes("1001"));
  assert.equal(feuille["Données"].filter(r => r[0]).length, 5); // entête + 4 lignes, l'ancienne 5e ligne est effacée

  // 7. Croix : celle d'un vendeur ne compte pas, celle du patron retire la ligne à 23 h 58
  messages.find(m => m.id === "1002").reactions = [{ emoji: { name: "❌" }, count: 1 }];
  messages.find(m => m.id === "1004").reactions = [{ emoji: { name: "❌" }, count: 1 }];
  croixPar["1002"] = ["u2"];
  croixPar["1004"] = ["u1"];
  messages.push({ ...embed("1007", "2026-10-25T22:30:00Z", "-100 $", "Synchronisation fd_banking"), reactions: [{ emoji: { name: "❌" }, count: 1 }] });
  croixPar["1007"] = ["u1"];
  messages.push(embed("1008", "2026-10-25T22:40:00Z", "+700 $", "Synchronisation fd_banking")); // nouveau depuis 23 h
  await programme("2026-10-25T22:58:00Z");
  assert.deepEqual(colonne("Données", 0).filter(Boolean).slice(1), ["1002", "1005", "1006", "1008"]); // 1001 ne revient pas

  // 8. Dimanche 23 h 59 : clôture, 💵 sur le dernier message vu (et seulement ça : pas de ✅)
  limite.prochain429 = true; // Discord demande d'attendre une fois : le bot attend et réessaie
  await programme("2026-10-25T22:59:00Z");
  assert.deepEqual(reactionsBot, ["PUT /channels/c1/messages/1008/reactions/💵/@me"]);
  assert.equal(feuille["Données"].filter(r => r[0]).length, 1);
  assert.deepEqual(feuille["État"].slice(0, 2), [["Dernier message", "1008"], ["Début semaine", "1008"]]);
  const histo = feuille["Historique"].filter(r => r[0] !== undefined && r[0] !== "");
  assert.equal(histo.length, 4);
  assert.deepEqual(histo[2], [46314, 46320, 43599, -24326 - 25000, 43599 - 49326, 50, -2863, "vapid-conta"]);
  const titres = feuille["4 dernières semaines"].filter(r => String(r[0] ?? "").startsWith("SEMAINE DU")).map(r => r[0]);
  assert.deepEqual(titres, ["SEMAINE DU 28/09 AU 04/10", "SEMAINE DU 05/10 AU 11/10", "SEMAINE DU 12/10 AU 18/10", "SEMAINE DU 19/10 AU 25/10"]);
  assert.ok(feuille["4 dernières semaines"].every(r => !r[5] && !r[6]), "les anciennes colonnes F et G sont vidées");
  assert.ok(feuille["4 dernières semaines"].some(r => r[1] === "Salaire" && r[2] === "Rodrigo bella" && r[4] === 25000));
  assert.deepEqual(feuille["Ventes"], [["Date", "Véhicule", "Motif", "Encaissé"], ["", "TOTAL", "", 0]]);

  // 9. Un message arrive après la clôture : /maj le range dans la nouvelle semaine
  messages.push(embed("1009", "2026-10-25T23:30:00Z", "+5000 $", "Vente AB123 [occas:250]"));
  await interaction({ ...base, type: 2, data: { name: "maj" } });
  assert.match(reponses.at(-1).embeds[0].description, /Compta mise à jour[\s\S]*Vente occasion · AB123/);
  assert.deepEqual(colonne("Données", 0).filter(Boolean), ["ID", "1009"]);
});

test("beaucoup de messages : /maj les lit tous sans dépasser la limite de Cloudflare", async () => {
  const ids = Array.from({ length: 60 }, (_, i) => String(1010 + i));
  for (const id of ids) messages.push(embed(id, "2026-10-27T12:00:00Z", "+100 $", "Vente ZZ" + id + " [occas:1]"));
  messages.push(embed("1070", "2026-10-27T13:00:00Z", "+1 $", "Synchronisation fd_banking")); // moins de 100 $ : ignoré
  const avant = compteur.discord + compteur.google;
  await interaction({ ...base, type: 2, data: { name: "maj" } });
  assert.ok(compteur.discord + compteur.google - avant <= 50, "Cloudflare gratuit : 50 appels au plus par passage");
  assert.ok(ids.every(id => colonne("Données", 0).includes(id)));
  assert.ok(!colonne("Données", 0).includes("1070"));
  assert.ok(!reactionsBot.some(r => r.includes("✅")));
});

test("/salaire pour Louis Lemarquis, qui n'est pas sur le Discord", async () => {
  messages.push(embed("1071", "2026-10-28T18:00:00Z", "-20000 $", "Synchronisation fd_banking"));
  await interaction({ ...base, type: 2, data: { name: "maj" } });
  // Ni membre ni nom, ou les deux : on demande de choisir
  await interaction({ ...base, type: 2, data: { name: "salaire", options: [{ name: "montant", value: 20000 }] } });
  assert.match(reponses.at(-1).content, /Choisis \*\*soit\*\*/);
  await interaction({ ...base, type: 2, data: { name: "salaire", options: [{ name: "montant", value: 20000 }, { name: "nom", value: "Louis Lemarquis" }] } });
  const b = reponses.at(-1).components[0].components[0];
  assert.equal(b.custom_id, "sal:1071:f0");
  await interaction({ ...base, type: 3, data: { custom_id: b.custom_id } });
  assert.match(reponses.at(-1).content, /Salaire noté : \*\*Louis Lemarquis\*\* \(Vendeur\/Vendeuse\), 20 000 \$/);
  assert.deepEqual(feuille["Salaires"][1].slice(1), ["Louis Lemarquis", "Vendeur/Vendeuse", 20000, 0, 20000]);
});

test("/salaire sans montant : 35 000 $ pour le Patron, montant obligatoire pour un vendeur", async () => {
  messages.push(embed("1072", "2026-10-28T19:00:00Z", "-35000 $", "Synchronisation fd_banking"));
  await interaction({ ...base, type: 2, data: { name: "maj" } });
  const salaire = (id, nick, roles) => interaction({ ...base, type: 2, data: { name: "salaire", options: [{ name: "employe", value: id }], resolved: { members: { [id]: { nick, roles } }, users: { [id]: { id } } } } });
  await salaire("u2", "Rodrigo bella", ["rv"]);
  assert.match(reponses.at(-1).content, /Indique le montant du salaire de \*\*Rodrigo bella\*\*/);
  await salaire("u1", "Clovis Petit", ["rp"]);
  assert.match(reponses.at(-1).content, /Salaire de \*\*35 000 \$\*\* pour \*\*Clovis Petit\*\* \(Patron\)/);
  assert.equal(reponses.at(-1).components[0].components[0].custom_id, "sal:1072:u1");
});

test("mise en forme : $ sur les montants, TOTAL en beige, trait noir épais entre les semaines", () => {
  const quatre = [
    ["Date", "Type", "Libellé", "Entrée", "Sortie"],
    ["SEMAINE DU 19/10 AU 25/10"], [46318, "Vente occasion", "IMP51497", 6200, ""], ["", "Total de la semaine", "", 6200, 0], [],
    ["TOTAL 4 SEMAINES", "", "", 6200, 0],
  ];
  const req = miseEnForme(7, "4 dernières semaines", quatre);
  const ligne = i => req.filter(r => r.repeatCell?.range.startRowIndex === i && r.repeatCell.range.endRowIndex === i + 1);
  assert.equal(ligne(3)[0].repeatCell.cell.userEnteredFormat.borders.bottom.style, "SOLID_THICK");
  assert.equal(ligne(1)[0].repeatCell.cell.userEnteredFormat.textFormat.bold, true);
  assert.ok(ligne(5)[0].repeatCell.cell.userEnteredFormat.backgroundColor);
  const dollars = req.filter(r => r.repeatCell?.cell.userEnteredFormat.numberFormat?.pattern === '#,##0\\ "$"').map(r => r.repeatCell.range.startColumnIndex);
  assert.deepEqual(dollars, [3, 4]);
  assert.deepEqual(req[0].repeatCell.range, { sheetId: 7 }); // l'ancienne mise en forme est effacée d'abord
  const ventes = miseEnForme(2, "Ventes", [["Date", "Véhicule", "Motif", "Encaissé"], [46318, "A", "Vente occasion", 6200], ["", "TOTAL", "", 6200]]);
  assert.ok(ventes.some(r => r.repeatCell?.range.startRowIndex === 2 && r.repeatCell.cell.userEnteredFormat.backgroundColor));
});

test("page d'accueil : dit quels réglages manquent, sans montrer les valeurs", async () => {
  const page = async e => (await worker.fetch(new Request("https://vapid.workers.dev/"), e, {})).text();
  assert.equal(await page(env), "vapid-conta est en ligne.");
  const sansCle = await page({ ...env, DISCORD_PUBLIC_KEY: undefined, GOOGLE_JSON: "" });
  assert.match(sansCle, /Il manque dans Cloudflare : DISCORD_PUBLIC_KEY, GOOGLE_JSON$/);
  assert.ok(!sansCle.includes(env.SHEET_ID));
});

test("signature : Discord est le seul à pouvoir appeler le bot", async () => {
  assert.equal((await interaction({ type: 1 }, false)).status, 401);
  const r = await interaction({ type: 1 });
  assert.deepEqual(await r.json(), { type: 1 });
});
