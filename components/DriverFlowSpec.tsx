import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { flow } from "@/components/DriverFlowUI";

const REFERENCE = require("@/assets/images/driver-flow-reference.png");

/** Reference poster dimensions (px) */
const POSTER = { width: 1024, height: 682 };
/** Crop region for the 14 phone mockups inside the poster */
const PHONES = { top: 72, height: 350, cols: 7, rows: 2 };

/** Compact phone width – matches reference poster density */
const PHONE_WIDTH = Platform.OS === "web" ? 68 : 52;
const PHONE_RATIO = 9 / 19.5;

const SCREENS = [
  { n: 1, col: 0, row: 0 },
  { n: 2, col: 1, row: 0 },
  { n: 3, col: 2, row: 0 },
  { n: 4, col: 3, row: 0 },
  { n: 5, col: 4, row: 0 },
  { n: 6, col: 5, row: 0 },
  { n: 7, col: 6, row: 0 },
  { n: 8, col: 0, row: 1 },
  { n: 9, col: 1, row: 1 },
  { n: 10, col: 2, row: 1 },
  { n: 11, col: 3, row: 1 },
  { n: 12, col: 4, row: 1 },
  { n: 13, col: 5, row: 1 },
  { n: 14, col: 6, row: 1 },
];

const PANELS = [
  {
    title: "REGISTRATION INCLUDES",
    items: [
      "Names (First & Last)",
      "Date of Birth",
      "Phone Number",
      "Email Address",
      "Vehicle Registration Number",
      "Vehicle Photo (Car/Motorbike)",
      "Driver Selfie Verification",
    ],
  },
  {
    title: "KEY FEATURES",
    items: [
      "Multi-Order System",
      "Real-time Incoming Orders",
      "Live Navigation",
      "Sender Info + Parcel Photo + Signature (Pickup)",
      "Receiver Info + Signature (Delivery)",
      "6 Digit PIN Verification",
      "Live Status Updates",
    ],
  },
  {
    title: "SECURITY FEATURES",
    items: [
      "Selfie Verification",
      "PIN Delivery Verification",
      "Secure Signatures",
      "Real-time Tracking",
      "Encrypted Data",
    ],
  },
  {
    title: "NOTIFICATION EVENTS",
    items: [
      "New Order (Blue)",
      "Order Accepted (Cyan)",
      "Pickup Confirmed (Orange)",
      "En Route (Purple)",
      "PIN Verified (Green)",
      "Delivery Completed (Green)",
      "Order Cancelled (Red)",
    ],
  },
  {
    title: "STATUS COLORS",
    items: [
      "Active / En Route (Cyan)",
      "Pending (Orange)",
      "Completed (Green)",
      "Failed (Red)",
      "Drop-off (Purple)",
    ],
  },
  {
    title: "APP STRUCTURE OVERVIEW",
    items: [
      "1. Login / Register",
      "2. Registration Flow",
      "3. Home Dashboard",
      "4. Incoming Orders",
      "5. My Deliveries",
      "6. Delivery Details",
      "7. Pickup Confirmation",
      "8. Active Navigation",
      "9. PIN Verification",
      "10. Completion",
      "11. Earnings",
      "12. Profile / Menu",
    ],
  },
];

function PhoneFrame({ number, col, row }: { number: number; col: number; row: number }) {
  const frameHeight = PHONE_WIDTH / PHONE_RATIO;
  const cellWidth = POSTER.width / PHONES.cols;
  const cellHeight = PHONES.height / PHONES.rows;
  const scale = PHONE_WIDTH / cellWidth;

  return (
    <View style={styles.phoneWrap}>
      <View style={[styles.phoneFrame, { width: PHONE_WIDTH, height: frameHeight }]}>
        <View style={[styles.phoneViewport, { width: PHONE_WIDTH, height: frameHeight - 4 }]}>
          <Image
            source={REFERENCE}
            style={{
              position: "absolute",
              width: POSTER.width * scale,
              height: POSTER.height * scale,
              left: -col * cellWidth * scale,
              top: -(PHONES.top + row * cellHeight) * scale,
            }}
          />
        </View>
      </View>
      <Text style={styles.phoneNumber}>{number}</Text>
    </View>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.panelItem}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

export default function DriverFlowSpec() {
  const rowA = SCREENS.filter((s) => s.row === 0);
  const rowB = SCREENS.filter((s) => s.row === 1);

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#020304", "#07121A", "#020304"]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>SAME DAY DELIVERY</Text>
        <Text style={styles.subheading}>DRIVER APP FLOW</Text>

        <View style={styles.phoneRows}>
          <View style={styles.phoneRow}>
            {rowA.map((screen) => (
              <PhoneFrame key={screen.n} number={screen.n} col={screen.col} row={screen.row} />
            ))}
          </View>
          <View style={styles.phoneRow}>
            {rowB.map((screen) => (
              <PhoneFrame key={screen.n} number={screen.n} col={screen.col} row={screen.row} />
            ))}
          </View>
        </View>

        <View style={styles.panelRow}>
          {PANELS.map((panel) => (
            <InfoPanel key={panel.title} title={panel.title} items={panel.items} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flow.bg },
  scroll: {
    paddingHorizontal: 6,
    paddingTop: Platform.OS === "web" ? 12 : 8,
    paddingBottom: 20,
    gap: 8,
  },
  heading: {
    color: flow.text,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 1,
  },
  subheading: {
    color: flow.cyan,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 0.6,
  },
  phoneRows: { gap: 5 },
  phoneRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "center",
    gap: 4,
  },
  phoneWrap: { alignItems: "center", width: PHONE_WIDTH + 2 },
  phoneFrame: {
    borderWidth: 1,
    borderColor: "#1A2833",
    borderRadius: 7,
    backgroundColor: "#05080C",
    padding: 2,
    alignItems: "center",
  },
  phoneViewport: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#14202A",
    backgroundColor: "#0A1016",
    overflow: "hidden",
  },
  phoneNumber: { color: flow.cyan, fontSize: 8, fontFamily: "Inter_700Bold", marginTop: 2 },
  panelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    justifyContent: "space-between",
    marginTop: 2,
  },
  panel: {
    width: Platform.OS === "web" ? "15.5%" : "48%",
    minWidth: 110,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: flow.line,
    backgroundColor: "rgba(10,13,18,0.96)",
    borderRadius: 6,
    padding: 5,
    gap: 1,
  },
  panelTitle: {
    color: flow.cyan,
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  panelItem: {
    color: flow.text,
    fontSize: 6.5,
    fontFamily: "Inter_500Medium",
    lineHeight: 9,
  },
});
