import type { EventCategory } from '../../shared/event.js';

/**
 * Evenemangskollen rows carry almost no labels in practice (~1% have any), so
 * categories come from keywords over name + tags. Order matters: specific
 * music/nightlife terms beat generic ones. Kept standalone so the source owns
 * its own mapping.
 */
const KEYWORD_TO_CATEGORY: readonly (readonly [RegExp, EventCategory])[] = [
  [/\b(klubb|clubbing|rave|nattklubb|techno|house|dj|after ?party|uthyrning)\b/i, 'nightlife'],
  [/\b(konsert|concert|live ?music|gig|musik|music|band|artist|festival|jazz|klassiskt|opera)\b/i, 'music'],
  [/\b(ståuppkomik|comedy|stand-?up|humor|improv)\b/i, 'comedy'],
  [/\b(teater|theatre|theater|scen|performance|dans|dance|balett|musikal|cirkus)\b/i, 'theatre'],
  [/\b(mat|food|middag|dinner|tasting|wine|vin|brunch|restaurang|fika)\b|\w*provning\b/i, 'food'],
  [/\b(konst|art|utställning|exhibition|gallery|galleri|vernissage|design)\b/i, 'art'],
  [/\b(pop-?up|marknad|market|loppis|bazaar|sample sale)\b/i, 'market'],
  [/\b(shopping|outlet|rea)\b/i, 'shopping'],
  [/\b(sport|match|race|lopp|yoga|fitness|träning|run|marathon|ishockey|fotboll)\b/i, 'sports'],
  [/\b(familj|family|barn|kids|children)\b/i, 'family'],
];

export function mapEkCategory(raw: { name: string; labels?: string[]; tags?: string[] }): EventCategory {
  const text = [raw.name, ...(raw.labels ?? []), ...(raw.tags ?? [])].join(' ');

  for (const [pattern, category] of KEYWORD_TO_CATEGORY) {
    if (pattern.test(text)) return category;
  }
  return 'other';
}
