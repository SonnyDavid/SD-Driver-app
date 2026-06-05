export { DashboardScreen as default } from "@/components/DriverFlowScreens";
/*
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useDelivery } from "@/contexts/DeliveryContext";
import { getDriverOrderNumber } from "@/lib/orderDisplay";

const SD_LOGO = require("@/assets/images/sd-logo.png");

export default function DashboardScreen() {
  const { driver, setOnline } = useAuth();
  const { availableOrders, activeDeliveries, completedDeliveries, todayEarnings, acceptOrder, rejectOrder } = useDelivery();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const online = !!driver?.isOnline;
  const incomingOrder = availableOrders[0];

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#000", "#070707", "#000"]} style={StyleSheet.absoluteFill} />
      <Modal visible={!!incomingOrder} transparent animationType="fade">
        <Pressable style={styles.popupBackdrop} onPress={() => incomingOrder && rejectOrder(incomingOrder.id)} />
        {!!incomingOrder && (
          <View style={styles.popupCard}>
            <View style={styles.popupTop}>
              <Text style={styles.popupTitle}>NEW ORDER RECEIVED!</Text>
              <Text style={styles.popupTimer}>00:15</Text>
            </View>
            <View style={styles.popupCustomer}>
              <View style={styles.popupAvatar}><Text style={styles.popupAvatarText}>{incomingOrder.recipientName?.charAt(0) || "C"}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.popupName} numberOfLines={1}>{incomingOrder.recipientName || "Customer"}</Text>
                <Text style={styles.popupPackage} numberOfLines={1}>{incomingOrder.packageType || "Parcel delivery"}</Text>
              </View>
              <Feather name="package" size={28} color="#FF6B00" />
            </View>
            <View style={styles.popupRoute}>
              <PopupPoint label="FROM" value={postcode(incomingOrder.pickupAddress)} />
              <Feather name="arrow-down" size={15} color="#FF6B00" />
              <PopupPoint label="TO" value={postcode(incomingOrder.deliveryAddress)} />
            </View>
            <View style={styles.popupMetrics}>
              <PopupMetric label="Earnings" value={`£${Number(incomingOrder.payout || 0).toFixed(2)}`} />
              <PopupMetric label="Distance" value={incomingOrder.distance || "0 mi"} />
              <PopupMetric label="Secure" value="PIN" />
            </View>
            <TouchableOpacity
              style={styles.popupAccept}
              onPress={async () => {
                await acceptOrder(incomingOrder as any);
                router.push("/delivery-navigation");
              }}
              activeOpacity={0.86}
            >
              <Text style={styles.popupActionText}>ACCEPT ORDER</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.popupReject} onPress={() => rejectOrder(incomingOrder.id)} activeOpacity={0.86}>
              <Text style={styles.popupActionText}>REJECT</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: topPad + 2 }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="menu" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Image source={SD_LOGO} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.roundButton}>
              <Feather name="bell" size={19} color="#FFFFFF" />
              <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roundButton}>
              <Feather name="message-square" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{driver?.name?.charAt(0).toUpperCase() || "S"}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName} numberOfLines={1}>{driver?.name || "Alex Driver"}</Text>
            <Text style={styles.driverId} numberOfLines={1}>{driver?.driverId || "SD-123456"}</Text>
            <Text style={styles.metaText} numberOfLines={1}><Feather name="map-pin" size={11} color="#FF6B00" /> Belfast, BT1 1AA</Text>
            <Text style={styles.metaText} numberOfLines={1}><Feather name="star" size={11} color="#FF6B00" /> Rating 4.9 (127)</Text>
          </View>
          <View style={styles.onlinePanel}>
            <Text style={styles.youAre}>You are</Text>
            <Text style={[styles.onlineText, !online && styles.offlineText]}>{online ? "ONLINE" : "OFFLINE"}</Text>
            <TouchableOpacity style={[styles.toggle, online && styles.toggleOn]} onPress={() => setOnline(!online)} activeOpacity={0.8}>
              <View style={[styles.toggleKnob, online && styles.toggleKnobOn]} />
            </TouchableOpacity>
            <Text style={styles.offlineButton}>{online ? "Go Offline" : "Go Online"}</Text>
          </View>
        </View>

        {!!availableOrders.length && (
          <TouchableOpacity style={styles.incomingCard} onPress={() => router.push("/(tabs)/orders")} activeOpacity={0.86}>
            <View style={styles.incomingIcon}><Feather name="bell" size={18} color="#FF6B00" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.incomingTitle}>New order received</Text>
              <Text style={styles.incomingSub} numberOfLines={1}>Incoming order popup - accept or reject</Text>
            </View>
            <Text style={styles.incomingAction}>View</Text>
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          <StatCard icon="wallet" color="#22C55E" label="Today's Earnings" value={`£${todayEarnings.toFixed(2)}`} sub="+18% vs yesterday" />
          <StatCard icon="package-variant" color="#FF6B00" label="Available Deliveries" value={String(availableOrders.length)} sub="View All" onPress={() => router.push("/(tabs)/orders")} />
          <StatCard icon="truck-delivery-outline" color="#38BDF8" label="My Deliveries (Active)" value={String(activeDeliveries.length)} sub="View All" onPress={() => router.push("/(tabs)/deliveries")} />
          <StatCard icon="clock-outline" color="#A855F7" label="Completed Today" value={String(completedDeliveries.length)} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Deliveries</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/deliveries")} style={styles.viewAllRow}>
            <Text style={styles.viewAll}>View All</Text>
            <Feather name="chevron-right" size={20} color="#FF6B00" />
          </TouchableOpacity>
        </View>

        {(activeDeliveries.length ? activeDeliveries : demoDeliveries).slice(0, 3).map((delivery, index) => (
          <TouchableOpacity key={delivery.id} style={styles.deliveryCard} onPress={() => router.push("/delivery-navigation")} activeOpacity={0.86}>
            <View style={styles.orderNumber}><Text style={styles.orderNumberText}>{index + 1}</Text></View>
            <View style={styles.deliveryIcon}>
              <Feather name={index === 1 ? "shopping-bag" : index === 2 ? "map-pin" : "package"} size={24} color={index === 2 ? "#22C55E" : "#FF6B00"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderId} numberOfLines={1}>{getDriverOrderNumber(delivery)}</Text>
              <Text style={styles.routeText} numberOfLines={1}>{postcode(delivery.pickupAddress)} <Text style={styles.arrow}>→</Text> {postcode(delivery.deliveryAddress)}</Text>
              <Text style={[styles.statusText, index === 2 && { color: "#22C55E" }]}>
                <Feather name="map-pin" size={12} color={index === 2 ? "#22C55E" : "#FF6B00"} /> {index === 0 ? "Pickup Pending" : index === 1 ? "Collected" : "En Route"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 10 }}>
              <Text style={styles.amount}>£{Number(delivery.payout || 15 + index * 3.25).toFixed(2)}</Text>
              <View style={styles.navButton}>
                <Feather name="navigation" size={14} color="#FF6B00" />
                <Text style={styles.navText} numberOfLines={1}>Navigate</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, color, label, value, sub, onPress }: { icon: string; color: string; label: string; value: string; sub?: string; onPress?: () => void }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.statCard} onPress={onPress as any} activeOpacity={0.86}>
      <MaterialCommunityIcons name={icon as any} size={30} color={color} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {!!sub && <Text style={[styles.statSub, { color }]}>{sub}</Text>}
    </Wrapper>
  );
}

function PopupPoint({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.popupPoint}>
      <Text style={styles.popupPointLabel}>{label}</Text>
      <Text style={styles.popupPointValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function PopupMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.popupMetric}>
      <Text style={styles.popupMetricLabel}>{label}</Text>
      <Text style={styles.popupMetricValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function postcode(address?: string) {
  if (!address) return "BT1 1AA";
  const parts = address.split(",");
  return parts[0]?.trim().slice(0, 9).toUpperCase() || address.slice(0, 9).toUpperCase();
}

const demoDeliveries = [
  { id: "demo-1", pickupAddress: "BT1 1AA, Belfast", deliveryAddress: "BT36 5XY, Newtownards", payout: 18.5, packageId: "SD-ORD-12345" },
  { id: "demo-2", pickupAddress: "BT5 4AA, Belfast", deliveryAddress: "BT17 0QQ, Belfast", payout: 22, packageId: "SD-ORD-12346" },
  { id: "demo-3", pickupAddress: "BT9 6AB, Belfast", deliveryAddress: "BT12 7GA, Belfast", payout: 15.75, packageId: "SD-ORD-12347" },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  popupBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.72)" },
  popupCard: { position: "absolute", left: 14, right: 14, top: 72, borderWidth: 1, borderColor: "rgba(255,107,0,0.36)", borderRadius: 12, backgroundColor: "#090909", padding: 12, shadowColor: "#FF6B00", shadowOpacity: 0.35, shadowRadius: 18, elevation: 12 },
  popupTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  popupTitle: { color: "#FF6B00", fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  popupTimer: { color: "#EF4444", fontSize: 14, fontFamily: "Inter_700Bold" },
  popupCustomer: { flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 8, backgroundColor: "#111", padding: 8, marginBottom: 8 },
  popupAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "#FF6B00", backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" },
  popupAvatarText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  popupName: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold" },
  popupPackage: { color: "#A6A6A6", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  popupRoute: { gap: 4, marginBottom: 8 },
  popupPoint: { borderRadius: 7, borderWidth: 1, borderColor: "#1F1F1F", backgroundColor: "#0D0D0D", paddingHorizontal: 8, paddingVertical: 6 },
  popupPointLabel: { color: "#9B9B9B", fontSize: 9, fontFamily: "Inter_700Bold" },
  popupPointValue: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  popupMetrics: { flexDirection: "row", gap: 6, marginBottom: 8 },
  popupMetric: { flex: 1, borderRadius: 7, backgroundColor: "#111", padding: 7, alignItems: "center" },
  popupMetricLabel: { color: "#8E8E8E", fontSize: 9, fontFamily: "Inter_600SemiBold" },
  popupMetricValue: { color: "#FF6B00", fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 2 },
  popupAccept: { height: 38, borderRadius: 7, backgroundColor: "#16A34A", alignItems: "center", justifyContent: "center", marginBottom: 7 },
  popupReject: { height: 38, borderRadius: 7, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" },
  popupActionText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 12, paddingBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 68 },
  logo: { width: 130, height: 66 },
  iconButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: "#1F1F1F", backgroundColor: "#090909", alignItems: "center", justifyContent: "center" },
  headerRight: { flexDirection: "row", gap: 7 },
  roundButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: "#1F1F1F", backgroundColor: "#090909", alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 1, right: 0, width: 17, height: 17, borderRadius: 9, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  profileCard: { flexDirection: "row", borderRadius: 10, borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(14,14,14,0.96)", padding: 10, gap: 10 },
  incomingCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, borderColor: "#2A1B10", backgroundColor: "rgba(255,107,0,0.09)", padding: 9, marginTop: 8 },
  incomingIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#0B0B0B", alignItems: "center", justifyContent: "center" },
  incomingTitle: { color: "#FF6B00", fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  incomingSub: { color: "#D0D0D0", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  incomingAction: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_700Bold" },
  avatarWrap: { width: 74, height: 74 },
  avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: "#FF6B00", backgroundColor: "#1B1B1B", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 24, fontFamily: "Inter_700Bold" },
  onlineDot: { position: "absolute", right: 2, bottom: 9, width: 16, height: 16, borderRadius: 8, backgroundColor: "#22C55E", borderWidth: 2, borderColor: "#111" },
  driverName: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  driverId: { color: "#FF6B00", fontSize: 13, fontFamily: "Inter_600SemiBold", marginVertical: 3 },
  metaText: { color: "#C8C8C8", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  onlinePanel: { alignItems: "flex-end", justifyContent: "center" },
  youAre: { color: "#BDBDBD", fontSize: 11, fontFamily: "Inter_400Regular" },
  onlineText: { color: "#22C55E", fontSize: 14, fontFamily: "Inter_700Bold", marginVertical: 2 },
  offlineText: { color: "#8F8F8F" },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: "#222", padding: 3, justifyContent: "center" },
  toggleOn: { backgroundColor: "#22C55E" },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  toggleKnobOn: { alignSelf: "flex-end" },
  offlineButton: { color: "#C8C8C8", fontSize: 10, marginTop: 5, fontFamily: "Inter_500Medium" },
  statsRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  statCard: { flex: 1, minHeight: 92, borderRadius: 8, borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(14,14,14,0.96)", padding: 7, alignItems: "center", justifyContent: "center" },
  statLabel: { color: "#BEBEBE", fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 5 },
  statValue: { color: "#FFFFFF", fontSize: 19, fontFamily: "Inter_700Bold", marginTop: 5 },
  statSub: { fontSize: 10, fontFamily: "Inter_600SemiBold", marginTop: 4, textAlign: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 7 },
  sectionTitle: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  viewAllRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewAll: { color: "#FF6B00", fontSize: 14, fontFamily: "Inter_700Bold" },
  deliveryCard: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: "#242424", backgroundColor: "rgba(15,15,15,0.96)", padding: 8, marginBottom: 7 },
  orderNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  orderNumberText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  deliveryIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#080808", alignItems: "center", justifyContent: "center" },
  orderId: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
  routeText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  arrow: { color: "#FF6B00" },
  statusText: { color: "#FF6B00", fontSize: 10, fontFamily: "Inter_600SemiBold", marginTop: 3 },
  amount: { color: "#FF8A1D", fontSize: 12, fontFamily: "Inter_700Bold", backgroundColor: "#050505", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, overflow: "hidden" },
  navButton: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#FF6B00", borderRadius: 9, paddingHorizontal: 7, paddingVertical: 6 },
  navText: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  bottomSpacer: { height: 76 },
});
*/
