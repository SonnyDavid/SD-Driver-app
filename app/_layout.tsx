import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { IncomingOrderNotifier } from "@/components/IncomingOrderNotifier";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DeliveryProvider } from "@/contexts/DeliveryContext";
import { initOrderNotifications } from "@/lib/orderNotifications";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const PROTECTED_ROOTS = new Set([
  "(tabs)",
  "edit-profile",
  "bank-details",
  "active-delivery",
  "delivery-navigation",
  "pickup-verification",
  "after-pickup",
  "navigate-customer",
  "customer-pin",
  "customer-proof",
  "complete-delivery",
  "delivery-verification",
  "driver-flow-spec",
]);

function AuthRouteSync() {
  const { driver, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const redirectingRef = useRef(false);
  const rootSegment = segments[0];

  useEffect(() => {
    if (isLoading) return;

    console.log("User session:", driver?.id ?? null);
    console.log("Auth state:", driver);

    if (driver) {
      redirectingRef.current = false;
      return;
    }

    if (!rootSegment || !PROTECTED_ROOTS.has(rootSegment) || redirectingRef.current) {
      return;
    }

    redirectingRef.current = true;
    console.log("Navigating to splash");
    router.replace("/");
  }, [driver, isLoading, rootSegment, router]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: "none" }} />
      <Stack.Screen name="login" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="register" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="register-success" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="active-delivery" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
      <Stack.Screen name="delivery-navigation" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="pickup-verification" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="after-pickup" options={{ animation: "fade" }} />
      <Stack.Screen name="navigate-customer" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="customer-pin" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="customer-proof" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="complete-delivery" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="delivery-verification" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="driver-flow-spec" options={{ animation: "fade" }} />
      <Stack.Screen name="bank-details" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="edit-profile" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    void initOrderNotifications();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <DeliveryProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <AuthRouteSync />
                  <RootLayoutNav />
                  <IncomingOrderNotifier />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </DeliveryProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
