// vapid-conta : lit le salon log-bancaire le dimanche à 23 h (mise à jour), 23 h 58 (revérification)
// et 23 h 59 (clôture de la semaine), et tient le Google Sheet de compta à jour. Chaque message compté reçoit un ✅. Les commandes /compta, /salaire et /maj arrivent ici par HTTP.

import {
  QUATRE, DONNEES, semainesAJour, remettreSemaines, lireMessage, aDollar, croixDe, normaliser, heureParis, lundi, cloturer, afficherSemaine, afficherEmployes,
  bilan, argent, jjmm, gradeDe, estDirection, nomDe, EMPLOYES_FIXES, DIRECTION, PRIME_MAX, fixeMax,
} from "./compta.js";
import { google, q } from "./google.js";

const API = "https://discord.com/api/v10";
const PAR_PAGE = 20;
// Mise en forme, reprise de l'ancien tableau : en-tête foncé, ligne TOTAL beige, montants en « $ »
const FOND_ENTETE = { red: 0.137, green: 0.153, blue: 0.184 };
const FOND_TOTAL = { red: 0.953, green: 0.914, blue: 0.839 };
const FOND_SEMAINE = { red: 0.91, green: 0.92, blue: 0.93 };
const TRAIT = { style: "SOLID", color: { red: 0, green: 0, blue: 0 } };
const TRAIT_EPAIS = { style: "SOLID_THICK", color: { red: 0, green: 0, blue: 0 } };
const DOLLARS = { type: "NUMBER", pattern: '#,##0\\ "$"' };
const DATE = { type: "DATE", pattern: "dd/mm/yyyy" };
// Colonnes de dates et de montants de chaque onglet (A = 0), et s'il a des flèches de tri (filtre)
const COLONNES = {
  "Ventes": { dates: [0], dollars: [3], filtre: true },
  "Rachats": { dates: [0], dollars: [3], filtre: true },
  "Dépenses": { dates: [0], dollars: [2], filtre: true },
  "Salaires": { dates: [0], dollars: [3, 4, 5], filtre: true },
  "Historique": { dates: [0, 1], dollars: [2, 3, 4, 6] },
  [QUATRE]: { dates: [0], dollars: [3, 4] },
  "Employés": { dates: [0], dollars: [], filtre: true },
};

