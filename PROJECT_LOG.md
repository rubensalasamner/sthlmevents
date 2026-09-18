# Projektstatus & Beslutslogga — sthlmevents

> **Syfte:** den här filen är projektets "minne" mellan datorer och sessioner.
> Läs den först om du (människa eller AI-agent) plockar upp projektet efter en
> paus. Den uppdateras när vi fattar beslut eller når slutsatser — inte för
> varje kodändring. Senast uppdaterad: **2026-09-18**.

---

## 1. Vad projektet är

Stockholm-events-app (Expo / React Native, iOS + Android + web) med en separat
datagräm-pipeline som aggregerar events från flera källor till en daglig JSON-
snapshot. Layout: Magazine-home + Explore (karta, kluster/cap, peek) + agenda-lista —
GET LOCL var den tidiga referensen, men 5k events kräver rails/karta/agenda
istället för en filterstack. Tema: "Blå Timmen"
(mörk nordisk blåpalett + Space Grotesk för rubriker).

- Appens README (`README.md`): deployment (Vercel, R2, EAS, cron).
- Pipeline-README (`pipeline/README.md`): arkitektur, källor, usage.
- **Denna fil**: beslut, kostnadsfakta, kvarvarande steg, gotchas.

## 2. Nuvarande läge (2026-09-17)

- **14 aktiva källor** (13 + curated IG-profiler). Snapshot-räkning oförändrad
  tills nästa `snapshot:apify` / veckokörning plockar in profil-events.
- **Facebook-källan (Apify) är LIVE**: adapter + filter + mapper + datumfönster
  byggt, testat och verifierad i flera riktiga snapshot-körningar.
- **Instagram keyword (Apify) är LIVE** (2026-09-16): caption-parsing-adapter,
  9 unika events i första körningen efter dedup mot FB. Vecko-cadens,
  $0.30 hard-cap per run (se §3 Instagram-sektionen).
- **Instagram profiles (Apify) LIVE** (2026-09-18): curated allowlist
  (`stockholm_samplesale`), `apify/instagram-post-scraper`, caption-parser/
  mapper. Första partial snapshot: **14 raw → 12 kvar** efter dedup
  (5781→5777 totalt). Kostnad **$0.0405**. Street-extraktion fix (2026-09-18):
  `extractStreetAddress` + geocode street-first → **10/12 med coords**
  (DEDICATED/Marimekko/A Day’s March m.fl. på kartan). Ingår i vecko-cron.
- **Favoritpåminnelser LIVE** (2026-09-16): lokala notiser via
  `expo-notifications` — dagen före 09:00 Stockholm + 2h innan start. Kräver
  **ny native build** (plugin + POST_NOTIFICATIONS). Permission frågas vid
  första favorit, inte vid appstart. Tap → eventdetalj.
- **Lägg till i kalender LIVE** (2026-09-16): `Add to calendar` på eventdetaljen
  öppnar OS-kalenderdialog (förifyllt) via `expo-calendar/legacy`; web → Google
  Calendar-URL. Samma native build som notiser.
- **Helg-/kvälls-default LIVE** (2026-09-16): Home öppnar på `weekend`
  torsdag–söndag (Stockholm-weekday), annars `today`. Magazine-hero +
  fönster-rail speglar fönstret (“This weekend” / “Today”).
- **Närhet LIVE** (2026-09-16): “Near me” + ≤2/5 km på Discover (lazy GPS via
  `expo-location`); kartan zoomar mot användaren. Favoriter får accent-bubbla
  **bara när de matchar aktiva filter** (bypass borttagen 2026-09-18 — annars
  stack kartan oense med Discover). Kräver samma ny native build
  (location-plugin).
- **Progressiv intresse-onboarding LIVE** (2026-09-16): ingen cold-start-wizard.
  Efter 1 favorit **eller** 3 eventöppningar → sheet “What are you into?”
  (8 chips, Not now). Soft boost i `orderFeed` (inte hårt filter). Kompakt
  “Vibes”-länk i Home-headern. Lagras lokalt
  (`sthlmevents.interests.v1`).
