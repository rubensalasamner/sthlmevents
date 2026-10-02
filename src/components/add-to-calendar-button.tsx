import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { addEventToCalendar } from '@/calendar/add-to-calendar';
import { useTheme } from '@/hooks/use-theme';
import type { StockholmEvent } from '@/types/event';

type AddToCalendarButtonProps = {
  event: StockholmEvent;
};

/** Quiet text action — sticky Directions/Tickets own the primary chrome. */
export function AddToCalendarButton({ event }: AddToCalendarButtonProps) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  const onPress = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await addEventToCalendar(event);
      if (result.status === 'denied') {
        Alert.alert(
          'Calendar access needed',
          'Allow calendar access in Settings to add events from sthlmevents.',
        );
      } else if (result.status === 'unavailable') {
        Alert.alert('Calendar unavailable', 'This device does not support adding calendar events.');
      } else if (result.status === 'error') {
        Alert.alert('Could not add to calendar', result.message);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, event]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add to calendar"
      disabled={busy}
      onPress={onPress}
      hitSlop={Spacing.two}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {busy ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <>
          <Icon sf="calendar.badge.plus" material="calendar_add_on" size={16} color={theme.accent} />
          <ThemedText type="link">
            Add to calendar
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
