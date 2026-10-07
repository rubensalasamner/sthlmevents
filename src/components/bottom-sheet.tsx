import { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BottomSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
  style?: ViewStyle;
};

/** Transparent modal sheet: the screen stays visible behind a tappable scrim. */
export function BottomSheet({ visible, onDismiss, children, style }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onDismiss}
          style={styles.scrim}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.backgroundElement,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
            style,
          ]}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6, 10, 16, 0.6)',
  },
  sheet: {
    width: '100%',
    paddingTop: Spacing.four,
    borderTopLeftRadius: Spacing.five,
    borderTopRightRadius: Spacing.five,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
