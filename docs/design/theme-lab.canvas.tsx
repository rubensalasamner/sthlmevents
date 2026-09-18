import type { ReactNode } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  Row,
  Stack,
  Table,
  Text,
} from "cursor/canvas";

/* ------------------------------------------------------------------ */
/* Theme data                                                          */
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
};

const FALUROD: AppTheme = {
  id: "falurod",
  name: "Faluröd & Senap",
  vibe: "Svensk arvsröd · varm och trygg",
  mode: "Ljus först",
  bg: "#FAF6F0",
  element: "#EFE7DB",
  selected: "#2A211B",
  text: "#1A1512",
  text2: "#6E6258",
  accent: "#C33B2E",
  accentInk: "#FFF6EC",
  accent2: "#E8A93D",
  artwork: "#E3D5C3",
  displayFont: "Fraunces",
  bodyFont: "Inter",
  why: [
    "Falu rödfärg är Sveriges mest igenkänningfärg — ingen annan eventapp i världen kan använda den trovärdigt.",
    "Varm cream-botten + senapsgul mikroaccent: känns som en marknad/kulturhus, inte nattklubb.",
    "Fraunces (display serif) ger 'kulturtidning'-känsla utan att bli gammaldags.",
  ],
};

const TANTO: AppTheme = {
  id: "tanto",
  name: "Tantolunden",
  vibe: "Djup parkgrön · lime-signal",
  mode: "Mörk först",
  bg: "#0C1410",
  element: "#152119",
  selected: "#203024",
  text: "#EEF5EF",
  text2: "#93A696",
  accent: "#9FE870",
  accentInk: "#0A140B",
  accent2: "#F4B860",
  artwork: "#1C2B20",
  displayFont: "Space Grotesk",
  bodyFont: "Inter",
  why: [
    "Parkgrön mörk yta = Gröna Lund, parkteater, utomhussäsong — den gröna delen av utbudet.",
    "Lime-accenten (DICE:s neongröna släkting) signalerar 'gratis/utomhus' perfekt på bekräftelse-ytor.",
    "Ovanligast av alla kandidater i eventapp-sammanhang — nästan obearbetat färgland.",
  ],
};

const MIDNATTSSOL: AppTheme = {
  id: "midnattssol",
  name: "Midnattssol",
  vibe: "Ljus lavendel · solgul energi",
  mode: "Ljus först",
  bg: "#F6F4FB",
  element: "#ECE8F7",
  selected: "#241A3D",
  text: "#1E1633",
  text2: "#6C6484",
  accent: "#6C4CF1",
  accentInk: "#FFFFFF",
  accent2: "#FFC93C",
  artwork: "#DDD6EE",
  displayFont: "Sora",
  bodyFont: "Inter",
  why: [
    "Ljust, lekfullt och dagtigt — säljer 'familj/park/marknad' bättre än mörka teman.",
    "Violett primär + solgul mikroaccent = sommar i Stockholm utan att bli barnslig.",
    "Ska barndomssagoskalan (Junibacken, parklekar) men med 2026-typografi.",
  ],
};

const BETONG: AppTheme = {
  id: "betong",
  name: "Betong & Syra",
  vibe: "Industribetong · syralime",
  mode: "Mörk först",
  bg: "#101014",
  element: "#191921",
  selected: "#23232E",
  text: "#F4F4F6",
  text2: "#9A9AA6",
  accent: "#CCFF00",
  accentInk: "#0C0C05",
  accent2: "#FF5CA8",
  artwork: "#22222C",
  displayFont: "JetBrains Mono",
  bodyFont: "Inter",
  why: [
    "Råaste technolook: betonggrått + syrligt lime är Södermalm/Under Bron-energin.",
    "Mono-display (JetBrains Mono) ger 'svart skylt i garage' — väldigt 2026.",
    "Samma DICE-restriktion: lime bara på urval/CTA, annars gråskala.",
  ],
};

const SALT: AppTheme = {
  id: "salt",
  name: "Saltsjön",
  vibe: "Havsdjup blagrön · korall",
  mode: "Mörk först",
  bg: "#071A1E",
  element: "#0E262B",
  selected: "#17333A",
  text: "#EDF6F6",
  text2: "#8FA9AC",
  accent: "#FF6A5C",
  accentInk: "#1A0806",
  accent2: "#5CE1D4",
  artwork: "#143238",
  displayFont: "Sora",
  bodyFont: "Inter",
  why: [
    "Skärgårdens färgpalett: havsdjupt blagrönt vatten + korallboj-accent.",
    "Korall på mörkblått är högkontrast och fotogeniskt — bilden gullas av den kalla ytan.",
    "Aqua-mikroaccent för 'gratis/happening'-chips.",
  ],
};

