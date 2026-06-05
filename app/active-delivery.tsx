export { DeliveryDetailsScreen as default } from "@/components/DriverFlowScreens";
/*
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDelivery } from "@/contexts/DeliveryContext";
import { getDriverOrderNumber } from "@/lib/orderDisplay";

export default function DeliveryDetailsScreen() {
  const { activeDeliveries } = useDelivery();
  const insets = useSafeAreaInsets();
  const order = activeDeliveries[0] || demoOrder;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#000000", "#070707", "#000000"]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPad + 6 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="chevron-left" size={26} color="#FFFFFF" /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Delivery Details</Text>
            <Text style={styles.orderId} numberOfLines={1}>Order ID: {getDriverOrderNumber(order)}</Text>
          </View>
          <Text style={styles.accepted}>ACCEPTED</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.customerRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(order.recipientName || "Customer").charAt(0)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName} numberOfLines={1}>{order.recipientName || "Emma Wilson"}</Text>
              <Text style={styles.customerPhone} numberOfLines={1}>{order.recipientPhone || order.customerPhone || "+44 7700 900123"}</Text>
            </View>
            <TouchableOpacity style={styles.iconBtn}><Feather name="phone" size={16} color="#FF6B00" /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}><Feather name="message-circle" size={16} color="#FF6B00" /></TouchableOpacity>
          </View>
        </View>

        <View style={styles.routeCard}>
          <RouteBlock icon="home" label="PICKUP ADDRESS" value={order.pickupAddress || "28 Innovation Blvd, London SW1"} />
          <View style={styles.routeDivider} />
          <RouteBlock icon="map-pin" label="DROPOFF ADDRESS" value={order.deliveryAddress || "23 Chelsea Manor St, London SW3"} />
        </View>

        <View style={styles.metricGrid}>
          <Metric label="Earnings" value={`£${Number(order.payout || 9.4).toFixed(2)}`} color="#22C55E" />
          <Metric label="Distance" value={order.distance || "3.7 km"} color="#38BDF8" />
          <Metric label="PIN" value="Required" color="#FF6B00" />
          <Metric label="Proof" value="Photo + Sign" color="#A855F7" />
        </View>

        <View style={styles.instructionsCard}>
          <Text style={styles.cardTitle}>DRIVER FLOW</Text>
          {["Navigate to pickup", "Capture parcel photo", "Collect sender signature", "Navigate to customer", "Verify recipient PIN"].map((item, index) => (
            <View key={item} style={styles.flowRow}>
              <View style={styles.flowNumber}><Text style={styles.flowNumberText}>{index + 1}</Text></View>
              <Text style={styles.flowText}>{item}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/delivery-navigation")} activeOpacity={0.86}>
          <Feather name="navigation" size={18} color="#111" />
          <Text style={styles.primaryText}>NAVIGATE TO PICKUP</Text>
        </TouchableOpacity>
        <View style={{ height: 76 }} />
      </ScrollView>
    </View>
  );
}

function RouteBlock({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.routeBlock}>
      <View style={styles.routeIcon}><Feather name={icon as any} size={17} color="#FF6B00" /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.routeLabel}>{label}</Text>
        <Text style={styles.routeValue}>{value}</Text>
      </View>
    </View>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const demoOrder = {
  id: "demo",
  pickupAddress: "28 Innovation Blvd, London SW1",
  deliveryAddress: "23 Chelsea Manor St, London SW3",
  distance: "3.7 km",
  payout: 9.4,
  packageId: "SD-ORD-12345",
  packageType: "Box",
  customerPhone: "+44 7700 900123",
  recipientName: "Emma Wilson",
  recipientPhone: "+44 7700 900123",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { paddingHorizontal: 12, paddingBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  orderId: { color: "#FF6B00", fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 1 },
  accepted: { color: "#22C55E", fontSize: 10, fontFamily: "Inter_700Bold", borderWidth: 1, borderColor: "rgba(34,197,94,0.36)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  summaryCard: { borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 8, padding: 10, marginBottom: 8 },
  customerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: "#FF6B00", backgroundColor: "#151515", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  customerName: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  customerPhone: { color: "#A4A4A4", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  iconBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: "#2A2A2A", alignItems: "center", justifyContent: "center" },
  routeCard: { borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 8, padding: 10, marginBottom: 8 },
  routeBlock: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  routeIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,107,0,0.12)", alignItems: "center", justifyContent: "center" },
  routeLabel: { color: "#9B9B9B", fontSize: 9, fontFamily: "Inter_700Bold" },
  routeValue: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 2, lineHeight: 17 },
  routeDivider: { width: 2, height: 18, backgroundColor: "#FF6B00", marginLeft: 14, marginVertical: 5 },
  metricGrid: { flexDirection: "row", gap: 6, marginBottom: 8 },
  metric: { flex: 1, borderWidth: 1, borderColor: "#202020", backgroundColor: "#101010", borderRadius: 7, padding: 7, alignItems: "center" },
  metricLabel: { color: "#8E8E8E", fontSize: 9, fontFamily: "Inter_600SemiBold" },
  metricValue: { fontSize: 11, fontFamily: "Inter_700Bold", marginTop: 3 },
  instructionsCard: { borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 8, padding: 10, marginBottom: 8 },
  cardTitle: { color: "#FF6B00", fontSize: 11, fontFamily: "Inter_700Bold", marginBottom: 8 },
  flowRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 26 },
  flowNumber: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center" },
  flowNumberText: { color: "#111", fontSize: 10, fontFamily: "Inter_700Bold" },
  flowText: { color: "#D8D8D8", fontSize: 11, fontFamily: "Inter_500Medium" },
  primaryButton: { height: 46, borderRadius: 8, backgroundColor: "#FF6B00", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: "#111", fontSize: 12, fontFamily: "Inter_700Bold" },
});
*/
