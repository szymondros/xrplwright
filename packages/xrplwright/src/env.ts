import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Loads `<dir>/.env` into `process.env`, if the file exists. Variables that
 * are already set (in the shell, in CI) win over the file.
 *
 * Call it at the top of playwright.config.ts with the config's directory:
 * `loadDotenv(import.meta.dirname)` (ESM) or `loadDotenv(__dirname)` (CommonJS).
 */
export function loadDotenv(dir: string, file = '.env'): void {
  const path = join(dir, file);
  if (!existsSync(path)) return;
  const fromShell = { ...process.env };
  process.loadEnvFile(path);
  Object.assign(process.env, fromShell);
}
