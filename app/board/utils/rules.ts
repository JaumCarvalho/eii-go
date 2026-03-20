type RoundCalculation = {
  id: string;
  roundScore: number;
  newPuddings: number;
  makiCount: number;
};

export function calculateRoundScores(dbPlayers: any[]): Record<string, any> {
  const calculations: RoundCalculation[] = [];
  const makiCounts: Record<string, number> = {};

  for (const p of dbPlayers) {
    let tempuras = 0,
      sashimis = 0,
      dumplings = 0,
      wasabis = 0;
    let roundScore = 0;
    let newPuddings = 0;

    for (const card of p.played_cards || []) {
      if (card.type === "tempura") tempuras++;
      if (card.type === "sashimi") sashimis++;
      if (card.type === "dumpling") dumplings++;
      if (card.type === "wasabi") wasabis++;
      if (card.type === "squid_nigiri") {
        roundScore += wasabis > 0 ? 9 : 3;
        if (wasabis > 0) wasabis--;
      }
      if (card.type === "salmon_nigiri") {
        roundScore += wasabis > 0 ? 6 : 2;
        if (wasabis > 0) wasabis--;
      }
      if (card.type === "egg_nigiri") {
        roundScore += wasabis > 0 ? 3 : 1;
        if (wasabis > 0) wasabis--;
      }
      if (card.type === "maki_1")
        makiCounts[p.id] = (makiCounts[p.id] || 0) + 1;
      if (card.type === "maki_2")
        makiCounts[p.id] = (makiCounts[p.id] || 0) + 2;
      if (card.type === "maki_3")
        makiCounts[p.id] = (makiCounts[p.id] || 0) + 3;
      if (card.type === "pudding") newPuddings++;
    }

    roundScore += Math.floor(tempuras / 2) * 5;
    roundScore += Math.floor(sashimis / 3) * 10;
    const dumpScores = [0, 1, 3, 6, 10, 15];
    roundScore += dumpScores[Math.min(dumplings, 5)];

    calculations.push({
      id: p.id,
      roundScore,
      newPuddings,
      makiCount: makiCounts[p.id] || 0,
    });
  }

  const makiValues = Object.values(makiCounts).sort((a, b) => b - a);
  if (makiValues.length > 0 && makiValues[0] > 0) {
    const highest = makiValues[0];
    const firstPlaceIds = Object.keys(makiCounts).filter(
      (id) => makiCounts[id] === highest,
    );
    const pointsEach = Math.floor(6 / firstPlaceIds.length);

    firstPlaceIds.forEach((id) => {
      const calc = calculations.find((c) => c.id === id);
      if (calc) calc.roundScore += pointsEach;
    });
  }

  const finalUpdates: Record<string, any> = {};
  calculations.forEach((calc) => {
    const p = dbPlayers.find((x) => x.id === calc.id);
    finalUpdates[calc.id] = {
      score: (p.score || 0) + calc.roundScore,
      puddings: (p.puddings || 0) + calc.newPuddings,
    };
  });

  return finalUpdates;
}
