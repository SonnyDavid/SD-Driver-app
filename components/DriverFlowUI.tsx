import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const flow = {
  bg: "#020304",
  panel: "#0A0D12",
  panel2: "#10151D",
  line: "#1F2A35",
  inputBg: "#070B10",
  inputBorder: "#172533",
  cyan: "#14C8F3",
  cyan2: "#0899C8",
  green: "#17C964",
  red: "#EF233C",
  amber: "#F59E0B",
  purple: "#7C3AED",
  text: "#FFFFFF",
  muted: "#8A94A6",
  muted2: "#6B7585",
  placeholder: "#4F5B6B",
  onCyan: "#001018",
  radius: 12,
  buttonHeight: 52,
  inputHeight: 48,
  headerIconSize: 34,
  iconSm: 15,
  iconMd: 17,
  iconLg: 22,
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, page: 12 },
};

function normalizeDistanceText(distance: unknown): string {
  if (distance == null) return "";
  if (typeof distance === "number") {
    return Number.isNaN(distance) ? "" : String(distance);
  }
  if (typeof distance === "string") {
    return distance.trim();
  }
  return "";
}

/** Safe display for order distance — handles string, number, null, undefined. */
export function formatDistanceDisplay(distance: unknown): string {
  if (distance == null) return "N/A";
  if (typeof distance === "number") {
    if (Number.isNaN(distance)) return "N/A";
    return `${distance.toFixed(1)} mi`;
  }
  if (typeof distance === "string") {
    return distance.trim() || "N/A";
  }
  return "N/A";
}

export function estimateTravelMinutes(distance?: unknown) {
  const distanceText = normalizeDistanceText(distance);
  const value = Number.parseFloat(distanceText || "");
  if (Number.isNaN(value)) return "12 min";
  const isMiles = distanceText.toLowerCase().includes("mile");
  const km = isMiles ? value * 1.609 : value;
  return `${Math.max(5, Math.round(km * 2.8))} min`;
}

export type ServiceTier = "Priority" | "Standard" | "Scheduled";

export function resolveServiceTier(
  deliveryType?: string | null,
  options?: { scheduledPickup?: string | null }
): ServiceTier {
  const normalized = (deliveryType || "").trim().toLowerCase();
  if (normalized.includes("sched")) return "Scheduled";
  if (normalized.includes("priority") || normalized.includes("express") || normalized.includes("same-day")) {
    return "Priority";
  }
  if (options?.scheduledPickup) return "Scheduled";
  return "Standard";
}

export function serviceTierColor(tier: ServiceTier) {
  if (tier === "Priority") return flow.amber;
  if (tier === "Scheduled") return flow.green;
  return flow.cyan;
}

export function formatOrderAge(createdAt?: string | null) {
  if (!createdAt) return "Just now";
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) return "Just now";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatTripDistance(distance?: unknown) {
  return formatDistanceDisplay(distance);
}

export function formatTripEta(distance?: unknown) {
  const value = normalizeDistanceText(distance);
  if (!value) return "ETA —";
  return estimateTravelMinutes(value);
}

export type WorkflowStage =
  | "Pickup Pending"
  | "Arrived At Pickup"
  | "En Route"
  | "Awaiting PIN"
  | "Completed";

export function resolveWorkflowStage(
  status: string,
  options?: { focusedOrderId?: string | null; orderId?: string }
): WorkflowStage {
  if (status === "delivered") return "Completed";
  if (status === "arriving") return "Awaiting PIN";
  if (status === "package_collected" || status === "en_route") return "En Route";
  if (status === "driver_assigned") {
    if (options?.focusedOrderId && options.orderId === options.focusedOrderId) {
      return "Arrived At Pickup";
    }
    return "Pickup Pending";
  }
  return "Pickup Pending";
}

