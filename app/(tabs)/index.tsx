import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { router } from "expo-router";

import {
  Feather,
  MaterialIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>
              Welcome back
            </Text>

            <Text style={styles.driverName}>
              Sonny Davidkov
            </Text>

            <Text style={styles.driverId}>
              SD-45318
            </Text>
          </View>

          <View style={styles.onlineWrapper}>
            <Text style={styles.onlineLabel}>
              ONLINE
            </Text>

            <View style={styles.onlineToggle}>
              <View style={styles.onlineDot} />
            </View>
          </View>
        </View>

        {/* ACTIVE SESSION */}

        <View style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>
              ACTIVE SESSION
            </Text>

            <View style={styles.modeBadge}>
              <Text style={styles.modeText}>
                COLLECTION MODE
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                6
              </Text>

              <Text style={styles.statLabel}>
                Accepted
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                3/6
              </Text>

              <Text style={styles.statLabel}>
                Collected
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                0/6
              </Text>

              <Text style={styles.statLabel}>
                Delivered
              </Text>
            </View>
          </View>

          <View style={styles.currentStopCard}>
            <Text style={styles.currentStopLabel}>
              CURRENT STOP
            </Text>

            <Text style={styles.currentStopName}>
              Pizza Palace
            </Text>

            <Text style={styles.currentStopAddress}>
              24 Oxford Street, London
            </Text>
          </View>

          <TouchableOpacity
            style={styles.resumeButton}
            onPress={() =>
              router.push("/my-deliveries")
            }
          >
            <Feather
              name="play"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.resumeButtonText}>
              Resume Collection Route
            </Text>
          </TouchableOpacity>
        </View>

        {/* QUICK ACTIONS */}

        <Text style={styles.sectionTitle}>
          QUICK ACTIONS
        </Text>

        <View style={styles.grid}>
          {/* AVAILABLE ORDERS */}

          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push("/(tabs)/orders")
            }
          >
            <Feather
              name="package"
              size={26}
              color="#FF7A1A"
            />

            <Text style={styles.cardTitle}>
              Available Orders
            </Text>
          </TouchableOpacity>

          {/* VIEW ON MAP */}

          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push("/orders-map")
            }
          >
            <Feather
              name="map-pin"
              size={26}
              color="#8B5CF6"
            />

            <Text style={styles.cardTitle}>
              View On Map
            </Text>
          </TouchableOpacity>

          {/* MY DELIVERIES */}

          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push("/my-deliveries")
            }
          >
            <MaterialIcons
              name="delivery-dining"
              size={28}
              color="#22C55E"
            />

            <Text style={styles.cardTitle}>
              My Deliveries
            </Text>
          </TouchableOpacity>

          {/* WALLET */}

          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push("/(tabs)/earnings")
            }
          >
            <Ionicons
              name="wallet-outline"
              size={26}
              color="#38BDF8"
            />

            <Text style={styles.cardTitle}>
              Wallet
            </Text>
          </TouchableOpacity>
        </View>

        {/* TODAY STATS */}

        <Text style={styles.sectionTitle}>
          TODAY STATS
        </Text>

        <View style={styles.grid}>
          {/* EARNINGS */}

          <View style={styles.card}>
            <FontAwesome5
              name="pound-sign"
              size={20}
              color="#22C55E"
            />

            <Text style={styles.statsValue}>
              £186
            </Text>

            <Text style={styles.statsLabel}>
              Earnings
            </Text>
          </View>

          {/* COMPLETED */}

          <View style={styles.card}>
            <Feather
              name="check-circle"
              size={22}
              color="#FF7A1A"
            />

            <Text style={styles.statsValue}>
              18
            </Text>

            <Text style={styles.statsLabel}>
              Completed
            </Text>
          </View>

          {/* DISTANCE */}

          <View style={styles.card}>
            <Feather
              name="navigation"
              size={22}
              color="#8B5CF6"
            />

            <Text style={styles.statsValue}>
              74mi
            </Text>

            <Text style={styles.statsLabel}>
              Distance
            </Text>
          </View>

          {/* SUPPORT */}

          <TouchableOpacity style={styles.card}>
            <Feather
              name="headphones"
              size={22}
              color="#38BDF8"
            />

            <Text style={styles.statsValue}>
              24/7
            </Text>

            <Text style={styles.statsLabel}>
              Support
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071120",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },

  welcome: {
    color: "#94A3B8",
    fontSize: 15,
  },

  driverName: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    marginTop: 4,
  },

  driverId: {
    color: "#FF7A1A",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 6,
  },

  onlineWrapper: {
    alignItems: "center",
  },

  onlineLabel: {
    color: "#22C55E",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  onlineToggle: {
    width: 70,
    height: 38,
    borderRadius: 30,
    backgroundColor: "#22C55E40",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  onlineDot: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: "#22C55E",
    alignSelf: "flex-end",
  },

  sessionCard: {
    backgroundColor: "#101827",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 28,
  },

  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },

  sessionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
  },

  modeBadge: {
    backgroundColor: "#FF7A1A20",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },

  modeText: {
    color: "#FF7A1A",
    fontSize: 11,
    fontWeight: "700",
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  statBox: {
    alignItems: "center",
    flex: 1,
  },

  statValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },

  statLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },

  currentStopCard: {
    backgroundColor: "#071120",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },

  currentStopLabel: {
    color: "#94A3B8",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
  },

  currentStopName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },

  currentStopAddress: {
    color: "#94A3B8",
    fontSize: 14,
  },

  resumeButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FF7A1A",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  resumeButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 10,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 18,
    letterSpacing: 1,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  card: {
    width: "48%",
    backgroundColor: "#101827",
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 16,
  },

  statsValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 4,
  },

  statsLabel: {
    color: "#94A3B8",
    fontSize: 13,
  },

  bottomSpacing: {
    height: 120,
  },
});