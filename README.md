# sthlmevents

Stockholm events app: Expo (iOS/Android/web) + a data pipeline that aggregates
events from 11 sources into a daily JSON snapshot.

## Get started

```bash
npm install
npx expo start
```

The app fetches the snapshot at runtime from `EXPO_PUBLIC_SNAPSHOT_URL` (see
Deployment). The bundled copy (`src/data/events.snapshot.json`) is used by local
dev, the web export and tests — EAS builds exclude it via `.easignore` to keep
uploads small. To work on the data pipeline, see `pipeline/README.md`.

## Deployment (daily-cron model)

Data flows one way:

```
pipeline (daily) -> events.snapshot.json -> R2 + Vercel -> app (remote fetch)
```

### 1. Vercel — web app + snapshot hosting

`vercel.json` configures the build (`npx expo export --platform web` → `dist/`)
and routes:

- `/` — the web app (clean URLs, SPA fallback for unknown routes)
- `/event/:id` — event detail deep links
- `/events.snapshot.json` — the snapshot, served with CORS `*` so installed
  native apps can fetch it too

Import the repo in Vercel and deploy — no extra settings needed.

### 2. GitHub Actions — daily snapshot refresh

`.github/workflows/snapshot.yml` runs the pipeline at 03:40 UTC daily and
commits the refreshed snapshot. Vercel redeploys automatically on the new
commit. One-time setup:

- Add the API keys from `pipeline/.env.example` as **repository secrets**
  (`TICKETMASTER_API_KEY`, `TICKETMASTER_API_SECRET`,
  `EVENEMANGSKOLLEN_API_KEY`, `EVENEMANGSKOLLEN_ANON_KEY`,
  `CATEGORIZER_API_KEY` — the rest are optional). Missing keys skip that
  source rather than failing the run.
- Or run it manually via **Run workflow** to test.

### 2b. Cloudflare R2 — optional snapshot hosting

The same workflow uploads the snapshot to an R2 bucket when these
**repository secrets** are set (all four are required for the upload to run;
without them the step skips and Vercel remains the only host):

| Secret | Value |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare account ID (dashboard right sidebar) |
| `R2_ACCESS_KEY_ID` | R2 API token access key (R2 → Manage R2 API tokens) |
| `R2_SECRET_ACCESS_KEY` | Matching secret key |
| `R2_BUCKET` | Bucket name |

Bucket setup: create it in R2, then allow public reads — either enable the
**r2.dev public access** switch (fine for a hobby app) or connect a custom
domain (recommended, unlimited and cached). Add a CORS policy allowing `GET`
from `*` so the web app can fetch the file. R2's free tier (10 GB storage,
10 M reads/month, zero egress) covers this use case many times over.

Then point native builds at it:

```bash
eas env:create --name EXPO_PUBLIC_SNAPSHOT_URL \
  --value "https://pub-<id>.r2.dev/events.snapshot.json" \
  --visibility plain
```

### 3. EAS — native builds with remote data

The APK/IPA builds fetch the live snapshot at startup — from R2 when
`EXPO_PUBLIC_SNAPSHOT_URL` points there, so they pick up the daily refresh
without rebuilds. EAS builds exclude the bundled snapshot (`.easignore`); the
fallback chain ends in mock data so the app still boots fully offline.
Point them at the deployed snapshot:

```bash
eas env:create --name EXPO_PUBLIC_SNAPSHOT_URL \
  --value https://<your-app>.vercel.app/events.snapshot.json \
  --visibility plain
```

Set it per-environment if desired (`eas env` scopes: development / preview /
production). Then build:

```bash
eas build -p android --profile preview   # APK for direct download/sharing
eas build -p all --profile production    # store builds
```

The `preview` APK link that EAS prints can be shared with friends; on Android
they allow "install from unknown sources" and install. iOS side-loading isn't
possible outside TestFlight (requires the Apple Developer Program); iPhone
users can use the web deployment in the meantime.
