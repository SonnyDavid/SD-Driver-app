import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const SD_LOGO = require("@/assets/images/sd-logo.png");

export default function SplashScreen() {
  const { driver, isLoading } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (!isLoading && !driver) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [isLoading, driver]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingGlow} />
        <Image source={SD_LOGO} style={styles.loadingLogo} resizeMode="contain" />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (driver) return <Redirect href="/(tabs)" />;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#0A0A0F", "#0D0D18", "#0A0A0F"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Hero section */}
      <Animated.View
        style={[
          styles.hero,
          { paddingTop: topPad + 10, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Glow behind logo */}
        <View style={styles.logoGlowWrap}>
          <View style={styles.logoGlowOuter} />
          <View style={styles.logoGlowInner} />
          <Animated.View style={{ transform: [{ scale: logoScale }] }}>
            <Image source={SD_LOGO} style={styles.logo} resizeMode="contain" />
          </Animated.View>
        </View>

        <View style={styles.brandBlock}>
          <View style={styles.taglineRow}>
            <View style={[styles.taglineLine, { backgroundColor: colors.primary }]} />
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              FAST. RELIABLE. EVERY TIME.
            </Text>
            <View style={[styles.taglineLine, { backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* Feature pills */}
        <View style={styles.pillRow}>
          {["Same-Day", "Tracked", "Insured"].map((label) => (
            <View key={label} style={[styles.pill, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.pillText, { color: colors.mutedForeground }]}>{label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View
        style={[
          styles.actions,
          { paddingBottom: bottomPad + 20, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/login")}
          activeOpacity={0.85}
        >
          <Feather name="log-in" size={20} color="#fff" />
          <Text style={styles.loginBtnText}>LOG IN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.registerBtn, { borderColor: colors.primary }]}
          onPress={() => router.push("/register")}
          activeOpacity={0.85}
        >
          <Feather name="user-plus" size={20} color={colors.primary} />
          <Text style={[styles.registerBtnText, { color: colors.primary }]}>REGISTER</Text>
        </TouchableOpacity>

        <View style={styles.supportRow}>
          <Text style={[styles.helpText, { color: colors.mutedForeground }]}>Need help?</Text>
        </View>
        <Pressable style={styles.supportBtn} onPress={() => {}}>
          <Feather name="headphones" size={18} color={colors.primary} />
          <Text style={[styles.supportText, { color: colors.foreground }]}>Contact Rider Support</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#FF6B00",
    opacity: 0.07,
  },
  loadingLogo: { width: 220, height: 220 },
  logoGlowWrap: { alignItems: "center", justifyContent: "center" },
  logoGlowOuter: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#FF6B00",
    opacity: 0.06,
  },
  logoGlowInner: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#FF6B00",
    opacity: 0.08,
  },
  logo: { width: 260, height: 260 },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  brandBlock: { alignItems: "center", gap: 10 },
  taglineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  taglineLine: {
    width: 20,
    height: 1.5,
    borderRadius: 1,
    opacity: 0.6,
  },
  tagline: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 3,
  },
  pillRow: {
    flexDirection: "row",
    gap: 10,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
  actions: { paddingHorizontal: 28, gap: 14 },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 16,
  },
  loginBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  registerBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  supportRow: { alignItems: "center", marginTop: 4 },
  helpText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  supportBtn: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
  supportText: { fontSize: 15, fontFamily: "Inter_500Medium", flex: 1 },
});
