import { type ReactNode, useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type FadeInViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** ms — timing fade; spring used for the slight rise. */
  duration?: number;
  /** Initial downward offset in px. */
  fromY?: number;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
};

/**
 * Mount fade/rise without Reanimated layout `entering` props.
 * Layout entering trips React 19.2 Fabric DEV (`Should not already be working`)
 * when the renderer deep-walks the animation config during passive mount.
 */
export function FadeInView({
  children,
  style,
  duration = 320,
  fromY = 14,
  pointerEvents,
}: FadeInViewProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(fromY);

  useEffect(() => {
    opacity.value = withTiming(1, { duration });
    translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
  }, [duration, fromY, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]} pointerEvents={pointerEvents}>
      {children}
    </Animated.View>
  );
}