- **Share → app/web LIVE** (2026-09-16): Share delar
  `https://<web>/event/<id>` (eller `sthlmevents://…` utan web-origin), inte
  Ticketmaster. `EXPO_PUBLIC_WEB_ORIGIN` sätter App Links / Universal Links-
  host i `app.config.ts`.
- **Fragile image hosting** (2026-09-16): pipeline-steg hostar fbcdn/IG-bilder
  till R2 när `R2_*` + `R2_PUBLIC_BASE_URL` är satta; misslyckanden →
  kategori-fallback. Appen har `EventImage` onError→fallback som säkerhetsnät.
- UI (2026-09-18): **Magazine home + map peek + agenda**. Tabs Home /
  Explore / Saved. Filter ligger i ett sheet bakom en sammanfattningschip —
  inte fyra always-on rader. EventPresentation-strategier: hero / poster /
  compact (map peek). Eventdetalj följer Standard 2026-mocken: 3:2-kort
  med titel på bilden, when/title/venue, pris+kategori-chips, beskrivning
  under fakta, sticky Directions + Tickets. Saved är en kronologisk lista
  (This week / Later). Ranking, Blå Timmen, weekend-default, vibes och
  påminnelser oförändrade. Event-räknaren under Home-rubriken är gömd;
  5-tap på rubriken (__DEV__) visar källfilter + räkning som tidigare.
  Explore: ingen sök-overlay, ingen half-sheet. Defaultkamera neighbourhood
  (zoom 13). `expo-maps` v57 saknar native clustering — JS-rutnät med
  räknebubblor under zoom 13, därefter närmaste ~40 pins i viewport.
  Pin-tap → peek-kort.
- Känd bugg-kvarleva: IG-titlar kan innehålla emoji/skräprader —
  `firstTitleLine` hackar vid 80 tecken men rensar inte alla emoji. Kosmetiskt.
- **Android OOM på IG-bilder** (2026-09-18): `Canvas: trying to draw too large
  bitmap` (~240 MB) via `ExpoImageView`. `source.width/height` räcker **inte**
  som decode-tak. Fix: `EventImage` använder `useImage({ maxWidth, maxHeight })`
  (Expo-dokumenterat mot stora assets).
  List-thumbs ska skicka `decodeWidth={56}`; default 400 är för hero/detail.

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
8. fbcdn-bild-URL:er är signerade med utgångsdatum (oe-param). Pipeline-steget
   `hostFragileImages` laddar ner och lägger dem på R2 när credentials finns;
   annars ligger de kvar (appen har onError-fallback).
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

### Instagram via Apify (käll-id: `apify-instagram`) — LIVE sedan 2026-09-16

**Aktör:** `apify/instagram-hashtag-scraper` (officiell, 3.39 rating
— låg, men API-funktionerna verifierades i probe + live-snapshot-körning).
Input-schema (build 0.0.2188): `hashtags[]` (fungerar som hashtag ELLER
keyword-läge med `keywordSearch: true`), `resultsType: posts|reels|stories`,
`resultsLimit` (per hashtag, inte globalt). **$0.0026/post** — en femtedel av
FB-priset. Alternativ aktör `apify/instagram-search-scraper` (4.84 rating)
har `searchType: place` men returnerar plats-sidor, inte tidsstämplade posts.

**Probe-resultat (31 posts, ~$0.21, input: 4 termer × 20 limit):**
- 61 % Stockholm-signal i caption, 48 % datum-signal, bara 2 noise-poster.
- **ALLA** posts har timestamp, bild och engagement (likes/comments).
- **NOLL** har strukturerad plats (`location.name`) — venue måste parsas ur
  caption (t.ex. "A-HOUSE UGGELVIKSGATAN 2A" står i texten).
- Datum finns ENDAST i caption-text ("Fri 25/9 10-18.00", "16–17 September").
- FB:s datumfönster-trick har ingen IG-motsvarighet (inget datumfilter).

