import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';

import { fileURLToPath } from 'node:url';

/**
 * Minimal static server for the snapshot JSON (the daily-cron model's missing
 * half: hosts the file the app's RemoteEventSource fetches). Intended to run
 * anywhere a plain file can be served — locally, a VPS, or behind any static
 * host that supports CORS.
 *
 *   npm run serve:snapshot        # 0.0.0.0:8787
 *   PORT=9000 npm run serve:snapshot
 */

const SNAPSHOT_URL = new URL('../../src/data/events.snapshot.json', import.meta.url);
const PORT = Number(process.env.PORT ?? 8787);

async function sendSnapshot(res: ServerResponse): Promise<void> {
  try {
    const body = await readFile(fileURLToPath(SNAPSHOT_URL), 'utf8');
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=300',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('snapshot not found — run `npm run snapshot` first');
  }
}

function handle(req: IncomingMessage, res: ServerResponse): void {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    });
    res.end();
    return;
  }
  if (req.method !== 'GET' || !(req.url === '/' || req.url === '/events.snapshot.json')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
    return;
  }
  void sendSnapshot(res);
}

createServer(handle).listen(PORT, '0.0.0.0', () => {
  console.log(`Serving snapshot on http://0.0.0.0:${PORT}/events.snapshot.json`);
});
