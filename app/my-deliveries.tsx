import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';

import { router } from 'expo-router';

import {
  myDeliveries,
} from '../data/orders-store';

export default function MyDeliveriesScreen() {

  return (

    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >

      <View style={styles.header}>

        <View>
          <Text style={styles.title}>
            My Deliveries
          </Text>

          <Text style={styles.subtitle}>
            Active delivery session
          </Text>
        </View>

        <View style={styles.activeBadge}>

          <View style={styles.activeDot} />

          <Text style={styles.activeText}>
            ACTIVE
          </Text>

        </View>

      </View>

      <View style={styles.sessionCard}>

        <View style={styles.sessionTop}>

          <Text style={styles.sessionTitle}>
            DELIVERY SESSION
          </Text>

          <View style={styles.modeBadge}>
            <Text style={styles.modeText}>
              COLLECTION MODE
            </Text>
          </View>

        </View>

        <View style={styles.statsRow}>

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {myDeliveries.length}
            </Text>

            <Text style={styles.statLabel}>
              Accepted
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              0
            </Text>

            <Text style={styles.statLabel}>
              Collected
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              0
            </Text>

            <Text style={styles.statLabel}>
              Delivered
            </Text>
          </View>

        </View>

      </View>

      <Text style={styles.sectionTitle}>
        PICKUP PENDING
      </Text>

      {myDeliveries.map((order) => (

        <View
          key={order.id}
          style={styles.orderCard}
        >

          <View style={styles.priceRow}>

            <Text style={styles.price}>
              {order.price}
            </Text>

            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>
                Pending Pickup
              </Text>
            </View>

          </View>

          <Text style={styles.label}>
            Pickup
          </Text>

          <Text style={styles.locationName}>
            {order.pickupName || 'Restaurant'}
          </Text>

          <Text style={styles.locationAddress}>
            {order.pickupAddress}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>
            Delivery
          </Text>

          <Text style={styles.customerName}>
            {order.customerName || 'Customer'}
          </Text>

          <Text style={styles.customerAddress}>
            {order.deliveryAddress}
          </Text>

          <View style={styles.buttonsRow}>

            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => {
                Linking.openURL(
                  `http://maps.apple.com/?daddr=${order.pickupAddress}`
                );
              }}
            >
              <Text style={styles.mapBtnText}>
                Navigate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickupBtn}
              onPress={() =>
                router.push('/pickup-verification')
              }
            >
              <Text style={styles.pickupBtnText}>
                Pickup
              </Text>
            </TouchableOpacity>

          </View>

        </View>

      ))}

      <View style={{ height: 40 }} />

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#020817',
    paddingTop: 54,
    paddingHorizontal: 10,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  subtitle: {
    color: '#94A3B8',
    fontSize: 8,
    marginTop: 1,
  },

  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1530',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },

  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 5,
  },

  activeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },

  sessionCard: {
    backgroundColor: '#071A52',
    borderRadius: 18,
    padding: 10,
    marginBottom: 14,
  },

  sessionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  sessionTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  modeBadge: {
    backgroundColor: '#6B3410',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  modeText: {
    color: '#FB923C',
    fontSize: 7,
    fontWeight: '700',
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  statBox: {
    alignItems: 'center',
    flex: 1,
  },

  statNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  statLabel: {
    color: '#94A3B8',
    fontSize: 8,
    marginTop: 2,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },

  orderCard: {
    backgroundColor: '#071A52',
    borderRadius: 18,
    padding: 10,
    marginBottom: 10,
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  price: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  pendingBadge: {
    backgroundColor: '#6B3410',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  pendingText: {
    color: '#FB923C',
    fontSize: 7,
    fontWeight: '700',
  },

  label: {
    color: '#94A3B8',
    fontSize: 8,
    marginBottom: 1,
  },

  locationName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  locationAddress: {
    color: '#94A3B8',
    fontSize: 8,
    marginTop: 1,
  },

  divider: {
    width: 3,
    height: 18,
    backgroundColor: '#F97316',
    borderRadius: 2,
    marginVertical: 8,
  },

  customerName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  customerAddress: {
    color: '#94A3B8',
    fontSize: 8,
    marginTop: 1,
  },

  buttonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },

  mapBtn: {
    flex: 1,
    backgroundColor: '#020617',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },

  mapBtnText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

  pickupBtn: {
    flex: 1,
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },

  pickupBtnText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

});