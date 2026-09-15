# Projektstatus & Beslutslogga — sthlmevents

> **Syfte:** den här filen är projektets "minne" mellan datorer och sessioner.
> Läs den först om du (människa eller AI-agent) plockar upp projektet efter en
> paus. Den uppdateras när vi fattar beslut eller når slutsatser — inte för
> varje kodändring. Senast uppdaterad: **2026-09-15**.

---

## 1. Vad projektet är

Stockholm-events-app (Expo / React Native, iOS + Android + web) med en separat
datagräm-pipeline som aggregerar events från flera källor till en daglig JSON-
snapshot. Layout- och funktionsinspiration: GET LOCL (iOS). Tema: "Blå Timmen"
(mörk nordisk blåpalett + Space Grotesk för rubriker).

- Appens README (`README.md`): deployment (Vercel, R2, EAS, cron).
- Pipeline-README (`pipeline/README.md`): arkitektur, källor, usage.
- **Denna fil**: beslut, kostnadsfakta, kvarvarande steg, gotchas.

## 2. Nuvarande läge (2026-09-15)

- **12 aktiva källor**, 5554 events i snapshoten (varav 23 från Facebook).
- **Facebook-källan (Apify) är LIVE**: adapter + filter + mapper + datumfönster
  byggt, testat (194 pipeline-tester gröna) och verifierad i en riktig snapshot-
  körning. Manuell körning endast så länge (se §5).
- UI: Blå Timmen-tema implementerat, filterstripp v1 (segmentkontroll för datum,
  pillrow för kategorier, dev-only source-chip), feed-ranking enligt §4.
- Känd bugg-kvarleva: inga öppna. (`Pop Up Shop` med past-datum filtrerades
  bort i senaste körningen; datumfönstret fungerar.)

## 3. Datagivning — vad vi vet (fakta, inte gissningar)

### Facebook Events via Apify (käll-id: `apify-facebook`)

**Aktör:** `apify/facebook-events-scraper` (Store-utvecklaren `apify`, 1.4M
körningar/mån). Input-schema (build 0.0.83, verifierad): `searchQueries`,
`startUrls`, `maxEvents` — **inget** cursor/exclude/"since"-filter finns.

**Prissättning (pay-per-event, FREE-plan):**
- $0.001 per actor start + **$0.013 per levererat event** (plattformsusage
  ingår i eventpriset; verifierat: run kostade exakt 46×$0.013+0.001 = $0.599).
- Free-plan = $5 kredit/mån, inget kort. Kredit slut → blockad till nästa
  månad, ingen oväntad faktura. Kredit rullas INTE över.
- Starter $19/mån är i praktiken förskottsbetalad usage ($19 credits) +
  Bronze-priser ($0.010/event). **Lönsam först vid ~1400 events/mån** — vi är
  långt under. Bli inte frestad att uppgradera.

**Verifierade beteenden (två riktiga körningar 2026-09-15):**
1. `maxEvents` är en **global** tak per run, inte per query.
2. Facebooks stads-targeting är lös: "pop up sale Stockholm" gav Ottawa,
   Melbourne, Reno osv. → pipeline-filtrering avgör kvaliteten, query:en inte.
3. **Datumfönster via startUrls fungerar**: FB hedrar base64-kodade
   `filters`-parametern utan sessions-param (`sde`). Noll past-events i run B.
   Byggare: `pipeline/src/sources/apify-facebook/search-url.ts`.
4. Aktören returnerar **platta** nycklar: `"location.name"`,
   `"location.city"` är bokstavliga nycklar, INTE nästlat objekt.
5. `location.city` är nästan alltid null; filtrering sker på
   `location.name` + `location.countryCode` (BÅDE eller) + titel-regex för
   kända främmande städer. Rader utan venue behålls om titeln inte skriker
   utländsk stad (t.ex. "SAMPLE SALE STOCKHOLM" utan venue = behåll).
6. `duration` är text ("3 days", "6 hr") → parsas till `endsAt`.
7. Ingen beskrivning i sökresultaten → `description` tom, `priceSek` förblir
   undefined ("See details" i UI:t). LLM-kategorisering senare kan förbättra.
8. fbcdn-bild-URL:er är signerade med utgångsdatum (oe-param) — de fungerar
   i snapshoten men är ephemera; vid långsiktigt behov: ladda ner och hosta
   bilder själva (R2). Inte akut.
