import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import SignatureScreen from 'react-native-signature-canvas';

import { router } from 'expo-router';

import {
  myDeliveries,
} from '../data/orders-store';

export default function PickupVerificationScreen() {

  const order = myDeliveries[0];

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        PICKUP VERIFICATION
      </Text>

      <View style={styles.card}>

        <Text style={styles.label}>
          Sender
        </Text>

        <Text style={styles.name}>
          {order.pickupName || 'Restaurant'}
        </Text>

        <Text style={styles.address}>
          {order.pickupAddress}
        </Text>

        <Text style={styles.sectionTitle}>
          Parcel Photo
        </Text>

        <View style={styles.photoBox}>

          <Text style={styles.placeholder}>
            Camera Preview
          </Text>

        </View>

        <Text style={styles.sectionTitle}>
          Sender Signature
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
          style={styles.continueBtn}
          onPress={() =>
            router.push(
              '/delivery-navigation'
            )
          }
        >

          <Text style={styles.continueBtnText}>
            Continue To Delivery
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
    color: '#94A3B8',
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

  photoBox: {
    height: 110,
    backgroundColor: '#020617',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  placeholder: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
  },

  signatureContainer: {
    height: 130,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },

  continueBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },

  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

});