export function workflowStageColor(stage: WorkflowStage) {
  switch (stage) {
    case "Pickup Pending":
      return flow.amber;
    case "Arrived At Pickup":
      return flow.cyan;
    case "En Route":
      return flow.cyan;
    case "Awaiting PIN":
      return flow.purple;
    case "Completed":
      return flow.green;
  }
}

export function deliveryStatusLabel(
  status: string,
  focusedOrderId?: string | null,
  orderId?: string
) {
  return resolveWorkflowStage(status, { focusedOrderId, orderId });
}

export function estimateEta(distance?: string) {
  if (!distance) return "25 min est.";
  const km = Number.parseFloat(distance);
  if (Number.isNaN(km)) return "25 min est.";
  if (km >= 100) {
    const hours = Math.floor(km / 65);
    const mins = Math.round((km % 65) * 1.1);
    return `${hours}h ${mins}m est.`;
  }
  return `${Math.max(12, Math.round(km * 4))} min est.`;
}

export function workflowRouteForOrder(order: { status: string }) {
  switch (order.status) {
    case "driver_assigned":
      return "/delivery-navigation";
    case "package_collected":
      return "/navigate-customer";
    case "en_route":
    case "arriving":
      return "/customer-proof";
    default:
      return "/active-delivery";
  }
}

export function safeTop() {
  const insets = useSafeAreaInsets();
  return Platform.OS === "web" ? 41 : insets.top;
}

export function safeBottom() {
  const insets = useSafeAreaInsets();
  return Platform.OS === "web" ? 24 : insets.bottom;
}

export function postcode(address?: string, fallback = "SW1") {
  if (!address) return fallback;
  return address.split(",")[0]?.trim() || fallback;
}

/** Extract UK-style postcode for display (optional explicit field takes priority). */
export function extractPostcode(
  address?: string,
  explicitPostcode?: string | null,
  fallback = ""
) {
  if (explicitPostcode?.trim()) {
    return explicitPostcode.replace(/\s+/g, " ").trim().toUpperCase();
  }
  if (!address) return fallback;
  const match = address.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i);
  if (match) return match[1].replace(/\s+/g, " ").trim().toUpperCase();
  for (const part of address.split(",").map((segment) => segment.trim()).reverse()) {
    const partMatch = part.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i);
    if (partMatch) return partMatch[1].replace(/\s+/g, " ").trim().toUpperCase();
  }
  return fallback;
}

export function routePostcodes(from?: string, to?: string) {
  return `${extractPostcode(from)} → ${extractPostcode(to)}`;
}

export function parseAddressLines(
  address?: string,
  fallbackStreet = "Address pending",
  fallbackCity = "",
  explicitPostcode?: string | null
) {
  const postcode = extractPostcode(address, explicitPostcode);
  if (!address) {
    return { street: fallbackStreet, locality: `${fallbackCity} ${postcode}`.trim(), postcode };
  }
  const withoutPostcode = postcode
    ? address.replace(new RegExp(postcode.replace(/\s+/g, "\\s*"), "i"), "").replace(/,\s*$/, "").trim()
    : address.trim();
  const parts = withoutPostcode.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const street = parts[0];
    const cityPart = parts.slice(1).join(", ");
    const locality = /\b[A-Z]{1,2}\d/.test(cityPart) ? cityPart : `${cityPart} ${postcode}`.trim();
    return { street, locality, postcode };
  }
  if (parts.length === 1) {
    return { street: parts[0], locality: `${fallbackCity} ${postcode}`, postcode };
  }
  return { street: fallbackStreet, locality: `${fallbackCity} ${postcode}`, postcode };
}

export function cityLine(address?: string, fallback = "London") {
  if (!address) return fallback;
  const postcodeMatch = address.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i);
  if (postcodeMatch) {
    const area = address.replace(postcodeMatch[0], "").replace(/,/g, " ").trim();
    if (area) return area;
  }
  const tail = address.split(",").slice(1).join(",").trim();
  return tail || fallback;
}

