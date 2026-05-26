import React, { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';

import SignatureScreen from 'react-native-signature-canvas';

import { router } from 'expo-router';

import {
  myDeliveries,
} from '../data/orders-store';

export default function DeliveryVerificationScreen() {

  const order = myDeliveries[0];

  const [pin, setPin] =
    useState('');

  const completeDelivery = () => {

    if (pin.length < 6) {

      Alert.alert(
        'Invalid PIN',
        'Enter valid 6-digit PIN'
      );

      return;
    }

    order.status = 'delivered';

    Alert.alert(
      'Delivery Complete',
      'Parcel delivered successfully'
    );

    router.push(
      '/completed-deliveries'
    );
  };

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        DELIVERY VERIFICATION
      </Text>

      <View style={styles.card}>

        <Text style={styles.label}>
          Recipient
        </Text>

        <Text style={styles.name}>
          {order.customerName || 'Customer'}
        </Text>

        <Text style={styles.address}>
          {order.deliveryAddress}
        </Text>

        <Text style={styles.sectionTitle}>
          Recipient Name
        </Text>

        <TextInput
          placeholder="Recipient Name"
          placeholderTextColor="#64748B"
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>
          6-Digit PIN
        </Text>

        <TextInput
          value={pin}
          onChangeText={setPin}
          placeholder="482719"
          placeholderTextColor="#64748B"
          keyboardType="number-pad"
          maxLength={6}
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>
          Recipient Signature
        </Text>

        <View style={styles.signatureContainer}>

          <SignatureScreen
            onOK={(signature) =>
              console.log(signature)
            }
            descriptionText=""
            clearText="Clear"
            confirmText="Save"
            webStyle={`
              .m-signature-pad {
                box-shadow: none;
                border: none;
              }

              .m-signature-pad--footer {
                display: none;
              }

              body,html {
                background: #020617;
              }
            `}
          />

        </View>

        <TouchableOpacity
          style={styles.completeBtn}
          onPress={completeDelivery}
        >

          <Text style={styles.completeBtnText}>
            Complete Delivery
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
    marginBottom: 10,
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

  name: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  address: {
    color: '#94A3B8',
    fontSize: 8,
    marginTop: 1,
    marginBottom: 10,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 6,
  },

  input: {
    backgroundColor: '#020617',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },

  signatureContainer: {
    height: 130,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },

  completeBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },

  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

});