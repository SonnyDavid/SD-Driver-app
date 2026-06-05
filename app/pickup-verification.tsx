export { PickupVerificationScreen as default } from "@/components/DriverFlowScreens";
/*
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDelivery } from "@/contexts/DeliveryContext";
import { getDriverOrderNumber } from "@/lib/orderDisplay";

export default function PickupVerificationScreen() {
  const { activeDeliveries, updateDeliveryStatus } = useDelivery();
  const insets = useSafeAreaInsets();
  const [photoUri, setPhotoUri] = useState("");
  const [signatureSaved, setSignatureSaved] = useState(false);
  const order = activeDeliveries[0] || demoOrder;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera access is needed.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  async function confirmPickup() {
    if (activeDeliveries[0]) {
      await updateDeliveryStatus(activeDeliveries[0].id, "package_collected");
    }
    router.replace("/delivery-navigation");
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#000", "#070707", "#000"]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPad + 6 }]} showsVerticalScrollIndicator={false}>
        <Header title="Pickup - Capture & Signature" orderId={getDriverOrderNumber(order)} />

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>STATUS</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>PICKUP - PHOTO & SIGNATURE</Text>
            <View style={styles.greenDot} />
            <Text style={styles.price}>£{Number(order.payout || 15.5).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>COLLECT PARCEL FROM SENDER</Text>
          <Detail icon="user" label="Sender" value={order.packageType || "David Brown"} />
          <Detail icon="map-pin" label="Pickup Address" value={order.pickupAddress || "12 Main Street\nBelfast BT12 XXX"} />
          <Detail icon="map-pin" label="Pickup Postcode" value={postcode(order.pickupAddress, "BT12")} />
          <Detail icon="shield" label="Security" value="Photo and sender signature only" />
        </View>

        <WorkflowStep complete={!!photoUri} number="1" title="Parcel Photo">
          <TouchableOpacity style={styles.photoBox} onPress={takePhoto} activeOpacity={0.86}>
            {photoUri ? (
              <>
                <Image source={{ uri: photoUri }} style={styles.photo} />
                <View style={styles.checkBadge}><Feather name="check" size={18} color="#FFFFFF" /></View>
              </>
            ) : (
              <>
              <Feather name="camera" size={28} color="#FF6B00" />
                <Text style={styles.photoText}>Take parcel photo at pickup</Text>
              </>
            )}
          </TouchableOpacity>
        </WorkflowStep>

        <WorkflowStep complete={signatureSaved} number="2" title="Sender Signature">
          <TouchableOpacity style={styles.signatureBox} onPress={() => setSignatureSaved(true)} activeOpacity={0.86}>
            {signatureSaved ? (
              <>
                <Text style={styles.signatureText}>Signature Captured</Text>
                <Feather name="check-circle" size={28} color="#22C55E" />
              </>
            ) : (
              <>
                <Feather name="edit-3" size={28} color="#9B9B9B" />
                <Text style={styles.photoText}>Tap to capture sender signature</Text>
              </>
            )}
          </TouchableOpacity>
        </WorkflowStep>

        <TouchableOpacity style={styles.primaryButton} onPress={confirmPickup} activeOpacity={0.86}>
          <Text style={styles.primaryText}>CONFIRM PICKUP</Text>
          <Feather name="arrow-right" size={20} color="#111" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Header({ title, orderId }: { title: string; orderId: string }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}><Feather name="chevron-left" size={26} color="#FFFFFF" /></TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.orderId}>Order ID: {orderId}</Text>
      </View>
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

function WorkflowStep({ complete, number, title, children }: { complete: boolean; number: string; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepNumber, complete && styles.stepDone]}>{complete ? <Feather name="check" size={16} color="#FFFFFF" /> : <Text style={styles.stepNumberText}>{number}</Text>}</View>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function postcode(address: string | undefined, fallback: string) {
  return address?.split(",")[0]?.trim().toUpperCase().slice(0, 8) || fallback;
}

const demoOrder = {
  id: "demo",
  pickupAddress: "12 Main Street, Belfast BT12 XXX",
  packageType: "David Brown",
  packageId: "SD-ORD-12345",
  payout: 15.5,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { paddingHorizontal: 14, paddingBottom: 22 },
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
  stepCard: { borderWidth: 1, borderColor: "#202020", backgroundColor: "rgba(15,15,15,0.98)", borderRadius: 7, padding: 10, marginBottom: 8 },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  stepNumber: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center" },
  stepDone: { backgroundColor: "#22C55E" },
  stepNumberText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold" },
  stepTitle: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold" },
  photoBox: { height: 138, borderRadius: 7, backgroundColor: "#111", borderWidth: 1, borderColor: "#282828", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photo: { width: "100%", height: "100%" },
  checkBadge: { position: "absolute", right: 10, top: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center" },
  photoText: { color: "#BDBDBD", fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 7, textAlign: "center" },
  signatureBox: { height: 110, borderRadius: 7, backgroundColor: "#111", borderWidth: 1, borderColor: "#282828", alignItems: "center", justifyContent: "center" },
  signatureText: { color: "#FFFFFF", fontSize: 19, fontFamily: "Inter_400Regular", marginBottom: 6 },
  primaryButton: { height: 48, borderRadius: 8, backgroundColor: "#FF6B00", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: "#111", fontSize: 13, fontFamily: "Inter_700Bold" },
});
*/
