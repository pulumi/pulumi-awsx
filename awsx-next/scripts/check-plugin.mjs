import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageDirectory = fileURLToPath(new URL('..', import.meta.url));
const result = spawnSync('pulumi', ['package', 'get-schema', '.'], {
  cwd: packageDirectory,
  stdio: ['ignore', 'ignore', 'inherit'],
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
