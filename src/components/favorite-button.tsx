import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { useFavorites } from '@/context/favorites-context';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FavoriteButtonProps = {
  eventId: string;
  size?: number;
};

export function FavoriteButton({ eventId, size = 22 }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const theme = useTheme();
  const active = isFavorite(eventId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? 'Remove from saved' : 'Save event'}
      hitSlop={Spacing.two}
      onPress={() => toggleFavorite(eventId)}
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
