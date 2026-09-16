import { ScrollView, StyleSheet } from 'react-native';

import { CategoryPill } from '@/components/category-pill';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** `null` = any distance (sort only). */
export type NearRadiusKm = null | 2 | 5;

export const NEAR_RADIUS_OPTIONS: readonly { value: NearRadiusKm; label: string }[] = [
  { value: null, label: 'Any distance' },
  { value: 2, label: '≤ 2 km' },
  { value: 5, label: '≤ 5 km' },
] as const;

type NearMeFilterProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  radiusKm: NearRadiusKm;
  onRadiusChange: (radiusKm: NearRadiusKm) => void;
  /** Soft status under the pills — e.g. "Locating…" / permission denied. */
  statusLabel?: string | null;
};

/**
 * Discover proximity controls: one master "Near me" pill, then radius options
 * when active. Strategy-friendly — radius set is data-driven.
 */
export function NearMeFilter({
  enabled,
  onEnabledChange,
  radiusKm,
  onRadiusChange,
  statusLabel,
}: NearMeFilterProps) {
  return (
    <ThemedView style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <CategoryPill
          label="Near me"
          selected={enabled}
          onPress={() => onEnabledChange(!enabled)}
        />
        {enabled &&
          NEAR_RADIUS_OPTIONS.map((option) => (
            <CategoryPill
              key={String(option.value)}
              label={option.label}
              selected={radiusKm === option.value}
              onPress={() => onRadiusChange(option.value)}
            />
          ))}
        {enabled && statusLabel ? <CategoryPill label={statusLabel} /> : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: 'transparent',
  },
  content: {
    gap: Spacing.two,
  },
});
