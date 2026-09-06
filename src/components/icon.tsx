import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ViewStyle } from 'react-native';

/**
 * Cross-platform icon. SF Symbols on iOS; Material Symbols (the object form)
 * elsewhere — a bare SF name renders nothing on web/android, so every icon
 * must go through this mapping.
 */
export function Icon({
  sf,
  material,
  size = 20,
  color,
  style,
}: {
  sf: SFSymbol;
  material: AndroidSymbol;
  size?: number;
  color?: string;
  style?: ViewStyle;
}) {
  return (
    <SymbolView
      name={{ ios: sf, web: material, android: material }}
      size={size}
      tintColor={color}
      style={style}
    />
  );
}
