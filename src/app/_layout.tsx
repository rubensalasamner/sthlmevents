import {
  Inter_500Medium,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { InterestsPrompt } from '@/components/interests-prompt';
import { Colors } from '@/constants/theme';
import { FavoritesProvider } from '@/context/favorites-context';
import { FiltersProvider } from '@/context/filters-context';
import { InterestsProvider } from '@/context/interests-context';
import { NotificationBootstrap } from '@/notifications/notification-bootstrap';

SplashScreen.preventAutoHideAsync();

/** Navigation themes aligned with the Blå Timmen tokens so edge-to-edge
 * system surfaces (nav-bar inset, screen background) never flash white. */
const BlaTimmenLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.accent,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.backgroundSelected,
  },
};

const BlaTimmenDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.accent,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.backgroundSelected,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded, fontsError] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontsError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontsError]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(Colors.dark.background).catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FavoritesProvider>
        <InterestsProvider>
          <FiltersProvider>
            <ThemeProvider value={colorScheme === 'dark' ? BlaTimmenDark : BlaTimmenLight}>
              {fontsLoaded || fontsError ? (
                <>
                  <NotificationBootstrap />
                  <InterestsPrompt />
                  <AnimatedSplashOverlay />
                  <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="agenda" options={{ title: 'All events' }} />
                    <Stack.Screen name="event/[id]" options={{ title: 'Event' }} />
                  </Stack>
                </>
              ) : null}
            </ThemeProvider>
          </FiltersProvider>
        </InterestsProvider>
      </FavoritesProvider>
    </GestureHandlerRootView>
  );
}
