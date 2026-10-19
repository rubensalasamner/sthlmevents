# Projektstatus & Beslutslogga — sthlmevents

> **Syfte:** den här filen är projektets "minne" mellan datorer och sessioner.
> Läs den först om du (människa eller AI-agent) plockar upp projektet efter en
> paus. Den uppdateras när vi fattar beslut eller når slutsatser — inte för
> varje kodändring. Senast uppdaterad: **2026-10-19**.

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

## 2. Nuvarande läge (2026-10-02)

- **Daglig cron frisk** t.o.m. 2026-10-01. **Weekly Apify**: 09-21 OK;
  **09-28 FAIL** (FB `Invalid time value` + push-race mot daily). Fix 2026-10-02:
  skippa bad `utcStartDate` i FB-adaptern; weekly cron flyttad till **05:00 UTC**
  mån. Manuell re-run **lyckades** (FB 10 + IG 11 + profiles 14 → 5408 events,
  commit + R2-upload).
- **CI-källstatus (granskad 2026-10-16 via run-logg 38873985474):** daily-cronen
  (`--only` fria källor) har sedan 2026-09-18 körts utan tre källor:
  `ticketmaster` **skippas** (TICKETMASTER_API_KEY saknas som repo-secret),
  `eventbrite` **failar 405** (bot-skydd mot CI-IP:n), `evenemangskollen`
  **skippas** (EVENEMANGSKOLLEN_ANON_KEY saknas som secret) → dess ~1539
  events i snapshoten är frysta från en lokal körning 2026-09-18. Båda
  adapterna verifierade fungerande lokalt 2026-10-16 (TM 100 events/page,
  EB 40). Bugg i `generate-snapshot.ts`: skippade (saknad nyckel) källor
  hamnar varken i `sources` eller `failures`, så deras gamla events tappas
  ur nästa `--only`-snapshot i stället för att behållas stale (endast
  riktiga failures behålls). Det är därför TM/EB försvann helt 2026-09-18→19.
- **Källor återställda i CI (2026-10-16):** ROOT CAUSE: repo-secrets fanns men
  var aldrig mappade i snapshot.yml-stegets `env:` → TM/EK/kulturbiljetter
  skippades varje dag. Fixar: (1) `TICKETMASTER_API_KEY`,
  `EVENEMANGSKOLLEN_ANON_KEY` satta som repo-secrets (värden från lokal
  `pipeline/.env`), (2) `env:`-mappning för TM/EK/KB i snapshot.yml,
  (3) keep-stale-buggen i `generate-snapshot.ts` fixad (skipped sourcen
  behåller gamla events). Verifierat i run 38880574358: TM 115, EK 1843,
  KB 277 events → snapshot 5698. eventbrite fortfarande 405 i CI (bot-filter,
  funkar lokalt). Dramaten fortfarande ~1 venue-event — kräver egen
  dramaten.se-adapter (se ovan), Ticketmaster saknar deras utbud.
- **Facebook-källan (Apify) är LIVE**: adapter + filter + mapper + datumfönster
  byggt, testat och verifierad i flera riktiga snapshot-körningar.
- **Instagram keyword (Apify) är LIVE** (2026-09-16): caption-parsing-adapter,
  9 unika events i första körningen efter dedup mot FB. Vecko-cadens,
  $0.30 hard-cap per run (se §3 Instagram-sektionen).
- **Instagram profiles (Apify) LIVE** (2026-09-18): curated allowlist
  (`stockholm_samplesale`, `stockholmsamplesale` tillagd 2026-09-19 utan
  caption-probe), `apify/instagram-post-scraper`, caption-parser/mapper.
  Första partial snapshot: **14 raw → 12 kvar** efter dedup
  (5781→5777 totalt). Kostnad **$0.0405**. Street-extraktion fix (2026-09-18):
  `extractStreetAddress` + geocode street-first → **10/12 med coords**
  (DEDICATED/Marimekko/A Day’s March m.fl. på kartan). Ingår i vecko-cron.
  Nytt konto syns efter nästa `snapshot:ig-profiles` / veckokörning.
- **Favoritpåminnelser LIVE** (2026-09-16): lokala notiser via
  `expo-notifications` — dagen före 09:00 Stockholm + 2h innan start. Kräver
  **ny native build** (plugin + POST_NOTIFICATIONS). Permission frågas vid
  första favorit, inte vid appstart. Tap → eventdetalj.