export function DriverAvatar({
  name,
  photoUri,
  size = 46,
}: {
  name?: string;
  photoUri?: string;
  size?: number;
}) {
  const radius = size / 2;
  const initial = name?.trim().charAt(0).toUpperCase() || "?";
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageFailed(false);
  }, [photoUri]);

  const showPhoto = !!photoUri && !imageFailed;

  if (showPhoto) {
    return (
      <Image
        key={photoUri}
        source={{ uri: photoUri }}
        style={{ width: size, height: size, borderRadius: radius, borderWidth: 2, borderColor: flow.cyan }}
        resizeMode="cover"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: 2,
        borderColor: flow.cyan,
        backgroundColor: "#101827",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: flow.text, fontSize: Math.round(size * 0.39), fontFamily: "Inter_700Bold" }}>{initial}</Text>
    </View>
  );
}

export function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.shell}>
      <LinearGradient colors={["#020304", "#07121A", "#020304"]} style={StyleSheet.absoluteFill} />
      <View style={styles.gridGlow} />
      <View style={styles.cyanGlow} />
      {children}
    </View>
  );
}

export function BrandLogo({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.logoWrap, compact && styles.logoWrapCompact]}>
      <Text style={[styles.logoSd, compact && styles.logoSdCompact]}>SD</Text>
      <Text style={[styles.logoText, compact && styles.logoTextCompact]}>SAME DAY DELIVERY</Text>
    </View>
  );
}