async function discord(env, chemin, options = {}, essai = 0) {
  const r = await fetch(API + chemin, {
    ...options,
    headers: { authorization: `Bot ${env.DISCORD_TOKEN}`, "content-type": "application/json" },
  });
  // Trop de réactions d'un coup : Discord dit combien de temps attendre, on attend et on réessaie une fois
  if (r.status === 429 && essai === 0) {
    const { retry_after = 1 } = await r.json().catch(() => ({}));
    await new Promise(ok => setTimeout(ok, Math.min(retry_after, 5) * 1000));
    return discord(env, chemin, options, 1);
  }
  if (!r.ok) throw new Error(`Discord ${r.status} sur ${chemin} : ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

const VALIDE = "✅";
const reaction = (env, salon, id, emoji, method = "PUT") =>
  discord(env, `/channels/${salon}/messages/${id}/reactions/${encodeURIComponent(emoji)}/@me`, { method });
const aMonValide = m => (m.reactions || []).some(r => r.emoji?.name === VALIDE && r.me);
const plusRecent = (a, b) => (BigInt(a) > BigInt(b) ? a : b);
const parId = (a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1);

// ---------- Google Sheet ----------

const PLAGES = [`${q("État")}!A1:B4`, `${q("Données")}!A2:F`, `${q("Résumé")}!B9`, `${q("Historique")}!A1:H`, `${q(QUATRE)}!A1:G`];

// Crée les onglets qui manquent (la première fois) et met les colonnes de dates au bon format
async function preparer(g) {
  const onglets = await g.onglets();
  const titres = new Set(onglets.map(o => o.title));
  const requetes = [];
  const ancienEmployes = onglets.find(o => o.title === "employer");
  if (!titres.has("Employés") && ancienEmployes) {
    requetes.push({ updateSheetProperties: { properties: { sheetId: ancienEmployes.sheetId, title: "Employés" }, fields: "title" } });
    titres.add("Employés");
  }
  // L'onglet Journal ne sert plus (« 4 dernières semaines » suffit) : on l'enlève
  const journal = onglets.find(o => o.title === "Journal");
  if (journal) requetes.push({ deleteSheet: { sheetId: journal.sheetId } });
  for (const titre of ["Données", "État", "Ventes", "Rachats", "Dépenses", "Salaires", "Résumé", "Historique", QUATRE, "Employés"]) {
    if (!titres.has(titre)) requetes.push({ addSheet: { properties: { title: titre, hidden: titre === "Données" || titre === "État" } } });
  }
  if (requetes.length) await g.modifier(requetes);
}

const peindre = (range, format, champs) => ({ repeatCell: { range, cell: { userEnteredFormat: format }, fields: champs } });

// Mise en forme complète d'un onglet recalculé : l'ancienne est effacée (elle ne collait plus aux colonnes), puis refaite
export function miseEnForme(sheetId, titre, rows) {
  const { dates, dollars, filtre } = COLONNES[titre];
  const largeur = Math.max(1, ...rows.map(r => r.length));
  const zone = (r0, r1, c0 = 0, c1 = largeur) => ({ sheetId, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 });
  const total = (i, bas = TRAIT) => peindre(zone(i, i + 1), { backgroundColor: FOND_TOTAL, textFormat: { bold: true }, borders: { top: TRAIT, bottom: bas } },
    "userEnteredFormat(backgroundColor,textFormat,borders)");
  const lignes = rows.flatMap((r, i) => {
    if (i === 0) return [];
    if (String(r[0] ?? "").startsWith("SEMAINE DU")) return [peindre(zone(i, i + 1), { backgroundColor: FOND_SEMAINE, textFormat: { bold: true } }, "userEnteredFormat(backgroundColor,textFormat)")];
    if (r[1] === "Total de la semaine") return [total(i, TRAIT_EPAIS)]; // le trait noir entre deux semaines
    return r[0] === "TOTAL" || r[1] === "TOTAL" || r[0] === "TOTAL 4 SEMAINES" ? [total(i)] : [];
  });
  return [
    peindre({ sheetId }, {}, "userEnteredFormat"),
    peindre(zone(0, 1), {
      backgroundColor: FOND_ENTETE, horizontalAlignment: "CENTER",
      textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
      borders: { top: TRAIT, bottom: TRAIT, left: TRAIT, right: TRAIT },
    }, "userEnteredFormat(backgroundColor,horizontalAlignment,textFormat,borders)"),
    ...dates.map(c => peindre(zone(1, undefined, c, c + 1), { numberFormat: DATE }, "userEnteredFormat.numberFormat")),
    ...dollars.map(c => peindre(zone(1, undefined, c, c + 1), { numberFormat: DOLLARS }, "userEnteredFormat.numberFormat")),
    ...lignes,
    // Le filtre de l'ancien tableau débordait sur des colonnes vides : on le recale, sans la ligne TOTAL
    ...(filtre ? [{ setBasicFilter: { filter: { range: zone(0, rows.at(-1)?.includes("TOTAL") ? rows.length - 1 : rows.length) } } }] : []),
    { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
    { autoResizeDimensions: { dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: largeur } } },
  ];
}

async function mettreEnForme(g, contenus) {
  const onglets = await g.onglets();
  const id = titre => onglets.find(o => o.title === titre)?.sheetId;
  const requetes = Object.entries(contenus).filter(([titre]) => COLONNES[titre] && id(titre) !== undefined)
    .flatMap(([titre, rows]) => miseEnForme(id(titre), titre, rows));
  // Résumé garde sa mise en page : on s'assure seulement du « $ » sur les montants (C2 à C8 et C10)
  if (id("Résumé") !== undefined) {
    for (const [r0, r1] of [[1, 8], [9, 10]]) {
      requetes.push(peindre({ sheetId: id("Résumé"), startRowIndex: r0, endRowIndex: r1, startColumnIndex: 2, endColumnIndex: 3 }, { numberFormat: DOLLARS }, "userEnteredFormat.numberFormat"));
    }
  }
  await g.modifier(requetes);
}

export async function lireTout(g) {
  let valeurs;
  try {
    valeurs = await g.lire(PLAGES);
  } catch (e) {
    if (!e.ongletManquant) throw e;
    await preparer(g);
    valeurs = await g.lire(PLAGES);
  }
  const [etat, donnees, taux, histo, quatre] = valeurs;
  const e = Object.fromEntries(etat.map(([k, v]) => [k, String(v ?? "")]));
  const tx = taux[0]?.[0];
  return {
    etat: { dernier: e["Dernier message"] || "", debut: e["Début semaine"] || "", serveur: e["Serveur"] || "", salon: e["Salon"] || "" },
    ops: donnees.filter(r => r[0]).map(r => ({ id: String(r[0]), date: String(r[1]), type: r[2], libelle: r[3] ?? "", detail: r[4] ?? "", montant: Number(r[5]) })),
    nbDonnees: donnees.length,
    taux: tx === undefined || tx === "" ? 50 : Number(tx),
    histo, quatre,
  };
}

// Lignes complétées avec des cases vides, pour effacer les anciennes sans jamais vider l'onglet avant d'écrire
// (si Google plante entre les deux, les données de la semaine ne sont pas perdues)
const completer = (rows, nbMin, largeur) =>
  [...rows, ...Array(Math.max(0, nbMin - rows.length)).fill([])].map(r => Array.from({ length: largeur }, (_, i) => r[i] ?? ""));

export async function ecrire(g, t, { ops, etat = t.etat, histo, quatre, employes }) {
  const vues = { ...afficherSemaine(ops, t.taux), ...(employes && { "Employés": employes }) };
  // L'ancien « 4 dernières semaines » (avec Détail et Par) passe au nouveau format dès la première écriture
  quatre ??= semainesAJour(t.quatre) ? null : remettreSemaines(t.quatre);
  await g.vider(Object.keys(vues).map(q)); // ces onglets sont recalculés en entier, on peut les vider
  const data = [
    { range: `${q("Données")}!A1`, values: completer([DONNEES, ...ops.map(o => [o.id, o.date, o.type, o.libelle, o.detail, o.montant])], t.nbDonnees + 1, 6) },
    { range: `${q("État")}!A1`, values: [["Dernier message", etat.dernier], ["Début semaine", etat.debut], ["Serveur", etat.serveur], ["Salon", etat.salon]] },
    ...Object.entries(vues).map(([nom, values]) => ({ range: `${q(nom)}!A1`, values })),
  ];
  if (histo) data.push({ range: `${q("Historique")}!A1`, values: completer(histo, t.histo.length, 8) });
  if (quatre) data.push({ range: `${q(QUATRE)}!A1`, values: completer(quatre, t.quatre.length, 7) });
  await g.ecrire(data);
  await mettreEnForme(g, { ...vues, "Historique": histo ?? t.histo, [QUATRE]: quatre ?? t.quatre });
}

// ---------- Lecture du salon ----------

// Identifiant juste avant le message au dollar posé par vous : « after » l'exclut, on veut le garder
async function trouverDepart(env, salon) {
  let avant = "";
  for (let i = 0; i < 5; i++) {
    const page = (await discord(env, `/channels/${salon}/messages?limit=100${avant && "&before=" + avant}`)).sort(parId).reverse();
    const m = page.find(aDollar);
    if (m) return (BigInt(m.id) - 1n).toString();
    if (page.length < 100) break;
    avant = page.at(-1).id;
  }
  return "";
}

// Tous les messages depuis la dernière clôture, du plus ancien au plus récent
async function messagesDeLaSemaine(env, salon, debut) {
  const vus = [];
  let apres = debut;
  for (let i = 0; i < 10; i++) {
    const page = await discord(env, `/channels/${salon}/messages?after=${apres}&limit=100`);
    vus.push(...page);
    if (page.length < 100) break;
    apres = page.map(m => m.id).reduce(plusRecent);
  }
  return vus.sort(parId);
}

// Une croix ne compte que si le Patron ou le Co-patron l'a mise (article 45.1 : seule la direction modifie la compta)
async function croixValide(env, salon, msg, direction) {
  for (const emoji of croixDe(msg)) {
    const qui = await discord(env, `/channels/${salon}/messages/${msg.id}/reactions/${encodeURIComponent(emoji)}?limit=100`);
    if (qui.some(u => direction.has(u.id))) return true;
  }
  return false;
}

// ✅ sur les messages comptés qui ne l'ont pas encore. Cloudflare gratuit limite à 50 appels par passage :
// on en pose au plus « max », les suivants passent la minute d'après.
async function marquer(env, salon, ids, messages, max) {
  for (const m of messages.filter(m => ids.has(m.id) && !aMonValide(m)).slice(0, max)) await reaction(env, salon, m.id, VALIDE);
}

// Entre 23 h 01 et 23 h 57 : pose les ✅ qui manquent encore
export async function marquerSemaine(env) {
  const t = await lireTout(google(env));
  if (!t.etat.debut || !t.ops.length) return;
  const semaine = await messagesDeLaSemaine(env, t.etat.salon, t.etat.debut);
  await marquer(env, t.etat.salon, new Set(t.ops.map(o => o.id)), semaine, 40 - Math.ceil((semaine.length + 1) / 100));
}

async function trouverSalon(env) {
  const [serveur] = await discord(env, "/users/@me/guilds");
  if (!serveur) throw new Error("Le bot n'est sur aucun serveur Discord : invite-le d'abord.");
  const salon = (await discord(env, `/guilds/${serveur.id}/channels`)).find(c => normaliser(c.name) === "logbancaire");
  if (!salon) throw new Error("Je ne trouve pas le salon log-bancaire (ou le bot ne le voit pas).");
  return { serveur: serveur.id, salon: salon.id };
}

// Met la compta à jour. Avec « cloture » (23 h 59), ferme aussi la semaine.
export async function tourner(env, maintenant = new Date(), { cloture = false } = {}) {
  const g = google(env);
  const t = await lireTout(g);
  let etat = t.etat;
  if (!etat.salon) etat = { ...etat, ...(await trouverSalon(env)) };
  if (!etat.debut) etat = { ...etat, debut: await trouverDepart(env, etat.salon) };
  if (!etat.debut) {
    console.log("Aucun message avec la réaction dollar dans le salon : je ne sais pas où commencer.");
    return t;
  }
  const [membres, roles] = await Promise.all([
    discord(env, `/guilds/${etat.serveur}/members?limit=1000`),
    discord(env, `/guilds/${etat.serveur}/roles`),
  ]);
  const semaine = await messagesDeLaSemaine(env, etat.salon, etat.debut);
  const direction = new Set(membres.filter(m => estDirection(m.roles, roles)).map(m => m.user.id));
  const barres = new Set();
  for (const m of semaine) if (croixDe(m).length && await croixValide(env, etat.salon, m, direction)) barres.add(m.id);
  // Un message déjà lu qui n'est plus dans Données a été supprimé avec /compta : on ne le remet pas
  const connus = new Set(t.ops.map(o => o.id));
  const neufs = semaine.filter(m => !connus.has(m.id) && !barres.has(m.id) && (!etat.dernier || BigInt(m.id) > BigInt(etat.dernier)));
  let ops = [...t.ops.filter(o => !barres.has(o.id)), ...neufs.map(lireMessage).filter(Boolean)];
  if (semaine.length) etat = { ...etat, dernier: semaine.at(-1).id };
  const clot = cloture ? cloturer(ops, lundi(heureParis(maintenant)), t.histo, t.quatre, t.taux) : null;
  const comptes = new Set(ops.map(o => o.id));
  if (clot) {
    ops = [];
    etat = { ...etat, debut: etat.dernier || etat.debut };
  }
  await ecrire(g, t, { ops, etat, histo: clot?.histo, quatre: clot?.quatre, employes: afficherEmployes(membres, roles) });
  if (clot && etat.dernier) {
    // Le 💵 sur le dernier message vu montre où la semaine suivante reprend
    await reaction(env, etat.salon, etat.dernier, "💵").catch(e => console.error("Réaction 💵 impossible :", e.message));
  }
  try {
    // ✅ = compté : on l'enlève des messages barrés depuis, et on en pose 15 au plus ici (le reste entre 23 h 01 et 23 h 57)
    for (const m of semaine) if (barres.has(m.id) && aMonValide(m)) await reaction(env, etat.salon, m.id, VALIDE, "DELETE");
    await marquer(env, etat.salon, comptes, semaine, 15);
  } catch (e) {
    console.error("Réactions ✅ impossibles :", e.message);
  }
  return { ops, taux: t.taux };
}

// ---------- Écrans Discord ----------

const ligneOp = o => `${jjmm(o.date)} ${o.date.slice(11)} · ${o.libelle}${o.detail ? " · " + o.detail : ""} · ${argent(o.montant)}`;
const bouton = (label, custom_id, style = 2, disabled = false) => ({ type: 2, label, custom_id, style, disabled });

export function vueCompta(ops, taux, page = 0, note = "") {
  const tri = [...ops].sort((a, b) => b.date.localeCompare(a.date));
  const b = bilan(ops, taux);
  const pages = Math.max(1, Math.ceil(tri.length / PAR_PAGE));
  page = Math.min(Math.max(page, 0), pages - 1);
  const morceau = tri.slice(page * PAR_PAGE, (page + 1) * PAR_PAGE);
  const description = [
    note,
    `Entrées : **${argent(b.ca)}** · Sorties : **${argent(b.ci)}**`,
    `Bénéfice brut : **${argent(b.brut)}** · Bénéfice net : **${argent(b.net)}**`,
    "",
    ...(morceau.length ? morceau.map(ligneOp) : ["Aucune opération cette semaine."]),
  ].filter((l, i) => i > 0 || l);
  const components = [];
  if (morceau.length) {
    components.push({ type: 1, components: [{
      type: 3, custom_id: `choisir:${page}`, placeholder: "Choisir une ligne à supprimer",
      options: morceau.map(o => ({ label: ligneOp(o).slice(0, 100), value: o.id })),
    }] });
  }
  if (pages > 1) {
    components.push({ type: 1, components: [
      bouton("◀", `page:${page - 1}`, 2, page === 0),
      bouton(`Page ${page + 1}/${pages}`, "rien", 2, true),
      bouton("▶", `page:${page + 1}`, 2, page === pages - 1),
    ] });
  }
  return { content: "", embeds: [{ title: "Compta de la semaine", description: description.join("\n"), color: 0x2ecc71 }], components };
}

export const vueConfirmer = (op, page) => ({
  content: `Supprimer cette ligne ?\n**${ligneOp(op)}**`,
  embeds: [],
  components: [{ type: 1, components: [bouton("Oui, supprimer", `suppr:${op.id}:${page}`, 4), bouton("Annuler", `page:${page}`)] }],
});

export function vueSalaire(ops, montant, idEmploye, nom, grade) {
  const candidats = ops.filter(o => o.type === "Dépense" && o.montant === -montant).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  if (!candidats.length) {
    return { content: `Je ne trouve aucune dépense de **${argent(-montant)}** cette semaine. Le virement n'est peut-être pas encore arrivé : réessaie dans une minute.` };
  }
  return {
    content: `Salaire de **${argent(montant)}** pour **${nom}**${grade ? ` (${grade})` : ""}. C'est laquelle de ces dépenses ?`,
    components: [{ type: 1, components: [
      ...candidats.map(o => bouton(`${jjmm(o.date)} ${o.date.slice(11)} · ${argent(o.montant)}`, `sal:${o.id}:${idEmploye}`, 1)),
      bouton("Annuler", "annuler"),
    ] }],
  };
}

