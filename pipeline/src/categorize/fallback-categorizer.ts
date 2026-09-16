import type { EventCategory } from '../shared/event.js';
import type { BatchCategorizer } from './categorizer.js';

/**
 * Failover strategy over one or more categorizers, tried in order. A
 * categorizer that throws (its own retries exhausted) is demoted to the back
 * for the rest of the run, so a decommissioned model costs one failed batch,
 * not one per batch. Throws only when every categorizer failed the batch.
 */
export class FallbackCategorizer implements BatchCategorizer {
  private order: BatchCategorizer[];

  constructor(categorizers: readonly BatchCategorizer[]) {
    if (categorizers.length === 0) {
      throw new Error('FallbackCategorizer requires at least one categorizer');
    }
    this.order = [...categorizers];
  }

  async categorize(inputs: readonly string[]): Promise<(EventCategory | null)[]> {
    if (inputs.length === 0) return [];

    let lastError: unknown;
    for (let tries = 0; tries < this.order.length; tries++) {
      const categorizer = this.order[0];
      if (!categorizer) break;
      try {
        return await categorizer.categorize(inputs);
      } catch (error) {
        lastError = error;
        this.order = [...this.order.slice(1), categorizer];
      }
    }
    throw lastError;
  }
}
