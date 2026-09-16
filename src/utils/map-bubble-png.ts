import { BADGE_INK } from '@/utils/category-colors';

/** Blå Timmen frost surface — high contrast on the dark map. */
const FROST_FILL = '#F2F5F9';
const TIME_INK = '#57667A';
const SHADOW = '#000000';

export const BUBBLE_HEIGHT = 40;
const TIP_HEIGHT = 11;
const MAX_BUBBLE_WIDTH = 260;

/**
 * 5×7 glyphs. Unknown characters are skipped so Android titles degrade
 * gracefully (iOS annotations render full Unicode natively).
 */
const GLYPHS: Record<string, number[]> = {
  '0': [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  '3': [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  '6': [0b01110, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],
  ':': [0b00000, 0b00100, 0b00100, 0b00000, 0b00100, 0b00100, 0b00000],
  '.': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b00100],
  ',': [0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b00100, 0b01000],
  '-': [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
  "'": [0b00100, 0b00100, 0b01000, 0b00000, 0b00000, 0b00000, 0b00000],
  '!': [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100],
  '?': [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b00000, 0b00100],
  '&': [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
  ' ': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
  '…': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b10101],
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10001, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b01010],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  a: [0b00000, 0b00000, 0b01110, 0b00001, 0b01111, 0b10001, 0b01111],
  b: [0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b11110],
  c: [0b00000, 0b00000, 0b01110, 0b10000, 0b10000, 0b10001, 0b01110],
  d: [0b00001, 0b00001, 0b01111, 0b10001, 0b10001, 0b10001, 0b01111],
  e: [0b00000, 0b00000, 0b01110, 0b10001, 0b11111, 0b10000, 0b01110],
  f: [0b00110, 0b01001, 0b01000, 0b11100, 0b01000, 0b01000, 0b01000],
  g: [0b00000, 0b00000, 0b01111, 0b10001, 0b01111, 0b00001, 0b01110],
  h: [0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001],
  i: [0b00100, 0b00000, 0b01100, 0b00100, 0b00100, 0b00100, 0b01110],
  j: [0b00010, 0b00000, 0b00110, 0b00010, 0b00010, 0b10010, 0b01100],
  k: [0b10000, 0b10000, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010],
  l: [0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  m: [0b00000, 0b00000, 0b11010, 0b10101, 0b10101, 0b10001, 0b10001],
  n: [0b00000, 0b00000, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001],
  o: [0b00000, 0b00000, 0b01110, 0b10001, 0b10001, 0b10001, 0b01110],
  p: [0b00000, 0b00000, 0b11110, 0b10001, 0b11110, 0b10000, 0b10000],
  q: [0b00000, 0b00000, 0b01111, 0b10001, 0b01111, 0b00001, 0b00001],
  r: [0b00000, 0b00000, 0b10110, 0b11001, 0b10000, 0b10000, 0b10000],
  s: [0b00000, 0b00000, 0b01111, 0b10000, 0b01110, 0b00001, 0b11110],
  t: [0b01000, 0b01000, 0b11100, 0b01000, 0b01000, 0b01001, 0b00110],
  u: [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b10001, 0b01111],
  v: [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  w: [0b00000, 0b00000, 0b10001, 0b10001, 0b10101, 0b10101, 0b01010],
  x: [0b00000, 0b00000, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001],
  y: [0b00000, 0b00000, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  z: [0b00000, 0b00000, 0b11111, 0b00010, 0b00100, 0b01000, 0b11111],
};

/** Map Swedish letters onto ASCII glyphs the bitmap font knows. */
function normalizeForBitmap(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[ÅÄ]/g, 'A')
    .replace(/[åä]/g, 'a')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/–—/g, '-');
}

function parseHexColor(hex: string): [number, number, number] {
  const raw = hex.replace('#', '');
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ];
}

function setPixel(
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = (y * width + x) * 4;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = a;
}

function fillRect(
  data: Uint8Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) setPixel(data, width, height, x, y, r, g, b, a);
  }
}

function fillCircle(
  data: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) {
  const r2 = radius * radius;
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (x * x + y * y <= r2) setPixel(data, width, height, cx + x, cy + y, r, g, b, a);
    }
  }
}

function fillPill(
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) {
  if (w <= 0 || h <= 0) return;
  const radius = Math.floor(h / 2);
  fillRect(data, width, height, x + radius, y, x + w - radius, y + h, r, g, b, a);
  fillCircle(data, width, height, x + radius, y + radius, radius, r, g, b, a);
  fillCircle(data, width, height, x + w - radius - 1, y + radius, radius, r, g, b, a);
}