// ---------- Commandes et boutons ----------

const INTERDIT = { content: "⛔ Seuls le Patron et le Co-patron peuvent utiliser cette commande.", embeds: [], components: [] };

async function commande(env, i) {
  const roles = await discord(env, `/guilds/${i.guild_id}/roles`);
  if (!estDirection(i.member.roles, roles)) return INTERDIT;
  if (i.data.name === "maj") {
    const r = await tourner(env);
    return vueCompta(r.ops, r.taux, 0, "✅ Compta mise à jour.");
  }
  const t = await lireTout(google(env));
  if (i.data.name === "compta") return vueCompta(t.ops, t.taux);
  const opt = Object.fromEntries(i.data.options.map(o => [o.name, o.value]));
  if (!opt.employe === !opt.nom) return { content: "Choisis **soit** un membre du Discord (employe), **soit** un nom de la liste (nom)." };
  // Employé qui n'est pas sur le Discord (ex. Louis Lemarquis) : « f » + sa place dans EMPLOYES_FIXES
  const f = EMPLOYES_FIXES.findIndex(([nom]) => nom === opt.nom);
  if (opt.nom && f < 0) return { content: "Je ne connais pas cet employé." };
  const membre = opt.employe && { ...i.data.resolved.members[opt.employe], user: i.data.resolved.users[opt.employe] };
  const [id, nom, grade] = opt.nom ? [`f${f}`, ...EMPLOYES_FIXES[f]] : [opt.employe, nomDe(membre), gradeDe(membre.roles, roles)];
  const max = fixeMax(grade) + PRIME_MAX;
  const montant = opt.montant ?? (DIRECTION.includes(grade) ? max : 0); // sans montant : le maximum, pour la direction seulement
  if (!montant) return { content: `Indique le montant du salaire de **${nom}**.` };
  if (montant > max) {
    return { content: `Le salaire de **${nom}** ne peut pas dépasser **${argent(max)}** : ${argent(fixeMax(grade))} de fixe + ${argent(PRIME_MAX)} de primes.` };
  }
  return vueSalaire(t.ops, montant, id, nom, grade);
}

