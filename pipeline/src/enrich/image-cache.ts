import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Cache of resolved image URLs keyed by page URL, so re-running the pipeline
 * doesn't re-scrape unchanged sites. Negative results (no image found) are
 * cached with a shorter TTL so transient failures are retried sooner.
 */
export interface ImageCache {
  get(url: string): string | null | undefined;
  set(url: string, image: string | null): void;
}

type CacheEntry = {
  image: string | null;
  fetchedAt: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export class FileImageCache implements ImageCache {
  private entries = new Map<string, CacheEntry>();

  constructor(
    private readonly path: string,
    private readonly positiveTtlMs = 30 * DAY_MS,
    private readonly negativeTtlMs = 3 * DAY_MS,
  ) {}

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.path, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
      this.entries = new Map(Object.entries(parsed));
    } catch {
      this.entries = new Map();
    }
  }

  async save(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const object = Object.fromEntries(this.entries);
    await writeFile(this.path, JSON.stringify(object, null, 2), 'utf8');
  }

  get(url: string): string | null | undefined {
    const entry = this.entries.get(url);
    if (!entry) return undefined;
    const ttl = entry.image === null ? this.negativeTtlMs : this.positiveTtlMs;
    if (Date.now() - entry.fetchedAt > ttl) return undefined;
    return entry.image;
  }

  set(url: string, image: string | null): void {
    this.entries.set(url, { image, fetchedAt: Date.now() });
  }
}

/** No-op cache for tests / one-off runs. */
export class NullImageCache implements ImageCache {
  get(): undefined {
    return undefined;
  }
  set(): void {}
}
