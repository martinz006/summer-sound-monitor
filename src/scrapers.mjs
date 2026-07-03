import { chromium } from 'playwright';

export function makeRotation(config) {
  const steps = [];
  for (const adults of config.search.adults) steps.push({ platform: 'booking', adults });
  for (const adults of config.search.adults) steps.push({ platform: 'airbnb', adults });
  return steps;
}

export async function scrapeOne(config, step) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'en-US',
    timezoneId: 'Europe/Riga',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
  });
  await context.route('**/*', route => {
    const type = route.request().resourceType();
    if (['image', 'media', 'font'].includes(type)) return route.abort().catch(() => {});
    return route.continue().catch(() => {});
  });
  const page = await context.newPage();
  try {
    if (step.platform === 'booking') return await scrapeBooking(page, config, step.adults);
    return await scrapeAirbnb(page, config, step.adults);
  } finally {
    await Promise.race([browser.close(), sleep(1500)]).catch(() => {});
  }
}

async function scrapeBooking(page, config, adults) {
  await gotoWithHardTimeout(page, bookingUrl(config, adults), config.runtime.navigationTimeoutMs);
  await waitForAnyCard(page, ["[data-testid='property-card']"], config.runtime.domTimeoutMs);
  return page.locator("[data-testid='property-card']").evaluateAll((cards, args) => {
    function parseEuro(text) {
      const matches = Array.from(String(text || '').matchAll(/€s?([0-9][0-9 .]*)/g));
      if (!matches.length) return null;
      const values = matches.map(m => parseInt(m[1].replace(/[ .]/g, ''), 10)).filter(Number.isFinite);
      if (!values.length) return null;
      return values[values.length - 1];
    }

    return cards.slice(0, args.maxCards).map(card => {
      const text = card.innerText;
      const link = card.querySelector('a[href]')?.href;
      const name = card.querySelector("[data-testid='title']")?.textContent?.trim() || text.split('
').find(Boolean)?.trim() || 'Booking listing';
      const priceText = card.querySelector("[data-testid='price-and-discounted-price']")?.textContent || '';
      const totalEur = parseEuro(priceText) ?? parseEuro(text);
      const ratingText = card.querySelector("[data-testid='review-score']")?.textContent || text;
      const ratingMatch = ratingText.match(/([0-9].[0-9])/);
      const reviewsMatch = text.match(/([0-9][0-9, .]*)s+(reviews|atsauks)/i);
      const distanceText = card.querySelector("[data-testid='distance']")?.textContent || text;
      const distanceMatch = distanceText.match(/([0-9]+(?:[.,][0-9]+)?)s*km/i);
      const freeCancellation = /free cancellation|bezmaksas atcel/i.test(text);
      const location = card.querySelector("[data-testid='address']")?.textContent?.trim() || distanceText.trim() || null;
      const distanceKm = distanceMatch ? Number(distanceMatch[1].replace(',', '.')) : null;
      const isClearlyFar = distanceKm == null || distanceKm >= args.maxDistanceKm || /([1-9][0-9])\s*km\s*(from|no)\s*(liep|center|centre)/i.test(text);
      return {
        id: link,
        platform: 'booking',
        name,
        url: link,
        totalEur,
        rating: ratingMatch ? Number(ratingMatch[1]) : null,
        reviewCount: reviewsMatch ? parseInt(reviewsMatch[1].replace(/[ ,.]/g, ''), 10) : null,
        distanceKm,
        location,
        isClearlyFar,
        freeCancellation,
        priceSource: priceText || 'card text fallback'
      };
    });
  }, { maxCards: config.runtime.maxCardsPerRun, maxDistanceKm: config.search.maxDistanceKm });
}

async function scrapeAirbnb(page, config, adults) {
  await gotoWithHardTimeout(page, airbnbUrl(config, adults), config.runtime.navigationTimeoutMs);
  await waitForAnyCard(page, ["a[href*='/rooms/']", "[data-testid='card-container']"], config.runtime.domTimeoutMs);
  return page.locator("a[href*='/rooms/']").evaluateAll((links, args) => {
    function parseEuro(text) {
      const matches = Array.from(String(text || '').matchAll(/€s?([0-9][0-9 .]*)/g));
      if (!matches.length) return null;
      const values = matches.map(m => parseInt(m[1].replace(/[ .]/g, ''), 10)).filter(Number.isFinite);
      if (!values.length) return null;
      return values[values.length - 1];
    }

    const seen = new Set();
    const out = [];
    for (const link of links) {
      const href = link.href;
      const id = href.match(//rooms/([0-9]+)/)?.[1] || href;
      if (seen.has(id)) continue;
      seen.add(id);
      const card = link.closest("[data-testid='card-container']") || link.parentElement;
      const text = card?.innerText || link.innerText || '';
      const name = text.split('
').find(line => line.trim().length > 5)?.trim() || 'Airbnb listing';
      const ratingMatch = text.match(/([0-5].[0-9]{1,2})/);
      const reviewsMatch = text.match(/([0-9][0-9, .]*)s+(reviews|atsauks)/i);
      const freeCancellation = /free cancellation|bezmaksas atcel|pay €0 today/i.test(text);
      out.push({
        id,
        platform: 'airbnb',
        name,
        url: href,
        totalEur: parseEuro(text),
        rating: ratingMatch ? Number(ratingMatch[1]) : null,
        reviewCount: reviewsMatch ? parseInt(reviewsMatch[1].replace(/[ ,.]/g, ''), 10) : null,
        distanceKm: null,
        location: null,
        isClearlyFar: true,
        freeCancellation
      });
      if (out.length >= args.maxCards) break;
    }
    return out;
  }, { maxCards: config.runtime.maxCardsPerRun });
}

async function gotoWithHardTimeout(page, url, timeoutMs) {
  await Promise.race([
    page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs }),
    sleep(timeoutMs).then(() => { throw new Error('Navigation hard-timeout after ' + timeoutMs + 'ms'); })
  ]);
}

async function waitForAnyCard(page, selectors, timeoutMs) {
  const waits = selectors.map(selector => page.waitForSelector(selector, { timeout: timeoutMs }).catch(() => null));
  const found = await Promise.race([Promise.any(waits), sleep(timeoutMs).then(() => null)]);
  if (!found) throw new Error('No result cards found after ' + timeoutMs + 'ms');
}

function bookingUrl(config, adults) {
  const params = new URLSearchParams({
    ss: 'Liepāja, Latvia',
    checkin: config.search.checkIn,
    checkout: config.search.checkOut,
    group_adults: String(adults),
    no_rooms: '1',
    group_children: '0',
    selected_currency: 'EUR',
    order: 'price'
  });
  return 'https://www.booking.com/searchresults.html?' + params;
}

function airbnbUrl(config, adults) {
  const params = new URLSearchParams({
    query: 'Liepaja, Latvia',
    checkin: config.search.checkIn,
    checkout: config.search.checkOut,
    adults: String(adults),
    currency: 'EUR'
  });
  return 'https://www.airbnb.com/s/Liepaja--Latvia/homes?' + params;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
