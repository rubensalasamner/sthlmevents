import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { useAffinity } from '@/context/affinity-context';
import { useFavorites } from '@/context/favorites-context';
import { useInterests } from '@/context/interests-context';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StockholmEvent } from '@/types/event';

type FavoriteButtonProps = {
  event: StockholmEvent;
  size?: number;
};

export function FavoriteButton({ event, size = 22 }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { recordFavoriteAdd } = useInterests();
  const { recordFavorite } = useAffinity();
  const theme = useTheme();
  const active = isFavorite(event.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? 'Remove from saved' : 'Save event'}
      hitSlop={Spacing.two}
      onPress={() => {
        if (!active) {
          recordFavoriteAdd();
          recordFavorite(event);
        }
        toggleFavorite(event.id);
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Icon
        sf={active ? 'heart.fill' : 'heart'}
        material={active ? 'favorite' : 'favorite_border'}
        size={size}
        color={active ? '#ff375f' : theme.textSecondary}
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
