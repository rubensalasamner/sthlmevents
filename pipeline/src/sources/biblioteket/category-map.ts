import type { EventCategory } from '../../shared/event.js';

/**
 * Bibliotekens evenemang har inga maskinkategorier — bara målgrupp
 * (Barn/Unga/Vuxna) och fritext. Kategorierna härleds därför från titel +
 * preamble med svenska nyckelord. Biblioteksspecifika ord ("saga" är
 * sagostund, inte drama) ligger före generiska engelska termer.
 *
 * Title is matched first: body copy often mentions "musik"/"film" incidentally
 * (e.g. IT-stöd describing phone apps). Bare `\bmusik` is title-only; the
 * preamble still matches stronger music event signals (konsert, jazz, …).
 * Theatre beats music when both appear (teaterföreställning … med musik).
 */

const KEYWORDS: Array<[RegExp, EventCategory]> = [
  [/\bförfattar(samtal|träff|besök)\b/i, 'other'],
  [/\bsagostund|\bsaga\b|\bläsning\b/i, 'family'],
  [/\bbarn(pyssel|ensemble)?\b|familj(e|elördag)/i, 'family'],
  [/\brollspel|\bbrädspel|\bspel(kväll|café|dagar?)\b/i, 'family'],
  // `\bteater` / `\bmusik` (no trailing boundary) match compounds.
  [/\bteater|\bmonolog\b|\bdansföreställning\b/i, 'theatre'],
  [/\bkonsert|\bmusik|\bjazz\b|\bkörsång|\bgitarr\b|\bviskväll/i, 'music'],
  [/\bpoesi\b|\bdikt(läsning)?\b/i, 'art'],
  [/\butställning\b|\bvernissage\b|\bbild konst|\bkonstnär/i, 'art'],
  [/\bfilm(klubb|visning)?\b|\bbio\b/i, 'other'],
  [/\bspråk(café)?\b|\bsvenska\b|\bengelska\b|\barabiska\b/i, 'other'],
  [/\bdebatt\b|\bföreläsning\b|\bsamtal om\b/i, 'other'],
  [/\bhantverk|\bpyssel\b|\bsyskola|\bstick(a|ning)\b/i, 'shopping'],
];

/** Preamble: same table, but bare "musik" is too weak (incidental mentions). */
const PREAMBLE_KEYWORDS: Array<[RegExp, EventCategory]> = KEYWORDS.map(([pattern, category]) =>
  category === 'music'
    ? [/\bkonsert\b|\bjazz\b|\bkörsång\b|\bgitarr\b|\bviskväll\b/i, category]
    : [pattern, category],
);

function firstMatch(haystack: string, rules: Array<[RegExp, EventCategory]>): EventCategory | null {
  for (const [pattern, category] of rules) {
    if (pattern.test(haystack)) return category;
  }
  return null;
}

export function mapBibCategory(title: string, preamble: string): EventCategory {
  return firstMatch(title, KEYWORDS) ?? firstMatch(preamble, PREAMBLE_KEYWORDS) ?? 'other';
}
