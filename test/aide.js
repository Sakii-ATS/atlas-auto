// Un message du salon log-bancaire, comme sur la capture d'écran
export const embed = (id, timestamp, mouvement, motif) => ({
  id, timestamp, embeds: [{ title: "🏦 Compte partagé", fields: [
    { name: "Mouvement", value: mouvement }, { name: "Motif", value: motif }, { name: "Origine", value: "x" },
    { name: "Ancien solde", value: "1 $" }, { name: "Nouveau solde", value: "2 $" },
  ] }],
});