9. Interest-signal: `usersGoing + usersInterested` är en stark kvalitetsproxy
   (ARAKII 1326 vs US-fundraiser-brus <10). Mapper ger 0–100-poäng.

**Kostnadsläge:** veckokörning ≈ $0.50/run → ~10 runs/mån = $2–3, väl inom
$5-krediten. Kör INTE dagligen (blir ~$18/mån, över krediten).

### Övriga källor (kort)

| Källa | Status | Notis |
|---|---|---|
| visit-stockholm | ✅ live | CC BY 4.0, ingen bild, ingen pris |
| loppiskartan | ✅ live | ren HTML-parser, filtrerad till Stockholms län |
| evenemangskollen | ✅ live | största källan (1907 events) |
| biblioteket | ✅ live | 2000 events (client-API, reverse-engineerat) |
| kulturhuset | ✅ live | 1629 events (Elasticsearch-index) |
| ticketmaster | ✅ live | 134 events |
| resident-advisor | ✅ live | 56 events (nightlife) |
| meetup | ✅ live | 48 events |
| eventbrite | ✅ live | 46 events |
| allevents | ✅ live | 45 events |
| luma | ✅ live | 20 events |
| kulturbiljetter | ⏸ skip | kräver API-key (info@kulturbiljetter.se) |

**Inte utforskat än:** Instagram-flödet via Apify (se §6 nästa steg).

## 4. Design- och rangingsbeslut (spikade)

- **Tema "Blå Timmen"**: mörk först, ljusläge sekundärt. Tokens i
  `src/constants/theme.ts` (background/backgroundElement/backgroundSelected/
  text/textSecondary/accent/accentInk/accent2/favorite). WCAG-kontraster
  kollade i canvas-fasen.
- **Filterstripp v1**: `SegmentedControl` (generisk) för datum
  (Idag/Helgen/Veckan/Allt), scrollande `CategoryPill`-rad, dev-only
  källchip som expanderar. Filter är permanenta, ingen toggle.
- **Feed-ranking** (`src/utils/ranking.ts`): band → tier → sortMs → featured →
  quality → id. Band: programme → outOfTown → longRunning (>30 dagar).
  Tier inom band: upcoming (startsAt) → ongoing (endsAt snarast) → past.
  Syfte: "händer nu" överst, månads-långa events längst ner.
- **Dedup**: normaliserad titel + Stockholm-lokal dag; rikaste data vinner.
  Facebook-vs-loppiskartan: noll kollisioner hittills (olika eventtyper).
- **Snapshot**: minifierad JSON, appen läser via `StaticEventSource` vid
  modul-load → **dev-servern måste startas om efter snapshot-körning**.

## 5. Utvecklingsflöde (det vi slöste tid på — sparat här)

### Kör snapshot

```bash
cd pipeline
npm run snapshot:fb   # ~55 s, ~$0.50, endast Facebook (övriga källor behålls)
npm run snapshot      # ~4.5 min, gratis, alla 12 källor
```

`--only`-flaggan (partial refresh) behåller övriga källor från föregående
snapshot och byter bara ut valda. Misslyckas Apify-runen behålls gamla
FB-events (stale beats missing). Output: `src/data/events.snapshot.json`.

### Starta dev-server + QR (WSL2)

```bash
npx expo start --tunnel --port 8081
```

**KRITISK GOTCHA (kostade oss en timme):** i icke-interaktivt läge skriver
Expo INTE ut tunnel-URL:en i loggen. Den **rekonstruerade** URL:en från
`.expo/settings.json` (`urlRandomness`) är FEL — den saknar ngrok-suffixet.

**Riktig URL hämtas från ngroks API:**

```bash
curl -s http://127.0.0.1:4040/api/tunnels | grep -o '"public_url":"[^"]*"'
# => "http://jyoqfks-<användarnamn>-8081.exp.direct"
```

Format: `exp://<randomness>-<ngrok-konto>-<port>.exp.direct` (alltid
gemener). Verifiera alltid med `curl https://<url>/status` → ska svara
`packager-status:running` INNAN QR genereras. QR-bygge:

```bash
node -e "
const QRCode = require('/tmp/node_modules/qrcode');
const url = 'exp://jyoqfks-rubensalasamner-8081.exp.direct';  // från ngrok-API:t
QRCode.toFile('assets/images/dev-qr.png', url, { width: 512, margin: 2 }, () => console.log('ok'));
"
```

