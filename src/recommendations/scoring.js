export function scoreCard({ card, interests, moodAffinity, isColdStart, isViewed, maxTrendScore, maxCollabScore }) {
  let score = 0;

  const primaryInterest = interests[0];
  const secondaryInterest = interests[1];
  const tertiaryInterest = interests[2];

  if (card.category === primaryInterest) score += 0.35;
  else if (card.category === secondaryInterest) score += 0.2;
  else if (card.category === tertiaryInterest) score += 0.1;

  if (card.mood === moodAffinity) score += 0.15;

  if (isColdStart) {
    score *= 0.5;
    score += (Number(card.trend_score || 0) / maxTrendScore) * 0.3;
    score += freshnessScore(card.created_at) * 0.2;
  } else {
    score += (Number(card.trend_score || 0) / maxTrendScore) * 0.15;
    score += (Number(card.collab_score || 0) / maxCollabScore) * 0.1;
    score += freshnessScore(card.created_at) * 0.05;
  }

  if (isViewed) score -= 0.5;

  return Math.max(0, score);
}

function freshnessScore(createdAt) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - ageDays / 30);
}
