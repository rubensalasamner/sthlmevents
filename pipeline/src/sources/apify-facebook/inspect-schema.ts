/**
 * Reads the input schema of an Apify actor's latest succeeded build.
 * Usage: tsx src/sources/apify-facebook/inspect-schema.ts <actorName>
 * Token comes from APIFY_TOKEN (env or pipeline/.env) — never printed.
 */
import { loadEnv } from '../../shared/load-env.js';

loadEnv();

async function main(): Promise<void> {
  const actorName = process.argv[2];
  if (!actorName) throw new Error('usage: tsx inspect-schema.ts <actorName>');
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN not set');

  const headers = { Authorization: `Bearer ${token}` } as const;

  if (actorName === '--usage') {
    const res = await fetch('https://api.apify.com/v2/users/me/usage/monthly', { headers });
    const usage = (await res.json()) as {
      data?: { totalUsageUsd?: number; perActor?: Record<string, { totalUsageUsd?: number }> };
    };
    console.log('monthly usage USD:', usage.data?.totalUsageUsd);
    for (const [actor, u] of Object.entries(usage.data?.perActor ?? {})) {
      console.log(`  ${actor}: $${u.totalUsageUsd?.toFixed(3) ?? '?'}`);
    }
    return;
  }

  const buildsRes = await fetch(
    `https://api.apify.com/v2/acts/apify~${actorName}/builds?limit=1&status=SUCCEEDED`,
    { headers },
  );
  const builds = (await buildsRes.json()) as { data?: { items?: { id: string }[] } };
  const buildId = builds.data?.items?.[0]?.id;
  if (!buildId) throw new Error(`no succeeded build for ${actorName}`);

  const buildRes = await fetch(`https://api.apify.com/v2/actor-builds/${buildId}`, { headers });
  const build = (await buildRes.json()) as {
    data?: {
      buildNumber?: string;
      actorDefinition?: {
        input?: {
          required?: string[];
          properties?: Record<
            string,
            { type?: string; default?: unknown; description?: string; enum?: string[] }
          >;
        };
      };
    };
  };
  const def = build.data?.actorDefinition;
  console.log(`actor: apify/${actorName} | build: ${build.data?.buildNumber ?? buildId}`);
  console.log('required:', JSON.stringify(def?.input?.required ?? []));
  for (const [key, prop] of Object.entries(def?.input?.properties ?? {})) {
    console.log(`--- ${key} | type: ${prop.type} | default: ${JSON.stringify(prop.default)}`);
    if (prop.enum) console.log(`    enum: ${JSON.stringify(prop.enum).slice(0, 250)}`);
    if (prop.description) console.log(`    desc: ${prop.description.slice(0, 160)}`);
  }
}

void main();
