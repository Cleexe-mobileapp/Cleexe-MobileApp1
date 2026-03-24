import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Purchases from 'react-native-purchases';

import { queryClient } from '@/lib/query-client';
import AuthStateBridge from '@/src/components/AuthStateBridge';
import { StripeRootProvider } from '@/src/components/StripeRootProvider';
import { AuthSessionProvider, useAuthSession } from '@/src/context/AuthSessionProvider';
import { initializePurchases } from '@/src/services/purchases';
import { ThemeProvider } from '@/src/theme/ThemeContext';

SplashScreen.preventAutoHideAsync();

function SplashReady() {
  const { initializing } = useAuthSession();
  useEffect(() => {
    if (!initializing) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [initializing]);
  return null;
}

function AuthBridge() {
  const { session } = useAuthSession();

  useEffect(() => {
    async function syncRevenueCatUser() {
      await initializePurchases();
      const userId = session?.user?.id;
      if (!userId) {
        await Purchases.logOut().catch(() => {});
        return;
      }

      const currentInfo = await Purchases.getCustomerInfo().catch(() => null);
      if (currentInfo?.originalAppUserId === userId) {
        return;
      }

      await Purchases.logIn(userId).catch(() => {});
    }

    syncRevenueCatUser().catch(() => {});
  }, [session?.user?.id]);

  return <AuthStateBridge session={session} />;
}

export default function RootLayout() {
  useEffect(() => {
    initializePurchases().catch((error) => {
      console.warn('RevenueCat initialization failed:', error);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeRootProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthSessionProvider>
              <SplashReady />
              <AuthBridge />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen
                  name="edit-profile"
                  options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                  }}
                />
              </Stack>
              <StatusBar style="auto" />
            </AuthSessionProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </StripeRootProvider>
    </GestureHandlerRootView>
  );
}
