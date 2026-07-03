import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = { runtime: { intervalMinutes: Number(globalThis.process?.env?.INTERVAL_MINUTES || 10) } };
const intervalMs = config.runtime.intervalMinutes * 60 * 1000;

async function runOnce() {
  return new Promise(resolveRun => {
    const child = spawn(process.execPath, [resolve(root, 'src', 'monitor.mjs')], { cwd: root, stdio: 'inherit' });
    const hardKill = setTimeout(() => child.kill('SIGKILL'), 25000);
    child.on('exit', () => { clearTimeout(hardKill); resolveRun(); });
  });
}

while (true) {
  await runOnce();
  await new Promise(resolveSleep => setTimeout(resolveSleep, intervalMs));
}
