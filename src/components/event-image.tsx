import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';
import type { StyleProp, ImageStyle } from 'react-native';

import type { EventCategory } from '@/types/event';
import { fallbackImageFor } from '@/utils/fallback-image';

type EventImageProps = {
  uri: string;
  category: EventCategory;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageProps['contentFit'];
  transition?: ImageProps['transition'];
};

/**
 * Event cover that swaps to a category placeholder when the remote URL 404s
 * (expired fbcdn signatures, etc.) so cards don't show broken frames.
 */
export function EventImage({ uri, category, style, contentFit = 'cover', transition = 200 }: EventImageProps) {
  const [failed, setFailed] = useState(false);
  const sourceUri = failed ? fallbackImageFor(category) : uri;

  return (
    <Image
      source={{ uri: sourceUri }}
      style={style}
      contentFit={contentFit}
      transition={transition}
      onError={() => setFailed(true)}
    />
  );
}
