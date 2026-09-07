import type { EventCategory } from '../../shared/event.js';

/**
 * Kulturbiljetter's API exposes no category field — it is a performing-arts
 * ticketing platform, so titles are the only signal. Swedish and English
 * keywords are matched in priority order (first match wins). Everything else
 * stays `other` for the LLM categorization pass to refine.
 */
const KEYWORD_TO_CATEGORY: readonly (readonly [RegExp, EventCategory])[] = [
  [/\b(konsert|concert|live ?musik|gig|jam|kvartett|trio|symfoni|opera|kör|choir|recital)\b/i, 'music'],
  [/\b(komedi|comedy|stand-?up|improv|revy)\b/i, 'comedy'],
  [/\b(teater|theatre|theater|dans|dance|balett|ballet|föreställning|performance|dockteater|cirkus|musikal|monolog)\b/i, 'theatre'],
  [/\b(utställning|exhibition|vernissage|galleri|konst|art)\b/i, 'art'],
  [/\b(barn|kids|familj|family|dockteater|puppet)\b/i, 'family'],
  [/\b(föreläsning|lecture|talk|samtal|podcast)\b/i, 'other'],
];

export function mapKulturbiljetterCategory(title: string): EventCategory {
  for (const [pattern, category] of KEYWORD_TO_CATEGORY) {
    if (pattern.test(title)) return category;
  }
  return 'other';
}
