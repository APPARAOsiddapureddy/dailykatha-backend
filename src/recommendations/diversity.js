export function diversify(scoredCards, interests) {
  const result = [];
  let position = 0;

  for (const card of scoredCards) {
    const cat = card.category;

    const lastThree = result.slice(-3);
    const allSameCat = lastThree.length === 3 && lastThree.every((c) => c.category === cat);
    if (allSameCat) continue;

    if (position > 0 && position % 5 === 0) {
      const festivalCard = scoredCards.find(
        (c) => (c.category === 'festival' || c.is_festival) && !result.some((r) => r.id === c.id),
      );
      if (festivalCard) {
        result.push(festivalCard);
        position++;
      }
    }

    if (!result.some((r) => r.id === card.id)) {
      result.push(card);
      position++;
    }
  }

  return result;
}
