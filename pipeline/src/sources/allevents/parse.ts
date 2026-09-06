import type { AeEvent } from './types.js';

/**
 * Pure parser over the allevents.in listing HTML. The page assigns its events
 * to an inline `_this.events_data = [ ... ]` array; there is no JSON-LD or
 * documented feed, so this reads that assignment with a string-aware
 * bracket-matcher (a naive regex would choke on brackets inside descriptions).
 * Returns the first populated array (the page also declares empty defaults).
 */

const ASSIGNMENT = /_this\.events_data\s*=\s*\[/g;

/** Returns the `[...]` slice starting at `openIndex`, or null if unbalanced. */
function extractArray(html: string, openIndex: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openIndex; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) return html.slice(openIndex, i + 1);
    }
  }
  return null;
}

export function parseAlleventsEvents(html: string): AeEvent[] {
  ASSIGNMENT.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ASSIGNMENT.exec(html)) !== null) {
    const openIndex = match.index + match[0].length - 1;
    const slice = extractArray(html, openIndex);
    if (!slice) continue;

    try {
      const data = JSON.parse(slice) as AeEvent[];
      if (Array.isArray(data) && data.length > 0) return data;
    } catch {
      continue;
    }
  }

  return [];
}
