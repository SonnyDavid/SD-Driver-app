export { DeliveriesScreen as default } from "@/components/DriverFlowScreens";
/*
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDelivery } from "@/contexts/DeliveryContext";
import { getDriverOrderNumber } from "@/lib/orderDisplay";

export default function DeliveriesScreen() {
  const { activeDeliveries, completedDeliveries } = useDelivery();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const visible = activeDeliveries.length ? activeDeliveries : demoActive;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#000", "#070707", "#000"]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPad + 6 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoBox}><Text style={styles.logoText}>SD</Text></View>
          <Text style={styles.title}>My Deliveries</Text>
          <TouchableOpacity style={styles.iconBtn}><Feather name="bell" size={19} color="#FFFFFF" /></TouchableOpacity>
          <View style={styles.onlinePill}><Feather name="power" size={17} color="#22C55E" /><Text style={styles.onlineText}>ONLINE</Text></View>
        </View>

        <View style={styles.tabs}>
          <Text style={[styles.tab, styles.tabActive]}>Active <Text style={styles.tabCount}>{activeDeliveries.length || 2}</Text></Text>
          <Text style={styles.tab}>Completed <Text style={styles.tabCount}>{completedDeliveries.length || 12}</Text></Text>
          <Text style={styles.tab}>Cancelled <Text style={styles.tabCount}>1</Text></Text>
        </View>

        <Text style={styles.sectionTitle}>ACTIVE DELIVERIES</Text>
        {visible.map((order, index) => {
          const isDemo = !activeDeliveries.length;
          const collected = order.status === "package_collected" || order.status === "en_route" || index === 1;
          return (
            <View key={order.id} style={styles.deliveryCard}>
              <View style={styles.topRow}>
                <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.status}>{collected ? "COLLECTED" : "PICKUP PENDING"}</Text>
                  <Text style={styles.orderId} numberOfLines={1}>{getDriverOrderNumber(order)}</Text>
                  <Text style={styles.created} numberOfLines={1}>{collected ? "Collected: 11:05 AM" : "Created: 10:24 AM"}</Text>
                </View>
                <Text style={styles.price}>£{Number(order.payout || (index ? 22 : 15.5)).toFixed(2)}</Text>
                <TouchableOpacity style={styles.detailsLink} onPress={() => router.push("/active-delivery")} activeOpacity={0.86}>
                  <Feather name="chevron-right" size={20} color="#FF6B00" />
                </TouchableOpacity>
              </View>

              <View style={styles.route}>
                <View style={styles.routeCol}>
                  <Text style={styles.routeLabel}>PICKUP</Text>
                  <Text style={styles.postcode} numberOfLines={1}>{postcode(order.pickupAddress, index, "pickup")}</Text>
                  <Text style={styles.city} numberOfLines={1}><Feather name="map-pin" size={10} color="#FF6B00" /> {city(order.pickupAddress)}</Text>
                </View>
                <View style={styles.routeLine}><View style={styles.dash} /><Feather name="package" size={16} color="#FF6B00" /><View style={styles.dash} /></View>
                <View style={styles.routeCol}>
                  <Text style={styles.routeLabel}>DELIVERY</Text>
                  <Text style={styles.postcode} numberOfLines={1}>{postcode(order.deliveryAddress, index, "delivery")}</Text>
                  <Text style={styles.city} numberOfLines={1}><Feather name="map-pin" size={10} color="#FF6B00" /> {city(order.deliveryAddress)}</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/delivery-navigation")} activeOpacity={0.86}>
                  <Feather name="navigation" size={14} color="#FF6B00" />
                  <Text style={styles.actionText} numberOfLines={1}>Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryAction, isDemo && { opacity: 0.88 }]}
                  onPress={() => router.push(collected ? "/delivery-navigation" : "/active-delivery")}
                  activeOpacity={0.86}
                >
                  <Text style={styles.primaryText} numberOfLines={1}>{collected ? "Start Delivery" : "Delivery Details"}</Text>
                  <Feather name={collected ? "arrow-right-circle" : "check-circle"} size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>RECENTLY COMPLETED</Text>
        {(completedDeliveries.length ? completedDeliveries.slice(0, 3) : demoCompleted).map((delivery, index) => (
          <View key={delivery.id} style={styles.completedRow}>
            <Feather name="check-circle" size={20} color="#22C55E" />
            <View style={{ flex: 1 }}>
              <Text style={styles.completedId}>{getDriverOrderNumber(delivery)}</Text>
              <Text style={styles.completedSub}>Completed: {index ? "Yesterday" : "09:15 AM"}</Text>
            </View>
            <Text style={styles.completedRoute}>{shortRoute(delivery.route || "SW1A 2AA -> EC2M 3YX")}</Text>
            <Text style={styles.completedAmount}>£{Number(delivery.amount || [18.75, 31.2, 19.5][index]).toFixed(2)}</Text>
            <Feather name="chevron-right" size={18} color="#777" />
          </View>
        ))}

        <View style={styles.pinCard}>
          <View style={styles.pinIcon}><Feather name="shield" size={20} color="#FF6B00" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pinTitle}>Secure PIN Delivery</Text>
            <Text style={styles.pinSub}>All deliveries are PIN protected for your safety.</Text>
          </View>
          <Feather name="chevron-right" size={22} color="#777" />
        </View>

        <View style={{ height: 76 }} />
      </ScrollView>
    </View>
  );
}

function postcode(address: string | undefined, index: number, type: "pickup" | "delivery") {
  if (!address) return type === "pickup" ? ["W1J 7JX", "NW1 6XE"][index] : ["E1 6AN", "SE1 7PB"][index];
  return address.split(",")[0]?.trim().toUpperCase().slice(0, 8) || address.slice(0, 8).toUpperCase();
}

function city(address?: string) {
  return address?.split(",")[1]?.trim() || "London";
}

function shortRoute(route: string) {
  return route.replace(" -> ", "  >  ").slice(0, 18);
}

const demoActive = [
  { id: "demo-a", pickupAddress: "W1J 7JX, London", deliveryAddress: "E1 6AN, London", payout: 15.5, packageId: "SD-ORD-12345", status: "pickup_pending" },
  { id: "demo-b", pickupAddress: "NW1 6XE, London", deliveryAddress: "SE1 7PB, London", payout: 22, packageId: "SD-ORD-12346", status: "package_collected" },
];

const demoCompleted = [
  { id: "done-1", orderId: "SD-ORD-12344", route: "SW1A 2AA -> EC2M 3YX", amount: 18.75 },
  { id: "done-2", orderId: "SD-ORD-12343", route: "B1 1AA -> B24 9FP", amount: 31.2 },
  { id: "done-3", orderId: "SD-ORD-12342", route: "M4 4QJ -> M14 7WB", amount: 19.5 },
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
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#202020", marginBottom: 10 },
  tab: { flex: 1, color: "#FFFFFF", textAlign: "center", paddingBottom: 8, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tabActive: { color: "#FF6B00", borderBottomWidth: 1.5, borderBottomColor: "#FF6B00" },
  tabCount: { color: "#FFFFFF", backgroundColor: "#262626" },
  sectionTitle: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 7, marginTop: 1 },
  deliveryCard: { borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 8, marginBottom: 8, overflow: "hidden" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 7, padding: 9, paddingBottom: 5 },
  detailsLink: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  number: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center" },
  numberText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  status: { color: "#FF6B00", fontSize: 9, fontFamily: "Inter_700Bold" },
  orderId: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  created: { color: "#9B9B9B", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  price: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold", backgroundColor: "#050505", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, overflow: "hidden" },
  route: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 7 },
  routeCol: { flex: 1, minWidth: 0 },
  routeLabel: { color: "#9D9D9D", fontSize: 9, fontFamily: "Inter_600SemiBold" },
  postcode: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 2 },
  city: { color: "#A0A0A0", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  routeLine: { width: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 },
  dash: { width: 12, height: 1, borderStyle: "dashed", borderWidth: 1, borderColor: "#FF6B00" },
  actions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#202020" },
  actionBtn: { flex: 1, minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRightWidth: 1, borderRightColor: "#202020", minWidth: 0 },
  actionText: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  primaryAction: { flex: 1.1, margin: 5, borderRadius: 7, backgroundColor: "#FF6B00", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 6 },
  primaryText: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_700Bold", flexShrink: 1 },
  completedRow: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 42, borderBottomWidth: 1, borderBottomColor: "#202020", backgroundColor: "rgba(15,15,15,0.96)", paddingHorizontal: 9 },
  completedId: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_700Bold" },
  completedSub: { color: "#9A9A9A", fontSize: 9, fontFamily: "Inter_400Regular" },
  completedRoute: { color: "#FFFFFF", fontSize: 9, fontFamily: "Inter_600SemiBold" },
  completedAmount: { color: "#22C55E", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  pinCard: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.96)", borderRadius: 8, padding: 10, marginTop: 8 },
  pinIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,107,0,0.12)", alignItems: "center", justifyContent: "center" },
  pinTitle: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  pinSub: { color: "#A0A0A0", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
});
*/
