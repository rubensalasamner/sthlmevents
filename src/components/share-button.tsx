import { Platform, Pressable, Share, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StockholmEvent } from '@/types/event';
import { formatEventDate } from '@/utils/format';

type ShareButtonProps = {
  event: StockholmEvent;
  size?: number;
};

export function ShareButton({ event, size = 22 }: ShareButtonProps) {
  const theme = useTheme();

  const onPress = async () => {
    const url = event.ticketUrl ?? event.sourceUrl;
    const message = [
      event.title,
      `${formatEventDate(event.startsAt)} · ${event.venue.name}, ${event.venue.district}`,
      url,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share(Platform.OS === 'ios' && url ? { message, url } : { message });
    } catch {
      // Sharing was dismissed or is unavailable on this platform.
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Share event"
      hitSlop={Spacing.two}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Icon
        sf="square.and.arrow.up"
        material="share"
        size={size}
        color={theme.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
});