- **Lägg till i kalender LIVE** (2026-09-16): `Add to calendar` på eventdetaljen
  öppnar OS-kalenderdialog (förifyllt) via `expo-calendar/legacy`; web → Google
  Calendar-URL. Samma native build som notiser.
- **Helg-/vecko-default** (uppdaterad 2026-10-07): Home öppnar på `weekend`
  **fredag–söndag** (Stockholm-weekday), annars `week` (Mon–Thu). Weekend-
  fönstret är Fre 00:00 → Mån 00:00; inne i helgen startar fönstret idag så
  passerade dagar inte återkommer. Magazine-hero + fönster-rail speglar
  fönstret.
- **Närhet LIVE** (2026-09-16): “Near me” + ≤2/5 km på Discover (lazy GPS via
  `expo-location`); kartan zoomar mot användaren. Favoriter får accent-bubbla
  **bara när de matchar aktiva filter** (bypass borttagen 2026-09-18 — annars
  stack kartan oense med Discover). Kräver samma ny native build
  (location-plugin).
- **Progressiv intresse-onboarding LIVE** (2026-09-16): ingen cold-start-wizard.
  Efter 1 favorit **eller** 3 eventöppningar → sheet “What are you into?”
  (9 chips inkl. market + popup, Not now). Soft boost i `orderFeed` (inte hårt filter). Kompakt
  “Vibes”-länk i Home-headern. Lagras lokalt
  (`sthlmevents.interests.v1`).
- **On-device feed personalization LIVE** (2026-10-19): utöver vibes —
  `AffinityProvider` (`sthlmevents.affinity.v1`) lär kategori/venue/organizer
  från opens + favorites (21-dagars half-life) + explicit Follow på detalj.
  `orderFeed` blandar vibes + affinity + tids-/helgprior + soft avstånd
  (när GPS finns men Near me är av) + diversify (max 2 samma kategori i rad).
  Magazine: **For you**-rail, **Because you saved**-rail, tematiska rails
  omordnade efter affinity (theatre/comedy/art/food/family tillagda).
- **Share → app/web LIVE** (2026-09-16): Share delar
  `https://<web>/event/<id>` (eller `sthlmevents://…` utan web-origin), inte
  Ticketmaster. `EXPO_PUBLIC_WEB_ORIGIN` sätter App Links / Universal Links-
  host i `app.config.ts`.
- **Fragile image hosting** (2026-09-16): pipeline-steg hostar fbcdn/IG-bilder
  till R2 när `R2_*` + `R2_PUBLIC_BASE_URL` är satta; misslyckanden →
  kategori-fallback. Appen har `EventImage` onError→fallback som säkerhetsnät.
- **R2 hostar även non-CORS-bilder** (2026-10-03): `shouldHostImageUrl` utöver
  fragile CDN:er — tredjepartshostar utan `Access-Control-Allow-Origin`
  (t.ex. bondensegen.com, biblioteket.stockholm.se) skrivs om till R2 så web
  (`expo-image`/`useImage`) inte faller tillbaka till kategori-placeholder.
  CORS-säkra CDN:er (Unsplash, Ticketmaster, Tickster, …) skippas. Misslyckad
  non-fragile-download behåller original-URL (native funkar fortfarande).
- **og:image-enrichment fix** (2026-10-03): scrape `sourceUrl` före `ticketUrl`;
  skriv bara över kategori-fallback / icke-plausibla URL:er; rejecta tix
  buyingflow-og:image (Kulturhuset giftade ~1095 events med checkout-URL:er
  som `imageUrl` → samma art-placeholder på web). Poisoned cache-entries
  re-scrapas.
- **og:image Visit Stockholm** (2026-10-19): `enrichmentPageUrls` skippar
  API-/tix-URL:er (`api.*`, `/api/`, `tix.*`, `/buyingflow/`). VS har
  `sourceUrl` = JSON-API (ingen og:image) och `ticketUrl` = arrangörssida —
  tidigare scrapades API:t → **663/663** Unsplash-placeholders. Nu scrapas
  arrangörssidan. Kulturhuset oförändrat (editorial `sourceUrl` först).
  Syns i appen efter nästa snapshot-körning (inte EAS-build).
