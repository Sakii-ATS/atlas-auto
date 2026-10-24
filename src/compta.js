// Logique de la compta : aucun appel réseau ici, tout se teste sans Discord ni Google.

export const QUATRE = "4 dernières semaines";
export const DONNEES = ["ID", "Date", "Type", "Libellé", "Détail", "Montant"];
// « 4 dernières semaines » : Type = le motif, Libellé = la plaque, ou le nom de l'employé pour un salaire
export const COLONNES_SEMAINE = ["Date", "Type", "Libellé", "Entrée", "Sortie"];
const HISTORIQUE = ["Semaine du", "au", "Chiffre d'affaires", "Consommations intermédiaires", "Bénéfice brut", "% déduit", "Bénéfice net", "Établi par"];

// Rôles Discord → grade, par ordre d'importance. La clé est le nom du rôle sans accents, espaces ni tirets.
const GRADES = [
  ["patron", "Patron"], ["pdg", "Patron"],
  ["copatron", "Co-patron"], ["copdg", "Co-patron"],
  ["manager", "Manager"],
  ["vendeurvendeuse", "Vendeur/Vendeuse"], ["vendeur", "Vendeur/Vendeuse"], ["vendeuse", "Vendeur/Vendeuse"],
];
// Toujours dans l'onglet Employés, même s'ils ne sont pas sur le Discord : [nom, grade, date d'arrivée]
export const EMPLOYES_FIXES = [["Louis Lemarquis", "Vendeur/Vendeuse", "2026-10-22"]];
// Salaire de la semaine : un fixe (30 000 $ au plus pour la direction, 20 000 $ pour les autres) + 5 000 $ de primes au plus
export const DIRECTION = ["Patron", "Co-patron"];
export const PRIME_MAX = 5000;
export const fixeMax = grade => (DIRECTION.includes(grade) ? 30000 : 20000);
export const DOLLARS = ["💵", "💲", "💰"];
export const CROIX = ["❌", "✖️", "✖", "❎"];

export const normaliser = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// « 2026-10-23 20:06 », heure de Paris
export function heureParis(instant) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(instant)).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

