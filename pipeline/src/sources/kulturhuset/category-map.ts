import type { EventCategory } from '../../shared/event.js';

/**
 * Kulturhuset's own category taxonomy (drupalCategory.label) is rich and
 * machine-readable — no keyword guessing needed for the common cases. Unmapped
 * labels fall through to keyword heuristics, then 'other'.
 */

const LABEL_MAP: Record<string, EventCategory> = {
  standup: 'comedy',
  komedi: 'comedy',
  comedy: 'comedy',
  konsert: 'music',
  musik: 'music',
  pop: 'music',
  jazz: 'music',
  rock: 'music',
  opera: 'music',
  körsång: 'music',
  utställning: 'art',
  konst: 'art',
  vernissage: 'art',
  film: 'other',
  bio: 'other',
  teater: 'theatre',
  teatern: 'theatre',
  drama: 'theatre',
  dans: 'theatre',
  dansföreställning: 'theatre',
  show: 'theatre',
  mat: 'food',
  dryck: 'food',
  vin: 'food',
  marknad: 'market',
  loppis: 'market',
  sagostund: 'family',
  barn: 'family',
  'barn och vuxna': 'family',
  familj: 'family',
  familjeföreställning: 'family',
  workshop: 'other',
  föreläsning: 'other',
  samtal: 'other',
  debatt: 'other',
  litteratur: 'other',
  poesi: 'art',
};

const KEYWORDS: Array<[RegExp, EventCategory]> = [
  [/\bstandup\b|\bkomedi\b|\bhumor\b/i, 'comedy'],
  [/\bkonsert\b|\bmusik\b|\bjazz\b|\bkvintett\b|\bkörsång\b/i, 'music'],
  [/\butställning\b|\bvernissage\b|\bkonstnär/i, 'art'],
  [/\bteater\b|\bdansföreställning\b|\bmonolog\b/i, 'theatre'],
  [/\bsagostund\b|\bpyssel\b|\bfamilj(e)?\b/i, 'family'],
  [/\bmarknad\b|\bloppis\b/i, 'market'],
];

export function mapKhsCategory(labels: string[], title: string, leadText: string): EventCategory {
  for (const label of labels) {
    const mapped = LABEL_MAP[label.trim().toLowerCase()];
    if (mapped) return mapped;
  }
  // Compound labels like "Teater för barn" aren't exact map keys; run the
  // keyword pass over the label text too, before title/lead guessing.
  const labelBlob = labels.join(' ');
  for (const [pattern, category] of KEYWORDS) {
    if (pattern.test(labelBlob)) return category;
  }
  const haystack = `${title} ${leadText}`;
  for (const [pattern, category] of KEYWORDS) {
    if (pattern.test(haystack)) return category;
  }
  return 'other';
}
