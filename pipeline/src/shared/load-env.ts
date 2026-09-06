import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let loaded = false;

/**
 * Loads `pipeline/.env` into `process.env` exactly once. A no-op when the file
 * is absent, so tests and CI without secrets still run. Call at process entry
 * points (CLI / snapshot) before any adapter reads its configuration.
 */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}
