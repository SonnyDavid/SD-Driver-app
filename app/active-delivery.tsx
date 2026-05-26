import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDelivery } from "@/contexts/DeliveryContext";
import { useColors } from "@/hooks/useColors";
import { OrderRow } from "@/lib/supabase";

type Step =
  | "navigate_pickup"
  | "collected"
  | "navigate_delivery"
  | "pin_entry"
  | "completed";

const STATUS_MAP: Record<Step, OrderRow["status"] | null> = {
  navigate_pickup: "driver_assigned",
  collected: "package_collected",
  navigate_delivery: "en_route",
  pin_entry: "arriving",
  completed: "delivered",
};

function openAppleMaps(address: string) {
  const url = `maps://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
  Linking.openURL(url).catch(() => {
    Linking.openURL(
      `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`,
    );
  });
}

function openGoogleMaps(address: string) {
  Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
  );
}

export default function ActiveDeliveryScreen() {
  const {
    activeDeliveries,
    completeDelivery,
    cancelActiveDelivery,
    updateDeliveryStatus,
  } = useDelivery();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("navigate_pickup");
  const [pin, setPin] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [pinError, setPinError] = useState("");
  const [loading, setLoading] = useState(false);
  const [completedDelivery, setCompletedDelivery] = useState<{
    amount: number;
    distance: string;
    durationMinutes: number;
  } | null>(null);

  const successScale = useRef(new Animated.Value(0)).current;
  const successFade = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const pinInputRef = useRef<TextInput>(null);
  const channelRef = useRef<any>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (!activeDeliveries.length && step !== "completed") {
      router.replace("/(tabs)");
    }
  }, [activeDeliveries]);

  useEffect(() => {
    if (step === "completed") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.spring(successScale, {
          toValue: 1,
          tension: 55,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(successFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
    if (step === "pin_entry") {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
        pinInputRef.current?.focus();
      }, 150);
    }
  }, [step]);

  async function advanceStep(nextStep: Step) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const dbStatus = STATUS_MAP[nextStep];
    if (dbStatus && activeDeliveries) {
      await updateDeliveryStatus(activeDelivery.id, dbStatus);
    }
    setStep(nextStep);
  }

  async function handleComplete() {
    if (!activeDelivery) return;
    setLoading(true);
    try {
      const result = await completeDelivery(activeDelivery);
      setCompletedDelivery({
        amount: result.amount,
        distance: result.distance || "0",
        durationMinutes: result.durationMinutes,
      });
      setStep("completed");
    } finally {
      setLoading(false);
    }
  }

  function verifyPin() {
    if (!activeDelivery) return;
    if (pin.trim() === String(activeDelivery.pin).trim()) {
      setPinError("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleComplete();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPinError(
        "Incorrect PIN. Please ask the customer for the correct 6-digit PIN.",
      );
      setPin("");
    }
  }

  const STEPS: { key: Step; label: string }[] = [
    { key: "navigate_pickup", label: "Pickup" },
    { key: "collected", label: "Collected" },
    { key: "navigate_delivery", label: "En Route" },
    { key: "pin_entry", label: "Deliver" },
  ];

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  if (!activeDelivery && step !== "completed") {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Text
          style={[styles.noDeliveryText, { color: colors.mutedForeground }]}
        >
          No active delivery
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          style={[styles.backHomeBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>
            Back to Dashboard
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === "completed" && completedDelivery) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: topPad,
            paddingBottom: bottomPad,
          },
        ]}
      >
        <View style={styles.completedContent}>
          <Animated.View
            style={[
              styles.successCircle,
              { transform: [{ scale: successScale }] },
            ]}
          >
            <View
              style={[
                styles.successBg,
                { backgroundColor: colors.success + "20" },
              ]}
            >
              <View
                style={[
                  styles.successInner,
                  { backgroundColor: colors.success },
                ]}
              >
                <Feather name="check" size={44} color="#fff" />
              </View>
            </View>
          </Animated.View>

          <Animated.View
            style={{ opacity: successFade, alignItems: "center", gap: 8 }}
          >
            <Text style={[styles.completedTitle, { color: colors.foreground }]}>
              Delivery Complete!
            </Text>
            <Text
              style={[styles.completedSub, { color: colors.mutedForeground }]}
            >
              Great work — package delivered successfully
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.completedCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: successFade,
              },
            ]}
          >
            {[
              {
                icon: "dollar-sign",
                label: "Earnings",
                value: `£${completedDelivery.amount.toFixed(2)}`,
                color: colors.success,
              },
              {
                icon: "map-pin",
                label: "Distance",
                value: completedDelivery.distance,
                color: colors.primary,
              },
              {
                icon: "clock",
                label: "Duration",
                value: `${completedDelivery.durationMinutes} min`,
                color: "#FBBF24",
              },
              {
                icon: "calendar",
                label: "Completed",
                value: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                color: "#A78BFA",
              },
            ].map((item, i, arr) => (
              <View key={item.label}>
                <View style={styles.completedRow}>
                  <View
                    style={[
                      styles.completedIcon,
                      { backgroundColor: item.color + "20" },
                    ]}
                  >
                    <Feather
                      name={item.icon as any}
                      size={18}
                      color={item.color}
                    />
                  </View>
                  <Text
                    style={[
                      styles.completedLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.completedValue,
                      { color: colors.foreground },
                    ]}
                  >
                    {item.value}
                  </Text>
                </View>
                {i < arr.length - 1 && (
                  <View
                    style={[styles.divider, { backgroundColor: colors.border }]}
                  />
                )}
              </View>
            ))}
          </Animated.View>
        </View>

        <Animated.View
          style={[styles.completedActions, { opacity: successFade }]}
        >
          <TouchableOpacity
            style={[styles.earningsBtn, { borderColor: colors.primary }]}
            onPress={() => {
              router.replace("/(tabs)");
              router.push("/(tabs)/earnings");
            }}
          >
            <Feather name="dollar-sign" size={18} color={colors.primary} />
            <Text style={[styles.earningsBtnText, { color: colors.primary }]}>
              View Earnings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dashboardBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.dashboardBtnText}>Back to Dashboard</Text>
            <Feather name="home" size={18} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }
  const activeDelivery = activeDeliveries[0];
  const order = activeDelivery;
  if (!order) { return null;}

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
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Cancel Delivery",
              "Are you sure you want to cancel this delivery?",
              [
                { text: "No", style: "cancel" },
                {
                  text: "Cancel Delivery",
                  style: "destructive",
                  onPress: async () => {
                    await cancelActiveDelivery(activeDelivery.id);
                    router.replace("/(tabs)");
                  },
                },
              ],
            )
          }
        >
          <Feather name="x" size={24} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Active Delivery
        </Text>
        <View
          style={[
            styles.packageBadge,
            { backgroundColor: colors.primary + "20" },
          ]}
        >
          <Text style={[styles.packageId, { color: colors.primary }]}>
            {order.packageId}
          </Text>
        </View>
      </View>

      {/* Status indicator */}
      <View
        style={[
          styles.statusBar,
          {
            backgroundColor: colors.primary + "15",
            borderBottomColor: colors.primary + "30",
          },
        ]}
      >
        <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.statusText, { color: colors.primary }]}>
          {step === "navigate_pickup" && "Heading to pickup"}
          {step === "collected" && "Package collected"}
          {step === "navigate_delivery" && "En route to customer"}
          {step === "pin_entry" && "Arrived — awaiting PIN"}
        </Text>
        <Text style={[styles.statusPayout, { color: colors.success }]}>
          £{Number(order.payout || 0).toFixed(2)}
        </Text>
      </View>

      <View
        style={[
          styles.progressBar,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        {STEPS.map((s, i) => (
          <View key={s.key} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    i <= stepIndex ? colors.primary : colors.muted,
                  borderColor: i === stepIndex ? colors.primary : "transparent",
                },
              ]}
            >
              {i < stepIndex && <Feather name="check" size={10} color="#fff" />}
            </View>
            <Text
              style={[
                styles.progressLabel,
                {
                  color:
                    i <= stepIndex ? colors.primary : colors.mutedForeground,
                },
              ]}
            >
              {s.label}
            </Text>
            {i < STEPS.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  {
                    backgroundColor:
                      i < stepIndex ? colors.primary : colors.muted,
                  },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 16,
            gap: 14,
            paddingBottom: bottomPad + 32,
          }}
        >
          {(step === "navigate_pickup" || step === "collected") && (
            <View
              style={[
                styles.addressCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.addressHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.addressDot,
                    { backgroundColor: colors.primary },
                  ]}
                />
                <Text style={[styles.addressType, { color: colors.primary }]}>
                  PICKUP LOCATION
                </Text>
              </View>
              <Text style={[styles.addressText, { color: colors.foreground }]}>
                {order.pickupAddress}
              </Text>
              {step === "navigate_pickup" && (
                <View style={styles.mapsRow}>
                  <TouchableOpacity
                    style={[styles.mapBtn, { backgroundColor: "#1C1C1E" }]}
                    onPress={() => openAppleMaps(order.pickupAddress)}
                  >
                    <Feather name="map" size={16} color="#fff" />
                    <Text style={styles.mapBtnText}>Apple Maps</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mapBtn, { backgroundColor: "#4285F4" }]}
                    onPress={() => openGoogleMaps(order.pickupAddress)}
                  >
                    <Feather name="map-pin" size={16} color="#fff" />
                    <Text style={styles.mapBtnText}>Google Maps</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {(step === "navigate_delivery" || step === "pin_entry") && (
            <View
              style={[
                styles.addressCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.addressHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.addressDot,
                    { backgroundColor: colors.success },
                  ]}
                />
                <Text style={[styles.addressType, { color: colors.success }]}>
                  DELIVERY LOCATION
                </Text>
              </View>
              <Text style={[styles.addressText, { color: colors.foreground }]}>
                {order.deliveryAddress}
              </Text>
              {step === "navigate_delivery" && (
                <View style={styles.mapsRow}>
                  <TouchableOpacity
                    style={[styles.mapBtn, { backgroundColor: "#1C1C1E" }]}
                    onPress={() => openAppleMaps(order.deliveryAddress)}
                  >
                    <Feather name="map" size={16} color="#fff" />
                    <Text style={styles.mapBtnText}>Apple Maps</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mapBtn, { backgroundColor: "#4285F4" }]}
                    onPress={() => openGoogleMaps(order.deliveryAddress)}
                  >
                    <Feather name="map-pin" size={16} color="#fff" />
                    <Text style={styles.mapBtnText}>Google Maps</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {[
              {
                icon: "phone",
                label: "Customer Phone",
                value: order.customerPhone,
              },
              { icon: "hash", label: "Package ID", value: order.packageId },
              {
                icon: "file-text",
                label: "Delivery Notes",
                value: order.deliveryNotes,
              },
            ].map((item, i, arr) => (
              <View key={item.label}>
                <View style={styles.infoRow}>
                  <View
                    style={[styles.infoIcon, { backgroundColor: colors.muted }]}
                  >
                    <Feather
                      name={item.icon as any}
                      size={15}
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

          {step === "pin_entry" && (
            <View
              style={[
                styles.pinCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.primary + "40",
                },
              ]}
            >
              <Text style={[styles.pinTitle, { color: colors.foreground }]}>
                Enter Delivery PIN
              </Text>
              <Text style={[styles.pinSub, { color: colors.mutedForeground }]}>
                Ask the customer for their 6-digit delivery PIN
              </Text>
              <TextInput
                style={[
                  styles.pinInput,
                  {
                    backgroundColor: colors.input,
                    color: colors.foreground,
                    borderColor: recipientName
                      ? colors.primary
                      : colors.border,
                  },
                ]}
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="Recipient Name"
                placeholderTextColor={colors.mutedForeground}
                textAlign="center"
                returnKeyType="next"
              />
              
              <TextInput
                ref={pinInputRef}
                style={[
                  styles.pinInput,
                  {
                    backgroundColor: colors.input,
                    color: colors.foreground,
                    borderColor: pin ? colors.primary : colors.border,
                  },
                ]}
                value={pin}
                onChangeText={(t) => {
                  setPin(t);
                  setPinError("");
                }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="• • • •"
                placeholderTextColor={colors.mutedForeground}
                textAlign="center"
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (pin.length === 6 && !loading) verifyPin();
                }}
              />
              {!!pinError && (
                <View
                  style={[
                    styles.pinError,
                    {
                      backgroundColor: colors.destructive + "20",
                      borderColor: colors.destructive + "40",
                    },
                  ]}
                >
                  <Feather
                    name="alert-circle"
                    size={14}
                    color={colors.destructive}
                  />
                  <Text
                    style={[styles.pinErrorText, { color: colors.destructive }]}
                  >
                    {pinError}
                  </Text>
                </View>
              )}
            </View>
          )}

          {step === "navigate_pickup" && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => advanceStep("collected")}
            >
              <Feather name="map-pin" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>I've Arrived at Pickup</Text>
            </TouchableOpacity>
          )}

          {step === "collected" && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
              onPress={() => advanceStep("navigate_delivery")}
            >
              <Feather name="package" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Package Collected</Text>
            </TouchableOpacity>
          )}

          {step === "navigate_delivery" && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => advanceStep("pin_entry")}
            >
              <Feather name="map-pin" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>I've Arrived at Delivery</Text>
            </TouchableOpacity>
          )}

          {step === "pin_entry" && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor:
                    pin.length === 6 ? colors.success : colors.muted,
                },
              ]}
              onPress={verifyPin}
              disabled={pin.length !== 6 || loading}
            >
              <Feather
                name="check-circle"
                size={20}
                color={pin.length === 6 ? "#fff" : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: pin.length === 6 ? "#fff" : colors.mutedForeground },
                ]}
              >
                {loading ? "Completing..." : "Verify PIN & Complete"}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  packageBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  packageId: { fontSize: 12, fontFamily: "Inter_700Bold" },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statusPayout: { fontSize: 15, fontFamily: "Inter_700Bold" },
  progressBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  progressStep: { flexDirection: "row", alignItems: "center", flex: 1 },
  progressDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  progressLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  progressLine: { flex: 1, height: 2, marginHorizontal: 4 },
  scroll: { flex: 1 },
  addressCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderBottomWidth: 1,
  },
  addressDot: { width: 10, height: 10, borderRadius: 5 },
  addressType: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  addressText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    padding: 14,
    lineHeight: 22,
  },
  mapsRow: { flexDirection: "row", gap: 10, padding: 14, paddingTop: 0 },
  mapBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 10,
  },
  mapBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  infoCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
  infoValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  divider: { height: 1, marginLeft: 62 },
  pinCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    gap: 12,
    alignItems: "center",
  },
  pinTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  pinSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  pinInput: {
    height: 64,
    width: "60%",
    borderRadius: 14,
    borderWidth: 2,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 12,
  },
  pinError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  pinErrorText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  actionBtn: {
    height: 58,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  actionBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  completedContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingHorizontal: 24,
  },
  successCircle: {},
  successBg: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
  },
  successInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  completedTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  completedSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  completedCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  completedIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  completedLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  completedValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  completedActions: { paddingHorizontal: 24, gap: 12, paddingBottom: 8 },
  earningsBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  earningsBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  dashboardBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  dashboardBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  noDeliveryText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    marginBottom: 20,
  },
  backHomeBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
});
