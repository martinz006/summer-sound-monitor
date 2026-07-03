import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alertLevel, dealScore, isWithinRules, pricePerPersonNight } from './score.mjs';
import { makeRotation, scrapeOne } from './scrapers.mjs';
import { loadState, markSeenChanges, saveState } from './state.mjs';
import { formatDealMessage, formatErrorMessage, sendTelegram } from './telegram.mjs';
import { loadConfig } from './config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = await loadConfig(root);
const statePath = resolve(root, 'state', 'seen.json');
const state = await loadState(statePath);
const rotation = makeRotation(config);
const step = rotation[state.rotationIndex % rotation.length];

console.log('Checking ' + step.platform + ' for ' + step.adults + ' adults...');

try {
  const scraped = await scrapeOne(config, step);
  const enriched = scraped
    .map(item => ({ ...item, adults: step.adults, pricePerPersonNight: Number.isFinite(item.totalEur) ? pricePerPersonNight(item.totalEur, config.search.nights, step.adults) : null }))
    .filter(item => isWithinRules(item, config))
    .map(item => {
      const score = dealScore(item);
      const withScore = { ...item, score };
      return { ...withScore, alertLevel: alertLevel(withScore) };
    });

  const changed = markSeenChanges(state, enriched)
    .map(item => {
      const score = dealScore(item);
      const withScore = { ...item, score };
      return { ...withScore, alertLevel: alertLevel(withScore) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  for (const item of changed) {
    await sendTelegram(config, config.telegram.dealChatIds, formatDealMessage(item));
  }

  state.consecutiveFailures = 0;
  state.lastSuccessAt = new Date().toISOString();
  state.rotationIndex += 1;
  await saveState(statePath, state);
  console.log('OK: ' + scraped.length + ' cards read, ' + enriched.length + ' under rules, ' + changed.length + ' alerts sent.');
} catch (error) {
  state.consecutiveFailures += 1;
  state.rotationIndex += 1;
  await saveState(statePath, state);
  const message = step.platform + ' ' + step.adults + ' adults failed: ' + error.message;
  console.log(message);
  if (state.consecutiveFailures >= config.runtime.consecutiveFailureAlertAfter) {
    await sendTelegram(config, config.telegram.errorChatIds, formatErrorMessage({ message, lastSuccessAt: state.lastSuccessAt }));
  }
}
