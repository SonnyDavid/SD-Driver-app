import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function AccountScreen() {
  const { driver, logout } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
          router.replace("/");
        },
      },
    ]);
  }

  async function openSupport(type: "call" | "whatsapp" | "email") {
    try {
      if (type === "call") await Linking.openURL("tel:+1800000000");
      else if (type === "whatsapp")
        await Linking.openURL("https://wa.me/1800000000");
      else await Linking.openURL("mailto:support@samedaydelivery.com");
    } catch {}
  }

  const VEHICLE_ICONS: Record<string, string> = {
    car: "truck",
    van: "package",
    motorcycle: "wind",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Account
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginHorizontal: 16,
              marginTop: 16,
            },
          ]}
        >
          <View
            style={[styles.avatarLarge, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.avatarText}>
              {driver?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.driverName, { color: colors.foreground }]}>
              {driver?.name}
            </Text>
            <Text style={[styles.driverId, { color: colors.primary }]}>
              {driver?.id}
            </Text>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor:
                    driver?.status === "verified"
                      ? colors.success + "20"
                      : "#FBBF2420",
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      driver?.status === "verified"
                        ? colors.success
                        : "#FBBF24",
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      driver?.status === "verified"
                        ? colors.success
                        : "#FBBF24",
                  },
                ]}
              >
                {driver?.status === "verified"
                  ? "Verified Driver"
                  : "Pending Verification"}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          DRIVER INFORMATION
        </Text>
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginHorizontal: 16,
            },
          ]}
        >
          {[
            { icon: "user", label: "Full Name", value: driver?.name ?? "" },
            { icon: "mail", label: "Email", value: driver?.email ?? "" },
            { icon: "phone", label: "Phone", value: driver?.phone ?? "" },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <View style={styles.infoRow}>
                <View
                  style={[styles.infoIcon, { backgroundColor: colors.muted }]}
                >
                  <Feather
                    name={item.icon as any}
                    size={16}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.infoLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[styles.infoValue, { color: colors.foreground }]}
                  >
                    {item.value}
                  </Text>
                </View>
              </View>
              {i < arr.length - 1 && (
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              )}
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          VEHICLE DETAILS
        </Text>
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginHorizontal: 16,
            },
          ]}
        >
          {[
            {
              icon: VEHICLE_ICONS[driver?.vehicleType ?? "car"] ?? "truck",
              label: "Vehicle Type",
              value:
                (driver?.vehicleType ?? "").charAt(0).toUpperCase() +
                (driver?.vehicleType ?? "").slice(1),
            },
            {
              icon: "hash",
              label: "Registration Number",
              value: driver?.vehicleRegistration ?? "",
            },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <View style={styles.infoRow}>
                <View
                  style={[styles.infoIcon, { backgroundColor: colors.muted }]}
                >
                  <Feather
                    name={item.icon as any}
                    size={16}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.infoLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[styles.infoValue, { color: colors.foreground }]}
                  >
                    {item.value}
                  </Text>
                </View>
              </View>
              {i < arr.length - 1 && (
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              )}
            </View>
          ))}
        </View>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          BANK DETAILS
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/bank-details")}
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginHorizontal: 16,
            },
          ]}
        >
          {[
            {
              icon: "repeat",
              label: "Bank Transfer",
              value: "Connected",
            },
            {
              icon: "hash",
              label: "Account Number",
              value: "****4821",
            },
            {
              icon: "check-circle",
              label: "Payout Status",
              value: "Ready",
            },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <View style={styles.infoRow}>
                <View
                  style={[styles.infoIcon, { backgroundColor: colors.muted }]}
                >
                  <Feather
                    name={item.icon as any}
                    size={16}
                    color={colors.primary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.infoLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {item.label}
                  </Text>

                  <Text
                    style={[styles.infoValue, { color: colors.foreground }]}
                  >
                    {item.value}
                  </Text>
                </View>
              </View>

              {i < arr.length - 1 && (
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              )}
            </View>
          ))}
          </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          SUPPORT
        </Text>
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginHorizontal: 16,
            },
          ]}
        >
          {[
            {
              icon: "phone-call",
              label: "Call Support",
              sub: "+1 800 000 0000",
              action: () => openSupport("call"),
            },
            {
              icon: "message-circle",
              label: "WhatsApp Support",
              sub: "Chat with us",
              action: () => openSupport("whatsapp"),
            },
            {
              icon: "mail",
              label: "Email Support",
              sub: "support@samedaydelivery.com",
              action: () => openSupport("email"),
            },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <TouchableOpacity
                style={styles.infoRow}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <Feather
                    name={item.icon as any}
                    size={16}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.infoValue, { color: colors.foreground }]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.infoLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {item.sub}
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
              {i < arr.length - 1 && (
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.logoutBtn,
            {
              borderColor: colors.destructive,
              marginHorizontal: 16,
              marginTop: 24,
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Feather name="log-out" size={20} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>
            Log Out
          </Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
          SD Driver App v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  driverName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  driverId: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
    marginBottom: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  infoCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 1 },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginLeft: 68 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  logoutText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  versionText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 16,
  },
});