// shortcut: pas de verrou entre la lecture du salon et les boutons ; si un message arrive pile pendant
// une suppression, l'une des deux peut être perdue. Passer à un Durable Object si ça arrive.
async function action(env, i) {
  const [quoi, a, b] = i.data.custom_id.split(":");
  if (quoi === "annuler") return { content: "Annulé.", embeds: [], components: [] };
  const g = google(env);
  if (quoi === "page") {
    const t = await lireTout(g);
    return vueCompta(t.ops, t.taux, Number(a));
  }
  if (quoi === "choisir") {
    const t = await lireTout(g);
    const op = t.ops.find(o => o.id === i.data.values[0]);
    return op ? vueConfirmer(op, Number(a)) : vueCompta(t.ops, t.taux, Number(a), "Cette ligne n'existe plus.");
  }
  const roles = await discord(env, `/guilds/${i.guild_id}/roles`);
  if (!estDirection(i.member.roles, roles)) return INTERDIT;
  if (quoi === "suppr") {
    const t = await lireTout(g);
    const ops = t.ops.filter(o => o.id !== a);
    if (ops.length !== t.ops.length) await ecrire(g, t, { ops });
    if (t.etat.salon) await reaction(env, t.etat.salon, a, VALIDE, "DELETE").catch(() => {}); // plus compté : plus de ✅
    return vueCompta(ops, t.taux, Number(b), "✅ Ligne supprimée.");
  }
  if (quoi === "sal") {
    const [nom, grade] = b.startsWith("f")
      ? EMPLOYES_FIXES[Number(b.slice(1))]
      : (m => [nomDe(m), gradeDe(m.roles, roles)])(await discord(env, `/guilds/${i.guild_id}/members/${b}`));
    const t = await lireTout(g);
    const op = t.ops.find(o => o.id === a && o.type === "Dépense");
    if (!op) return { content: "Cette dépense n'existe plus (déjà rangée ou supprimée).", components: [] };
    Object.assign(op, { type: "Salaire", libelle: nom, detail: grade });
    await ecrire(g, t, { ops: t.ops });
    return { content: `✅ Salaire noté : **${op.libelle}**${op.detail ? ` (${op.detail})` : ""}, ${argent(-op.montant)}.`, components: [] };
  }
  return { content: "Bouton inconnu.", components: [] };
}