- UI (2026-09-18): **Magazine home + map peek + agenda**. Tabs Home /
  Explore / Saved. Filter ligger i ett sheet bakom en sammanfattningschip —
  inte fyra always-on rader. EventPresentation-strategier: hero / poster /
  compact (map peek). Eventdetalj: 3:2-hero, kategori-färgad chip (samma
  språk som map-peek), sticky Directions + Tickets, ExpandableText,
  “Show on map” när coords finns. Saved: This week / Later / Past.
  Type scale låst i `ThemedText` (display/section/card/body/meta).
  Agenda: sök + filter-chip (ingen separat DateFilter-rad). Tomma lägen
  erbjuder Reset filters + Open Explore. Ranking, Blå Timmen, weekend-
  default, vibes och påminnelser oförändrade.
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
   `hostFragileImages` laddar ner och lägger dem på R2 när credentials finns
   (även non-CORS-hostar sedan 2026-10-03); annars ligger de kvar (appen har
   onError-fallback).
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
  Markets & fleas / Sales & pop-ups / Nightlife / Music) — inte en 5k-lista.
  Explore är kartan med
  overlay-chip + detent-sheet. “See all” / sök är agenda (tid-grupperade
  compact rows). En `EventPresentation`-strategy per densitet; samma
  `useFilteredEvents` för alla tre ytor så filtret inte ljuger.
- **Kategori-split market vs popup (2026-09-19)**: `market` = loppis/marknad/
  flea; `popup` = sample sale/utförsäljning/brand pop-up. Separata magazine-
  rails + interest-chips. Keyword-maps + FB/IG mapper använder
  `inferCommerceCategory`; LLM-prompten säger samma sak. Syns i data efter
  nästa snapshot.
- **App variants (2026-10-02)**: EAS `development` sätter `APP_VARIANT=development`
  → Android/iOS id `app.sthlmevents.dev`, app-namn “sthlmevents Dev”. Play /
  production behåller `app.sthlmevents`. Då kan Internal Testing och lokal
  hot-reload-klient sitta sida vid sida. Kräver **en** ny
  `eas build -p android --profile development`. Metro: `npm run start:usb`.
  USB: `scripts/usb-dev.ps1` (öppnar bara `.dev`-paketet). Lägg till
  `app.sthlmevents.dev` SHA-1 i Google Maps API-nyckelrestriktionen.
- **Filter**: sammanfattningschip öppnar sheet (datum, kategori, near-me,
  dev-source). Inte always-on-stack. `reset()` rensar till kontextuell default.
- **Helgfönster (2026-10-07)**: `weekend` = Fre→sön (inte lör→sön). Default
  Fri–Sun → weekend, Mon–Thu → week (stadskalender, inte “bara ikväll”).
  Hints i sheet via `dateRangeHint` (samma källa som heading).
- **UX P1 (2026-10-07)**: transparent `BottomSheet`; interests-prompt via
  `maybePrompt` på Home-focus (inte samtidigt som notis-permission); agenda
  scope (`?category=` + clear query on leave); Saved använder `groupAgenda`;
  event-detalj deep-link back + “Browse events”.
- **UX P2 (2026-10-07)**: Home-rubrik öppnar filter; remiss-preprompt före
  notis-permission; CTA “RSVP”/“Event page”; gutter `Spacing.four` 24→18.
- **UX P3 (2026-10-07)**: `FilteredEventsProvider` (en pipeline + GPS);
  map split (`map-availability` / `use-map-camera` / `use-pin-icons` +
  Apple/Google strategy); favorit-påminnelser i `FavoriteReminders`;
  död kod bort (filter-typer → `types/filters.ts`).
- **Sparade events överlever slut (2026-10-07)**: källorna filtrerar bort
  avslutade events, så favoriter (bara id) försvann ur Saved och detalj-404:ade.
  `SavedEventsProvider` sparar en snapshot per favorit
  (`sthlmevents.favorites.snapshots.v1`), live-kopian vinner; Past visar
  avslutade i 30 dagar. Detaljen faller tillbaka på snapshot (“Ended · datum”,
  ingen biljett/kalender/karta).
- **Relaterade events på detalj (2026-10-07)**: `RelatedStrategy`
  (`utils/related-events.ts`): samma venue → samma arrangör (skippas om
  arrangör = venue; 1040 av ~4.9k) → samma dag inom 1.5 km (ej ≥30-dagars
  körningar). Rails dedupar serier sinsemellan. Paraplyarrangörer
  (Stadsbiblioteket 1638, Kulturhuset 1244) ger breda arrangörsrails.
