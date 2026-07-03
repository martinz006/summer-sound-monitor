export function pricePerPersonNight(totalEur, nights, adults) {
  return round(totalEur / nights / adults, 2);
}

export function dealScore(item) {
  const ppn = item.pricePerPersonNight;
  const distance = item.distanceKm;
  const rating = normalizeRating(item.rating, item.platform);
  const reviews = item.reviewCount ?? 0;
  const priceScore = ppn <= 30 ? 40 : ppn <= 45 ? 32 : ppn <= 60 ? 22 : ppn <= 80 ? 12 : 4;
  const distanceScore = distance == null ? 0 : distance < 2 ? 25 : distance < 5 ? 20 : distance < 8 ? 11 : 0;
  const ratingScore = rating == null ? 8 : rating >= 9 ? 20 : rating >= 8 ? 16 : rating >= 7 ? 10 : 4;
  const cancellationScore = item.freeCancellation === true ? 10 : 0;
  const reviewScore = reviews >= 50 ? 5 : reviews >= 10 ? 4 : reviews >= 1 ? 2 : 1;
  return Math.min(100, Math.round(priceScore + distanceScore + ratingScore + cancellationScore + reviewScore));
}

export function alertLevel(item) {
  const rating = normalizeRating(item.rating, item.platform);
  if (rating == null) return 'WATCHLIST - nav rating';
  if (rating < 7.5) return 'WATCHLIST - zems rating';
  if (item.score >= 85 || item.totalEur < 150 || item.priceDroppedByPercent >= 20) return 'INSTANT ALERT';
  if (item.score >= 70 || (item.totalEur < 220 && rating >= 8)) return 'GOOD DEAL';
  return 'WATCHLIST';
}

export function normalizeRating(rating, platform) {
  if (rating == null) return null;
  const value = Number(rating);
  if (!Number.isFinite(value)) return null;
  if (platform === 'airbnb' && value <= 5) return round(value * 2, 1);
  return value;
}

export function isWithinRules(item, config) {
  if (!Number.isFinite(item.totalEur) || item.totalEur > config.search.maxTotalEur) return false;
  if (item.distanceKm == null) return false;
  if (item.distanceKm >= config.search.maxDistanceKm) return false;
  if (item.isClearlyFar === true) return false;
  return true;
}

function round(value, decimals = 0) {
  const p = 10 ** decimals;
  return Math.round(value * p) / p;
}
