import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

import {
  myDeliveries,
} from '../data/orders-store';

export default function CompletedDeliveriesScreen() {

  const completedOrders =
    myDeliveries.filter(
      order => order.status === 'delivered'
    );

  return (

    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >

      <Text style={styles.title}>
        COMPLETED DELIVERIES
      </Text>

      <Text style={styles.subtitle}>
        Delivery history
      </Text>

      {completedOrders.map(order => (

        <View
          key={order.id}
          style={styles.card}
        >

          <View style={styles.topRow}>

            <Text style={styles.price}>
              {order.price}
            </Text>

            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>
                COMPLETED
              </Text>
            </View>

          </View>

          <Text style={styles.label}>
            Pickup
          </Text>

          <Text style={styles.name}>
            {order.pickupName || 'Restaurant'}
          </Text>

          <Text style={styles.address}>
            {order.pickupAddress}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>
            Delivered To
          </Text>

          <Text style={styles.name}>
            {order.customerName || 'Customer'}
          </Text>

          <Text style={styles.address}>
            {order.deliveryAddress}
          </Text>

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

  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  subtitle: {
    color: '#94A3B8',
    fontSize: 8,
    marginTop: 2,
    marginBottom: 14,
  },

  card: {
    backgroundColor: '#071A52',
    borderRadius: 18,
    padding: 10,
    marginBottom: 10,
  },

  topRow: {
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

  completedBadge: {
    backgroundColor: '#123524',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  completedText: {
    color: '#4ADE80',
    fontSize: 7,
    fontWeight: '700',
  },

  label: {
    color: '#94A3B8',
    fontSize: 8,
    marginBottom: 1,
  },

  name: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  address: {
    color: '#94A3B8',
    fontSize: 8,
    marginTop: 1,
  },

  divider: {
    width: 3,
    height: 18,
    backgroundColor: '#4ADE80',
    borderRadius: 2,
    marginVertical: 8,
  },

});