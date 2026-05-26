import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';

import {
  availableOrders,
  myDeliveries,
} from '../../data/orders-store';

export default function OrdersScreen() {

  const [orders, setOrders] =
    useState(availableOrders);

  const acceptOrder = (order: any) => {

    const updatedOrders =
      orders.filter(
        item => item.id !== order.id
      );

    setOrders(updatedOrders);

    myDeliveries.push({
      ...order,
      status: 'pickup_pending',
    });
  };

  const openMaps = async (
    pickup: string,
    delivery: string
  ) => {

    const url =
      `http://maps.apple.com/?saddr=${encodeURIComponent(
        pickup
      )}&daddr=${encodeURIComponent(delivery)}`;

    await Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>
        Available Orders
      </Text>

      {orders.map(order => (

        <View
          key={order.id}
          style={styles.orderCard}
        >

          <Text style={styles.price}>
            {order.price}
          </Text>

          <Text style={styles.label}>
            Pickup
          </Text>

          <Text style={styles.locationName}>
            {order.pickup}
          </Text>

          <Text style={styles.locationAddress}>
            {order.pickupAddress}
          </Text>

          <View style={styles.line} />

          <Text style={styles.label}>
            Delivery
          </Text>

          <Text style={styles.customerName}>
            {order.customer}
          </Text>

          <Text style={styles.deliveryAddress}>
            {order.deliveryAddress}
          </Text>

          <View style={styles.buttonRow}>

            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() =>
                openMaps(
                  order.pickupAddress,
                  order.deliveryAddress
                )
              }
            >
              <Text style={styles.mapBtnText}>
                Open in Maps
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => acceptOrder(order)}
            >
              <Text style={styles.acceptBtnText}>
                Accept
              </Text>
            </TouchableOpacity>

          </View>

        </View>

      ))}

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#020817',
    paddingTop: 42,
    paddingHorizontal: 10,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },

  orderCard: {
    backgroundColor: '#061235',
    borderRadius: 18,
    padding: 10,
    marginBottom: 8,
  },

  price: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },

  label: {
    color: '#94A3B8',
    fontSize: 10,
    marginBottom: 2,
  },

  locationName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  locationAddress: {
    color: '#7F8DA3',
    fontSize: 11,
    marginBottom: 6,
  },

  line: {
    width: 2,
    height: 20,
    backgroundColor: '#FF7A1A',
    borderRadius: 10,
    marginVertical: 6,
    marginLeft: 2,
  },

  customerName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  deliveryAddress: {
    color: '#7F8DA3',
    fontSize: 11,
    marginBottom: 8,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },

  mapBtn: {
    flex: 1,
    backgroundColor: '#010B1F',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },

  mapBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  acceptBtn: {
    flex: 1,
    backgroundColor: '#FF7A1A',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },

  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

});