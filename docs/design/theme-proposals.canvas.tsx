import type { CSSProperties, ReactNode } from "react";
import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  Link,
  Row,
  Stack,
  Table,
  Text,
  useHostTheme,
} from "cursor/canvas";

/* ------------------------------------------------------------------ */
/* Theme candidate data — the artifact under evaluation                */
/* ------------------------------------------------------------------ */

type AppTheme = {
  id: string;
  name: string;
  vibe: string;
  mode: string;
  bg: string;
  element: string;
  selected: string;
  text: string;
  text2: string;
  accent: string;
  accentInk: string;
  accent2?: string;
  artwork: string;
  displayFont: string;
  bodyFont: string;
  why: string[];
  cost: string;
};

const CURRENT: AppTheme = {
  id: "current",
  name: "Dagens läge (referens)",
  vibe: "Neutral gråskala",
  mode: "Ljus först",
  bg: "#FFFFFF",
  element: "#F0F0F3",
  selected: "#E0E1E6",
  text: "#000000",
  text2: "#60646C",
  accent: "#FFB1D8",
  accentInk: "#1A1A1A",
  artwork: "#C9CDD4",
  displayFont: "system-ui",
  bodyFont: "system-ui",
  why: [
    "Fungerar men ger ingen identitet — ser ut som Expo-startmallen.",
    "Rosa pill (#ffb1d8) är hårdkodat i EventCard, inte en tematoken.",
    "Pills i urvalsläge skiljs bara med mörkare grå — svag signal.",
  ],
  cost: "Referens",
};

const BLA_TIMMEN: AppTheme = {
  id: "bla-timmen",
  name: "Blå Timmen",
  vibe: "Nordisk skymning · isblå accent",
  mode: "Mörk först",
  bg: "#0B0E14",
  element: "#151B26",
  selected: "#1F2735",
  text: "#F2F5F9",
  text2: "#97A3B6",
  accent: "#7CD4FF",
  accentInk: "#06121C",
  accent2: "#FFC46B",
  artwork: "#223042",
  displayFont: "Space Grotesk",
  bodyFont: "Inter",
  why: [
    "Blå timmen är Stockholms eget varumärke — vinterns fyra timmar blå skymning. Namnet säljer identiteten.",
    "Mörk-first får eventbilderna att poppa (Nite/Luma-mönstret); mitt i natten browsar folk event.",
    "En enda isblå accent + varm bärnsten som mikroaccent. Resten nästan färglöst — DICE-restriktion.",
  ],
  cost: "Låg: nya tokens i theme.ts + byt hårdkodade rosa → accent. Typsnitt via @expo-google-fonts.",
};

const POSTERVITT: AppTheme = {
  id: "postervitt",
  name: "Postervitt",
  vibe: "Gallerivitt · syragul accent",
  mode: "Ljus först",
  bg: "#FAFAF7",
  element: "#EFEFE9",
  selected: "#121212",
  text: "#121212",
  text2: "#6E6E68",
  accent: "#D8FF3D",
  accentInk: "#101010",
  accent2: "#FF4D2E",
  artwork: "#DDD9CF",
  displayFont: "Archivo Black",
  bodyFont: "Inter",
  why: [
    "DICE-approachen: svartvitt UI, färg finns bara i eventbilderna + ett syraigt accentglittr.",
    "Känns som en kulturkalender/zine — stort tack vare tung display-typografi.",
    "Ljus-first skiljer sig från alla konkurrenter som är mörka; sticker ut i App Store-skärmdumpar.",
  ],
  cost: "Låg-medel: tokens + fetare typskala. Kräver disciplin: accenten bara på urval/CTA.",
};

const NEON_NATT: AppTheme = {
  id: "neon-natt",
  name: "Neon Natt",
  vibe: "Ren svart · elektriskt violett",
  mode: "Mörk först",
  bg: "#000000",
  element: "#121212",
  selected: "#1F1F24",
  text: "#F5F5F5",
  text2: "#9E9E9E",
  accent: "#8B5CFF",
  accentInk: "#FFFFFF",
  accent2: "#FF5CA8",
  artwork: "#1C1727",
  displayFont: "Space Grotesk",
  bodyFont: "Inter",
  why: [
    "Resy/Nite-skolan: ren svart yta, lager på lager av nästan-svart, ingen grå mellanmjölk.",
    "Violett + rosa mikro-accent = nattlivsenergi; passar klubb/techno-delen av utbudet.",
    "Mest 'hip' av kandidaterna — men också minst unik, många appar ser ut så 2026.",
  ],
  cost: "Medel: behöver mörk och ljus variant genomtänkt + scrims på bilder för textläsbarhet.",
};

