// Self-contained check: starts a throwaway emulator on separate ports (firebase.check.json),
// seeds it, runs check-flow, shuts down. Safe to run while `npm run emulators` is up.
import { spawnSync, execSync } from 'node:child_process';

const r = spawnSync(
  'npx firebase emulators:exec --config firebase.check.json --project demo-bodivex ' +
    '"node scripts/seed.mjs && node scripts/check-flow.mjs"',
  { stdio: 'inherit', shell: true }
);

// Note: on Windows the Firestore emulator's JVM can outlive emulators:exec; free its ports.
if (process.platform === 'win32') {
  const out = execSync('netstat -ano', { encoding: 'utf8' });
  const pids = new Set(
    out.split('\n')
      .filter((l) => /:(18080|19150)\s.*LISTENING/.test(l))
      .map((l) => l.trim().split(/\s+/).pop())
  );
  for (const pid of pids) spawnSync('taskkill', ['/PID', pid, '/F'], { stdio: 'ignore' });
}
process.exit(r.status ?? 1);
