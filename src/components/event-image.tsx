import { Image, useImage, type ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';
import { PixelRatio, Platform, type ImageStyle, type StyleProp } from 'react-native';

import type { EventCategory } from '@/types/event';
import { fallbackImageFor } from '@/utils/fallback-image';

/** Hard cap — Android Canvas dies around ~100MB bitmaps (~8k×8k RGBA). */
const MAX_DECODE_PX = 1280;

type EventImageProps = {
  uri: string;
  category: EventCategory;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageProps['contentFit'];
  contentPosition?: ImageProps['contentPosition'];
  transition?: ImageProps['transition'];
  /** Logical CSS px used for decode size. List thumbs should pass ~56. */
  decodeWidth?: number;
};

/**
 * Event cover. Native uses `useImage({ maxWidth })` so huge IG/FB assets don't
 * OOM Android. Web skips that path — `useImage` fetches with CORS and many
 * organizer/municipal hosts omit ACAO, which made every card fall back to the
 * same category placeholder. Plain `source={{ uri }}` uses `<img>` (no CORS).
 */
export function EventImage(props: EventImageProps) {
  if (Platform.OS === 'web') {
    return <EventImageWeb {...props} />;
  }
  return <EventImageNative {...props} />;
}

function EventImageWeb({
  uri,
  category,
  style,
  contentFit = 'cover',
  contentPosition,
  transition = 200,
}: EventImageProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);

  const sourceUri = failed ? fallbackImageFor(category) : uri;

  return (
    <Image
      source={{ uri: sourceUri }}
      style={style}
      contentFit={contentFit}
      contentPosition={contentPosition}
      transition={transition}
      recyclingKey={sourceUri}
      onError={() => setFailed(true)}
    />
  );
}

function EventImageNative({
  uri,
  category,
  style,
  contentFit = 'cover',
  contentPosition,
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
      contentPosition={contentPosition}
      transition={transition}
      recyclingKey={sourceUri}
    />
  );
}
