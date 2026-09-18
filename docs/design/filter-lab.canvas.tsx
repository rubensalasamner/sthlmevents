import type { CSSProperties, ReactNode } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Grid,
  H1,
  H2,
  Stack,
  Table,
  Text,
} from "cursor/canvas";

/* ------------------------------------------------------------------ */
/* Theme (Blå Timmen — the assumed pick)                               */
/* ------------------------------------------------------------------ */

const T = {
  bg: "#0B0E14",
  element: "#151B26",
  selected: "#1F2735",
  text: "#F2F5F9",
  text2: "#97A3B6",
  accent: "#7CD4FF",
  accentInk: "#06121C",
  artwork: "#223042",
  font: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
};

const FONT = "ui-sans-serif, system-ui, sans-serif";

/* ------------------------------------------------------------------ */
/* Shared phone frame                                                  */
/* ------------------------------------------------------------------ */

function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 250,
        borderRadius: 20,
        overflow: "hidden",
        background: T.bg,
        border: `1px solid ${T.element}`,
        fontFamily: FONT,
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
          color: T.text2,
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
            fontFamily: T.font,
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: "-0.02em",
            color: T.text,
          }}
        >
          Upptäck
        </span>
        <div style={{ width: 22, height: 22, borderRadius: 999, background: T.selected }} />
      </div>
      <div style={{ padding: "0 14px 10px" }}>
        <div
          style={{
            background: T.element,
            color: T.text2,
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 11,
          }}
        >
          Sök event, plats…
        </div>
      </div>
      {children}
      <div style={{ padding: "0 14px 12px" }}>
        <div style={{ borderRadius: 14, overflow: "hidden", background: T.element }}>
          <div style={{ background: T.artwork, height: 56 }} />
          <div style={{ padding: "8px 10px" }}>
            <div style={{ color: T.accent, fontSize: 11, fontWeight: 600 }}>Idag 19:00</div>
            <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>
              Rooftop Jazz på Fotografiska
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "8px 0 10px",
          borderTop: `1px solid ${T.element}`,
          fontSize: 10,
        }}
      >
        <span style={{ color: T.accent, fontWeight: 600 }}>Utforska</span>
        <span style={{ color: T.text2 }}>Karta</span>
        <span style={{ color: T.text2 }}>Sparat</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chips                                                               */
/* ------------------------------------------------------------------ */

function Chip({
  label,
  active,
  outline,
}: {
  label: string;
  active?: boolean;
  outline?: boolean;
}) {
  const base: CSSProperties = {
    borderRadius: 999,
    padding: "3px 10px",
    fontSize: 11,
    whiteSpace: "nowrap",
  };
  if (active) {
    return (
      <div style={{ ...base, background: T.accent, color: T.accentInk, fontWeight: 600 }}>
        {label}
      </div>
    );
  }
  if (outline) {
    return <div style={{ ...base, border: `1px solid ${T.selected}`, color: T.text2 }}>{label}</div>;
  }
  return <div style={{ ...base, background: T.element, color: T.text2 }}>{label}</div>;
}

function Segmented() {
  return (
    <div
      style={{
        display: "flex",
        background: T.element,
        borderRadius: 999,
        padding: 2,
        margin: "0 14px 10px",
      }}
    >
      {[
        { l: "Idag", a: true },
        { l: "Helgen", a: false },
        { l: "Veckan", a: false },
        { l: "Alla", a: false },
      ].map((s) => (
        <div
          key={s.l}
          style={{
            flex: 1,
            textAlign: "center",
            borderRadius: 999,
            padding: "5px 0",
            fontSize: 11,
            fontWeight: s.a ? 600 : 400,
            background: s.a ? T.accent : "transparent",
            color: s.a ? T.accentInk : T.text2,
          }}
        >
          {s.l}
        </div>
      ))}
    </div>
  );
}