const KANEL: AppTheme = {
  id: "kanel",
  name: "Kanel & Salvia",
  vibe: "Cafécream · terrakotta",
  mode: "Ljus först",
  bg: "#FBF7F2",
  element: "#F0E8DE",
  selected: "#33241A",
  text: "#2B211B",
  text2: "#87756A",
  accent: "#B4653F",
  accentInk: "#FFF8F2",
  accent2: "#6B8F71",
  artwork: "#E9DCCB",
  displayFont: "Fraunces",
  bodyFont: "Inter",
  why: [
    "Stockholms kafékultur som tema: kanelbulle-brun terrakotta på varm cream.",
    "Mjukast av alla — passar mat/marknad/familj; mindre nattliv.",
    "Sage-grön mikroaccent för status ('gratis', 'utsålt').",
  ],
};

const NEW_THEMES: AppTheme[] = [FALUROD, TANTO, MIDNATTSSOL, BETONG, SALT, KANEL];

/* previous round, for the combined contrast table */
const BLA_TIMMEN: AppTheme = {
  id: "bla-timmen",
  name: "Blå Timmen",
  vibe: "",
  mode: "Mörk först",
  bg: "#0B0E14",
  element: "#151B26",
  selected: "#1F2735",
  text: "#F2F5F9",
  text2: "#97A3B6",
  accent: "#7CD4FF",
  accentInk: "#06121C",
  artwork: "#223042",
  displayFont: "Space Grotesk",
  bodyFont: "Inter",
  why: [],
};
const POSTERVITT: AppTheme = {
  id: "postervitt",
  name: "Postervitt",
  vibe: "",
  mode: "Ljus först",
  bg: "#FAFAF7",
  element: "#EFEFE9",
  selected: "#121212",
  text: "#121212",
  text2: "#6E6E68",
  accent: "#D8FF3D",
  accentInk: "#101010",
  artwork: "#DDD9CF",
  displayFont: "Archivo Black",
  bodyFont: "Inter",
  why: [],
};
const NEON_NATT: AppTheme = {
  id: "neon-natt",
  name: "Neon Natt",
  vibe: "",
  mode: "Mörk först",
  bg: "#000000",
  element: "#121212",
  selected: "#1F1F24",
  text: "#F5F5F5",
  text2: "#9E9E9E",
  accent: "#8B5CFF",
  accentInk: "#FFFFFF",
  artwork: "#1C1727",
  displayFont: "Space Grotesk",
  bodyFont: "Inter",
  why: [],
};

const ALL_THEMES: AppTheme[] = [...NEW_THEMES, BLA_TIMMEN, POSTERVITT, NEON_NATT];

