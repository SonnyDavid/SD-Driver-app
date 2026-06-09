import { Feather } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React from "react";
import { AppState, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { flow, postcode } from "@/components/DriverFlowUI";
import { useAuth } from "@/contexts/AuthContext";
import { useDelivery } from "@/contexts/DeliveryContext";
import { getDriverOrderNumber } from "@/lib/orderDisplay";
import {
  initOrderNotifications,
  isNewOrderNotification,
  ringForNewOrder,
} from "@/lib/orderNotifications";

function estimateTripTime(distance?: string) {
  if (!distance) return "45 min";
  const km = Number.parseFloat(distance);
  if (Number.isNaN(km)) return "45 min";
  if (km >= 100) return `${Math.max(1, Math.round(km / 65))}h ${Math.round((km % 65) / 1.1) % 60 || 15}m`;
  return `${Math.max(12, Math.round(km * 4))} min`;
}

function IncomingOrderOverlay({
  order,
  seconds,
  accepting,
  queueSize,
  onAccept,
  onReject,
}: {
  order: any;
  seconds: number;
  accepting: boolean;
  queueSize: number;
  onAccept: () => void | Promise<void>;
  onReject: () => void;
}) {
  const timerLabel = `00:${String(seconds).padStart(2, "0")}`;

  return (
    <View style={styles.overlay}>
      <View style={styles.popup}>
        <View style={styles.popupBadge}>
          <Feather name="package" size={22} color={flow.cyan} />
        </View>

        <Text style={styles.popupTitle}>NEW DELIVERY REQUEST</Text>

        <View style={styles.popupMetaRow}>
          <View style={styles.popupMetaLeft}>
            <Feather name="box" size={13} color={flow.cyan} />
            <Text style={styles.popupMetaLabel}>ORDER ID:</Text>
            <Text style={styles.popupMetaValue}>{getDriverOrderNumber(order)}</Text>
          </View>
          <View style={styles.popupMetaRight}>
            <Text style={styles.popupTimerLabel}>TIME TO ACCEPT</Text>
            <Text style={styles.popupTimer}>{timerLabel}</Text>
          </View>
        </View>

        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.routeDotCyan} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeKind}>PICKUP LOCATION</Text>
              <Text style={styles.routeAddress}>{order.pickupAddress}</Text>
            </View>
          </View>
          <View style={styles.routeConnector} />
          <View style={styles.routeRow}>
            <View style={styles.routeDotGreen} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeKind}>DROPOFF LOCATION</Text>
              <Text style={styles.routeAddress}>{order.deliveryAddress}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tripRow}>
          <View style={styles.tripItem}>
            <Feather name="map" size={13} color={flow.cyan} />
            <View>
              <Text style={styles.tripLabel}>DISTANCE</Text>
              <Text style={styles.tripValue}>{order.distance || "3.7 km"}</Text>
            </View>
          </View>
          <View style={styles.tripItem}>
            <Feather name="clock" size={13} color={flow.cyan} />
            <View>
              <Text style={styles.tripLabel}>ESTIMATED TIME</Text>
              <Text style={styles.tripValue}>{estimateTripTime(order.distance)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.earningsRow}>
          <View style={styles.earningsLeft}>
            <Feather name="credit-card" size={14} color={flow.cyan} />
            <Text style={styles.earningsLabel}>ESTIMATED EARNINGS</Text>
          </View>
          <Text style={styles.earningsValue}>£{Number(order.payout || 0).toFixed(2)}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject} disabled={accepting} activeOpacity={0.88}>
            <View style={styles.rejectIconWrap}>
              <Feather name="x" size={16} color={flow.red} />
            </View>
            <Text style={styles.rejectText}>REJECT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} disabled={accepting} activeOpacity={0.88}>
            <View style={styles.acceptIconWrap}>
              <Feather name="check" size={16} color={flow.onCyan} />
            </View>
            <Text style={styles.acceptText}>{accepting ? "ADDING..." : "ACCEPT"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Accept adds this order to My Deliveries{queueSize > 0 ? ` (${queueSize} already queued)` : ""}. You can keep accepting more deliveries.
        </Text>
      </View>
    </View>
  );
}