export function HeaderBar({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity style={styles.headerIcon} onPress={onBack} activeOpacity={0.85}>
          <Feather name="chevron-left" size={flow.iconLg} color={flow.text} />
        </TouchableOpacity>
      ) : (
        <BrandLogo compact />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right || <View style={styles.headerIcon}><Feather name="bell" size={flow.iconMd} color={flow.text} /></View>}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  tone = "cyan",
  disabled,
  icon,
}: {
  label: string;
  onPress?: () => void;
  tone?: "cyan" | "green" | "red" | "dark";
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
}) {
  const backgroundColor =
    tone === "green" ? flow.green : tone === "red" ? flow.red : tone === "dark" ? "#111827" : flow.cyan;
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, { backgroundColor }, disabled && { opacity: 0.55 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.86}
    >
      {!!icon && <Feather name={icon} size={flow.iconSm} color={tone === "dark" ? flow.cyan : flow.onCyan} />}
      <Text style={[styles.primaryText, tone === "dark" && { color: flow.cyan }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Field({
  label,
  icon,
  ...inputProps
}: {
  label?: string;
  icon?: keyof typeof Feather.glyphMap;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldWrap}>
      {!!label && <Text style={styles.fieldLabel}>{label}</Text>}
      <View style={styles.field}>
        {!!icon && <Feather name={icon} size={flow.iconSm} color={flow.cyan} />}
        <TextInput
          {...inputProps}
          style={styles.input}
          placeholderTextColor={flow.placeholder}
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

export function Metric({ label, value, color = flow.cyan }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function StatusPill({ label, color = flow.cyan }: { label: string; color?: string }) {
  return (
    <View style={[styles.pill, { borderColor: `${color}66`, backgroundColor: `${color}16` }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function RouteSummary({
  from,
  to,
  compact,
}: {
  from?: string;
  to?: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.routeSummary, compact && { paddingVertical: 8 }]}>
      <RoutePoint label="Pickup" code={extractPostcode(from, null, "BT1 3AB")} detail={cityLine(from, "Belfast City Centre")} />
      <View style={styles.routeConnector}>
        <View style={styles.routeDot} />
        <View style={styles.routeLine} />
        <Feather name="package" size={16} color={flow.cyan} />
        <View style={styles.routeLine} />
        <View style={[styles.routeDot, { backgroundColor: flow.green }]} />
      </View>
      <RoutePoint label="Dropoff" code={extractPostcode(to, null, "BT7 2XY")} detail={cityLine(to, "Ormeau Road")} alignRight />
    </View>
  );
}

function RoutePoint({
  label,
  code,
  detail,
  alignRight,
}: {
  label: string;
  code: string;
  detail: string;
  alignRight?: boolean;
}) {
  return (
    <View style={[styles.routePoint, alignRight && { alignItems: "flex-end" }]}>
      <Text style={styles.routeLabel}>{label}</Text>
      <Text style={styles.routeCode} numberOfLines={1}>{code}</Text>
      <Text style={styles.routeDetail} numberOfLines={1}>{detail}</Text>
    </View>
  );
}

export function MiniMap({ destination = "Ready for Delivery" }: { destination?: string }) {
  return (
    <View style={styles.map}>
      <View style={styles.mapGrid} />
      <View style={[styles.mapRoad, { left: 18, top: 38, width: 106, transform: [{ rotate: "22deg" }] }]} />
      <View style={[styles.mapRoad, { right: 18, top: 88, width: 136, transform: [{ rotate: "-22deg" }] }]} />
      <View style={[styles.mapRoad, { left: 66, bottom: 42, width: 116, transform: [{ rotate: "16deg" }] }]} />
      <View style={styles.mapPinA}><Feather name="home" size={12} color={flow.onCyan} /></View>
      <View style={styles.mapPinB}><Feather name="map-pin" size={12} color={flow.onCyan} /></View>
      <Text style={styles.mapLabel}>{destination}</Text>
    </View>
  );
}

export function AspectImage({
  uri,
  aspectRatio = 4 / 3,
  rounded = 10,
}: {
  uri: string;
  aspectRatio?: number;
  rounded?: number;
}) {
  return (
    <View style={[styles.aspectWrap, { aspectRatio, borderRadius: rounded }]}>
      <Image source={{ uri }} style={styles.aspectImage} resizeMode="contain" />
    </View>
  );
}

export function ParcelArt({ imageUri }: { imageUri?: string }) {
  if (imageUri) return <AspectImage uri={imageUri} aspectRatio={4 / 3} rounded={10} />;
  return (
    <View style={styles.parcelArt}>
      <View style={styles.boxTop} />
      <View style={styles.boxFace}>
        <View style={styles.boxTape} />
      </View>
      <View style={styles.boxSide} />
    </View>
  );
}

export function SignaturePanel({ name = "Customer", captured }: { name?: string; captured?: boolean }) {
  return (
    <View style={styles.signature}>
      <Text style={styles.signatureHint}>{captured ? "Signature Captured" : "Tap to capture signature"}</Text>
      <Text style={styles.signatureName}>{captured ? name : "Sign here"}</Text>
      <View style={styles.signatureLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: flow.bg },
  gridGlow: {
    position: "absolute",
    left: -80,
    right: -80,
    bottom: -90,
    height: 300,
    borderRadius: 180,
    backgroundColor: "rgba(20,200,243,0.08)",
  },
  cyanGlow: {
    position: "absolute",
    top: 70,
    alignSelf: "center",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(20,200,243,0.08)",
  },
  logoWrap: { alignItems: "center" },
  logoWrapCompact: { width: 44, alignItems: "flex-start" },
  logoSd: { color: "#FFFFFF", fontSize: 45, fontFamily: "Inter_700Bold", fontStyle: "italic", letterSpacing: -4 },
  logoSdCompact: { fontSize: 18, letterSpacing: -2 },
  logoText: { color: "#FFFFFF", fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1.2, marginTop: -4 },
  logoTextCompact: { fontSize: 4, letterSpacing: 0.4, marginTop: -1 },
  header: { flexDirection: "row", alignItems: "center", gap: flow.space.sm, minHeight: flow.headerIconSize + 8 },
  headerIcon: {
    width: flow.headerIconSize,
    height: flow.headerIconSize,
    borderRadius: flow.radius,
    borderWidth: 1,
    borderColor: flow.line,
    backgroundColor: "rgba(10,13,18,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: flow.text, fontSize: 17, fontFamily: "Inter_700Bold" },
  headerSub: { color: flow.muted, fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 1 },
  card: {
    borderWidth: 1,
    borderColor: flow.line,
    backgroundColor: "rgba(10,13,18,0.96)",
    borderRadius: flow.radius,
    padding: flow.space.md,
  },
  primaryBtn: {
    height: flow.buttonHeight,
    borderRadius: flow.radius,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: flow.space.sm,
  },
  primaryText: { color: flow.onCyan, fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  fieldWrap: { gap: 5 },
  fieldLabel: { color: "#D7E3EA", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  field: {
    height: flow.inputHeight,
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    paddingHorizontal: flow.space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: flow.space.sm,
  },
  input: { flex: 1, color: flow.text, fontSize: 13, fontFamily: "Inter_500Medium", padding: 0 },
  metric: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    alignItems: "center",
    justifyContent: "center",
    padding: 7,
  },
  metricLabel: { color: flow.muted, fontSize: 9, fontFamily: "Inter_600SemiBold" },
  metricValue: { fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 3 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  routeSummary: { flexDirection: "row", alignItems: "center", gap: 8 },
  routePoint: { flex: 1, minWidth: 0 },
  routeLabel: { color: flow.muted, fontSize: 8, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  routeCode: { color: flow.text, fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 2 },
  routeDetail: { color: flow.muted2, fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 1 },
  routeConnector: { width: 58, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: flow.cyan },
  routeLine: { flex: 1, height: 1, backgroundColor: flow.cyan, opacity: 0.55 },
  map: {
    width: "100%",
    aspectRatio: 16 / 10,
    maxHeight: 168,
    borderRadius: flow.radius,
    borderWidth: 1,
    borderColor: "#153140",
    backgroundColor: "#07151C",
    overflow: "hidden",
  },
  mapGrid: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(20,200,243,0.04)" },
  mapRoad: { position: "absolute", height: 5, borderRadius: 4, backgroundColor: flow.cyan },
  mapPinA: { position: "absolute", left: 44, top: 74, width: 28, height: 28, borderRadius: 14, backgroundColor: flow.cyan, alignItems: "center", justifyContent: "center" },
  mapPinB: { position: "absolute", right: 48, bottom: 50, width: 28, height: 28, borderRadius: 14, backgroundColor: flow.green, alignItems: "center", justifyContent: "center" },
  mapLabel: { position: "absolute", left: 12, bottom: 10, color: flow.text, fontSize: 11, fontFamily: "Inter_700Bold" },
  aspectWrap: {
    width: "100%",
    backgroundColor: "#081019",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  aspectImage: { width: "100%", height: "100%" },
  parcelArt: { aspectRatio: 4 / 3, borderRadius: flow.radius, backgroundColor: "#081019", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  boxTop: { width: 126, height: 30, backgroundColor: "#B87536", transform: [{ skewX: "-28deg" }], borderTopLeftRadius: 4 },
  boxFace: { width: 132, height: 78, backgroundColor: "#C9823E", alignItems: "center" },
  boxTape: { width: 20, height: "100%", backgroundColor: "#E2B46B", opacity: 0.8 },
  boxSide: { position: "absolute", right: 89, top: 57, width: 44, height: 80, backgroundColor: "#8E5528", transform: [{ skewY: "-28deg" }] },
  signature: { height: 96, borderRadius: flow.radius, borderWidth: 1, borderColor: flow.inputBorder, backgroundColor: flow.inputBg, alignItems: "center", justifyContent: "center", padding: 10 },
  signatureHint: { color: flow.muted, fontSize: 9, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  signatureName: { color: flow.text, fontSize: 24, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  signatureLine: { width: "72%", height: 1, backgroundColor: "#334155", marginTop: 4 },
});
