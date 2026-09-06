import type { EventCategory } from '../../shared/event.js';

/**
 * Bibliotekens evenemang har inga maskinkategorier — bara målgrupp
 * (Barn/Unga/Vuxna) och fritext. Kategorierna härleds därför från titel +
 * preamble med svenska nyckelord. Biblioteksspecifika ord ("saga" är
 * sagostund, inte drama) ligger före generiska engelska termer.
 */

const KEYWORDS: Array<[RegExp, EventCategory]> = [
  [/\bförfattar(samtal|träff|besök)\b/i, 'other'],
  [/\bsagostund|\bsaga\b|\bläsning\b/i, 'family'],
  [/\bbarn(pyssel|ensemble)?\b|familj(e|elördag)/i, 'family'],
  [/\brollspel|\bbrädspel|\bspel(kväll|café|dagar?)\b/i, 'family'],
  [/\bkonsert|\bmusik\b|\bjazz\b|\bkörsång|\bgitarr\b|\bviskväll/i, 'music'],
  [/\bpoesi\b|\bdikt(läsning)?\b/i, 'art'],
  [/\butställning\b|\bvernissage\b|\bbild konst|\bkonstnär/i, 'art'],
  [/\bfilm(klubb|visning)?\b|\bbio\b/i, 'other'],
  [/\bspråk(café)?\b|\bsvenska\b|\bengelska\b|\barabiska\b/i, 'other'],
  [/\bdebatt\b|\bföreläsning\b|\bsamtal om\b/i, 'other'],
  [/\bhantverk|\bpyssel\b|\bsyskola|\bstick(a|ning)\b/i, 'shopping'],
];

export function mapBibCategory(title: string, preamble: string): EventCategory {
  const haystack = `${title} ${preamble}`;
  for (const [pattern, category] of KEYWORDS) {
    if (pattern.test(haystack)) return category;
  }
  return 'other';
}
