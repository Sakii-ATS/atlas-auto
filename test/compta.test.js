import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyser, lireMessage, afficherSemaine, lundi, serie, bilan, ajouterHistorique, ajouterSemaine, cloturer, afficherEmployes, gradeDe, heureParis,
} from "../src/compta.js";
import { embed } from "./aide.js";


test("les motifs sont rangés comme décidé", () => {
  assert.deepEqual(analyser("-500 $", "Synchronisation fd_banking"), { type: "Dépense", libelle: "Dépense", detail: "", montant: -500 });
  assert.deepEqual(analyser("-24326 $", "Rachat LG32764 [occas:240]"), { type: "Rachat", libelle: "Rachat occasion", detail: "LG32764", montant: -24326 });
  assert.deepEqual(analyser("+6200 $", "Vente IMP51497 [occas:241]"), { type: "Vente", libelle: "Vente occasion", detail: "IMP51497", montant: 6200 });
  assert.deepEqual(analyser("+42899 $", "Commission import IMP19762 [occas:243]"), { type: "Vente", libelle: "Commission import", detail: "IMP19762", montant: 42899 });
  assert.deepEqual(analyser("+300 $", "Synchronisation fd_banking"), { type: "Vente", libelle: "Entrée", detail: "", montant: 300 });
  assert.equal(analyser("+1 000 $", "x").montant, 1000);
  assert.equal(analyser("0 $", "x"), null);
});

test("un message Discord devient une opération à l'heure de Paris", () => {
  const op = lireMessage(embed("1", "2026-10-23T18:06:00.000Z", "-24326 $", "Rachat LG32764 [occas:240]"));
  assert.equal(op.date, "2026-10-23 20:06");
  assert.equal(op.id, "1");
  assert.equal(lireMessage({ id: "2", timestamp: "2026-10-23T18:06:00Z", content: "salut", embeds: [] }), null);
});

test("semaines et dates", () => {
  assert.equal(lundi("2026-10-25"), "2026-10-19"); // dimanche
  assert.equal(lundi("2026-10-19"), "2026-10-19");
  assert.equal(serie("2026-09-21"), 46286); // même numéro que dans le tableau actuel
  assert.equal(heureParis("2026-10-25T22:59:00Z"), "2026-10-25 23:59"); // passage à l'heure d'hiver
  assert.equal(heureParis("2026-10-25T23:00:00Z"), "2026-10-26 00:00");
});

test("bénéfice net arrondi comme l'ancien tableau", () => {
  const b = bilan([{ type: "Vente", montant: 605188 }, { type: "Dépense", montant: -393895 }], 50);
  assert.equal(b.brut, 211293);
  assert.equal(b.net, 105647);
});

// Début de l'onglet Historique actuel
const HISTO = [
  ["Semaine du", "au", "Chiffre d'affaires", "Consommations intermédiaires", "Bénéfice brut", "% déduit", "Bénéfice net", "Établi par"],
  [46307, 46313, 338379, -298608, 39771, 50, 19886, "Clovis Petit"],
  ["TOTAL", "", 338379, -298608, 39771, "", 19886],
];

test("Historique : on ajoute la semaine et on recalcule le total", () => {
  const h = ajouterHistorique(HISTO, "2026-10-19", { ca: 1000, ci: -400, brut: 600, net: 300 }, 50);
  assert.equal(h.length, 4);
  assert.deepEqual(h[2], [serie("2026-10-19"), serie("2026-10-25"), 1000, -400, 600, 50, 300, "vapid-conta"]);
  assert.deepEqual(h[3], ["TOTAL", "", 339379, -299008, 40371, "", 20186, ""]);
});

// Onglet « 4 dernières semaines » dans l'ancien format (avec la colonne Par)
const semaineAncienne = (titre, date) => [[titre], [date, "Vente", "m3e36", "Jenna Clark", "Clovis Petit", 100], [date, "Rachat", "Nightblade", "", "Clovis Petit", "", 40], ["", "Total de la semaine", "", "", "", 100, 40], []];
const QUATRE_ANCIEN = [
  ["Date", "Type", "Libellé", "Détail", "Par", "Entrée", "Sortie"],
  ...semaineAncienne("SEMAINE DU 21/09 AU 27/09", 46286),
  ...semaineAncienne("SEMAINE DU 28/09 AU 04/10", 46293),
  ...semaineAncienne("SEMAINE DU 05/10 AU 11/10", 46300),
  ...semaineAncienne("SEMAINE DU 12/10 AU 18/10", 46307),
  ["TOTAL 4 SEMAINES", "", "", "", "", 400, 160],
];

