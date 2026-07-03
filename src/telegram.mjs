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
  const distance = item.distanceKm == null ? 'nav droši nolasīts' : item.distanceKm + ' km';
  const location = item.location ? item.location : 'nav droši redzama sarakstā';
  const cancellation = item.freeCancellation == null ? 'nezināms' : item.freeCancellation ? 'jā' : 'nē';
  const reason = item.alertLevel.includes('zems rating') ? '
Iemesls: ļoti tuvu/budžetā, bet atsauksmes vājas.' : item.alertLevel.includes('nav rating') ? '
Iemesls: budžetā, bet atsauksmes nav redzamas.' : '';
  return item.alertLevel + ' - Score ' + item.score + '/100
' + item.name + '
Cena: ' + item.totalEur + ' EUR kopā
Cena/cilv./nakts: ' + item.pricePerPersonNight + ' EUR
Cilvēki: ' + item.adults + '
Lokācija: ' + location + '
Attālums: ' + distance + ' līdz Liepājas centram/festivāla zonai aptuveni
Rating: ' + rating + reviews + '
Free cancellation: ' + cancellation + reason + '
Links: ' + item.url;
}

export function formatErrorMessage(errorState) {
  return 'BOT ERROR
' + errorState.message + '
Last successful check: ' + (errorState.lastSuccessAt ?? 'unknown');
}
