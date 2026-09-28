// `npm run emulators`: local Firebase (auth, firestore, storage, functions) with data kept
// in .emulator-data between runs. Functions get 60s to load (default 10s is too tight on
// a busy laptop, e.g. while Metro is bundling).
import { spawn } from 'node:child_process';

const child = spawn(
  'npx firebase emulators:start --import=.emulator-data --export-on-exit=.emulator-data',
  { stdio: 'inherit', shell: true, env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: '60' } }
);
child.on('exit', (code) => process.exit(code ?? 0));
