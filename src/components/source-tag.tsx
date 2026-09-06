import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatSource } from '@/utils/format';

/**
 * Diagnostic badge showing which pipeline source produced an event.
 * Dev builds only — production builds render nothing.
 */
export function SourceTag({ source }: { source: string }) {
  if (!__DEV__) return null;

  return (
    <ThemedView type="backgroundSelected" style={styles.tag}>
      <ThemedText type="code" themeColor="textSecondary" numberOfLines={1}>
        {formatSource(source)}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
});