**Slutsats (proben):** källan är värd att bygga som **long-tail-komplement** —
unika fynd (Marimekko-rean, 2km-loppis) fanns ingen annanstans, men ~50% av
IG-fynden fanns redan via FB (Axel Arigato, Korean Film Festival). Dedup-
steget sköter överlappet automatiskt (samma titel + dag → slås ihop, FB
vinner på strukturerat datum).

**Adaptern (byggd 2026-09-16, verifierad live):**
- `caption.ts`: date-parser för "25/9", "16–17 September", "06 Sep 10:00-16:00",
  "imorgon", bare weekday; time-span-parser med date-span-masking ("11/9 -
  08.00" innehåller pseudo-span "9 - 08" — datumeftersläpet maskas bort innan
  tidssökning); venue-extraktion (rad med gatan/vägen/huset + stadsord).
- Gotcha: JS `\b` är ASCII-only — regex med å/ä/é-ord är farliga (`\bentré\b`
  matchar aldrig). Använd unicode-lookarounds.
- Gotcha 2: global regex med `lastIndex` + skip av match → tappar nästa match;
  maska fysiskt (ersätt span med mellanslag) istället.
- All-day events: midnight Stockholm = 22:00Z dagen före (CEST) —
  assertion-tester måste matcha det.
- Första live-körningen: **9 unika IG-events** i snapshoten (5767 totalt) efter
  dedup; 26 av 31 posts slängdes (noise/roundups/dubletter) — önskvärt filter.
- Kända svagheter: IG-titlar kan innehålla emoji-brus; venue-extraktionen
  slänger ibland med brand-prefix; `resultsLimit` per term, ingen datumkontroll
  (FB:s datumfönster-trick har ingen IG-motsvarighet).

**Praktiskt:** `npm run snapshot:ig` (bara IG, ~$0.21), `npm run snapshot:apify`
(FB+IG tillsammans, ~$0.80), `npm run probe:ig`, `npm run apify:usage`
(kreditkoll). Vecko-cadens. Usage-cykeln startar den **14:e** varje månad
(inte den 1:a — Credits återställs då).

**`apify:usage` (fixad 2026-09-17):** API:t returnerar
`totalUsageCreditsUsdAfterVolumeDiscount` (inte `totalUsageUsd`). Scriptet
läser också `/users/me/limits` → `maxMonthlyUsageUsd` och skriver used/cap/
remaining. Usage-totalen kan lagga några sekunder efter en run — mät före
**och** efter med kort väntan.

### `@stockholm_samplesale` profil-probe (2026-09-17)

**Aktör:** `apify/instagram-post-scraper` (username-läge), `resultsLimit: 15`,
`maxTotalChargeUsd: 0.10`.

**Kostnad (mätt via usage före/efter, efter API-lag):** $2.8800 → $2.9205 =
**$0.0405** för 15 posts → **$0.0027/post** (matchar free-plan $2.70/1k).

**Yield:** 15/15 hade caption (ingen tom); **14/15** fick parsebart datum via
befintlig `caption.ts`; venue-extraktion träffade något på alla (ibland
svagt — hashtag-rad eller postnummer). **OCR behövs inte** för detta konto —
gul flyer-text dupliceras i caption.

**Missar / parser-luckor:** engelska "May 22-May 31, 2026" (en post utan
datum); multi-day-poster väljer ofta sista `d/m`-raden + tid från den raden
(inte alltid hela spannet korrekt); "September N" kan ge felaktig dag i
edge cases. Tillräckligt bra för curated allowlist-källa + dedup.

**Slutsats:** källa `apify-instagram-profiles` (allowlist i `profiles.ts`,
börjar med `stockholm_samplesale`) återanvänder caption-parser/mapper; keyword-
IG hålls separat. ~15 senaste posts/vecka ≈ **$0.04**/körning. Lägg till fler
konton först efter caption-probe (ingen OCR som default).

### Kostnadsläge (verifierat via usage-API 2026-09-17)

