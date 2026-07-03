export async function sendTelegram(config, chatIds, text) {
  const token = config.telegram.botToken;
  const results = [];
  for (const chatId of chatIds) {
    const response = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false })
    });
    const body = await response.text();
    results.push({ chatId, ok: response.ok, status: response.status, body });
  }
  return results;
}

export function formatDealMessage(item) {
  const rating = item.rating == null ? 'nav' : String(item.rating) + (item.platform === 'airbnb' ? '/5' : '');
  const reviews = item.reviewCount == null ? '' : ' (' + item.reviewCount + ' ats.)';
  const distance = item.distanceKm == null ? 'aptuvens/nezināms' : item.distanceKm + ' km';
  const cancellation = item.freeCancellation == null ? 'nezināms' : item.freeCancellation ? 'jā' : 'nē';
  const reason = item.alertLevel.includes('zems rating') ? '\nIemesls: ļoti tuvu/budžetā, bet atsauksmes vājas.' : item.alertLevel.includes('nav rating') ? '\nIemesls: budžetā, bet atsauksmes nav redzamas.' : '';
  return item.alertLevel + ' - Score ' + item.score + '/100\n' + item.name + '\nCena: ' + item.totalEur + ' EUR kopā\nCena/cilv./nakts: ' + item.pricePerPersonNight + ' EUR\nCilvēki: ' + item.adults + '\nRating: ' + rating + reviews + '\nAttālums: ' + distance + ' līdz Summer Sound zonai\nFree cancellation: ' + cancellation + reason + '\nLinks: ' + item.url;
}

export function formatErrorMessage(errorState) {
  return 'BOT ERROR\n' + errorState.message + '\nLast successful check: ' + (errorState.lastSuccessAt ?? 'unknown');
}
