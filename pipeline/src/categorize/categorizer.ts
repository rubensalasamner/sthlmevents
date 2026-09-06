import { EVENT_CATEGORIES, type EventCategory } from '../shared/event.js';

/**
 * Categorization strategy: turn event text into a category. Batch-shaped
 * because LLM providers price and perform much better with several items per
 * call. Kept as an interface so the provider (any OpenAI-compatible API here)
 * can be swapped — or stubbed in tests — without touching the pipeline stage.
 */
export interface BatchCategorizer {
  /**
   * Returns exactly one entry per input: an `EventCategory`, or `null` when
   * the model cannot confidently classify the text (the event stays `other`).
   * Throws on transport/parse failures so the caller decides cache policy.
   */
  categorize(inputs: readonly string[]): Promise<(EventCategory | null)[]>;
}

export type OpenAiCategorizerOptions = {
  apiKey: string;
  model?: string;
  /** Any OpenAI-compatible base URL (OpenAI, Groq, OpenRouter, local...). */
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

type ChatCompletionResponse = {
  choices?: { message?: { content?: string } }[];
};

const SYSTEM_PROMPT =
  'You classify Swedish event listings for a Stockholm events app. For each ' +
  'item pick exactly one category from the provided list, or null when ' +
  'genuinely unclear — never invent categories. Reply with JSON only: ' +
  '{"categories": ["music", null, ...]} with the same order and length as the items.';

/**
 * Classifies texts via an OpenAI-compatible chat-completions endpoint. One
 * request per `categorize` call; the calling stage controls batching.
 */
export class OpenAiCategorizer implements BatchCategorizer {
  constructor(private readonly options: OpenAiCategorizerOptions) {}

  async categorize(inputs: readonly string[]): Promise<(EventCategory | null)[]> {
    if (inputs.length === 0) return [];

    const doFetch = this.options.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30_000);
    try {
      const response = await doFetch(`${this.baseUrl()}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.options.model ?? DEFAULT_MODEL,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: JSON.stringify({ categories: EVENT_CATEGORIES, items: inputs }),
            },
          ],
        }),
      });
      if (!response.ok) {
        throw new Error(`categorizer API ${response.status}: ${(await response.text()).slice(0, 200)}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('categorizer returned no content');

      const parsed = JSON.parse(content) as { categories?: unknown };
      const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
      if (categories.length !== inputs.length) {
        throw new Error(`categorizer returned ${categories.length} results for ${inputs.length} items`);
      }

      return categories.map((value) =>
        typeof value === 'string' && isKnownCategory(value) ? value : null,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private baseUrl(): string {
    return (this.options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }
}

function isKnownCategory(value: string): value is EventCategory {
  return (EVENT_CATEGORIES as readonly string[]).includes(value);
}