const THEMES: AppTheme[] = [CURRENT, BLA_TIMMEN, POSTERVITT, NEON_NATT];

/* ------------------------------------------------------------------ */
/* WCAG contrast (computed, not vibes)                                 */
/* ------------------------------------------------------------------ */

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const linear = channels.map((u) =>
    u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrastRatio(a: string, b: string): string {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return ((hi + 0.05) / (lo + 0.05)).toFixed(1);
}

/* ------------------------------------------------------------------ */
/* Phone mockup                                                        */
/* ------------------------------------------------------------------ */

function Pill({
  label,
  active,
  theme: t,
}: {
  label: string;
  active: boolean;
  theme: AppTheme;
}) {
  return (
    <div
      style={{
        background: active ? t.accent : t.element,
        color: active ? t.accentInk : t.text2,
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: active ? 600 : 400,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

function Phone({ theme: t }: { theme: AppTheme }) {
  const mono = "ui-sans-serif, system-ui, sans-serif";

  return (
    <div
      style={{
        width: 250,
        borderRadius: 20,
        overflow: "hidden",
        background: t.bg,
        border: `1px solid ${t.element}`,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: 12,
        lineHeight: "16px",
        flexShrink: 0,
      }}
    >
      {/* status bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "6px 14px 2px",
          color: t.text2,
          fontSize: 10,
        }}
      >
        <span>9:41</span>
        <span>sthlmevents</span>
      </div>

      {/* header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 14px 6px",
        }}
      >
        <span
          style={{
            fontFamily: `${t.displayFont}, ui-sans-serif, system-ui, sans-serif`,
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: "-0.02em",
            color: t.text,
          }}
        >
          Upptäck
        </span>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: t.selected,
          }}
        />
      </div>

      {/* search */}
      <div style={{ padding: "0 14px 10px" }}>
        <div
          style={{
            background: t.element,
            color: t.text2,
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 11,
          }}
        >
          Sök event, plats…
        </div>
      </div>

      {/* filter pills */}
      <div style={{ display: "flex", gap: 6, padding: "0 14px 10px", overflow: "hidden" }}>
        <Pill label="Idag" active theme={t} />
        <Pill label="Helgen" active={false} theme={t} />
        <Pill label="Musik" active={false} theme={t} />
        <Pill label="Loppis" active={false} theme={t} />
      </div>

      {/* featured card */}
      <div style={{ padding: "0 14px 12px" }}>
        <div style={{ borderRadius: 14, overflow: "hidden", background: t.element }}>
          <div style={{ position: "relative", background: t.artwork, height: 96 }}>
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                background: t.accent,
                color: t.accentInk,
                borderRadius: 6,
                padding: "2px 7px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.06em",
              }}
            >
              MUSIK
            </div>
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 22,
                height: 22,
                borderRadius: 999,
                background: t.selected,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                background: t.accent2 ?? t.selected,
                color: t.accent2 ? "#101010" : t.text,
                borderRadius: 6,
                padding: "2px 7px",
                fontSize: 9,
                fontWeight: 700,
              }}
            >
              FRI ENTRÉ
            </div>
          </div>
          <div style={{ padding: "8px 10px 10px" }}>
            <div style={{ color: t.accent, fontSize: 11, fontWeight: 600 }}>Idag 19:00</div>
            <div
              style={{
                color: t.text,
                fontWeight: 600,
                fontSize: 14,
                lineHeight: "18px",
                margin: "2px 0",
              }}
            >
              Rooftop Jazz på Fotografiska
            </div>
            <div style={{ color: t.text2, fontSize: 11 }}>Fotografiska · Södermalm · 395 kr</div>
          </div>
        </div>
      </div>

      {/* compact row card */}
      <div style={{ padding: "0 14px 12px" }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            background: t.element,
            borderRadius: 12,
            padding: 8,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 8,
              background: t.artwork,
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: t.text2, fontSize: 10 }}>lör 5 sep · 11:00</div>
            <div style={{ color: t.text, fontWeight: 600, fontSize: 12 }}>
              Dalendagen — loppis &amp; musik
            </div>
            <div style={{ color: t.text2, fontSize: 11 }}>Stockholm · Gratis</div>
          </div>
        </div>
      </div>

      {/* tab bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "8px 0 10px",
          borderTop: `1px solid ${t.element}`,
          fontSize: 10,
        }}
      >
        <span style={{ color: t.accent, fontWeight: 600 }}>Utforska</span>
        <span style={{ color: t.text2 }}>Karta</span>
        <span style={{ color: t.text2 }}>Sparat</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Swatch rows                                                         */
/* ------------------------------------------------------------------ */

function Swatches({ theme: t }: { theme: AppTheme }) {
  const rows: Array<{ role: string; hex: string; against?: string }> = [
    { role: "Bakgrund", hex: t.bg, against: t.text },
    { role: "Kort/yta", hex: t.element, against: t.text },
    { role: "Vald pill", hex: t.accent, against: t.accentInk },
    { role: "Sekundärtext", hex: t.text2, against: t.element },
  ];

  return (
    <Stack gap={4}>
      {rows.map((r) => {
        const ratio = r.against ? contrastRatio(r.hex, r.against) : null;
        return (
          <div key={r.role}>
            <Row gap={8} align="center">
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: r.hex,
                  border: `1px solid ${t.selected}`,
                  flexShrink: 0,
                }}
              />
              <div style={{ width: 96 }}>
                <Text size="small" tone="secondary">
                  {r.role}
                </Text>
              </div>
              <Text size="small" style={{ fontFamily: "monospace" }}>
                {r.hex}
              </Text>
              {ratio ? (
                <Text size="small" tone="tertiary">
                  {ratio}:1
                </Text>
              ) : null}
            </Row>
          </div>
        );
      })}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Theme card                                                          */
/* ------------------------------------------------------------------ */

function ThemeCard({ theme: t }: { theme: AppTheme }) {
  return (
    <Card>
      <CardHeader trailing={<Text size="small" tone="tertiary">{t.mode}</Text>}>
        {t.name}
      </CardHeader>
      <CardBody>
        <Stack gap={12}>
          <Row gap={16} align="start">
            <Phone theme={t} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Stack gap={6}>
                <Text size="small" tone="secondary">
                  {t.vibe}
                </Text>
                <Text size="small">
                  <b>Typografi:</b> {t.displayFont} (display) + {t.bodyFont} (bröd)
                </Text>
                <Swatches theme={t} />
              </Stack>
            </div>
          </Row>
          <Divider />
          <Stack gap={4}>
            {t.why.map((w) => (
              <div key={w}>
                <Text size="small" tone="secondary">
                  — {w}
                </Text>
              </div>
            ))}
          </Stack>
          <Text size="small" tone="tertiary">
            <b>Implementering:</b> {t.cost}
          </Text>
        </Stack>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ThemeProposals() {
  const host = useHostTheme();
  const hostLabel = host.kind === "light" || host.kind === "hc-light" ? "ljust" : "mörkt";

  return (
    <Stack gap={20}>
      <Stack gap={8}>
        <H1>Temaförslag — sthlmevents</H1>
        <Text tone="secondary">
          Tre identitetsförslag renderade på våra riktiga komponentmönster (EventCard,
          pills, tabbar), jämförda mot dagens läge. Kontrasterna är räknade enligt WCAG
          — inte magkänsla.
        </Text>
      </Stack>

      <Callout tone="info" title="Nulägets problem">
        Gråskala utan accent (ser ut som mallen), rosa kategorimärke hårdkodat i
        EventCard istället för som token, systemtypsnitt, och markerade pills skiljs
        bara med mörkare grå. Byggnationen är dock redo: alla ytor går redan via
        semantiska tokens, så ett temabyte är i princip bara <b>theme.ts</b>.
      </Callout>

      <Grid columns={2} gap={16}>
        {THEMES.map((t) => (
          <div key={t.id}>
            <ThemeCard theme={t} />
          </div>
        ))}
      </Grid>

      <Stack gap={8}>
        <H2>Kontrast, räknat (WCAG)</H2>
        <Table
          headers={["Tema", "Brödtext/meny", "Text på kort", "Text på accent"]}
          rows={THEMES.map((t) => [
            t.name,
            `${contrastRatio(t.text, t.bg)}:1`,
            `${contrastRatio(t.text, t.element)}:1`,
            `${contrastRatio(t.accentInk, t.accent)}:1`,
          ])}
          columnAlign={["left", "right", "right", "right"]}
        />
        <Text size="small" tone="tertiary">
          AA-gräns: 4.5:1 för normal text, 3:1 för stor text. Sekundärtextens kontrast
          mot kortyta finns i swatchlistan per tema.
        </Text>
      </Stack>

      <Stack gap={8}>
        <H2>Research — vad referenserna faktiskt gör</H2>
        <Table
          headers={["Referens", "Vi lånar", "Vi struntar i"]}
          rows={[
            [
              <div key="dice">
                <Link href="https://styles.refero.design/style/f4af4c42-2cba-4aa6-8d06-2f728bce702d">
                  DICE
                </Link>
              </div>,
              "Monokromt UI där eventkonsten bär all färg; pillknappar; tyst restriktivitet med loud typografi.",
              "Custom condenseda display-font (Foggy) — inte gratislicensierad.",
            ],
            [
              <div key="luma">
                <Link href="https://www.youtube.com/watch?v=lGJYvLfQf-Q">Luma</Link>
              </div>,
              "Mörk yta + egna typografiska element ovanpå bilderna; färgade mikrodetaljer (pristag); 2-radershantering.",
              "Karusell-tunga flows — stor ombyggnad för liten vinst nu.",
            ],
            [
              <div key="nite">
                <Link href="https://abduzeedo.com/nite-event-discovery-app-design-puts-nightlife-first">
                  Nite
                </Link>
              </div>,
              "Mörk-first som standard; mörka ytor gör fotografier mer vivid; vikt-kontrast i typografi istället för färg.",
              "Tunga gradientöverlägg per kort — dyrt, och vår pipeline ger inga bildkvalitetsgarantier.",
            ],
            [
              <div key="resy">
                <Link href="https://github.com/Meliwat/awesome-ios-design-md/blob/main/design-md/food/resy/DESIGN-expo.md">
                  Resy
                </Link>
              </div>,
              "Ren svart canvas + nära-svarta lager; divider-border istället för skuggor (skuggor syns inte på svart).",
              "Serif-display — fel ton för vårt utbud.",
            ],
            [
              <div key="hig">
                <Link href="https://developer.apple.com/design/human-interface-guidelines/dark-mode">
                  Apple HIG
                </Link>
              </div>,
              "Aldrig hårdkodade färger — semantiska par; dimmare bakgrunder, ljusare förgrund i mörkt läge.",
              "—",
            ],
          ]}
        />
      </Stack>

      <Stack gap={8}>
        <H2>UX-uppdateringar oavsett tema</H2>
        <Stack gap={6}>
          <Text size="small" tone="secondary">
            — <b>Pill-states:</b> vald kategori = fylld accent med mörk text (nu: bara
            mörkare grå). Ovald = mjuk yta.
          </Text>
          <Text size="small" tone="secondary">
            — <b>Kort:</b> "När"-raden i accentfärg (Luma-mönstret), skärma under bild
            där chip ligger, enhetlig radie 16/12.
          </Text>
          <Text size="small" tone="secondary">
            — <b>Typografi:</b> displayfont på rubriker och korttitlar (tight tracking),
            brödtext kvar på systemfont för läsbarhet.
          </Text>
          <Text size="small" tone="secondary">
            — <b>Tabbar:</b> aktiv färg = accent istället för grå.
          </Text>
          <Text size="small" tone="secondary">
            — <b>Tokens städas:</b> EventCards rosa (#ffb1d8) och badge-text (#1a1a1a)
            flyttas in i theme.ts som accent/accentInk.
          </Text>
        </Stack>
      </Stack>

      <Stack gap={8}>
        <H2>Min rekommendation</H2>
        <Text>
          <b>Blå Timmen</b> — billigast att implementera (ren token-swap + typsnitt),
          mörk-first passar när folk browsar event på kvällen, och "Stockholms blå
          timme" ger en identitet ingen annan eventapp kan kopiera. Postervitt är
          det starkaste alternativet om ni vill synas som ljus, zineig kulturkalender.
        </Text>
        <Text size="small" tone="tertiary">
          Din host är i {hostLabel} läge — mockuperna visar varje förslags eget läge,
          inte host-temat. (kind: {host.kind})
        </Text>
      </Stack>
    </Stack>
  );
}