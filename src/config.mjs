import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function loadConfig(root) {
  const config = JSON.parse(await readFile(resolve(root, 'config.json'), 'utf8'));
  config.telegram.botToken = env('TELEGRAM_BOT_TOKEN', config.telegram.botToken);
  config.telegram.dealChatIds = envList('DEAL_CHAT_IDS', config.telegram.dealChatIds);
  config.telegram.errorChatIds = envList('ERROR_CHAT_IDS', config.telegram.errorChatIds);
  config.search.checkIn = env('CHECK_IN', config.search.checkIn);
  config.search.checkOut = env('CHECK_OUT', config.search.checkOut);
  config.search.maxTotalEur = Number(env('MAX_TOTAL_EUR', config.search.maxTotalEur));
  config.search.maxDistanceKm = Number(env('MAX_DISTANCE_KM', config.search.maxDistanceKm));
  if (!config.telegram.botToken || config.telegram.botToken === 'SET_IN_RENDER_ENV') {
    throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable');
  }
  return config;
}

function env(name, fallback) {
  return globalThis.process?.env?.[name] ?? fallback;
}

function envList(name, fallback) {
  const value = globalThis.process?.env?.[name];
  if (!value) return fallback;
  return value.split(',').map(v => v.trim()).filter(Boolean);
}