/* ------------------------------------------------------------------ */
/* WCAG contrast                                                       */
/* ------------------------------------------------------------------ */

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = ch.map((u) => (u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

function contrast(a: string, b: string): string {
  const la = luminance(a);
  const lb = luminance(b);
  return ((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(1);
}

/* ------------------------------------------------------------------ */
/* Phone mockup (same placement as the app today)                      */
/* ------------------------------------------------------------------ */

function Pill({
  label,
  active,
  t,
}: {
  label: string;
  active: boolean;
  t: AppTheme;
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

function Phone({ t }: { t: AppTheme }) {
  return (
    <div
      style={{
        width: 240,
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
        <div style={{ width: 22, height: 22, borderRadius: 999, background: t.selected }} />
      </div>

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

      <div style={{ display: "flex", gap: 6, padding: "0 14px 10px", overflow: "hidden" }}>
        <Pill label="Idag" active t={t} />
        <Pill label="Helgen" active={false} t={t} />
        <Pill label="Musik" active={false} t={t} />
        <Pill label="Loppis" active={false} t={t} />
      </div>

      <div style={{ padding: "0 14px 12px" }}>
        <div style={{ borderRadius: 14, overflow: "hidden", background: t.element }}>
          <div style={{ position: "relative", background: t.artwork, height: 92 }}>
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
/* Swatches                                                            */
/* ------------------------------------------------------------------ */

function Swatches({ t }: { t: AppTheme }) {
  const rows: Array<{ role: string; hex: string; against?: string }> = [
    { role: "Bakgrund", hex: t.bg, against: t.text },
    { role: "Kort/yta", hex: t.element, against: t.text },
    { role: "Vald pill", hex: t.accent, against: t.accentInk },
    { role: "Sekundärtext", hex: t.text2, against: t.element },
  ];
  return (
    <Stack gap={4}>
      {rows.map((r) => (
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
            <div style={{ width: 92 }}>
              <Text size="small" tone="secondary">
                {r.role}
              </Text>
            </div>
            <Text size="small" style={{ fontFamily: "monospace" }}>
              {r.hex}
            </Text>
            {r.against ? (
              <Text size="small" tone="tertiary">
                {contrast(r.hex, r.against)}:1
              </Text>
            ) : null}
          </Row>
        </div>
      ))}
    </Stack>
  );
}

function ThemeCard({ t }: { t: AppTheme }) {
  return (
    <Card>
      <CardHeader trailing={<Text size="small" tone="tertiary">{t.mode}</Text>}>
        {t.name}
      </CardHeader>
      <CardBody>
        <Stack gap={12}>
          <Row gap={14} align="start">
            <Phone t={t} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Stack gap={6}>
                <Text size="small" tone="secondary">
                  {t.vibe}
                </Text>
                <Text size="small">
                  <b>Typografi:</b> {t.displayFont} + {t.bodyFont}
                </Text>
                <Swatches t={t} />
              </Stack>
            </div>
          </Row>
          <Stack gap={4}>
            {t.why.map((w) => (
              <div key={w}>
                <Text size="small" tone="secondary">
                  — {w}
                </Text>
              </div>
            ))}
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Layout Lab — same theme, different element placement                */
/* ------------------------------------------------------------------ */

function VariantChipOverImage({ t }: { t: AppTheme }) {
  return (
    <div
      style={{
        width: 232,
        borderRadius: 16,
        overflow: "hidden",
        background: t.element,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        flexShrink: 0,
      }}
    >
      <div style={{ position: "relative", background: t.artwork, height: 100 }}>
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
      </div>
      <div style={{ padding: "8px 10px 10px" }}>
        <div style={{ color: t.accent, fontSize: 11, fontWeight: 600 }}>Idag 19:00</div>
        <div style={{ color: t.text, fontWeight: 600, fontSize: 14, lineHeight: "18px", margin: "2px 0" }}>
          Rooftop Jazz på Fotografiska
        </div>
        <div style={{ color: t.text2, fontSize: 11 }}>Fotografiska · Södermalm · 395 kr</div>
      </div>
    </div>
  );
}

function VariantFullBleed({ t }: { t: AppTheme }) {
  return (
    <div
      style={{
        width: 232,
        borderRadius: 16,
        overflow: "hidden",
        background: t.artwork,
        position: "relative",
        height: 168,
        flexShrink: 0,
      }}
    >
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
          background: "rgba(255,255,255,0.25)",
        }}
      />
      {/* flat bottom band instead of gradient scrim */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          background: t.bg,
          padding: "8px 10px 10px",
        }}
      >
        <div style={{ color: t.accent, fontSize: 11, fontWeight: 600 }}>Idag 19:00</div>
        <div style={{ color: t.text, fontWeight: 600, fontSize: 14, lineHeight: "18px", margin: "2px 0" }}>
          Rooftop Jazz på Fotografiska
        </div>
        <div style={{ color: t.text2, fontSize: 11 }}>Fotografiska · Södermalm · 395 kr</div>
      </div>
    </div>
  );
}

function VariantDateBlock({ t }: { t: AppTheme }) {
  return (
    <div
      style={{
        width: 232,
        borderRadius: 16,
        overflow: "hidden",
        background: t.element,
        display: "flex",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 62,
          background: t.selected,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <div style={{ color: t.text2, fontSize: 9, letterSpacing: "0.08em" }}>SEP</div>
        <div
          style={{
            color: t.accent,
            fontFamily: `${t.displayFont}, ui-sans-serif, sans-serif`,
            fontWeight: 700,
            fontSize: 26,
            lineHeight: "28px",
          }}
        >
          12
        </div>
        <div style={{ color: t.text2, fontSize: 9 }}>FRE</div>
      </div>
      <div style={{ padding: "10px 12px", minWidth: 0 }}>
        <div style={{ color: t.accent, fontSize: 10, fontWeight: 600 }}>19:00 · FRI ENTRÉ</div>
        <div style={{ color: t.text, fontWeight: 600, fontSize: 14, lineHeight: "18px", margin: "3px 0" }}>
          Rooftop Jazz på Fotografiska
        </div>
        <div style={{ color: t.text2, fontSize: 11 }}>Fotografiska · Södermalm · 395 kr</div>
        <div
          style={{
            display: "inline-block",
            marginTop: 6,
            border: `1px solid ${t.accent}`,
            color: t.accent,
            borderRadius: 999,
            padding: "2px 8px",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.06em",
          }}
        >
          MUSIK
        </div>
      </div>
    </div>
  );
}

const LAYOUTS: Array<{ name: string; note: string; render: (t: AppTheme) => ReactNode }> = [
  {
    name: "A — Chips över bild (dagens)",
    note: "Kategori + favorit över bilden, text under. Beprövat, men märkena täcker konsten.",
    render: (t) => <VariantChipOverImage t={t} />,
  },
  {
    name: "B — Fullbleed + solid scrim",
    note: "Textblocket ligger på en solid scrim-flik längst ner (ingen gradient behövs). Bilden får mer plats — Luma-känslan.",
    render: (t) => <VariantFullBleed t={t} />,
  },
  {
    name: "C — Datumkolumn",
    note: "Stort datum till vänster i accenten, kategori som outline-pill. Kalenderkänsla, bäst skannbarhet i listvy.",
    render: (t) => <VariantDateBlock t={t} />,
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ThemeLab() {
  return (
    <Stack gap={20}>
      <Stack gap={8}>
        <H1>Tema­labb — runda 2</H1>
        <Text tone="secondary">
          Sex nya färgidentiteter (samma elementplacering som appen har idag, så
          färgen är den enda variabeln) plus en <b>Layout Lab</b> där placeringen
          varieras på Blå Timmen. Kontraster räknade enligt WCAG.
        </Text>
      </Stack>

      <Grid columns={2} gap={16}>
        {NEW_THEMES.map((t) => (
          <div key={t.id}>
            <ThemeCard t={t} />
          </div>
        ))}
      </Grid>

      <Stack gap={8}>
        <H2>Kontrast — alla 9 kandidater (WCAG)</H2>
        <Table
          headers={["Tema", "Läge", "Brödtext/bg", "Text/kort", "Text/accent"]}
          rows={ALL_THEMES.map((t) => [
            t.name,
            t.mode,
            `${contrast(t.text, t.bg)}:1`,
            `${contrast(t.text, t.element)}:1`,
            `${contrast(t.accentInk, t.accent)}:1`,
          ])}
          columnAlign={["left", "left", "right", "right", "right"]}
        />
        <Text size="small" tone="tertiary">
          AA-gräns: 4.5:1 normal text, 3:1 stor text. Alla förslag ovan klarar AA för
          brödtext; kolla kolumnen "Text/accent" innan du sätter liten text på accentfärg.
        </Text>
      </Stack>

      <Stack gap={8}>
        <H2>Layout Lab — placering (Blå Timmen som bädd)</H2>
        <Text tone="secondary">
          Samma event renderat i tre placeringar. Färgen är identisk mellan korten så
          du ser vad själva layouten gör.
        </Text>
        <Row gap={16} align="start" wrap>
          {LAYOUTS.map((l) => (
            <div key={l.name} style={{ width: 232 }}>
              <Stack gap={6}>
                <div style={{ height: 180, display: "flex", alignItems: "flex-start" }}>
                  {l.render(BLA_TIMMEN)}
                </div>
                <Text size="small" weight="semibold">
                  {l.name}
                </Text>
                <Text size="small" tone="secondary">
                  {l.note}
                </Text>
              </Stack>
            </div>
          ))}
        </Row>
      </Stack>

      <Stack gap={8}>
        <H2>Mitt råd</H2>
        <Stack gap={6}>
          <Text size="small" tone="secondary">
            — <b>Färg:</b> Tantolunden eller Faluröd &amp; Senap om vi vill vara
            modigt unika; Blå Timmen (runda 1) är fortfarande det säkraste starka
            valet. Betong &amp; Syra är mest "hip just nu" men minst tidlös.
          </Text>
          <Text size="small" tone="secondary">
            — <b>Layout:</b> B (fullbleed + solid scrim) för den horisontella
            featured-klämman; C (datumkolumn) i listvyn; A behålls som fallback där
            bilder saknas (fallback-bilderna är släta färgytor — chips syns då bäst).
          </Text>
          <Text size="small" tone="secondary">
            — <b>Kombo-förslag:</b> Blå Timmen + C i lista + B i featured. Det ger
            egen identitet och bättre skannbarhet utan ombyggnad av flödet.
          </Text>
        </Stack>
      </Stack>
    </Stack>
  );
}