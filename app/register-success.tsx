export { ApprovalPendingScreen as default } from "@/components/DriverFlowScreens";
/*
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SD_LOGO = require("@/assets/images/sd-logo.png");

export default function RegisterSuccessScreen() {
  const { driverId, name, vehicleRegistration } = useLocalSearchParams<{
    driverId: string;
    name: string;
    vehicleRegistration: string;
  }>();
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad + 2, paddingBottom: bottomPad + 14 }]}>
      <LinearGradient colors={["#000", "#090604", "#000"]} style={StyleSheet.absoluteFill} />
      <Image source={SD_LOGO} style={styles.logo} resizeMode="contain" />

      <View style={styles.content}>
        <Animated.View style={[styles.successWrap, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.successGlow}>
            <View style={styles.successCircle}>
              <Feather name="check" size={42} color="#FFFFFF" />
            </View>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, width: "100%", alignItems: "center" }}>
          <Text style={styles.title}>Almost Done!</Text>
          <Text style={styles.subtitle}>Your driver application has been submitted for admin approval.</Text>

          <View style={styles.card}>
            <InfoRow label="Driver Name" value={name || "SD Driver"} />
            <View style={styles.divider} />
            <Text style={styles.idLabel}>DRIVER ID</Text>
            <View style={styles.idBox}>
              <Text style={styles.idValue}>{driverId}</Text>
            </View>
            <View style={styles.divider} />
            <InfoRow label="Vehicle Registration" value={vehicleRegistration || "Pending"} />
            <View style={styles.statusBox}>
              <View style={styles.statusDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>Pending Review</Text>
                <Text style={styles.statusSub}>Please wait for admin approval before accepting deliveries.</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => router.replace("/login")} activeOpacity={0.86}>
        <Text style={styles.buttonText}>CONTINUE TO SIGN IN</Text>
        <Feather name="arrow-right" size={20} color="#111" />
      </TouchableOpacity>
    </View>
  );
}

function InfoRow({ label, value }: { label: string | string[]; value: string | string[] }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 24 },
  logo: { width: 175, height: 92, alignSelf: "center" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18 },
  successWrap: { marginBottom: 2 },
  successGlow: { width: 104, height: 104, borderRadius: 52, backgroundColor: "rgba(34,197,94,0.14)", alignItems: "center", justifyContent: "center" },
  successCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center", shadowColor: "#22C55E", shadowOpacity: 0.8, shadowRadius: 20 },
  title: { color: "#FFFFFF", fontSize: 21, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { color: "#A6A6A6", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19, marginTop: 5, marginBottom: 14 },
  card: { width: "100%", borderRadius: 12, borderWidth: 1, borderColor: "#242424", backgroundColor: "rgba(14,14,14,0.96)", padding: 14, gap: 10 },
  row: { gap: 4 },
  rowLabel: { color: "#8F8F8F", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  rowValue: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  divider: { height: 1, backgroundColor: "#252525" },
  idLabel: { color: "#8F8F8F", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textAlign: "center" },
  idBox: { borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,107,0,0.45)", backgroundColor: "rgba(255,107,0,0.12)", paddingVertical: 10, alignItems: "center" },
  idValue: { color: "#FF6B00", fontSize: 21, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  statusBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, backgroundColor: "rgba(251,191,36,0.1)", borderWidth: 1, borderColor: "rgba(251,191,36,0.24)", padding: 10 },
  statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#FBBF24" },
  statusTitle: { color: "#FBBF24", fontSize: 14, fontFamily: "Inter_700Bold" },
  statusSub: { color: "#B7B7B7", fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 2 },
  button: { height: 48, borderRadius: 10, backgroundColor: "#FF6B00", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  buttonText: { color: "#111", fontSize: 13, fontFamily: "Inter_700Bold" },
});
*/
