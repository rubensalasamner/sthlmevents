import type { LoppisRow } from './types.js';

/**
 * Pure HTML parser for the loppiskartan calendar. Structure-based (anchor to
 * `/markets/...`, a `<time dateTime>`, then title + meta spans) rather than
 * class-based, so it survives styling changes. Tested against a real fixture.
 */

const ANCHOR = /<a\b[^>]*href="(\/markets\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
const DATE = /dateTime="([^"]+)"/;
const SPAN = /<span[^>]*>([\s\S]*?)<\/span>/g;
// "11:00–15:00 · Botkyrka (Stockholms län)"  (en-dash or hyphen; end time optional)
const META = /(\d{1,2}:\d{2})\s*(?:[–-]\s*(\d{1,2}:\d{2}))?\s*·\s*(.+?)\s*\(([^)]+)\)/;

function stripTags(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseLoppiskartan(html: string): LoppisRow[] {
  const rows: LoppisRow[] = [];
  let anchor: RegExpExecArray | null;
  ANCHOR.lastIndex = 0;

  while ((anchor = ANCHOR.exec(html)) !== null) {
    const path = anchor[1]!;
    const inner = anchor[2]!;

    const date = inner.match(DATE)?.[1];
    if (!date) continue;

    const spans: string[] = [];
    let span: RegExpExecArray | null;
    SPAN.lastIndex = 0;
    while ((span = SPAN.exec(inner)) !== null) {
      const text = stripTags(span[1]!);
      if (text) spans.push(text);
    }

    const metaSpan = spans.find((s) => s.includes('·')) ?? '';
    const title = spans.find((s) => s !== metaSpan) ?? '';
    if (!title) continue;

    const meta = metaSpan.match(META);
    rows.push({
      path,
      date,
      title,
      startTime: meta?.[1],
      endTime: meta?.[2],
      city: meta?.[3]?.trim() ?? '',
      region: meta?.[4]?.trim() ?? '',
    });
  }

  return rows;
}