function fillTriangleTip(
  data: Uint8Array,
  width: number,
  height: number,
  pillHeight: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) {
  const tipY = height - 1;
  const baseY = pillHeight - 1;
  const cx = Math.floor(width / 2);
  const baseHalf = Math.max(5, Math.round((tipY - baseY) * 0.85));
  for (let y = baseY; y <= tipY; y++) {
    const t = (y - baseY) / (tipY - baseY || 1);
    const half = Math.max(1, Math.round(baseHalf * (1 - t)));
    for (let x = cx - half; x <= cx + half; x++) setPixel(data, width, height, x, y, r, g, b, a);
  }
}

/** Draw a frost card with category border, left accent, tip, and soft shadow. */
function paintChrome(
  data: Uint8Array,
  width: number,
  height: number,
  pillHeight: number,
  accent: [number, number, number],
  uiScale: number,
) {
  const [ar, ag, ab] = accent;
  const [fr, fg, fb] = parseHexColor(FROST_FILL);
  const [sr, sg, sb] = parseHexColor(SHADOW);
  const border = Math.max(2, Math.round(2 * uiScale));
  const accentW = Math.max(4, Math.round(5 * uiScale));
  const shadowOx = Math.max(1, Math.round(1.5 * uiScale));
  const shadowOy = Math.max(2, Math.round(2.5 * uiScale));

  // Soft drop shadow (under card + tip).
  fillPill(data, width, height, shadowOx, shadowOy, width - shadowOx, pillHeight, sr, sg, sb, 50);
  fillTriangleTip(data, width, height, pillHeight + shadowOy, sr, sg, sb, 40);

  // Category-coloured outer shell + tip.
  fillPill(data, width, height, 0, 0, width, pillHeight, ar, ag, ab);
  fillTriangleTip(data, width, height, pillHeight, ar, ag, ab);

  // Frost inset.
  fillPill(
    data,
    width,
    height,
    border,
    border,
    width - border * 2,
    pillHeight - border * 2,
    fr,
    fg,
    fb,
  );

  // Left accent strip inside the frost.
  const stripX = border;
  const stripY = border;
  const stripH = pillHeight - border * 2;
  fillRect(data, width, height, stripX, stripY, stripX + accentW, stripY + stripH, ar, ag, ab);

  return { contentLeft: border + accentW + Math.round(8 * uiScale), border };
}

function drawGlyph(
  data: Uint8Array,
  width: number,
  height: number,
  ch: string,
  ox: number,
  oy: number,
  scale: number,
  r: number,
  g: number,
  b: number,
) {
  const rows = GLYPHS[ch];
  if (!rows) return 0;
  for (let row = 0; row < 7; row++) {
    const bits = rows[row]!;
    for (let col = 0; col < 5; col++) {
      if (bits & (1 << (4 - col))) {
        fillRect(
          data,
          width,
          height,
          ox + col * scale,
          oy + row * scale,
          ox + (col + 1) * scale,
          oy + (row + 1) * scale,
          r,
          g,
          b,
        );
      }
    }
  }
  return 5 * scale;
}

function measurableChars(label: string): string[] {
  return [...normalizeForBitmap(label)].filter((ch) => GLYPHS[ch]);
}

function drawLabelAt(
  data: Uint8Array,
  width: number,
  height: number,
  chars: string[],
  fontScale: number,
  textWidth: number,
  xStart: number,
  y: number,
  ink: [number, number, number],
) {
  let x = xStart;
  const gap = Math.max(1, Math.round(fontScale * 0.85));
  // Ignore unused textWidth for left-aligned layout; kept for callers' metrics.
  void textWidth;
  for (const ch of chars) {
    const advance = drawGlyph(data, width, height, ch, x, y, fontScale, ink[0], ink[1], ink[2]);
    x += advance + gap;
  }
}

function lineMetrics(label: string, fontScale: number) {
  const chars = measurableChars(label);
  const glyphW = 5 * fontScale;
  const gap = Math.max(1, Math.round(fontScale * 0.85));
  const textWidth = chars.length * glyphW + Math.max(0, chars.length - 1) * gap;
  return { chars, textWidth, lineHeight: 7 * fontScale };
}

function crcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = crcTable();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u32(n: number): Uint8Array {
  return Uint8Array.of((n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = Uint8Array.from(type, (ch) => ch.charCodeAt(0));
  const len = u32(data.length);
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);
  const crc = u32(crc32(body));
  const out = new Uint8Array(len.length + body.length + crc.length);
  out.set(len, 0);
  out.set(body, len.length);
  out.set(crc, len.length + body.length);
  return out;
}

function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]!) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function zlibStore(data: Uint8Array): Uint8Array {
  const blocks: number[] = [0x78, 0x01];
  let offset = 0;
  while (offset < data.length) {
    const size = Math.min(65535, data.length - offset);
    const isLast = offset + size >= data.length;
    blocks.push(isLast ? 0x01 : 0x00);
    blocks.push(size & 0xff, (size >> 8) & 0xff);
    blocks.push(~size & 0xff, (~size >> 8) & 0xff);
    for (let i = 0; i < size; i++) blocks.push(data[offset + i]!);
    offset += size;
  }
  const checksum = adler32(data);
  blocks.push(
    (checksum >>> 24) & 0xff,
    (checksum >>> 16) & 0xff,
    (checksum >>> 8) & 0xff,
    checksum & 0xff,
  );
  return Uint8Array.from(blocks);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return globalThis.btoa(binary);
}

