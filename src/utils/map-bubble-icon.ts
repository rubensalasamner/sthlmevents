import { Image, type ImageRef } from 'expo-image';

import { buildBubblePng, type BubblePngContent } from '@/utils/map-bubble-png';

const cache = new Map<string, Promise<ImageRef>>();
const CACHE_VERSION = 'frost-v1';

/**
 * Map markers take a bitmap icon (Google has no text annotations; we also use
 * PNG on iOS so two-line title+time bubbles match). Cache by content+scale.
 */
export function loadBubbleIcon(
  content: BubblePngContent | string,
  backgroundColor: string,
  uiScale = 1.55,
): Promise<ImageRef> {
  const bubble: BubblePngContent = typeof content === 'string' ? { primary: content } : content;
  const key = `${CACHE_VERSION}|${backgroundColor}|${bubble.primary}|${bubble.secondary ?? ''}|${uiScale}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const { uri, width, height } = buildBubblePng(bubble, backgroundColor, uiScale);
  const promise = Image.loadAsync({ uri }, { maxWidth: width, maxHeight: height });
  cache.set(key, promise);
  return promise;
}