test("4 dernières semaines : la plus vieille part, il en reste 4", () => {
  const ops = [{ id: "1", date: "2026-10-23 20:06", type: "Rachat", libelle: "Rachat occasion", detail: "LG32764", montant: -24326 }];
  const q = ajouterSemaine(QUATRE_ANCIEN, "2026-10-19", ops);
  const titres = q.filter(r => String(r[0]).startsWith("SEMAINE DU")).map(r => r[0]);
  assert.deepEqual(titres, ["SEMAINE DU 28/09 AU 04/10", "SEMAINE DU 05/10 AU 11/10", "SEMAINE DU 12/10 AU 18/10", "SEMAINE DU 19/10 AU 25/10"]);
  assert.deepEqual(q[0], ["Date", "Type", "Libellé", "Entrée", "Sortie"]);
  assert.deepEqual(q[2], [46293, "Vente", "m3e36", 100, ""]); // colonnes Détail et Par retirées
  assert.deepEqual(q.find(r => r[0] === serie("2026-10-23")), [serie("2026-10-23"), "Rachat occasion", "LG32764", "", 24326]);
  assert.deepEqual(q.at(-1), ["TOTAL 4 SEMAINES", "", "", 300, 24326 + 120]);
  // Une semaine de plus : toujours 4
  const q2 = ajouterSemaine(q, "2026-10-26", ops.map(o => ({ ...o, date: "2026-10-27 10:00" })));
  assert.equal(q2.filter(r => String(r[0]).startsWith("SEMAINE DU")).length, 4);
});

test("clôture : tout ce qui a été lu va dans la semaine, et jamais deux fois la même", () => {
  const ops = [
    { id: "1", date: "2026-10-23 10:00", type: "Vente", libelle: "Vente occasion", detail: "A", montant: 1000 },
    { id: "2", date: "2026-10-18 23:59", type: "Dépense", libelle: "Dépense", detail: "", montant: -50 }, // arrivé après la clôture d'avant
  ];
  const c = cloturer(ops, "2026-10-19", HISTO, QUATRE_ANCIEN, 50);
  assert.equal(c.histo.length, 4);
  assert.deepEqual(c.histo[2].slice(0, 5), [serie("2026-10-19"), serie("2026-10-25"), 1000, -50, 950]);
  // La semaine du 12/10 est déjà dans l'Historique : on ne la refait pas
  assert.equal(cloturer(ops, "2026-10-12", HISTO, QUATRE_ANCIEN, 50), null);
});

test("salaires : le fixe jusqu'au maximum du grade, le reste en primes", () => {
  const sal = (montant, detail) => ({ id: String(montant), date: "2026-10-25 20:00", type: "Salaire", libelle: "X", detail, montant });
  const lignes = afficherSemaine([sal(-25000, "Vendeur/Vendeuse"), sal(-35000, "Patron"), sal(-18000, "Manager")], 50)["Salaires"];
  assert.deepEqual(lignes.slice(1).map(r => r.slice(3)), [[20000, 5000, 25000], [30000, 5000, 35000], [18000, 0, 18000], [68000, 10000, 78000]]);
});

test("employés : grade d'après les rôles, patrons en premier", () => {
  const roles = [{ id: "r1", name: "Vendeur/Vendeuse" }, { id: "r2", name: "Co-Patron" }, { id: "r3", name: "Patron" }, { id: "r4", name: "Client" }];
  const m = (nick, ids) => ({ nick, roles: ids, joined_at: "2026-10-01T10:00:00Z", user: { username: "x" } });
  const rows = afficherEmployes([m("Rodrigo bella", ["r1"]), m("Victor Vidal", ["r2"]), m("Clovis Petit", ["r3", "r1"]), m("Un client", ["r4"])], roles);
  assert.deepEqual(rows.map(r => r[1]), ["Nom", "Clovis Petit", "Victor Vidal", "Louis Lemarquis", "Rodrigo bella"]);
  assert.deepEqual(rows.map(r => r[2]), ["Grade", "Patron", "Co-patron", "Vendeur/Vendeuse", "Vendeur/Vendeuse"]);
  assert.equal(rows[3][0], 46317); // même date d'arrivée que dans l'ancien onglet
  assert.equal(gradeDe(["r4"], roles), "");
  // S'il arrive sur le Discord avec un rôle, il n'est pas mis deux fois
  const avecLouis = afficherEmployes([m("Louis LEMARQUIS", ["r1"])], roles);
  assert.deepEqual(avecLouis.map(r => r[1]), ["Nom", "Louis LEMARQUIS"]);
});