/** Global new-order popup + notification tap handling (any screen). */
export function IncomingOrderNotifier() {
  const { driver } = useAuth();
  const {
    popupIncomingOrder,
    myDeliveries,
    acceptOrder,
    rejectOrder,
    clearPopupSnooze,
    setFocusIncomingPopup,
  } = useDelivery();
  const incoming = popupIncomingOrder;
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [seconds, setSeconds] = React.useState(30);
  const [accepting, setAccepting] = React.useState(false);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 41 : insets.top;

  const online = !!driver?.isOnline;
  const hasActiveDeliveries = myDeliveries.length > 0;
  const showPopup = !!driver && !!incoming && online && !hasActiveDeliveries;
  const activeIncomingId = showPopup && incoming ? incoming.id : null;

  React.useEffect(() => {
    void initOrderNotifications();
  }, []);

  React.useEffect(() => {
    if (!activeIncomingId || !incoming) return;
    void ringForNewOrder({
      orderId: getDriverOrderNumber(incoming),
      orderUuid: incoming.id,
      pickupPostcode: postcode(incoming.pickupAddress),
      deliveryPostcode: postcode(incoming.deliveryAddress),
      earnings: Number(incoming.payout || 0),
    });
  }, [activeIncomingId, incoming]);

  const openIncomingFromNotification = React.useCallback(
    (data: unknown) => {
      if (!isNewOrderNotification(data)) return;
      if (data.orderUuid) clearPopupSnooze(data.orderUuid);
      setFocusIncomingPopup(true);
      router.push("/(tabs)");
    },
    [clearPopupSnooze, setFocusIncomingPopup]
  );

  React.useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openIncomingFromNotification(response.notification.request.content.data);
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      openIncomingFromNotification(response.notification.request.content.data);
    });

    return () => {
      responseSub.remove();
    };
  }, [openIncomingFromNotification]);

  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" || !driver?.isOnline) return;
      if (!popupIncomingOrder || hasActiveDeliveries) return;
      setFocusIncomingPopup(true);
    });

    return () => sub.remove();
  }, [driver?.isOnline, hasActiveDeliveries, popupIncomingOrder, setFocusIncomingPopup]);

  React.useEffect(() => {
    if (!activeIncomingId) return;
    setSeconds(30);
    setAccepting(false);
  }, [activeIncomingId]);

  React.useEffect(() => {
    if (!activeIncomingId) return;
    if (seconds <= 0) {
      rejectOrder(activeIncomingId);
      return;
    }
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds, activeIncomingId, rejectOrder]);

  async function handleAccept(order: NonNullable<typeof popupIncomingOrder>) {
    if (accepting) return;
    setAccepting(true);
    await acceptOrder(order);
    setAccepting(false);
    setSuccessMessage("Added to My Deliveries · you can accept more");
    setTimeout(() => setSuccessMessage(null), 2200);
  }

  return (
    <View style={styles.host} pointerEvents={driver ? "box-none" : "none"}>
      {!!driver && !!successMessage && (
        <View style={[styles.successBanner, { top: topInset + 8 }]}>
          <Feather name="check-circle" size={18} color={flow.green} />
          <Text style={styles.successBannerText}>{successMessage}</Text>
        </View>
      )}
      {showPopup && incoming && (
        <IncomingOrderOverlay
          key={incoming.id}
          order={incoming}
          seconds={seconds}
          accepting={accepting}
          queueSize={myDeliveries.length}
          onAccept={() => handleAccept(incoming)}
          onReject={() => rejectOrder(incoming.id)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  successBanner: {
    position: "absolute",
    left: flow.space.page,
    right: flow.space.page,
    zIndex: 110,
    flexDirection: "row",
    alignItems: "center",
    gap: flow.space.sm,
    borderWidth: 1,
    borderColor: "rgba(23,201,100,0.45)",
    backgroundColor: "rgba(7,16,12,0.96)",
    borderRadius: flow.radius,
    paddingHorizontal: flow.space.md,
    paddingVertical: 10,
  },
  successBannerText: { color: flow.text, fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    padding: 16,
  },
  popup: {
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.45)",
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: flow.space.md,
    gap: 10,
    shadowColor: flow.cyan,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  popupBadge: {
    alignSelf: "center",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.45)",
    backgroundColor: "rgba(20,200,243,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -34,
    marginBottom: -4,
  },
  popupTitle: { color: flow.text, fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.8, textAlign: "center" },
  popupMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  popupMetaLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  popupMetaLabel: { color: flow.muted, fontSize: 8, fontFamily: "Inter_600SemiBold" },
  popupMetaValue: { color: flow.text, fontSize: 9, fontFamily: "Inter_700Bold" },
  popupMetaRight: { alignItems: "flex-end" },
  popupTimerLabel: { color: flow.muted, fontSize: 7, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4 },
  popupTimer: { color: flow.cyan, fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 24 },
  routeCard: {
    borderWidth: 1,
    borderColor: flow.line,
    backgroundColor: "rgba(10,13,18,0.9)",
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  routeRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  routeDotCyan: { width: 8, height: 8, borderRadius: 4, backgroundColor: flow.cyan, marginTop: 4 },
  routeDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: flow.green, marginTop: 4 },
  routeConnector: { width: 1, height: 14, backgroundColor: "rgba(20,200,243,0.35)", marginLeft: 3 },
  routeKind: { color: flow.muted, fontSize: 7, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  routeAddress: { color: flow.text, fontSize: 10, fontFamily: "Inter_500Medium", lineHeight: 14, marginTop: 2 },
  tripRow: { flexDirection: "row", gap: 8 },
  tripItem: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: flow.line,
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
  },
  tripLabel: { color: flow.muted, fontSize: 7, fontFamily: "Inter_600SemiBold" },
  tripValue: { color: flow.text, fontSize: 10, fontFamily: "Inter_700Bold", marginTop: 1 },
  earningsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: flow.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  earningsLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  earningsLabel: { color: flow.muted, fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  earningsValue: { color: flow.cyan, fontSize: 20, fontFamily: "Inter_700Bold" },
  actionRow: { flexDirection: "row", gap: 10 },
  rejectBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: flow.red,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(239,35,60,0.08)",
  },
  rejectIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: flow.red,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectText: { color: flow.red, fontSize: 12, fontFamily: "Inter_700Bold" },
  acceptBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: flow.cyan,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  acceptIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,16,24,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptText: { color: flow.onCyan, fontSize: 12, fontFamily: "Inter_700Bold" },
  footerNote: { color: flow.muted, fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 13 },
});