function encodePng(rgba: Uint8Array, width: number, height: number): string {
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), rowStart + 1);
  }

  const signature = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
  const ihdr = chunk('IHDR', Uint8Array.of(...u32(width), ...u32(height), 8, 6, 0, 0, 0));
  const idat = chunk('IDAT', zlibStore(raw));
  const iend = chunk('IEND', new Uint8Array());

  const png = new Uint8Array(signature.length + ihdr.length + idat.length + iend.length);
  let o = 0;
  png.set(signature, o);
  o += signature.length;
  png.set(ihdr, o);
  o += ihdr.length;
  png.set(idat, o);
  o += idat.length;
  png.set(iend, o);

  return `data:image/png;base64,${bytesToBase64(png)}`;
}

export type BubblePng = {
  uri: string;
  width: number;
  height: number;
};

export type BubblePngContent = {
  primary: string;
  secondary?: string;
};

/**
 * Frost map pill (Blå Timmen): light surface, category border/accent, dark title,
 * muted time — readable on the dark basemap without pastel washout.
 */
export function buildBubblePng(
  content: BubblePngContent | string,
  categoryColor: string,
  uiScale = 1.55,
): BubblePng {
  const bubble: BubblePngContent =
    typeof content === 'string' ? { primary: content } : content;
  const twoLine = Boolean(bubble.secondary);

  // Never drop below 2px font cells — 1px glyphs look like a toy bitmap font.
  const primaryFont = Math.max(2, Math.round((twoLine ? 1.35 : 2.1) * uiScale));
  const secondaryFont = Math.max(2, Math.round(1.15 * uiScale));
  const padY = Math.round((twoLine ? 8 : 9) * uiScale);
  const padRight = Math.round(12 * uiScale);
  const lineGap = twoLine ? Math.round(5 * uiScale) : 0;
  const tip = Math.max(10, Math.round(TIP_HEIGHT * uiScale));
  const accentGuess = Math.max(4, Math.round(5 * uiScale));
  const borderGuess = Math.max(2, Math.round(2 * uiScale));
  const contentLeftGuess = borderGuess + accentGuess + Math.round(8 * uiScale);

  const primary = lineMetrics(bubble.primary, primaryFont);
  const secondary = bubble.secondary
    ? lineMetrics(bubble.secondary, secondaryFont)
    : null;

  const textBlockHeight =
    primary.lineHeight + (secondary ? lineGap + secondary.lineHeight : 0);
  const pillHeight = padY * 2 + textBlockHeight;
  const width = Math.min(
    Math.round(MAX_BUBBLE_WIDTH * Math.max(1, uiScale * 0.95)),
    Math.max(
      Math.round(88 * uiScale),
      contentLeftGuess + Math.max(primary.textWidth, secondary?.textWidth ?? 0) + padRight,
    ),
  );
  // Extra room under the tip for the soft shadow.
  const shadowPad = Math.max(2, Math.round(3 * uiScale));
  const height = pillHeight + tip + shadowPad;

  const accent = parseHexColor(categoryColor);
  const titleInk = parseHexColor(BADGE_INK);
  const timeInk = parseHexColor(TIME_INK);
  const rgba = new Uint8Array(width * height * 4);

  const { contentLeft } = paintChrome(rgba, width, height, pillHeight, accent, uiScale);

  const primaryY = padY;
  drawLabelAt(
    rgba,
    width,
    height,
    primary.chars,
    primaryFont,
    primary.textWidth,
    contentLeft,
    primaryY,
    titleInk,
  );
  if (secondary) {
    const secondaryY = padY + primary.lineHeight + lineGap;
    drawLabelAt(
      rgba,
      width,
      height,
      secondary.chars,
      secondaryFont,
      secondary.textWidth,
      contentLeft,
      secondaryY,
      timeInk,
    );
  }

  return { uri: encodePng(rgba, width, height), width, height };
}

/** Convenience for tests that only assert on the data-URI prefix. */
export function buildBubblePngDataUri(
  label: string,
  backgroundColor: string,
  uiScale = 1.55,
): string {
  return buildBubblePng(label, backgroundColor, uiScale).uri;
}
