import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type AttributionFooterProps = {
  attribution: string | null;
};

/**
 * Data-source credit line (CC BY 4.0 requires attribution). Renders nothing
 * when there is no attribution to show.
 */
export function AttributionFooter({ attribution }: AttributionFooterProps) {
  if (!attribution) return null;

  return (
    <View style={styles.container}>
      <ThemedText themeColor="textSecondary" type="small" style={styles.text}>
        {attribution}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  text: {
    textAlign: 'center',
  },
});