- **Agenda dag-strip, gemensam FilterSheet, `EventsStatus` (2026-10-07)**:
  en `FilterSheetProvider` (`openFilters(counter?)` — kartan räknar pins);
  `resolveEventsStatus` = innehåll vinner över spinner/fel. Tab-bar
  `minimizeBehavior="onScrollDown"` (endast iOS 26+, ingen effekt på Android).
- **Explore map + sheet (2026-10-07)**: Layout Proposals "pair" — detent-lista
  (`DetentSheet` peek/half/full via RNGH + Reanimated) över kartan med
  `CompactRow`. Pin-val synkas med highlight + scroll; `MapEventPeek` avstängd
  på Explore (båda vill ha nederkanten). Near me → titel "N nearby" +
  avstånd i raderna. Ingen ny dependency (`@gorhom/bottom-sheet` skippad).
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

### CI — weekly vs daily race (2026-09-28)

Weekly (då 03:50 UTC) och daily (03:40 UTC) överlappade: daily pushade medan
weekly commitade → non-fast-forward, scrape gick förlorad. **Fix:** weekly
cron → `0 5 * * 1` (05:00 UTC). Samma körning failade också FB med
`Invalid time value` (en rad utan parsebar `utcStartDate`); adaptern filtrerar
nu bort sådana rader innan map.

### Starta development build (WSL2 + Android) — USB + wifi

Två lägen, samma development client (`app.sthlmevents.dev`).

#### USB (daglig driver — verifierat 2026-09-16)

```bash
# WSL — --localhost är viktigt (annars blir QR/URL WSL-bridge 172.x)
npm run start:usb
# Metro ska visa: …/?url=http%3A%2F%2F127.0.0.1%3A8081
```

```powershell
# Windows PowerShell (USB + USB-felsökning)
.\scripts\usb-dev.ps1
# hittar adb på PATH eller %LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
```

Scanna **inte** QR i USB-läge. Lyckat tecken i WSL: `Android Bundled …`.

**APK-install (när Expo Install-sidan hänger på telefon-WiFi):** ladda ner
APK på PC från build-sidan, sen:
`adb install -r "$env:USERPROFILE\Downloads\application-<build-id>.apk"`
(`~` funkar inte till adb.exe på Windows.)

#### Utan USB / wifi (tunnel — server- + tunnelsida verifierad 2026-10-16)

`npm run start:wifi` kör `expo start --tunnel` (Expo-ngrok, riktiga
`@expo/ngrok`; det gamla Cloudflare-aliaset är borttaget). Tunnel-subdomainen
är **deterministisk**: `<urlRandomness>-<username>-<port>.exp.direct`, där
`urlRandomness` lagras i `.expo/settings.json` — URL:en ändras alltså inte
mellan omstartar, så länge randomnessen inte nollställs.

```bash
# WSL
npm run start:wifi
# Vänta på: Tunnel connected. + Tunnel ready. + Waiting on http://localhost:8081
```

```powershell
# Telefon: öppna app.sthlmevents.dev → Enter URL → klistra in HTTPS-URL:en
# QR/deep link-alternativ (URL:en måste URL-encodas):
#   sthlmevents-dev://expo-development-client/?url=https%3A%2F%2F<tunnelhost>
```

**Verifiera innan telefonförsök** (sparar gissningar — allt ska vara 200,
annars är problemet server-/tunnelsidan, inte telefonen):

```bash
TUN=https://<randomness>-<user>-8081.exp.direct
curl -s $TUN/status                        # → packager-status:running
curl -s -H 'expo-platform: android' $TUN/  # → manifest-JSON med launchAsset
```

**Diagnostikregel efter misslyckat telefonförsök** — kolla Metro-loggen först:
- **Inga nya requests/Bundled-rader** → telefonen nådde aldrig servern.
  Kända orsak: underscore i tunnel-hostnamen (se nedan) eller nätväg.
- **Requests + error-rader** → serversidan; felraden namnger problemet.
- Fel-skärmens **Copy-knapp** ("There was a problem loading the project")
  ger stack trace:n — den verkliga diagnosen. T.ex. `Android internal error`
  med `Invalid input to toASCII` = TLS-vägrat hostname, inte Expo/nätverk.
- Web-appen som referens: öppna samma tunnel-URL i telefon-Chrome. Laddar
  webben men inte dev client → app-/TLS-sidigt problem, inte nätvägen.