function DevChip({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${T.selected}`,
        borderRadius: 999,
        padding: "2px 8px",
        fontSize: 9,
        color: T.text2,
        fontWeight: 600,
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */

function Variant1() {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px 8px" }}>
        <DevChip label="DEV · Källor" />
      </div>
      <Segmented />
      <div style={{ display: "flex", gap: 6, padding: "0 14px 4px", overflow: "hidden" }}>
        <Chip label="Allt" active />
        <Chip label="Musik" />
        <Chip label="Nattliv" />
        <Chip label="Loppis" />
        <Chip label="Teater" />
      </div>
    </div>
  );
}

function Variant2() {
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "0 14px 10px",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <Chip label="Idag" active />
        <Chip label="Helgen" />
        <div style={{ width: 1, height: 18, background: T.selected, flexShrink: 0 }} />
        <Chip label="Allt" />
        <Chip label="Musik" />
        <Chip label="Loppis" />
      </div>
    </div>
  );
}

function Variant3() {
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "0 14px 10px",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <Chip label="Idag" active />
        <Chip label="Helgen" />
        <Chip label="Veckan" />
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            border: `1px solid ${T.accent}`,
            borderRadius: 999,
            padding: "3px 10px",
            flexShrink: 0,
          }}
        >
          <span style={{ color: T.accent, fontSize: 11, fontWeight: 600 }}>Filter</span>
          <span
            style={{
              background: T.accent,
              color: T.accentInk,
              borderRadius: 999,
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 5px",
            }}
          >
            2
          </span>
        </div>
      </div>
    </div>
  );
}

function Variant4() {
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 18,
          padding: "0 14px 0",
          borderBottom: `1px solid ${T.element}`,
        }}
      >
        {[
          { l: "Idag", a: true },
          { l: "Helgen", a: false },
          { l: "Veckan", a: false },
        ].map((s) => (
          <div
            key={s.l}
            style={{
              padding: "6px 2px 8px",
              fontSize: 12,
              fontWeight: s.a ? 700 : 400,
              color: s.a ? T.text : T.text2,
              borderBottom: s.a ? `2px solid ${T.accent}` : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {s.l}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, padding: "10px 14px 4px", overflow: "hidden" }}>
        <Chip label="Allt" active />
        <Chip label="Musik" />
        <Chip label="Nattliv" />
        <Chip label="Loppis" />
        <Chip label="Mat" />
      </div>
      <div style={{ padding: "6px 14px 4px" }}>
        <DevChip label="DEV · visit-stockholm, loppiskartan" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Variant card                                                        */
/* ------------------------------------------------------------------ */

function VariantCard({
  title,
  pros,
  cons,
  children,
}: {
  title: string;
  pros: string[];
  cons: string[];
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>{title}</CardHeader>
      <CardBody>
        <Stack gap={12}>
          {children}
          <Stack gap={4}>
            {pros.map((p) => (
              <div key={p}>
                <Text size="small" tone="secondary">
                  + {p}
                </Text>
              </div>
            ))}
            {cons.map((c) => (
              <div key={c}>
                <Text size="small" tone="tertiary">
                  − {c}
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
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function FilterLab() {
  return (
    <Stack gap={20}>
      <Stack gap={8}>
        <H1>Filter-labb — tre rader blir en hierarki</H1>
        <Text tone="secondary">
          Idag: sökfält + tre staplade pill-rader (datum, kategori, dev-källor). Fyra
          förslag på hierarki. Tema: Blå Timmen; vald pill = fylld accent.
        </Text>
      </Stack>

      <Grid columns={2} gap={16}>
        <VariantCard
          title="1 · Segmenterad datum + kategoristrip + dev-chip (rekommenderad)"
          pros={[
            "Datum är den primära axeln i en eventapp (Luma/DICE) — en segmentkontroll är tydligare än scrollpills.",
            "Kategorierna blir den enda skrollande raden — mest vertikal luft.",
            "Dev-filtret försvinner ur det visuella ledet: liten chip vid headern, bara __DEV__.",
            "Alla tre dimensionerna finns kvar — inget göms.",
          ]}
          cons={["Segmentkontroll har fast bredd — 4 val är lagom."]}
        >
          <Frame>
            <Variant1 />
          </Frame>
        </VariantCard>

        <VariantCard
          title="2 · En grupperad chip-rad"
          pros={["Minst höjd av alla varianter."]}
          cons={[
            "Blandar dimensioner: 'Idag' och 'Musik' ser likadana ut men gör olika saker.",
            "Klotterigt när 4 datum + 13 kategorier ska in i samma rad.",
          ]}
        >
          <Frame>
            <Variant2 />
          </Frame>
        </VariantCard>

        <VariantCard
          title="3 · Komprimera + Filter-knapp med antal"
          pros={[
            "Minimal yta — feeden dominerar.",
            "Aktiva filter räknas i knappen (badge), som i kartappar.",
          ]}
          cons={[
            "Kategorierna göms — försämrar upptäcktsbläddring, som är appens poäng.",
            "Ett tryck till för den vanligaste handlingen (byt dag).",
          ]}
        >
          <Frame>
            <Variant3 />
          </Frame>
        </VariantCard>

        <VariantCard
          title="4 · Två nivåer: understrykningsflikar + strip"
          pros={[
            "Datum som flikar är redaktionellt och prydligt med displayfont.",
            "Dev-chippet kompakt, fortfarande synbart i dev.",
          ]}
          cons={[
            "Flikar + pills i samma yta kan se ut som två nivåer av samma sak.",
            "Högre än variant 1.",
          ]}
        >
          <Frame>
            <Variant4 />
          </Frame>
        </VariantCard>
      </Grid>

      <Stack gap={8}>
        <H2>Jämförelse</H2>
        <Table
          headers={["Variant", "Synliga rader", "Höjd", "Klarhet", "Dev-filter"]}
          rows={[
            ["Idag (3 pillrader)", "3 + dev", "Hög", "Låg — rader konkurrerar", "Egen rad"],
            ["1 · Segment + strip", "2", "Låg", "Hög", "Chip i headern"],
            ["2 · En grupperad rad", "1", "Lägst", "Låg — blandade dimensioner", "Saknas"],
            ["3 · Filter-knapp", "1", "Låg", "Medel — kategorier gömda", "I sheet"],
            ["4 · Flikar + strip", "2 + dev", "Medel", "Medel-hög", "Kompakt rad"],
          ]}
        />
      </Stack>

      <Stack gap={8}>
        <H2>Rekommendation</H2>
        <Stack gap={6}>
          <Text size="small" tone="secondary">
            — <b>Variant 1.</b> Datum som segmentkontroll (primär axel), kategorier som
            enda skrollande strip, dev-källor som liten chip vid headern (__DEV__ only).
            Ren hierarki, minst höjd, alla dimensioner kvar.
          </Text>
          <Text size="small" tone="secondary">
            — Oavsett val: vald pill = fylld accent i det nya temat; aktivt filter som
            ligger utanför synligt område markeras med en liten prick på sektionen.
          </Text>
        </Stack>
      </Stack>
    </Stack>
  );
}