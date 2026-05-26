import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';

import { router } from 'expo-router';

import {
  myDeliveries,
} from '../data/orders-store';

export default function DeliveryNavigationScreen() {

  const order = myDeliveries[0];

  const openMaps = () => {

    Linking.openURL(
      `http://maps.apple.com/?daddr=${order.deliveryAddress}`
    );
  };

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        DELIVERY NAVIGATION
      </Text>

      <View style={styles.card}>

        <Text style={styles.label}>
          Deliver To
        </Text>

        <Text style={styles.customerName}>
          {order.customerName || 'Customer'}
        </Text>

        <Text style={styles.address}>
          {order.deliveryAddress}
        </Text>

        <View style={styles.routeBox}>

          <Text style={styles.routeTitle}>
            NEXT DELIVERY STOP
          </Text>

          <Text style={styles.routeSubtitle}>
            Open Apple Maps navigation
          </Text>

        </View>

        <TouchableOpacity
          style={styles.mapBtn}
          onPress={openMaps}
        >

          <Text style={styles.mapBtnText}>
            Open Apple Maps
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          style={styles.arrivedBtn}
          onPress={() =>
            router.push(
              '/delivery-verification'
            )
          }
        >

          <Text style={styles.arrivedBtnText}>
            Arrived
          </Text>

        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#020817',
    paddingTop: 54,
    paddingHorizontal: 10,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },

  card: {
    backgroundColor: '#071A52',
    borderRadius: 18,
    padding: 10,
  },

  label: {
    color: '#A78BFA',
    fontSize: 8,
    marginBottom: 2,
  },

  customerName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  address: {
    color: '#94A3B8',
    fontSize: 8,
    marginTop: 1,
    marginBottom: 12,
  },

  routeBox: {
    backgroundColor: '#020617',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
    marginBottom: 12,
  },

  routeTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },

  routeSubtitle: {
    color: '#64748B',
    fontSize: 8,
  },

  mapBtn: {
    backgroundColor: '#020617',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },

  mapBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  arrivedBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },

  arrivedBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

});