async function repondre(env, i, travail) {
  let message;
  try {
    message = await travail(env, i);
  } catch (e) {
    console.error(e);
    message = { content: `⚠️ Erreur : ${e.message}`.slice(0, 1900), embeds: [], components: [] };
  }
  await fetch(`${API}/webhooks/${i.application_id}/${i.token}/messages/@original`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(message),
  });
}

const hex = h => Uint8Array.from(h.match(/../g) || [], x => parseInt(x, 16));

async function signatureValide(req, corps, clePublique) {
  const signature = req.headers.get("x-signature-ed25519");
  const horodatage = req.headers.get("x-signature-timestamp");
  if (!signature || !horodatage) return false;
  const cle = await crypto.subtle.importKey("raw", hex(clePublique), { name: "Ed25519" }, false, ["verify"]);
  return crypto.subtle.verify("Ed25519", cle, hex(signature), new TextEncoder().encode(horodatage + corps)).catch(() => false);
}

const json = o => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });

export default {
  async fetch(req, env, ctx) {
    if (req.method !== "POST") return new Response("vapid-conta est en ligne.");
    const corps = await req.text();
    if (!(await signatureValide(req, corps, env.DISCORD_PUBLIC_KEY))) return new Response("Signature invalide", { status: 401 });
    const i = JSON.parse(corps);
    if (i.type === 1) return json({ type: 1 });
    // On répond tout de suite « en cours », puis on remplace le message quand le tableau a répondu
    if (i.type === 2) { ctx.waitUntil(repondre(env, i, commande)); return json({ type: 5, data: { flags: 64 } }); }
    if (i.type === 3) { ctx.waitUntil(repondre(env, i, action)); return json({ type: 6 }); }
    return new Response("Type inconnu", { status: 400 });
  },

  // Cloudflare ne connaît que l'heure UTC : le cron tourne chaque minute de 21 h à 22 h 59 UTC,
  // et on ne garde que le dimanche de 23 h à 23 h 59 à l'heure de Paris (été comme hiver).
  async scheduled(event, env, ctx) {
    const maintenant = new Date(event.scheduledTime);
    const h = heureParis(maintenant), minute = h.slice(11);
    if (new Date(h.slice(0, 10) + "T00:00:00Z").getUTCDay() !== 0 || !minute.startsWith("23:")) return;
    if (minute === "23:00" || minute === "23:58") ctx.waitUntil(tourner(env, maintenant));
    else if (minute === "23:59") ctx.waitUntil(tourner(env, maintenant, { cloture: true }));
    else ctx.waitUntil(marquerSemaine(env));
  },
};