**Underscore-fällan (2026-10-16, rotorsak via copy-stack):** Expo genererar
`urlRandomness` som base64url (alfabetet innehåller `_`). Androids SSL-stack
(`SNIHostName` → `IDN.toASCII`, STD-3-regler) vägrar underscore-hostnames →
OkHttp kastar *innan* anslutningen; servern ser inget. Fix: byt till
underscore-fritt värde i `.expo/settings.json` (t.ex. `z8ynht4`) och starta
om. Expo-buggen: generatorn validarar bara första tecknet, inte hela
strängen. Lärda lektioner: (1) dev client-validering är strictare än
webbläsare — testa alltid manifest-URL:en med `curl` ovan; (2) app-state
(Clear storage) var INTE problemet här — copy-stack hoppade direkt till
rotorsaken utan den averingen.

**Kamera-error #2 (2026-10-16, efter fix ovan):** `UninitializedPropertyAccessException:
lateinit property cameraState has not been initialized` på `setCameraPosition`.
Orsak i expo-maps Kotlin-källan: `cameraState` sätts först i Composable
`Content()` — imperativa anrop före first compose kraschar. Också: JS-wrappern
`setCameraPosition` returnerar `void` (inte Promise), så `.catch()` fäster
aldrig — felet dyker alltid som "Uncaught (in promise)". Fix: gatea
kluster-zoom bakom `onMapLoaded`-propen (Google-only; Apple har ingen
motsvarighet men behöver den inte — iOS är annotations-drivet).

#### Fel vi såg och varför

| Symptom | Orsak | Fix |
|---|---|---|
| “problem loading the project” efter QR utan tunnel | Metro ger `http://172.19.0.1:8081` (WSL-bridge); telefonen når den inte | USB: `--localhost` + `adb reverse` + `usb-dev.ps1` (scanna inte QR). Wifi: `start:wifi` |
| Samma fel med `adb reverse` men Metro utan `--localhost` | Appen öppnas men Metro-loggen får **inga** Bundled-rader | `npm run start:usb` (inkl. `--localhost`) |
| Stock `expo start --tunnel` → `reading 'body'` (2026-10-03) | Expo:s delade ngrok var då trasig; löstes då via Cloudflare-alias |Aliaset är numera borttaget — `start:wifi` kör riktiga `@expo/ngrok` och funkar (verifierat 2026-10-16) |
| Dev client "There was a problem loading the project" + copy-stack `Invalid input to toASCII: z_ynht4-…exp.direct` (2026-10-16) | `urlRandomness` i `.expo/settings.json` innehöll `_` (base64url-alfabetet). Android SSL (`SNIHostName` → `IDN.toASCII`, STD-3) vägrar underscore-hostnames → OkHttp kastar innan anslutning; serverloggen får **inga** requests. Chrome laddar samma URL fint (tillämpar inte STD-3) | Byt `urlRandomness` till underscore-fritt värde (t.ex. `z8ynht4`) i `.expo/settings.json`, starta om `start:wifi`, använd nya URL:en. Expo-bugg: generatoren guardar bara första tecknet |
| Tunnel droppar mid-session | Instabil quick-tunnel | Starta om `start:wifi`, eller USB |
| `adb: no devices` / adb saknas | USB på Windows; adb ofta inte på PATH | Kör `usb-dev.ps1` (SDK-path fallback); installera platform-tools om saknas |
| Expo Install på telefon hänger vid nedladdning | CDN/redirect via mobil-WiFi | Ladda ner APK på PC → `adb install` |

### Miljövariabler

- `pipeline/.env` (gitignored): `APIFY_TOKEN`, TICKETMASTER_*, EVENEMANGSKOLLEN_*,
  CATEGORIZER_* (valfria), KULTURBILJETTER_API_KEY (valfri). mall:
  `pipeline/.env.example`.
- **OBS**: rotens `.env.local` läses av Expo-appen, INTE av pipeline.
- Adaptern läser `APIFY_TOKEN` lazily i `fetch()` (inte konstruktorn) —
  eftersom modul-import körs före `loadEnv()`.
- **`.cursorignore` (2026-10-03):** blockerar agent/index från riktiga `.env*`;
  `!.env.example` håller mallen synlig. Påverkar inte terminal/pipeline —
  bara att AI:n inte kan läsa hemligheter.
