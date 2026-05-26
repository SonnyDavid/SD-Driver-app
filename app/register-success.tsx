import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function RegisterSuccessScreen() {
  const { driverId, name, vehicleRegistration } = useLocalSearchParams<{
    driverId: string;
    name: string;
    vehicleRegistration: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  async function copyId() {
    if (driverId) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: bottomPad }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.iconBg, { backgroundColor: colors.success + "20" }]}>
            <View style={[styles.iconInner, { backgroundColor: colors.success }]}>
              <Feather name="check" size={40} color="#fff" />
            </View>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: "center", gap: 8 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Registration Successful!</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Your driver account has been created
          </Text>
        </Animated.View>

        <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim }]}>
          <Row label="Driver Name" value={name ?? ""} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.idLabel, { color: colors.mutedForeground }]}>DRIVER ID</Text>
          <View style={[styles.idRow, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
            <Text style={[styles.idValue, { color: colors.primary }]}>{driverId}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row label="Vehicle Registration" value={vehicleRegistration ?? ""} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={[styles.statusRow, { backgroundColor: colors.muted }]}>
            <View style={[styles.statusDot, { backgroundColor: "#FBBF24" }]} />
            <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>Account Status</Text>
            <Text style={[styles.statusValue, { color: "#FBBF24" }]}>Pending Verification</Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, width: "100%" }}>
          <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.primary + "30" }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Use your <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Driver ID</Text> and password to log into the SD Driver system.
            </Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.buttons, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={[styles.copyBtn, { borderColor: colors.primary }]}
          onPress={copyId}
          activeOpacity={0.85}
        >
          <Feather name={copied ? "check" : "copy"} size={18} color={colors.primary} />
          <Text style={[styles.copyText, { color: colors.primary }]}>{copied ? "Copied!" : "Copy Driver ID"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/login")}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>Continue to Login</Text>
          <Feather name="arrow-right" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function Row({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <View style={styles.rowWrap}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 24 },
  iconWrapper: { marginBottom: 4 },
  iconBg: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" },
  iconInner: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { width: "100%", borderRadius: 18, borderWidth: 1, padding: 20, gap: 14 },
  divider: { height: 1 },
  rowWrap: { gap: 3 },
  rowLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  rowValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  idLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  idRow: { borderRadius: 10, borderWidth: 1, padding: 14, alignItems: "center" },
  idValue: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  statusValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  infoBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 19 },
  buttons: { gap: 12, paddingBottom: 8 },
  copyBtn: { height: 52, borderRadius: 14, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  copyText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  continueBtn: { height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  continueText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
