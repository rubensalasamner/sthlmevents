import {
  Tabs,
  TabList,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="events" href="/" asChild>
            <TabButton sf="calendar" material="calendar_month" label="Events" />
          </TabTrigger>
          <TabTrigger name="map" href="/map" asChild>
            <TabButton sf="map.fill" material="location_on" label="Map" />
          </TabTrigger>
          <TabTrigger name="saved" href="/saved" asChild>
            <TabButton sf="heart.fill" material="favorite" label="Saved" />
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  sf,
  material,
  label,
  isFocused,
  ...props
}: TabTriggerSlotProps & { sf: SFSymbol; material: AndroidSymbol; label: string }) {
  return (
    <Pressable {...props} accessibilityLabel={label} style={styles.tabButtonPressable}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <Icon sf={sf} material={material} size={22} />
      </ThemedView>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: BottomTabInset + Spacing.two,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    pointerEvents: 'box-none',
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.five,
    maxWidth: MaxContentWidth,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  tabButtonPressable: {
    borderRadius: Spacing.five,
  },
  tabButtonView: {
    width: 52,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