const jourUTC = jour => new Date(jour.slice(0, 10) + "T00:00:00Z");
export function plusJours(jour, n) {
  const d = jourUTC(jour);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const lundi = jour => plusJours(jour, -((jourUTC(jour).getUTCDay() + 6) % 7));
// Numéro de jour Google Sheets (jours depuis le 30/12/1899), affiché en date grâce au format de la colonne
export const serie = jour => Math.round((jourUTC(jour) - Date.UTC(1899, 11, 30)) / 864e5);
export const jjmm = jour => `${jour.slice(8, 10)}/${jour.slice(5, 7)}`;
export const argent = n => (n < 0 ? "-" : "") + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " $";

// Mouvement « +6200 $ » et motif « Vente IMP51497 [occas:241] » → opération
export function analyser(mouvement, motif) {
  // shortcut: les centimes ne sont pas gérés, le serveur n'affiche que des montants entiers
  const montant = parseInt(String(mouvement).replace(/[^\d+-]/g, ""), 10);
  if (!Number.isFinite(montant) || Math.abs(montant) < 100) return null; // moins de 100 $ : ne compte pas
  const m = normaliser(motif);
  const plaque = (String(motif).match(/^\s*(?:vente|rachat|commission import)\s+([^\s[]+)/i) || [])[1] || "";
  if (m.startsWith("commissionimport") && montant > 0) return { type: "Vente", libelle: "Commission import", detail: plaque, montant };
  if (m.startsWith("vente") && montant > 0) return { type: "Vente", libelle: "Vente occasion", detail: plaque, montant };
  if (m.startsWith("rachat") && montant < 0) return { type: "Rachat", libelle: "Rachat occasion", detail: plaque, montant };
  return montant < 0
    ? { type: "Dépense", libelle: "Dépense", detail: "", montant }
    : { type: "Vente", libelle: "Entrée", detail: "", montant };
}

// Message Discord (tel que l'API le renvoie) → opération, ou null si ce n'est pas un mouvement bancaire
export function lireMessage(msg) {
  const champs = Object.fromEntries((msg.embeds?.[0]?.fields || []).map(f => [normaliser(f.name), f.value]));
  if (!champs.mouvement) return null;
  const op = analyser(champs.mouvement, champs.motif || "");
  return op && { id: msg.id, date: heureParis(msg.timestamp), ...op };
}

const reactions = (msg, liste) => (msg.reactions || []).map(r => r.emoji?.name).filter(e => liste.includes(e));
export const aDollar = msg => reactions(msg, DOLLARS).length > 0;
export const croixDe = msg => reactions(msg, CROIX);

export function bilan(ops, taux) {
  const somme = t => ops.filter(o => o.type === t).reduce((s, o) => s + o.montant, 0);
  const nb = t => ops.filter(o => o.type === t).length;
  const ca = somme("Vente");
  const ci = somme("Rachat") + somme("Dépense") + somme("Salaire");
  const brut = ca + ci;
  return { ca, ci, brut, net: Math.floor(brut * (100 - taux) / 100 + 0.5), somme, nb };
}

const parDate = (a, b) => a.date.localeCompare(b.date);
const ligneSemaine = o => [
  serie(o.date), o.type === "Salaire" ? "Salaire" : o.libelle, o.type === "Salaire" ? o.libelle : o.detail,
  o.montant > 0 ? o.montant : "", o.montant < 0 ? -o.montant : "",
];
const total = (lignes, i) => lignes.reduce((s, r) => s + (Number(r[i]) || 0), 0);

// Onglets de la semaine en cours, recalculés en entier à chaque changement
export function afficherSemaine(ops, taux) {
  ops = [...ops].sort(parDate);
  const b = bilan(ops, taux);
  const lignes = (type, f) => ops.filter(o => o.type === type).map(f);
  // Ce qui dépasse le fixe maximum du grade est compté en primes
  const salaires = lignes("Salaire", o => {
    const fixe = Math.min(-o.montant, fixeMax(o.detail));
    return [serie(o.date), o.libelle, o.detail, fixe, -o.montant - fixe, -o.montant];
  });
  return {
    "Ventes": [["Date", "Véhicule", "Motif", "Encaissé"], ...lignes("Vente", o => [serie(o.date), o.detail, o.libelle, o.montant]), ["", "TOTAL", "", b.somme("Vente")]],
    "Rachats": [["Date", "Véhicule", "Motif", "Décaissé"], ...lignes("Rachat", o => [serie(o.date), o.detail, o.libelle, -o.montant]), ["", "TOTAL", "", -b.somme("Rachat")]],
    "Dépenses": [["Date", "Motif", "Montant"], ...lignes("Dépense", o => [serie(o.date), o.libelle, -o.montant]), ["", "TOTAL", -b.somme("Dépense")]],
    "Salaires": [["Date", "Employé", "Grade", "Fixe", "Primes", "Total versé"], ...salaires, ["", "TOTAL", "", total(salaires, 3), total(salaires, 4), total(salaires, 5)]],
    "Résumé": [
      ["Poste", "Nombre", "Montant"],
      ["Ventes (encaissé)", b.nb("Vente"), b.ca],
      ["Rachats (décaissé)", b.nb("Rachat"), b.somme("Rachat")],
      ["Dépenses (décaissé)", b.nb("Dépense"), b.somme("Dépense")],
      ["Salaires (décaissé)", b.nb("Salaire"), b.somme("Salaire")],
      ["Chiffre d'affaires (CA)", "", b.ca],
      ["Consommations intermédiaires", "", b.ci],
      ["BÉNÉFICE BRUT", "", b.brut],
      ["% déduit (taxes payées)", taux, ""],
      ["BÉNÉFICE NET", "", b.net],
    ],
  };
}

const lignesHistorique = rows => rows.slice(1).filter(r => r[0] !== undefined && r[0] !== "" && r[0] !== "TOTAL");

// Ajoute une semaine à l'onglet Historique (on garde toutes les semaines) et recalcule la ligne TOTAL
export function ajouterHistorique(rows, debut, b, taux) {
  const semaines = [...lignesHistorique(rows), [serie(debut), serie(plusJours(debut, 6)), b.ca, b.ci, b.brut, taux, b.net, "vapid-conta"]];
  return [rows[0] || HISTORIQUE, ...semaines, ["TOTAL", "", total(semaines, 2), total(semaines, 3), total(semaines, 4), "", total(semaines, 6), ""]];
}

// Semaines de l'onglet « 4 dernières semaines ». Les colonnes sont retrouvées par leur nom :
// l'ancien format (avec Détail et Par) est remis au nouveau
function lireSemaines(rows) {
  const places = COLONNES_SEMAINE.map(nom => (rows[0] || COLONNES_SEMAINE).indexOf(nom));
  const blocs = [];
  for (const r of rows.slice(1)) {
    if (String(r[0] ?? "").startsWith("SEMAINE DU")) blocs.push({ titre: r[0], lignes: [] });
    else if (blocs.length && typeof r[0] === "number") blocs.at(-1).lignes.push(places.map(i => (i < 0 ? "" : r[i] ?? "")));
  }
  return blocs;
}
export const semainesAJour = rows => (rows[0] || []).join() === COLONNES_SEMAINE.join();
export const remettreSemaines = rows => afficherSemaines(lireSemaines(rows));

// Ajoute une semaine à l'onglet « 4 dernières semaines » et ne garde que les 4 dernières
export function ajouterSemaine(rows, debut, ops) {
  const blocs = lireSemaines(rows);
  blocs.push({ titre: `SEMAINE DU ${jjmm(debut)} AU ${jjmm(plusJours(debut, 6))}`, lignes: [...ops].sort(parDate).map(ligneSemaine) });
  return afficherSemaines(blocs);
}

function afficherSemaines(blocs) {
  const garde = blocs.slice(-4);
  const out = [COLONNES_SEMAINE];
  for (const b of garde) out.push([b.titre], ...b.lignes, ["", "Total de la semaine", "", total(b.lignes, 3), total(b.lignes, 4)], []);
  const tout = garde.flatMap(b => b.lignes);
  out.push(["TOTAL 4 SEMAINES", "", "", total(tout, 3), total(tout, 4)]);
  return out;
}

// Clôture du dimanche soir : toutes les opérations lues depuis la dernière clôture vont dans la semaine
// qui commence le lundi « debut ». Renvoie null si cette semaine est déjà dans l'Historique (clôture lancée deux fois).
export function cloturer(ops, debut, histo, quatre, taux) {
  if (lignesHistorique(histo).some(r => r[0] === serie(debut))) return null;
  return { histo: ajouterHistorique(histo, debut, bilan(ops, taux), taux), quatre: ajouterSemaine(quatre, debut, ops) };
}

export function gradeDe(idsRoles, roles) {
  const noms = new Set(roles.filter(r => idsRoles.includes(r.id)).map(r => normaliser(r.name)));
  return (GRADES.find(([cle]) => noms.has(cle)) || [])[1] || "";
}
export const estDirection = (idsRoles, roles) => DIRECTION.includes(gradeDe(idsRoles, roles));
export const nomDe = membre => membre.nick || membre.user?.global_name || membre.user?.username || "";

// Membres du serveur qui ont un grade, plus les employés fixes → onglet Employés
export function afficherEmployes(membres, roles) {
  const rang = g => GRADES.findIndex(([, x]) => x === g);
  const liste = membres
    .map(m => ({ nom: nomDe(m), grade: gradeDe(m.roles, roles), arrivee: serie(heureParis(m.joined_at)) }))
    .filter(e => e.grade);
  const noms = new Set(liste.map(e => normaliser(e.nom)));
  for (const [nom, grade, jour] of EMPLOYES_FIXES) if (!noms.has(normaliser(nom))) liste.push({ nom, grade, arrivee: serie(jour) });
  liste.sort((a, b) => rang(a.grade) - rang(b.grade) || a.nom.localeCompare(b.nom));
  return [["Arrivée", "Nom", "Grade"], ...liste.map(e => [e.arrivee, e.nom, e.grade])];
}
