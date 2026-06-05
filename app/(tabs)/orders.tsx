export { OrdersScreen as default } from "@/components/DriverFlowScreens";
/*
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDelivery } from "@/contexts/DeliveryContext";
import { getDriverOrderNumber } from "@/lib/orderDisplay";

export default function OrdersScreen() {
  const { availableOrders, acceptOrder, rejectOrder, isLoadingOrders } = useDelivery();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const visibleOrders = availableOrders.length ? availableOrders : demoOrders;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#000", "#070707", "#000"]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPad + 6 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoBox}><Text style={styles.logoText}>SD</Text></View>
          <Text style={styles.title}>Available Deliveries</Text>
          <TouchableOpacity style={styles.iconBtn}><Feather name="bell" size={19} color="#FFFFFF" /></TouchableOpacity>
          <View style={styles.onlinePill}>
            <Feather name="power" size={17} color="#22C55E" />
            <Text style={styles.onlineText}>ONLINE</Text>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <View style={styles.noticeIcon}><Feather name="package" size={22} color="#FF6B00" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>New jobs available</Text>
            <Text style={styles.noticeSub}>Accept a delivery to start earning</Text>
          </View>
          <View style={styles.countBadge}><Text style={styles.countText}>{availableOrders.length || 5}</Text></View>
        </View>

        {isLoadingOrders ? (
          <View style={styles.loading}><ActivityIndicator color="#FF6B00" /></View>
        ) : (
          visibleOrders.map((order, index) => {
            const isDemo = !availableOrders.length;
            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.cardTop}>
                  <View>
                    <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
                    <Text style={styles.orderId} numberOfLines={1}>{getDriverOrderNumber(order)}</Text>
                  </View>
                  <Text style={styles.price}>£{Number(order.payout || 18.5 + index * 5.2).toFixed(2)}</Text>
                </View>

                <View style={styles.routeRow}>
                  <View style={styles.routeCol}>
                    <Text style={styles.routeLabel}>PICKUP</Text>
                    <Text style={styles.postcode} numberOfLines={1}>{postcode(order.pickupAddress, index, "pickup")}</Text>
                    <Text style={styles.city} numberOfLines={1}><Feather name="map-pin" size={11} color="#FF6B00" /> {city(order.pickupAddress)}</Text>
                  </View>
                  <Text style={styles.routeArrow}>→</Text>
                  <View style={styles.routeCol}>
                    <Text style={styles.routeLabel}>DELIVERY</Text>
                    <Text style={styles.postcode} numberOfLines={1}>{postcode(order.deliveryAddress, index, "delivery")}</Text>
                    <Text style={styles.city} numberOfLines={1}><Feather name="map-pin" size={11} color="#FF6B00" /> {city(order.deliveryAddress)}</Text>
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <View style={styles.metric}><Feather name="navigation" size={13} color="#CFCFCF" /><Text style={styles.metricText} numberOfLines={1}>{order.distance || `${(5.6 + index * 2.1).toFixed(1)} miles`}</Text></View>
                  <View style={styles.metric}><Feather name="clock" size={13} color="#CFCFCF" /><Text style={styles.metricText} numberOfLines={1}>Est. {28 + index * 7} min</Text></View>
                  <TouchableOpacity
                    style={[styles.rejectBtn, isDemo && { opacity: 0.55 }]}
                    onPress={() => !isDemo && rejectOrder(String(order.id))}
                    disabled={isDemo}
                    activeOpacity={0.86}
                  >
                    <Text style={styles.rejectText} numberOfLines={1}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptBtn, isDemo && { opacity: 0.55 }]}
                    onPress={async () => {
                      if (isDemo) return;
                      await acceptOrder(order as any);
                      router.push("/delivery-navigation");
                    }}
                    disabled={isDemo}
                    activeOpacity={0.86}
                  >
                    <Text style={styles.acceptText} numberOfLines={1}>Accept</Text>
                    <Feather name="arrow-right" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.pinCard}>
          <View style={styles.shield}><Feather name="shield" size={20} color="#FF6B00" /></View>
          <View>
            <Text style={styles.pinTitle}>All deliveries are PIN protected</Text>
            <Text style={styles.pinSub}>You'll need to verify the PIN at the delivery location</Text>
          </View>
        </View>
        <View style={{ height: 76 }} />
      </ScrollView>
    </View>
  );
}

function postcode(address: string | undefined, index: number, type: "pickup" | "delivery") {
  if (!address) return type === "pickup" ? ["BT1 1AA", "M2 4QJ", "B15 1TN"][index] : ["BT36 5XY", "M14 7WB", "B24 9FP"][index];
  const first = address.split(",")[0]?.trim();
  return first?.toUpperCase().slice(0, 8) || address.slice(0, 8).toUpperCase();
}

function city(address?: string) {
  return address?.split(",")[1]?.trim() || "Belfast";
}

const demoOrders = [
  { id: "demo-1", pickupAddress: "BT1 1AA, Belfast", deliveryAddress: "BT36 5XY, Newtownards", distance: "8.2 miles", payout: 18.5, packageId: "SD-ORD-12351" },
  { id: "demo-2", pickupAddress: "M2 4QJ, Manchester", deliveryAddress: "M14 7WB, Manchester", distance: "5.6 miles", payout: 22.75, packageId: "SD-ORD-12352" },
  { id: "demo-3", pickupAddress: "B15 1TN, Birmingham", deliveryAddress: "B24 9FP, Birmingham", distance: "10.3 miles", payout: 31.2, packageId: "SD-ORD-12353" },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { paddingHorizontal: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  logoBox: { width: 34, height: 34, borderRadius: 8, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  title: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold", flex: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "#1F1F1F", alignItems: "center", justifyContent: "center" },
  onlinePill: { height: 34, borderRadius: 17, borderWidth: 1, borderColor: "#1F1F1F", backgroundColor: "#101010", paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 5 },
  onlineText: { color: "#22C55E", fontSize: 11, fontFamily: "Inter_700Bold" },
  noticeCard: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.96)", borderRadius: 8, padding: 10, marginBottom: 10 },
  noticeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#17120D", alignItems: "center", justifyContent: "center" },
  noticeTitle: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold" },
  noticeSub: { color: "#B7B7B7", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  countBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center" },
  countText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold" },
  loading: { paddingVertical: 40 },
  orderCard: { borderRadius: 8, borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", marginBottom: 8, overflow: "hidden" },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, padding: 10, paddingBottom: 6 },
  newBadge: { alignSelf: "flex-start", borderRadius: 4, borderWidth: 1, borderColor: "#FF6B00", paddingHorizontal: 4, paddingVertical: 1, marginBottom: 4 },
  newBadgeText: { color: "#FF6B00", fontSize: 8, fontFamily: "Inter_700Bold" },
  orderId: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold", flexShrink: 1 },
  price: { color: "#FF7A1A", fontSize: 16, fontFamily: "Inter_700Bold", backgroundColor: "#050505", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, overflow: "hidden" },
  routeRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 8 },
  routeCol: { flex: 1, minWidth: 0 },
  routeLabel: { color: "#9D9D9D", fontSize: 9, fontFamily: "Inter_600SemiBold" },
  postcode: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 3 },
  city: { color: "#A0A0A0", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 3 },
  routeArrow: { color: "#FF6B00", fontSize: 18, marginHorizontal: 8 },
  cardBottom: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#1E1E1E", padding: 8, gap: 8 },
  metric: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  metricText: { color: "#DADADA", fontSize: 10, fontFamily: "Inter_400Regular" },
  rejectBtn: { marginLeft: "auto", height: 34, minWidth: 70, borderRadius: 7, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  rejectText: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_700Bold" },
  acceptBtn: { height: 34, minWidth: 86, borderRadius: 7, backgroundColor: "#16A34A", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10 },
  acceptText: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_700Bold" },
  pinCard: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.96)", borderRadius: 8, padding: 10, marginTop: 2 },
  shield: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "#FF6B00", alignItems: "center", justifyContent: "center" },
  pinTitle: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  pinSub: { color: "#9D9D9D", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
});
*/
