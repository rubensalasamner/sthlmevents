/**
 * Analysis for IG probe output — pure functions so they're testable.
 * Answers the three gate questions before building an adapter:
 *  1. Stockholm share (caption/location signal)
 *  2. event-likeness (does the caption carry date/price/venue signals?)
 *  3. data richness (images, timestamps, engagement)
 */

const STOCKHOLM_HINTS_RE =
  /stockholm|södermalm|norrmalm|östermalm|vasastan|kungsholmen|djurgården|solna|sundbyberg|lidingö|nacka|huddinge|täby|bromma|årsta|farsta|skärholmen|spånga|stockholmsmässan|stureplan|hornstull|nytorget|sofo|mariefred|sigtuna/i;

/** Swedish date-range patterns: "23–24 sep", "26/9", "imorgon", "lördag 4 okt", "11-15". */
const DATE_SIGNAL_RE =
  /(\d{1,2}\s*[–\-/]\s*\d{1,2}(\s*(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)\w*)?|\b\d{1,2}\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)|\b(imorgon|idag|den \d{1,2}(::|\.)?|helgen|lördag|söndag|måndag|tisdag|onsdag|torsdag|fredag)\b)/i;

const PRICE_SIGNAL_RE =
  /(?<![\p{L}\p{N}])(gratis|fri entré|free|kr|SEK|pris|entré|€|\$)(?![\p{L}\p{N}])/iu;

const NOISE_HINTS_RE =
  /giveaway|vinst|tävling|rabattkod|nu \d+%|nyhet.*webshop|restock|länk i bio|follow|samarbete|annons/i;

export type IgPost = {
  caption?: string;
  timestamp?: string;
  location?: { name?: string } | null;
  likesCount?: number;
  commentsCount?: number;
  imageUrl?: string;
  displayUrl?: string;
  ownerUsername?: string;
};

export type IgPostFlags = {
  isStockholm: boolean;
  hasDateSignal: boolean;
  hasPriceSignal: boolean;
  isNoise: boolean;
};

export function flagPost(post: IgPost): IgPostFlags {
  const text = `${post.caption ?? ''} ${post.location?.name ?? ''}`;
  return {
    isStockholm: STOCKHOLM_HINTS_RE.test(text),
    hasDateSignal: DATE_SIGNAL_RE.test(post.caption ?? ''),
    hasPriceSignal: PRICE_SIGNAL_RE.test(post.caption ?? ''),
    isNoise: NOISE_HINTS_RE.test(post.caption ?? ''),
  };
}

export function analyze(posts: readonly IgPost[]): void {
  if (posts.length === 0) {
    console.log('no posts to analyze');
    return;
  }
  const flagged = posts.map((p) => ({ post: p, flags: flagPost(p) }));
  const count = (pred: (f: IgPostFlags) => boolean) => flagged.filter(({ flags }) => pred(flags)).length;

  const withTs = flagged.filter(({ post }) => Boolean(post.timestamp)).length;
  const withImg = flagged.filter(({ post }) => Boolean(post.imageUrl ?? post.displayUrl)).length;
  const withLoc = flagged.filter(({ post }) => Boolean(post.location?.name)).length;
  const withEngagement = flagged.filter(
    ({ post }) => (post.likesCount ?? 0) > 0 || (post.commentsCount ?? 0) > 0,
  ).length;

  console.log('=== yield ===');
  console.log(`total: ${posts.length}`);
  console.log(`stockholm-signal: ${count((f) => f.isStockholm)} (${pct(count((f) => f.isStockholm), posts.length)})`);
  console.log(`date-signal in caption: ${count((f) => f.hasDateSignal)} (${pct(count((f) => f.hasDateSignal), posts.length)})`);
  console.log(`price-signal: ${count((f) => f.hasPriceSignal)} (${pct(count((f) => f.hasPriceSignal), posts.length)})`);
  console.log(`noise (ads/giveaways): ${count((f) => f.isNoise)} (${pct(count((f) => f.isNoise), posts.length)})`);
  console.log('=== data richness ===');
  console.log(`timestamp: ${withTs} | image: ${withImg} | location-name: ${withLoc} | engagement: ${withEngagement}`);
  console.log('=== sample event-like posts (stockholm + date) ===');
  for (const { post, flags } of flagged.filter((f) => f.flags.isStockholm && f.flags.hasDateSignal).slice(0, 8)) {
    const caption = (post.caption ?? '').replace(/\s+/g, ' ').slice(0, 110);
    console.log(`- [${post.location?.name ?? 'no-loc'}] ${caption}`);
  }
}

function pct(part: number, total: number): string {
  return total === 0 ? '0%' : `${Math.round((part / total) * 100)}%`;
}
