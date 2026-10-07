import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { EmptyEventsState } from '@/components/empty-events-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveEventsStatus, type EventsStatusInput } from '@/utils/events-status';

type EventsStatusProps = EventsStatusInput & {
  onRetry: () => void;
  emptyMessage?: string;
  showReset?: boolean;
  showExplore?: boolean;
  /** Rendered once there is content. */
  children?: ReactNode;
};

/** The one loading / error / empty surface for event lists. */
export function EventsStatus({
  loading,
  error,
  empty,
  onRetry,
  emptyMessage = 'No events match your filters.',
  showReset = false,
  showExplore = false,
  children = null,
}: EventsStatusProps) {
  const theme = useTheme();

  switch (resolveEventsStatus({ loading, error, empty })) {
    case 'ready':
      return <>{children}</>;
    case 'loading':
      return <ActivityIndicator color={theme.textSecondary} style={styles.loader} />;
    case 'error':
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading events"
          onPress={onRetry}
          style={({ pressed }) => [styles.error, pressed && styles.pressed]}>
          <ThemedText type="meta" themeColor="textSecondary" style={styles.errorText}>
            Could not load events. Tap to retry.
          </ThemedText>
        </Pressable>
      );
    case 'empty':
      return (
        <EmptyEventsState
          message={emptyMessage}
          showReset={showReset}
          showExplore={showExplore}
        />
      );
  }
}

const styles = StyleSheet.create({
  loader: {
    marginTop: Spacing.six,
  },
  error: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  errorText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