- Månadscykel: 14:e → 13:e. `PAID_ACTORS_PER_EVENT` är den enda stora posten.
- Förbrukat i cykeln som började 2026-09-14: **$2.92** av $5-krediten →
  **~$2.08 kvar** till den 13:e oktober (inkl. samplesale-proben $0.04).
  Planera veckokörningar: FB (~$0.60) + IG-keyword (~$0.30) + ev. profil-
  allowlist (~$0.04) per vecka.

## 4. Design- och rangingsbeslut (spikade)

- **Tema "Blå Timmen"**: mörk först, ljusläge sekundärt. Tokens i
  `src/constants/theme.ts` (background/backgroundElement/backgroundSelected/
  text/textSecondary/accent/accentInk/accent2/favorite). WCAG-kontraster
  kollade i canvas-fasen. Temamallar / labbar versionerade i
  `docs/design/` (`theme-proposals`, `theme-lab`, `filter-lab` — Cursor
  canvas-filer, öppnas som `.canvas.tsx`).
- **IA v2 (2026-09-18)**: Home är algoritmiska magazine-rails (hero + Free /
  Markets / Nightlife / Music) — inte en 5k-lista. Explore är kartan med
  overlay-chip + detent-sheet. “See all” / sök är agenda (tid-grupperade
  compact rows). En `EventPresentation`-strategy per densitet; samma
  `useFilteredEvents` för alla tre ytor så filtret inte ljuger.
- **Filter**: sammanfattningschip öppnar sheet (datum, kategori, near-me,
  dev-source). Inte always-on-stack. `reset()` rensar till kontextuell default.
- **Feed-ranking** (`src/utils/ranking.ts`): band → tier → sortMs → featured →
  quality → id. Band: programme → outOfTown → longRunning (>30 dagar).
  Tier inom band: upcoming (startsAt) → ongoing (endsAt snarast) → past.
  Syfte: "händer nu" överst, månads-långa events längst ner.
- **Kartmarkörer v1**: frost-pills (Blå Timmen-yta `#F2F5F9`) med kategori-
  border/accent-stripe, titel i mörk ink + tid i secondary. Default = tid;
  från zoom ≥13 / ≤20 events: titel+tid två rader. Storlek sm/md/lg med zoom.
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

### Starta development build (WSL2 + Android) — verifierat 2026-09-16

**Det som funkade** (USB, efter ny EAS development-build):

```bash
# WSL — --localhost är viktigt (annars blir QR/URL WSL-bridge 172.x)
npx expo start --port 8081 --dev-client --localhost
# Metro ska visa: …/?url=http%3A%2F%2F127.0.0.1%3A8081
```

```powershell
# Windows PowerShell (USB + USB-felsökning; adb måste lista telefonen)
curl http://127.0.0.1:8081/status
# → packager-status:running

adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW -d "exp+sthlmevents://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

Lyckat tecken i WSL: `Android Bundled …`. Appen öppnar Discover.

**APK-install (när Expo Install-sidan hänger på telefon-WiFi):** ladda ner
APK på PC från build-sidan, sen:
`adb install -r "$env:USERPROFILE\Downloads\application-<build-id>.apk"`
(`~` funkar inte till adb.exe på Windows.)

#### Fel vi såg och varför

| Symptom | Orsak | Fix |
|---|---|---|
| “problem loading the project” efter QR utan tunnel | Metro ger `http://172.19.0.1:8081` (WSL-bridge); telefonen når den inte | `--localhost` + `adb reverse` + öppna via `am start` (scanna inte QR) |
| Samma fel med `adb reverse` men Metro utan `--localhost` | Appen öppnas men Metro-loggen får **inga** Bundled-rader | Lägg till `--localhost`; verifiera `curl` från Windows |
| `npx expo start --tunnel` → `Cannot read properties of undefined (reading 'body')` | Expo:s delade ngrok trasig/överbelastad (känd 2026) | Skippa `--tunnel` tills vidare; USB-receptet ovan |
| Tunnel droppar mid-session (`Tunnel connection has been closed`) | Instabil ngrok | Starta om eller använd USB |
| `adb: no devices` i WSL | USB sitter på Windows, inte WSL | Kör `adb` i **Windows** PowerShell |
| Expo Install på telefon hänger vid nedladdning | CDN/redirect via mobil-WiFi | Ladda ner APK på PC → `adb install` |

