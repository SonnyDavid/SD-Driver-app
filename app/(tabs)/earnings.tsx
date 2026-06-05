export { EarningsScreen as default } from "@/components/DriverFlowScreens";
/*
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useDelivery } from "@/contexts/DeliveryContext";

export default function EarningsScreen() {
  const { driver } = useAuth();
  const { completedDeliveries, todayEarnings, weeklyEarnings } = useDelivery();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState("TODAY");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const monthEarnings = weeklyEarnings || todayEarnings || 1842.5;
  const balance = weeklyEarnings || 247.5;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#000", "#070707", "#000"]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPad + 4 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Earnings</Text>
          <TouchableOpacity style={styles.bell}><Feather name="bell" size={20} color="#FFFFFF" /><View style={styles.dot} /></TouchableOpacity>
        </View>

        <View style={styles.driverCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{driver?.name?.charAt(0).toUpperCase() || "S"}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.small}>Driver ID</Text>
            <Text style={styles.driverId}>{driver?.driverId || "SD-34567"}</Text>
          </View>
          <Text style={styles.verified}><Feather name="check-circle" size={13} color="#22C55E" /> Verified</Text>
        </View>

        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balance}>£{balance.toFixed(2)}</Text>
            <Text style={styles.small}>Ready to transfer to your bank</Text>
          </View>
          <View style={styles.walletIcon}><Feather name="credit-card" size={34} color="#FF6B00" /></View>
        </View>

        <TouchableOpacity style={styles.transferBtn} onPress={() => router.push("/bank-details")} activeOpacity={0.86}>
          <Feather name="credit-card" size={16} color="#111" />
          <Text style={styles.transferText}>TRANSFER TO BANK</Text>
        </TouchableOpacity>

        <View style={styles.tabs}>
          {["TODAY", "WEEK", "MONTH", "YEAR"].map((item) => (
            <TouchableOpacity key={item} style={[styles.tab, tab === item && styles.tabActive]} onPress={() => setTab(item)}>
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.grid}>
          <MiniCard color="#22C55E" label="Today" value={`£${(todayEarnings || 86.5).toFixed(2)}`} icon="trending-up" />
          <MiniCard color="#3B82F6" label="This Week" value={`£${(weeklyEarnings || 412).toFixed(2)}`} icon="activity" />
          <MiniCard color="#FF6B00" label="This Month" value={`£${monthEarnings.toFixed(2)}`} icon="bar-chart-2" />
          <MiniCard color="#A855F7" label="Completed Deliveries" value={String(completedDeliveries.length || 127)} icon="calendar" />
        </View>

        <View style={styles.targetCard}>
          <View style={styles.targetTop}>
            <Text style={styles.targetText}>Today's Target</Text>
            <Text style={styles.targetValue}>£{(todayEarnings || 86.5).toFixed(2)} / £100</Text>
          </View>
          <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
          <Text style={styles.small}>Great job! Only £13.50 to go!</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Earnings</Text>
          <Text style={styles.viewAll}>View all</Text>
        </View>

        {(completedDeliveries.length ? completedDeliveries.slice(0, 5) : demoRows).map((delivery, index) => (
          <View key={delivery.id} style={styles.historyRow}>
            <Feather name="check-circle" size={20} color="#22C55E" />
            <View style={{ flex: 1 }}>
              <Text style={styles.historyId}>{delivery.orderId || `SD-ORD-${12345 + index}`}</Text>
              <Text style={styles.historySub}>{delivery.route || ["BT7 -> BT12", "BT5 -> BT28", "BT1 -> BT11"][index] || "BT1 -> BT11"}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.historyAmount}>£{Number(delivery.amount || [15.5, 12, 18.5][index] || 10).toFixed(2)}</Text>
              <Text style={styles.historySub}>Today</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#777" />
          </View>
        ))}
        <View style={{ height: 84 }} />
      </ScrollView>
    </View>
  );
}

function MiniCard({ color, label, value, icon }: { color: string; label: string; value: string; icon: string }) {
  return (
    <View style={styles.miniCard}>
      <View style={styles.miniTop}>
        <Text style={[styles.miniLabel, { color }]}>{label}</Text>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <Text style={[styles.miniValue, { color }]}>{value}</Text>
      <View style={[styles.sparkline, { backgroundColor: color }]} />
    </View>
  );
}

const demoRows = [
  { id: "e1", orderId: "SD-ORD-12345", route: "BT7 -> BT12", amount: 15.5 },
  { id: "e2", orderId: "SD-ORD-12346", route: "BT5 -> BT28", amount: 12 },
  { id: "e3", orderId: "SD-ORD-12347", route: "BT1 -> BT11", amount: 18.5 },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { paddingHorizontal: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, minHeight: 36 },
  title: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  bell: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", right: 8, top: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: "#EF4444" },
  driverCard: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 8, padding: 9 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#2A2A2A", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold" },
  small: { color: "#9A9A9A", fontSize: 10, fontFamily: "Inter_400Regular" },
  driverId: { color: "#FF6B00", fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 1 },
  verified: { color: "#22C55E", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  balanceCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 8, padding: 12, marginTop: 8 },
  balanceLabel: { color: "#A0A0A0", fontSize: 12, fontFamily: "Inter_400Regular" },
  balance: { color: "#FFFFFF", fontSize: 24, fontFamily: "Inter_700Bold", marginVertical: 2 },
  walletIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  transferBtn: { height: 44, borderRadius: 6, backgroundColor: "#FF6B00", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  transferText: { color: "#111", fontSize: 12, fontFamily: "Inter_700Bold" },
  tabs: { flexDirection: "row", backgroundColor: "#111", borderRadius: 7, marginTop: 9, padding: 3 },
  tab: { flex: 1, height: 30, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: "#FF6B00" },
  tabText: { color: "#BDBDBD", fontSize: 11, fontFamily: "Inter_700Bold" },
  tabTextActive: { color: "#111" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 },
  miniCard: { width: "49%", minHeight: 78, borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 8, padding: 9 },
  miniTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  miniLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  miniValue: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 6 },
  sparkline: { height: 2, borderRadius: 2, opacity: 0.6, marginTop: 12 },
  targetCard: { borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 8, padding: 10, marginTop: 8 },
  targetTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  targetText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  targetValue: { color: "#22C55E", fontSize: 12, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: "#242424", marginBottom: 6 },
  progressFill: { width: "86%", height: 6, borderRadius: 3, backgroundColor: "#22C55E" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 11, marginBottom: 6 },
  sectionTitle: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  viewAll: { color: "#FF6B00", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 46, borderBottomWidth: 1, borderBottomColor: "#202020", backgroundColor: "rgba(15,15,15,0.96)", paddingHorizontal: 10 },
  historyId: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  historySub: { color: "#9A9A9A", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  historyAmount: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold" },
});
*/
