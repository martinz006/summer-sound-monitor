import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function loadState(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return { rotationIndex: 0, seen: {}, consecutiveFailures: 0, lastSuccessAt: null };
  }
}

export async function saveState(path, state) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(state, null, 2), 'utf8');
}

export function markSeenChanges(state, items) {
  const changed = [];
  for (const item of items) {
    const key = item.platform + ':' + (item.id || item.url || item.name);
    const old = state.seen[key];
    if (!old) {
      changed.push({ ...item, changeType: 'new' });
    } else if (Number.isFinite(old.totalEur) && item.totalEur < old.totalEur) {
      const diff = old.totalEur - item.totalEur;
      const percent = Math.round((diff / old.totalEur) * 100);
      changed.push({ ...item, changeType: 'price_drop', oldTotalEur: old.totalEur, priceDroppedByPercent: percent });
    }
    state.seen[key] = { name: item.name, totalEur: item.totalEur, adults: item.adults, lastSeenAt: new Date().toISOString() };
  }
  return changed;
}