#### Utan USB (nästa steg att testa)

Expo `--tunnel` är opålitlig just nu. Alternativ när kabeln ska bort:

1. **Egen ngrok** (rekommenderat): konto + authtoken → `ngrok http 8081`, sen
   starta Metro med `EXPO_PACKAGER_PROXY_URL=https://<din-ngrok-url>` och öppna
   den URL:en i development client (Enter URL / `am start` med https-URL).
2. **LAN** om telefon + PC på samma WiFi *utan* client isolation: hitta
   Windows LAN-IP, portforward WSL:8081 → Windows om behövs, starta med
   `REACT_NATIVE_PACKAGER_HOSTNAME=<lan-ip>`, öppna `http://<lan-ip>:8081`
   i dev client. Fungerar ofta sämre på företags-WiFi.
3. **Cloudflare Tunnel** (`cloudflared tunnel --url http://localhost:8081`) —
   samma mönster som egen ngrok.

När trådlöst är verifierat: uppdatera den här sektionen med det recept som
faktiskt fungerade (kommando + URL-form).

**Äldre gotcha (tunnel-QR):** rekonstruerad URL från `.expo/settings.json` saknar
ngrok-suffix — hämta riktig URL från `curl -s http://127.0.0.1:4040/api/tunnels`
när en egen/fungerande tunnel kör.
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

1. **Lägg till `APIFY_TOKEN` som repo-secret** (endast manuell kvarvarande
   steg): Settings → Secrets and variables → Actions → New repository secret.
   Workflows är redan uppsatta: `apify-weekly.yml` (måndagar 03:50 UTC, FB+IG
   ~$0.90/run) + `snapshot.yml` (daglig, exkluderar Apify-källorna via
   `--only <free sources>`). Testa med "Run workflow" på `apify-weekly.yml`.
2. **Ny EAS-build** — `expo-notifications` + `expo-calendar` + `expo-location`
   är native; JS-only reload räcker inte. Efter build: favorisera → notiser;
   eventdetalj → Add to calendar; Discover → Near me → GPS-prompt. Sätt också
   `EXPO_PUBLIC_WEB_ORIGIN` (Vercel-URL) i EAS env så Share/App Links pekar rätt.
   Dev-loop (WSL): se §5 “Starta development build” — USB + `--localhost` +
   `adb reverse` är verifierat; trådlöst (egen ngrok/LAN) kvar att testa.
3. **R2_PUBLIC_BASE_URL** som repo-secret (utöver befintliga R2_*) — aktiverar
   FB/IG-bildhosting i daglig + veckovis snapshot. Utan den behålls signerade
   CDN-URL:er (appen faller tillbaka till kategori-bild vid 404).
4. **LLM-kategorisering** (CATEGORIZER_API_KEY): förbättrar FB-events
   (alla har `popup`-default). Groq gratisnivå räcker (llama-3.3-70b).
5. **Pris-extraktion för sample sales**: FB har ingen prisdata; om "Fri
   entré" efterfrågas krävs LLM-extraktion ur beskrivning eller detail-pass
   (fördubblad kostnad). Beslut: vänta.
6. **Utforska tier 2 queries** (quiz, standup, brunch osv.) när tier 1-yield
   är känd över 2–4 veckor. Aktivera i `queries.ts` via `queriesForTier`.
7. **Universal Links AASA / assetlinks.json** på Vercel-hosten (Apple Team ID +
   Android SHA-256) — Share-URL:en funkar redan i webbläsaren; detta behövs
   bara för att https-länken ska öppna den installerade appen automatiskt.

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
