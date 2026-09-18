import { Image, useImage, type ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';
import { PixelRatio, type ImageStyle, type StyleProp } from 'react-native';

import type { EventCategory } from '@/types/event';
import { fallbackImageFor } from '@/utils/fallback-image';

/** Hard cap — Android Canvas dies around ~100MB bitmaps (~8k×8k RGBA). */
const MAX_DECODE_PX = 1280;

type EventImageProps = {
  uri: string;
  category: EventCategory;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageProps['contentFit'];
  transition?: ImageProps['transition'];
  /** Logical CSS px used for decode size. List thumbs should pass ~56. */
  decodeWidth?: number;
};

/**
 * Event cover with forced downscale. Instagram/fbcdn URLs are often several
 * thousand px; putting `width`/`height` on `source` alone does NOT limit
 * Android decode size — `useImage({ maxWidth })` does (Expo Image docs).
 */
export function EventImage({
  uri,
  category,
  style,
  contentFit = 'cover',
  transition = 200,
  decodeWidth = 400,
}: EventImageProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);

  const sourceUri = failed ? fallbackImageFor(category) : uri;
  const decodePx = Math.min(MAX_DECODE_PX, Math.ceil(decodeWidth * PixelRatio.get()));

  const image = useImage(
    sourceUri,
    {
      maxWidth: decodePx,
      maxHeight: decodePx,
      onError: () => setFailed(true),
    },
    [sourceUri, decodePx],
  );

  return (
    <Image
      source={image}
      style={style}
      contentFit={contentFit}
      transition={transition}
      recyclingKey={sourceUri}
    />
  );
}
