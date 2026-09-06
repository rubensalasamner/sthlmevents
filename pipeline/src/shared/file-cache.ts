import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Generic on-disk cache keyed by string, so re-running the pipeline doesn't
 * repeat expensive lookups (og:image scrapes, geocoding, ...). A `null` value
 * is a negative result, cached with a shorter TTL so transient failures are
 * retried sooner than successes expire.
 */
export interface KeyedCache<T> {
  get(key: string): T | null | undefined;
  set(key: string, value: T | null): void;
}

type CacheEntry<T> = {
  value: T | null;
  fetchedAt: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export class FileKeyedCache<T> implements KeyedCache<T> {
  private entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly path: string,
    private readonly positiveTtlMs = 30 * DAY_MS,
    private readonly negativeTtlMs = 3 * DAY_MS,
  ) {}

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.path, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, CacheEntry<T>>;
      this.entries = new Map(Object.entries(parsed));
    } catch {
      this.entries = new Map();
    }
  }

  async save(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(Object.fromEntries(this.entries), null, 2), 'utf8');
  }

  get(key: string): T | null | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    const ttl = entry.value === null ? this.negativeTtlMs : this.positiveTtlMs;
    if (Date.now() - entry.fetchedAt > ttl) return undefined;
    return entry.value;
  }

  set(key: string, value: T | null): void {
    this.entries.set(key, { value, fetchedAt: Date.now() });
  }
}

/** No-op cache for tests / one-off runs. */
export class NullKeyedCache<T> implements KeyedCache<T> {
  get(): undefined {
    return undefined;
  }
  set(): void {}
}