- **Remote control (2026-10-06):** bytte från `udah1/cursor-chat-bridge` till
  **nitech/auto** (MIT; Telegram kan vidarebefordra Approve/Run).
  Full setup + **local secrets checklist** (token, chat id, CDP, supervise):
  **`docs/auto-telegram-setup.md`**. Denna maskin:
  `C:\Users\rus\programming\personal\auto`, `AUTO_POLICY=ask-on-write`,
  chat-bridge purged. En bot = en poller (kör inte två laptops samtidigt).

### App-ikon (2026-10-03)

Bytte Expo-placeholder mot Blå Timmen-mark (isblå **S** + amber prick på
`#0B0E14`). Assets: `assets/images/icon.png` + Android adaptive
foreground/background/monochrome; `adaptiveIcon.backgroundColor` → `#0B0E14`.
Syns först efter **ny native build** (dev + Play Internal Testing). Dev-varianten
(`APP_VARIANT=development`) använder badgade assets (`icon-dev.png`,
`android-icon-foreground-dev.png`, `splash-icon-dev.png`) via `app.config.ts`
— amber **DEV**-pill under S-märket. Store/Play behåller utan badge.

### Web-mappen (2026-10-16) — testa kartan i webbläsaren

`expo-maps` har ingen web-implementation, så webben byggde tidigare en
plattform-override (`event-map.web.tsx`) som renderade en eventlista. Nu finns
en riktig web-karta: **Google Maps JS API** i `src/components/map/web-event-map.tsx`
(+ `web-event-map-host.tsx` som kör samma pin-/kluster-/kamera-pipeline som
native). Pinnarna återanvänder exakt samma PNG-bubbles som native
(`loadBubbleIconUrl` → data-URI:er som Google-markers-icon) — visuell paritet
utan extra kod.

**Nyckel:** webben behöver en egen, webbrestrictad nyckel i `.env.local`:

```
EXPO_PUBLIC_GOOGLE_MAPS_KEY=<browser key>
```

- Native-bygget använder fortfarande `GOOGLE_MAPS_API_KEY` (SHA-1-restrictad,
  via app.config.ts) — de två nycklarna är separata.
- Utan `EXPO_PUBLIC_GOOGLE_MAPS_KEY` faller webben tillbaka till eventlistan
  (samma fallback som förut) med en notis som namnger den saknade variabeln.
- Styrka till web-kartan (filter, kluster, peek-sheet) kan testas direkt i
  webbläsaren; bara native-specifika saker (GPS, notiser) kräver fortfarande
  telefon.
- Arkitektur: plattformsstrategi — `mapRenderers` (ios/android) i
  `event-map.tsx` + web-strategi via `event-map.web.tsx`-overriden. Delade
  hooks: `useBubbleMode` (rubrik-/skala-trösklar), `useMapSelection`
  (urval) används av både native och web — en källa, ingen dubblering.

### Testing

```bash
cd pipeline && npm test          # 194 tester (node:test + tsx)
npm run typecheck                # tsc --noEmit
```

Nya adapters följer mönstret: `types.ts` (rå shape + klient) → `mapper.ts`
(pure transform, testbar) → `adapter.ts` (filter + fetch) → `fixture.json`
(riktig data!) → `*.test.ts`.

## 6. Nästa steg (prioriterat)

1. **Weekly Apify re-run OK 2026-10-02** (FB date-guard + cron 05:00 UTC).
   Nästa schemalagda: mån 05:00 UTC. Daily exkluderar Apify via `--only`.
2. **Ny EAS-build** — `expo-notifications` + `expo-calendar` + `expo-location`
   är native; JS-only reload räcker inte. Efter build: favorisera → notiser;
   eventdetalj → Add to calendar; Discover → Near me → GPS-prompt. Sätt också
   `EXPO_PUBLIC_WEB_ORIGIN` (Vercel-URL) i EAS env så Share/App Links pekar rätt.
   Dev-loop (WSL): se §5 — USB (`start:usb`) + wifi-tunnel (`start:wifi` /
   Cloudflare). Bekräfta `Android Bundled…` på telefon via tunnel-URL.
3. **R2_PUBLIC_BASE_URL** som repo-secret (utöver befintliga R2_*) — aktiverar
   bildhosting (FB/IG + non-CORS) i daglig + veckovis snapshot. Utan den behålls signerade
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
