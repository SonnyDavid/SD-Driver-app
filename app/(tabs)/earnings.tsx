import { Feather } from "@expo/vector-icons";
import React from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDelivery } from "@/contexts/DeliveryContext";
import { useColors } from "@/hooks/useColors";

export default function EarningsScreen() {
  const { completedDeliveries, todayEarnings, weeklyEarnings, isLoadingOrders } = useDelivery();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const pending = todayEarnings;
  const completed = weeklyEarnings - todayEarnings;

  function handleTransfer() {
    router.push("/bank-details");
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Earnings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={[styles.summaryCard, { backgroundColor: colors.primary, marginHorizontal: 16, marginTop: 16, borderRadius: 20 }]}>
          <Text style={styles.summaryLabel}>WEEKLY EARNINGS</Text>
          <Text style={styles.summaryAmount}>£{weeklyEarnings.toFixed(2)}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Today</Text>
              <Text style={styles.summaryItemValue}>£{todayEarnings.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Deliveries</Text>
              <Text style={styles.summaryItemValue}>{completedDeliveries.length}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Avg Payout</Text>
              <Text style={styles.summaryItemValue}>
                £{completedDeliveries.length > 0 ? (weeklyEarnings / completedDeliveries.length).toFixed(2) : "0.00"}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 12 }}>
          {[
            { label: "Pending Payout", value: `£${pending.toFixed(2)}`, color: "#FBBF24", icon: "clock" },
            { label: "Completed Payout", value: `£${completed.toFixed(2)}`, color: colors.success, icon: "check-circle" },
          ].map((item) => (
            <View key={item.label} style={[styles.payoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.payoutIcon, { backgroundColor: item.color + "20" }]}>
                <Feather name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={[styles.payoutAmount, { color: colors.foreground }]}>{item.value}</Text>
              <Text style={[styles.payoutLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.transferBtn, { backgroundColor: colors.card, borderColor: colors.primary, marginHorizontal: 16, marginTop: 16 }]}
          onPress={handleTransfer}
          activeOpacity={0.85}
        >
          <Feather name="credit-card" size={20} color={colors.primary} />
          <Text style={[styles.transferText, { color: colors.primary }]}>Transfer to Bank Account</Text>
          <Feather name="arrow-right" size={18} color={colors.primary} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>DELIVERY HISTORY</Text>

        {isLoadingOrders ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : completedDeliveries.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={40} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No deliveries yet</Text>
            <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>Complete your first delivery to see history</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {completedDeliveries.map((delivery) => (
              <View key={delivery.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.historyLeft}>
                  <View style={[styles.historyIcon, { backgroundColor: colors.success + "20" }]}>
                    <Feather name="check" size={16} color={colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyRoute, { color: colors.foreground }]}>{delivery.route}</Text>
                    <Text style={[styles.historyDate, { color: colors.mutedForeground }]}>
                      {delivery.date} · {delivery.distance} · {delivery.durationMinutes}min
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[styles.historyAmount, { color: colors.success }]}>£{delivery.amount.toFixed(2)}</Text>
                  <View style={[styles.historyBadge, { backgroundColor: colors.success + "20" }]}>
                    <Text style={[styles.historyBadgeText, { color: colors.success }]}>Completed</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryCard: { padding: 24, gap: 8 },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)", letterSpacing: 1.2 },
  summaryAmount: { fontSize: 42, fontFamily: "Inter_700Bold", color: "#fff" },
  summaryRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryItemLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  summaryItemValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  summaryDivider: { width: 1, height: 30 },
  payoutCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  payoutIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  payoutAmount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  payoutLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  transferBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 16, borderWidth: 1.5 },
  transferText: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  emptyState: { alignItems: "center", gap: 12, marginTop: 40 },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  emptySubText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  historyCard: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  historyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  historyRoute: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  historyDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  historyAmount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  historyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  historyBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
