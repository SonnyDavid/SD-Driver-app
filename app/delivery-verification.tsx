export { CustomerPinScreen as default } from "@/components/DriverFlowScreens";
/*
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDelivery } from "@/contexts/DeliveryContext";

export default function DeliveryVerificationScreen() {
  const { activeDeliveries, completeDelivery } = useDelivery();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [photoUri, setPhotoUri] = useState("");
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const order = activeDeliveries[0] || demoOrder;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function verifyPin() {
    if (!pin.trim() || pin.length < 4) {
      Alert.alert("Invalid PIN", "Enter the PIN provided by the recipient.");
      return;
    }
    if (activeDeliveries[0]?.pin && String(activeDeliveries[0].pin).trim() !== pin.trim()) {
      Alert.alert("Incorrect PIN", "Please ask the recipient for the correct PIN.");
      setPin("");
      return;
    }
    setPinVerified(true);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera access is needed.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  async function finishDelivery() {
    if (!pinVerified || !signatureSaved || !photoUri) {
      Alert.alert("Incomplete delivery", "Verify PIN, capture signature, and take a delivery photo first.");
      return;
    }
    if (activeDeliveries[0]) {
      setLoading(true);
      await completeDelivery(activeDeliveries[0]);
      setLoading(false);
    }
    setComplete(true);
  }

  if (complete) {
    return (
      <View style={[styles.container, { paddingTop: topPad + 20 }]}>
        <LinearGradient colors={["#000", "#070707", "#000"]} style={StyleSheet.absoluteFill} />
        <View style={styles.completeContent}>
          <View style={styles.bigCheck}><Feather name="check" size={58} color="#FFFFFF" /></View>
          <Text style={styles.completeTitle}>Delivery Completed!</Text>
          <Text style={styles.completeSub}>Great job. You have completed the delivery.</Text>
          <View style={styles.completeCard}>
            <CompleteRow label="Pickup Postcode" value={postcode(order.pickupAddress, "BT7")} />
            <CompleteRow label="Dropoff Postcode" value={postcode(order.deliveryAddress, "BT12")} />
            <CompleteRow label="Earnings" value={`£${Number(order.payout || 15.5).toFixed(2)}`} />
            <CompleteRow label="Completed At" value={new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
            <CompleteRow label="PIN Verified" value="OK" green />
            <CompleteRow label="Customer Signature" value="OK" green />
            <CompleteRow label="Delivery Photo" value="OK" green />
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace("/(tabs)/deliveries")}>
            <Text style={styles.primaryText}>BACK TO MY DELIVERIES</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#000", "#070707", "#000"]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPad + 6 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="chevron-left" size={26} color="#FFFFFF" /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Delivery in Progress</Text>
            <Text style={styles.orderId}>Order ID: {order.packageId || "SD-ORD-12345"}</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>STATUS</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>ARRIVED AT DELIVERY</Text>
            <View style={styles.greenDot} />
            <Text style={styles.price}>£{Number(order.payout || 15.5).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>DELIVERY DETAILS</Text>
          <Detail icon="user" label="Customer" value={order.recipientName || "David Brown"} />
          <Detail icon="map-pin" label="Delivery Address" value={order.deliveryAddress || "12 Main Street\nBelfast BT12 XXX"} />
          <Detail icon="map-pin" label="Delivery Postcode" value={postcode(order.deliveryAddress, "BT12")} />
        </View>

        <View style={[styles.pinCard, pinVerified && styles.successCard]}>
          <View style={styles.stepHeader}>
            <Feather name={pinVerified ? "check-circle" : "lock"} size={22} color={pinVerified ? "#22C55E" : "#FF6B00"} />
            <Text style={styles.stepTitle}>{pinVerified ? "PIN VERIFIED" : "CUSTOMER PIN ENTRY"}</Text>
          </View>
          {pinVerified ? (
            <Text style={styles.successText}>The PIN is correct.</Text>
          ) : (
            <>
              <Text style={styles.pinHelp}>Only the recipient knows the PIN. Ask the customer and enter it below.</Text>
              <TextInput value={pin} onChangeText={setPin} style={styles.pinInput} keyboardType="number-pad" maxLength={6} placeholder="Enter Customer PIN" placeholderTextColor="#777" />
              <TouchableOpacity style={styles.primaryButton} onPress={verifyPin}><Text style={styles.primaryText}>VERIFY PIN</Text></TouchableOpacity>
            </>
          )}
        </View>

        {pinVerified && (
          <>
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Feather name={signatureSaved ? "check-circle" : "edit-3"} size={22} color={signatureSaved ? "#22C55E" : "#FF6B00"} />
                <Text style={styles.stepTitle}>CUSTOMER SIGNATURE & PHOTO</Text>
              </View>
              <TouchableOpacity style={styles.signatureBox} onPress={() => setSignatureSaved(true)} activeOpacity={0.86}>
                {signatureSaved ? <Text style={styles.signatureText}>David Brown</Text> : <Text style={styles.photoText}>Tap to sign</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Feather name={photoUri ? "check-circle" : "camera"} size={22} color={photoUri ? "#22C55E" : "#FF6B00"} />
                <Text style={styles.stepTitle}>DELIVERY PHOTO</Text>
              </View>
              <TouchableOpacity style={styles.photoBox} onPress={takePhoto} activeOpacity={0.86}>
                {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : <Text style={styles.photoText}>Take a clear photo at point of delivery.</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.primaryButton, loading && { opacity: 0.6 }]} onPress={finishDelivery} disabled={loading} activeOpacity={0.86}>
              <Text style={styles.primaryText}>{loading ? "COMPLETING..." : "COMPLETE DELIVERY"}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Detail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Feather name={icon as any} size={18} color="#FF6B00" />
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function CompleteRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <View style={styles.completeRow}>
      <Text style={styles.completeLabel}>{label}</Text>
      <Text style={[styles.completeValue, green && { color: "#22C55E" }]}>{value}</Text>
    </View>
  );
}

function postcode(address: string | undefined, fallback: string) {
  return address?.split(",")[0]?.trim().toUpperCase().slice(0, 8) || fallback;
}

const demoOrder = {
  id: "demo",
  pickupAddress: "BT7 1JQ, Belfast",
  deliveryAddress: "BT12 6AN, Belfast",
  recipientName: "David Brown",
  packageId: "SD-ORD-12345",
  payout: 15.5,
  pin: "1234",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { paddingHorizontal: 14, paddingBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  title: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  orderId: { color: "#FF6B00", fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  statusCard: { borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 7, padding: 10, marginBottom: 8 },
  statusLabel: { color: "#9B9B9B", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 5 },
  statusText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  price: { color: "#FF6B00", fontSize: 14, fontFamily: "Inter_700Bold" },
  detailsCard: { borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 7, padding: 10, marginBottom: 8 },
  cardTitle: { color: "#FF6B00", fontSize: 11, fontFamily: "Inter_700Bold", marginBottom: 8 },
  detailRow: { flexDirection: "row", gap: 9, marginBottom: 8 },
  detailLabel: { color: "#9B9B9B", fontSize: 10, fontFamily: "Inter_500Medium" },
  detailValue: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1, lineHeight: 17 },
  pinCard: { borderWidth: 1, borderColor: "rgba(255,107,0,0.28)", backgroundColor: "rgba(255,107,0,0.08)", borderRadius: 7, padding: 10, marginBottom: 8 },
  successCard: { borderColor: "rgba(34,197,94,0.35)", backgroundColor: "rgba(34,197,94,0.1)" },
  stepCard: { borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 7, padding: 10, marginBottom: 8 },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  stepTitle: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold" },
  pinHelp: { color: "#BDBDBD", fontSize: 11, lineHeight: 16, marginBottom: 8 },
  pinInput: { height: 42, borderWidth: 1, borderColor: "#333", borderRadius: 7, backgroundColor: "#080808", color: "#FFFFFF", textAlign: "center", fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 4, marginBottom: 8 },
  successText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_500Medium" },
  signatureBox: { height: 104, borderRadius: 7, borderWidth: 1, borderColor: "#282828", backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center" },
  signatureText: { color: "#FFFFFF", fontSize: 24, fontFamily: "Inter_400Regular" },
  photoBox: { height: 132, borderRadius: 7, borderWidth: 1, borderColor: "#282828", backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photo: { width: "100%", height: "100%" },
  photoText: { color: "#BDBDBD", fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  primaryButton: { height: 46, borderRadius: 8, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center", marginTop: 3 },
  primaryText: { color: "#111", fontSize: 12, fontFamily: "Inter_700Bold" },
  completeContent: { flex: 1, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", gap: 14 },
  bigCheck: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center", shadowColor: "#22C55E", shadowOpacity: 0.75, shadowRadius: 22 },
  completeTitle: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  completeSub: { color: "#A7A7A7", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  completeCard: { width: "100%", borderRadius: 7, borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", padding: 10 },
  completeRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  completeLabel: { color: "#A7A7A7", fontSize: 12, fontFamily: "Inter_500Medium" },
  completeValue: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_700Bold" },
});
*/
