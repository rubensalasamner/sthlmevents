import { CompactRow } from '@/components/event-presentation/compact-row';
import { HeroPoster } from '@/components/event-presentation/hero-poster';
import { PosterTile } from '@/components/event-presentation/poster-tile';
import type { StockholmEvent } from '@/types/event';

export type EventPresentationVariant = 'hero' | 'poster' | 'compact';

type EventPresentationProps = {
  event: StockholmEvent;
  variant: EventPresentationVariant;
  width?: number;
  selected?: boolean;
  distanceKm?: number;
  onPress?: () => void;
};

const strategies = {
  hero: HeroPoster,
  poster: PosterTile,
  compact: CompactRow,
} as const;

/**
 * Strategy dispatcher for event surfaces. Featured, rails, agenda, saved, and
 * the map sheet must not share one card density.
 */
export function EventPresentation({
  event,
  variant,
  width,
  selected,
  distanceKm,
  onPress,
}: EventPresentationProps) {
  if (variant === 'hero') {
    const Strategy = strategies.hero;
    return <Strategy event={event} />;
  }
  if (variant === 'poster') {
    const Strategy = strategies.poster;
    return <Strategy event={event} width={width} />;
  }
  const Strategy = strategies.compact;
  return <Strategy event={event} selected={selected} distanceKm={distanceKm} onPress={onPress} />;
}

export { CompactRow, HeroPoster, PosterTile, strategies };
