import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { AgendaDay } from '@/utils/agenda-groups';

type DayStripProps = {
  days: readonly AgendaDay[];
  activeKey: string | null;
  onSelect: (key: string) => void;
};

/** Horizontal day jump row; keeps the active day scrolled into view. */
export function DayStrip({ days, activeKey, onSelect }: DayStripProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef(new Map<string, number>());

  useEffect(() => {
    if (!activeKey) return;
    const x = offsets.current.get(activeKey);
    if (x === undefined) return;
    scrollRef.current?.scrollTo({ x: Math.max(0, x - Spacing.four), animated: true });
  }, [activeKey]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {days.map((day) => {
        const active = day.key === activeKey;
        return (
          <Pressable
            key={day.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${day.weekday} ${day.day}`}
            onPress={() => onSelect(day.key)}
            onLayout={(event) => offsets.current.set(day.key, event.nativeEvent.layout.x)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: active ? theme.accent : theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText
              type="meta"
              style={{ color: active ? theme.accentInk : theme.textSecondary }}>
              {day.weekday}
            </ThemedText>
            <ThemedText type="metaBold" themeColor={active ? 'accentInk' : 'text'}>
              {day.day}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  chip: {
    minWidth: 52,
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.75,
  },
});
