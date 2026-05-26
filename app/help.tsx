import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';

export default function MyDeliveriesScreen() {
  const openMaps = (address: string) => {
    const url = `http://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Deliveries</Text>
          <Text style={styles.subtitle}>
            Active delivery session
          </Text>
        </View>

        <View style={styles.activeBadge}>
          <Text style={styles.activeText}>● ACTIVE</Text>
        </View>
      </View>

      <View style={styles.sessionCard}>
        <View style={styles.sessionTop}>
          <Text style={styles.sessionTitle}>
            DELIVERY SESSION
          </Text>

          <View style={styles.collectionBadge}>
            <Text style={styles.collectionBadgeText}>
              COLLECTION MODE
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.sessionNumber}>6</Text>
            <Text style={styles.sessionLabel}>
              Accepted
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.sessionNumber}>3</Text>
            <Text style={styles.sessionLabel}>
              Collected
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.sessionNumber}>0</Text>
            <Text style={styles.sessionLabel}>
              Delivered
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.collectBtn}>
          <Text style={styles.collectBtnText}>
            Start Collecting
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        PICKUP PENDING
      </Text>

      <View style={styles.deliveryCard}>
        <View style={styles.deliveryTop}>
          <Text style={styles.deliveryPrice}>
            £8.40
          </Text>

          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>
              Pending Pickup
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.iconCircle}>
            <Text style={{ color: '#f97316' }}>⬡</Text>
          </View>

          <View style={styles.info}>
            <Text style={styles.deliveryLabel}>
              Pickup
            </Text>

            <Text style={styles.deliveryName}>
              Pizza Palace
            </Text>

            <Text style={styles.deliveryAddress}>
              Oxford Street, London
            </Text>
          </View>
        </View>

        <View style={styles.line} />

        <View style={styles.row}>
          <View style={styles.iconCircle}>
            <Text style={{ color: '#8b5cf6' }}>◉</Text>
          </View>

          <View style={styles.info}>
            <Text style={styles.deliveryLabel}>
              Delivery
            </Text>

            <Text style={styles.deliveryName}>
              John Smith
            </Text>

            <Text style={styles.deliveryAddress}>
              Baker Street, London
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.openDetailsBtn}>
          <Text style={styles.openDetailsText}>
            Open Details
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navigateBtn}
          onPress={() =>
            openMaps('Baker Street, London')
          }
        >
          <Text style={styles.navigateText}>
            Navigate
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020817',
    paddingTop: 44,
    paddingHorizontal: 12,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },

  activeBadge: {
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  activeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  sessionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },

  sessionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sessionTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },

  collectionBadge: {
    backgroundColor: '#78350f',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },

  collectionBadgeText: {
    color: '#fb923c',
    fontSize: 11,
    fontWeight: 'bold',
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
  },

  statBox: {
    alignItems: 'center',
  },

  sessionNumber: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
  },

  sessionLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },

  collectBtn: {
    backgroundColor: '#f97316',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },

  collectBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },

  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  deliveryCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  deliveryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  deliveryPrice: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },

  pendingBadge: {
    backgroundColor: '#78350f',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },

  pendingBadgeText: {
    color: '#fb923c',
    fontSize: 11,
    fontWeight: 'bold',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e1b2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  info: {
    flex: 1,
  },

  deliveryLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },

  deliveryName: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },

  deliveryAddress: {
    color: '#94a3b8',
    fontSize: 12,
  },

  line: {
    width: 2,
    height: 18,
    backgroundColor: '#f97316',
    marginVertical: 8,
    marginLeft: 17,
  },

  openDetailsBtn: {
    backgroundColor: '#020617',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },

  openDetailsText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },

  navigateBtn: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },

  navigateText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});







styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020817',
    paddingTop: 44,
    paddingHorizontal: 12,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
  },

  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },

  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    marginRight: 10,
  },

  activeText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },

  sessionCard: {
    backgroundColor: '#071339',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },

  sessionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sessionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },

  modeBadge: {
    backgroundColor: '#5B341B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },

  modeText: {
    color: '#FF7A1A',
    fontWeight: '700',
    fontSize: 12,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 14,
  },

  statBox: {
    alignItems: 'center',
    flex: 1,
  },

  statNumber: {
    color: 'white',
    fontSize: 42,
    fontWeight: '800',
  },

  statLabel: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
  },

  startBtn: {
    backgroundColor: '#FF7A1A',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },

  startBtnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 18,
  },

  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },

  orderCard: {
    backgroundColor: '#071339',
    borderRadius: 26,
    padding: 22,
    marginBottom: 40,
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  price: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
  },

  pendingBadge: {
    backgroundColor: '#5B341B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },

  pendingText: {
    color: '#FF7A1A',
    fontWeight: '700',
    fontSize: 11,
  },

  label: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
  },

  locationName: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },

  customerName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },

  address: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 4,
  },

  line: {
    width: 2,
    height: 18,
    backgroundColor: '#FF7A1A',
    borderRadius: 20,
    marginVertical: 8,
    marginLeft: 17,
  },

  detailsBtn: {
    backgroundColor: '#020617',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },

  detailsBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },

  navigateBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },

  navigateText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 14,
  },
});