Payloaden ska vara **plain `exp://`** — inte `exp+sthlmevents://...dev-client`
-wrappern (den fungerade inte via kamerascan). Dev-klienten på telefonen
förstår plain `exp://` och öppnar rätt.

**Diagnos-tabell om "error loading app":**
- Metro-loggen visar **inga** "Bundling"-rader → telefonen nådde aldrig
  servern (nätverk/URL-problem, INTE kodfel).
- "Bundling"-rader syns + fel på telefonen → JS-crash, läs stacktracen.
- Ngrok-metriken ljuger inte: `connections.count > 0` = telefonen kom fram.

### Miljövariabler

- `pipeline/.env` (gitignored): `APIFY_TOKEN`, TICKETMASTER_*, EVENEMANGSKOLLEN_*,
  CATEGORIZER_* (valfria), KULTURBILJETTER_API_KEY (valfri). mall:
  `pipeline/.env.example`.
- **OBS**: rotens `.env.local` läses av Expo-appen, INTE av pipeline.
- Adaptern läser `APIFY_TOKEN` lazily i `fetch()` (inte konstruktorn) —
  eftersom modul-import körs före `loadEnv()`.

### Testing

```bash
cd pipeline && npm test          # 194 tester (node:test + tsx)
npm run typecheck                # tsc --noEmit
```

Nya adapters följer mönstret: `types.ts` (rå shape + klient) → `mapper.ts`
(pure transform, testbar) → `adapter.ts` (filter + fetch) → `fixture.json`
(riktig data!) → `*.test.ts`.

## 6. Nästa steg (prioriterat)

1. **Instagram-flödet via Apify** — INTE utforskat än. Arbetshypotes:
   IG-events lever som inlägg/story, inte event-objekt; scrapning via
   hashtag (t.ex. #stockholmevents #sample sale) eller plats-tagg. Apify-aktörer:
   `apify/instagram-hashtag-scraper`, `apify/instagram-scraper`. Innehåller
   risk: IG är hårdare bot-skyddat än FB-events; PPE-priser liknande.
   **Första steg**: GUI-test på 1–2 hashtags, se om outputs innehåller
   datum + plats + bild. Kör INTE flera queries än 2–3 (kredit!).
2. **Schemalägg Facebook-körningen** (veckovis räcker — kostnadsmodellen).
   GitHub Actions workflow finns (`snapshot.yml`, daglig cron) men saknar
   `APIFY_TOKEN` som repo-secret. Lägg till den + byt till vecko-cron eller
   kör `--only apify-facebook` i ett separat vecko-jobb.
3. **LLM-kategorisering** (CATEGORIZER_API_KEY): förbättrar FB-events
   (alla har `popup`-default). Groq gratisnivå räcker (llama-3.3-70b).
4. **FB-bilder långsiktigt**: ladda ner fbcdn-bilder till R2 i pipeline
   (signerade URL:er dör), så appen inte visar döda bilder efter dagar.
5. **Pris-extraktion för sample sales**: FB har ingen prisdata; om "Fri
   entré" efterfrågas krävs LLM-extraktion ur beskrivning eller detail-pass
   (fördubblad kostnad). Beslut: vänta.
6. **Utforska tier 2 queries** (quiz, standup, brunch osv.) när tier 1-yield
   är känd över 2–4 veckor. Aktivera i `queries.ts` via `queriesForTier`.

## 7. Arkitektursankeiser (för framtida refs)

- `SourceAdapter`-pattern: adapters är dumma (fetch+map); cross-source-logik
  (dedupe, enrich, geocode) är separata steg. Ny källa = ny mapp, noll ändringar
  i stegen.
- Partial refresh (`--only`) är stateful mot snapshot-filen — den är "databasen".
- Kostnadskontroll i tre lager: (1) datumfönster i URL:en, (2) `maxEvents`
  (global tak), (3) `maxTotalChargeUsd` (Apify hard-cap per run).
- `looksLikeStockholmEvent` sitter i adaptern, INTE mappern — mappern är
  total (mappar vad som helst), filtret är adapterns ansvar.
- Verifieringsdisciplin som funkat: **kör en riktig liten GUI-run innan** en
  adapter byggs; fixture.json från riktig data; input-schema hämtas från
  aktörens build-record (`/v2/actor-builds/<id>`), inte från Store-sidan.

---

*Uppdatera denna fil när: ny källa live, ny prissättning verifierad, ny
gotcha upptäckt, beslut fattats om nästa steg, eller när en "klar"-rad i §2
blir inaktuell.*
