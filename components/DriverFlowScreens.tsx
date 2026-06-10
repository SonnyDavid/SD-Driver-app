import { Feather, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { SignaturePad } from "@/components/SignaturePad";
import { getDeliveryProof, saveDeliveryProof, deliveryPhotoDisplayUri } from "@/lib/deliveryProofStorage";
import { logCompleteDelivery, supabaseErrorMessage } from "@/lib/completeDeliveryLog";
import { logConfirmPickup } from "@/lib/confirmPickupLog";
import { uploadDeliveryPhoto, uploadDeliverySignature } from "@/lib/deliveryPhotoUpload";
import { uploadPickupPhoto, uploadPickupSignature } from "@/lib/pickupProofUpload";
import { getPickupProof, savePickupPhoto, savePickupProof, savePickupSignature } from "@/lib/pickupProofStorage";
import {
  mapsAppLabel,
  formatMapsAddress,
  mapsTargetFromDelivery,
  mapsTargetFromPickup,
  openMapsNavigation,
} from "@/lib/openMaps";
import { getDriverOrderNumber } from "@/lib/orderDisplay";
import { fetchOrderDeliveryConfirmationPin } from "@/lib/orderDeliveryPin";
import { copyToClipboard } from "@/lib/copyToClipboard";
import {
  loadLocalBankDetails,
  maskAccountNumber,
  maskSortCode,
  saveLocalBankDetails,
  type LocalBankDetails,
} from "@/lib/localBankDetails";
import {
  loadLocalDriverSettings,
  saveLocalDriverSettings,
  type LocalDriverSettings,
} from "@/lib/localDriverSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useDelivery } from "@/contexts/DeliveryContext";
import {
  BrandLogo,
  Card,
  Field,
  HeaderBar,
  Metric,
  MiniMap,
  ParcelArt,
  PrimaryButton,
  RouteSummary,
  ScreenShell,
  SignaturePanel,
  StatusPill,
  cityLine,
  deliveryStatusLabel,
  DriverAvatar,
  estimateEta,
  estimateTravelMinutes,
  extractPostcode,
  flow,
  formatOrderAge,
  formatTripDistance,
  formatTripEta,
  resolveServiceTier,
  serviceTierColor,
  parseAddressLines,
  postcode,
  resolveWorkflowStage,
  safeBottom,
  safeTop,
  workflowRouteForOrder,
  workflowStageColor,
  type WorkflowStage,
} from "@/components/DriverFlowUI";

type VehicleType = "car" | "van" | "motorcycle";

function usePickupCountdown(minutesFromNow = 45) {
  const [label, setLabel] = React.useState("");
  React.useEffect(() => {
    const deadline = Date.now() + minutesFromNow * 60 * 1000;
    function tick() {
      const remaining = Math.max(0, deadline - Date.now());
      const totalSec = Math.floor(remaining / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      const byTime = new Date(deadline);
      const byLabel = `Pick up by ${String(byTime.getHours()).padStart(2, "0")}:${String(byTime.getMinutes()).padStart(2, "0")}`;
      setLabel(remaining > 0 ? `${byLabel} · ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : "Pickup deadline passed");
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [minutesFromNow]);
  return label;
}

function AddressBlock({
  kind,
  address,
  explicitPostcode,
  alignRight,
}: {
  kind: "Pickup" | "Delivery";
  address?: string;
  explicitPostcode?: string | null;
  alignRight?: boolean;
}) {
  const lines = parseAddressLines(address, "Address pending", "", explicitPostcode);
  const pinColor = kind === "Pickup" ? flow.cyan : flow.green;
  return (
    <View style={[styles.dashAddressBlock, alignRight && { alignItems: "flex-end" }]}>
      <View style={[styles.dashAddressLabelRow, alignRight && { justifyContent: "flex-end" }]}>
        <Feather name="map-pin" size={9} color={pinColor} />
        <Text style={styles.dashAddressKind}>{kind.toUpperCase()}</Text>
      </View>
      <Text style={[styles.dashAddressStreet, alignRight && { textAlign: "right" }]} numberOfLines={2}>
        {lines.street}
      </Text>
      <Text style={[styles.dashAddressLocality, alignRight && { textAlign: "right" }]} numberOfLines={1}>
        {lines.locality}
      </Text>
      <Text style={[styles.dashAddressPostcode, alignRight && { textAlign: "right" }]}>{lines.postcode}</Text>
    </View>
  );
}

function deliveryProgress(status: string) {
  switch (status) {
    case "driver_assigned":
      return { label: "Pickup Pending", pct: 18 };
    case "package_collected":
      return { label: "En Route", pct: 42 };
    case "en_route":
      return { label: "En Route", pct: 65 };
    case "arriving":
      return { label: "Awaiting PIN", pct: 85 };
    default:
      return { label: "En Route", pct: 65 };
  }
}

type MyDeliveryFilter = "all" | "pickup_pending" | "in_progress" | "completed";

type MyDeliveryItem = {
  id: string;
  orderNumber?: string;
  packageId?: string;
  senderName?: string;
  recipientName?: string;
  pickupAddress: string;
  deliveryAddress: string;
  distance?: string;
  payout: number;
  status: string;
  acceptedAt?: string;
  completedAt?: string | null;
  scheduledPickup?: string;
};

function getWorkflowAction(stage: WorkflowStage, _order: Pick<MyDeliveryItem, "status">) {
  switch (stage) {
    case "Pickup Pending":
      return { label: "START PICKUP", path: "/delivery-navigation", focus: true };
    case "Arrived At Pickup":
      return { label: "CONFIRM PICKUP", path: "/pickup-verification", focus: false };
    case "En Route":
      return {
        label: "CONTINUE DELIVERY",
        path: "/navigate-customer",
        focus: true,
      };
    case "Awaiting PIN":
      return { label: "VERIFY PIN", path: "/customer-proof", focus: true };
    case "Completed":
      return { label: "VIEW SUMMARY", path: "/complete-delivery", focus: false };
  }
}

function filterMatchesStage(filter: MyDeliveryFilter, stage: WorkflowStage) {
  if (filter === "all") return true;
  if (filter === "pickup_pending") return stage === "Pickup Pending";
  if (filter === "in_progress") {
    return stage === "Arrived At Pickup" || stage === "En Route" || stage === "Awaiting PIN";
  }
  return stage === "Completed";
}

function DriverHeaderStrip({
  driver,
  online,
  onToggleOnline,
}: {
  driver: ReturnType<typeof useAuth>["driver"];
  online: boolean;
  onToggleOnline: (v: boolean) => void;
}) {
  const [idCopied, setIdCopied] = React.useState(false);
  const driverCode = driver?.driverId || "SD-123456";

  async function handleCopyId() {
    const ok = await copyToClipboard(driverCode);
    if (ok) {
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
    }
  }

  return (
    <View style={styles.dashboardHeader}>
      <View style={styles.dashboardProfile}>
        <DriverAvatar name={driver?.name} photoUri={driver?.profilePhotoUri} size={44} />
        <View style={styles.dashboardIdentity}>
          <Text style={styles.dashboardName} numberOfLines={1}>{driver?.name || "Sonny Davidkov"}</Text>
          <View style={styles.dashboardIdRow}>
            <Text style={styles.dashboardIdLabel}>Driver ID </Text>
            <Text style={styles.dashboardIdValue}>{driverCode}</Text>
            <TouchableOpacity onPress={handleCopyId} hitSlop={8} activeOpacity={0.85}>
              <Feather name="copy" size={11} color={flow.cyan} />
            </TouchableOpacity>
          </View>
          {idCopied ? <Text style={styles.dashboardIdCopied}>Copied</Text> : null}
          <Text style={styles.dashboardVehicle} numberOfLines={1}>
            Vehicle {driver?.vehicleRegistration || "AB12 CDE"}
          </Text>
          <View style={styles.onlineRow}>
            <View style={[styles.onlineDot, { backgroundColor: online ? flow.green : flow.muted }]} />
            <Text style={[styles.onlineText, { color: online ? flow.green : flow.muted }]}>{online ? "ONLINE" : "OFFLINE"}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.dashboardPower} onPress={() => onToggleOnline(!online)} activeOpacity={0.86}>
        <Feather name="power" size={17} color={flow.cyan} />
      </TouchableOpacity>
    </View>
  );
}

function MyDeliveryCard({
  order,
  stage,
  onAction,
}: {
  order: MyDeliveryItem;
  stage: WorkflowStage;
  onAction: () => void;
}) {
  const pickup = parseAddressLines(order.pickupAddress);
  const delivery = parseAddressLines(order.deliveryAddress);
  const action = getWorkflowAction(stage, order);
  const stageColor = workflowStageColor(stage);
  const isCompleted = stage === "Completed";
  const iconName = isCompleted ? "check-circle" : "package";
  const sender = order.senderName || order.recipientName || "Sender";
  const timeLabel = isCompleted
    ? `Completed ${order.completedAt || "10:05"}`
    : `Accepted ${order.acceptedAt || "09:00"}`;

  return (
    <View style={styles.myDeliveryCard}>
      <View style={styles.myDeliveryTop}>
        <View style={[styles.myDeliveryIcon, { borderColor: `${stageColor}55`, backgroundColor: `${stageColor}14` }]}>
          <Feather name={iconName} size={16} color={stageColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.myDeliveryOrderId}>{getDriverOrderNumber(order)}</Text>
          <Text style={styles.myDeliverySender} numberOfLines={1}>{sender}</Text>
        </View>
        <View style={styles.myDeliveryTopRight}>
          <View style={[styles.myDeliveryStatusBadge, { borderColor: `${stageColor}66` }]}>
            <Text style={[styles.myDeliveryStatusText, { color: stageColor }]}>{stage.toUpperCase()}</Text>
          </View>
          <Text style={styles.myDeliveryTime}>{timeLabel}</Text>
        </View>
      </View>

      <View style={styles.myDeliveryBody}>
        <View style={styles.myDeliveryRouteCol}>
          <View style={styles.myDeliveryRouteLine}>
            <View style={[styles.myDeliveryDot, { backgroundColor: flow.cyan }]} />
            <View style={styles.myDeliveryLine} />
            <View style={[styles.myDeliveryDot, { backgroundColor: flow.green }]} />
          </View>
          <View style={styles.myDeliveryAddresses}>
            <View style={styles.myDeliveryAddressBlock}>
              <Text style={styles.myDeliveryAddressKind}>PICKUP</Text>
              <Text style={styles.myDeliveryStreet}>{pickup.street}</Text>
              <Text style={styles.myDeliveryLocality}>{pickup.locality}</Text>
              <Text style={styles.myDeliveryPostcode}>{pickup.postcode}</Text>
            </View>
            <View style={styles.myDeliveryAddressBlock}>
              <Text style={styles.myDeliveryAddressKind}>DELIVERY</Text>
              <Text style={styles.myDeliveryStreet}>{delivery.street}</Text>
              <Text style={styles.myDeliveryLocality}>{delivery.locality}</Text>
              <Text style={styles.myDeliveryPostcode}>{delivery.postcode}</Text>
            </View>
          </View>
        </View>
        <View style={styles.myDeliveryStats}>
          <Text style={styles.myDeliveryEarnings}>£{Number(order.payout || 0).toFixed(2)}</Text>
          <View style={styles.myDeliveryMetaRow}>
            <Feather name="map-pin" size={10} color={flow.muted} />
            <Text style={styles.myDeliveryMeta}>{order.distance || "4.2 miles"}</Text>
          </View>
          <View style={styles.myDeliveryMetaRow}>
            <Feather name="clock" size={10} color={flow.muted} />
            <Text style={styles.myDeliveryMeta}>{estimateEta(order.distance)}</Text>
          </View>
        </View>
      </View>

      {order.scheduledPickup && stage === "Pickup Pending" ? (
        <View style={styles.myDeliveryScheduledRow}>
          <Feather name="calendar" size={11} color={flow.amber} />
          <Text style={styles.myDeliveryScheduledText}>Scheduled pickup: {order.scheduledPickup}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          styles.myDeliveryActionBtn,
          isCompleted ? styles.myDeliveryActionBtnCompleted : styles.myDeliveryActionBtnActive,
        ]}
        onPress={onAction}
        activeOpacity={0.88}
      >
        {isCompleted ? (
          <>
            <Text style={styles.myDeliveryActionTextCompleted}>{action.label}</Text>
            <Feather name="chevron-right" size={14} color={flow.green} />
          </>
        ) : (
          <>
            <Feather name="navigation" size={13} color={flow.onCyan} />
            <Text style={styles.myDeliveryActionTextActive}>{action.label}</Text>
            <Feather name="chevron-right" size={14} color={flow.onCyan} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const IN_PROGRESS_STATUSES = ["package_collected", "en_route", "arriving"];

function orderPriorityWeight(status: string) {
  switch (status) {
    case "arriving":
      return 4;
    case "en_route":
      return 3;
    case "package_collected":
      return 2;
    case "driver_assigned":
      return 1;
    default:
      return 0;
  }
}

function pickPriorityOrder<T extends { status: string }>(orders: T[]) {
  if (!orders.length) return undefined;
  return [...orders].sort((a, b) => orderPriorityWeight(b.status) - orderPriorityWeight(a.status))[0];
}

function workflowPush(path: string, orderId: string) {
  router.push({ pathname: path as any, params: { id: orderId } });
}

function useWorkflowOrder() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getOrderById, currentOrderId, myDeliveries } = useDelivery();
  const orderId = id || currentOrderId || undefined;
  const order =
    (orderId ? getOrderById(orderId) : null) ?? myDeliveries[0] ?? null;

  useFocusEffect(
    useCallback(() => {
      if (!order) router.replace("/(tabs)");
    }, [order])
  );

  return order;
}

function useOrderFromParam(orderId?: string) {
  const { getOrderById, currentOrder, myDeliveries } = useDelivery();
  const order =
    (orderId ? getOrderById(orderId) : null) ??
    currentOrder ??
    myDeliveries[0] ??
    null;

  useFocusEffect(
    useCallback(() => {
      if (!order) router.replace("/(tabs)");
    }, [order])
  );

  return order;
}

function scrollPads(extraBottom = 88) {
  return { paddingTop: safeTop() + 8, paddingBottom: safeBottom() + extraBottom };
}

export function WelcomeScreen() {
  const { driver, isLoading } = useAuth();
  const top = safeTop();
  const bottom = safeBottom();

  if (isLoading) {
    return (
      <View style={styles.welcomeScreen}>
        <WelcomeBackdrop />
        <View style={styles.center}>
          <ActivityIndicator color={flow.cyan} />
        </View>
      </View>
    );
  }

  if (driver) return <Redirect href="/(tabs)" />;

  return (
    <View style={styles.welcomeScreen}>
      <WelcomeBackdrop />
      <View style={[styles.welcomeRoot, { paddingTop: top + 18, paddingBottom: bottom + 28 }]}>
        <View style={styles.welcomeLogoBlock}>
          <View style={styles.welcomeLogoGlow} />
          <View style={styles.welcomeLogoMarkRow}>
            <View style={styles.welcomeSpeedLines}>
              <View style={[styles.welcomeSpeedLine, { width: 22 }]} />
              <View style={[styles.welcomeSpeedLine, { width: 16 }]} />
              <View style={[styles.welcomeSpeedLine, { width: 10 }]} />
            </View>
            <Text style={styles.welcomeLogoSd}>SD</Text>
          </View>
          <Text style={styles.welcomeLogoTitle}>SAME DAY</Text>
          <View style={styles.welcomeLogoSubRow}>
            <View style={styles.welcomeLogoLine} />
            <Text style={styles.welcomeLogoSub}>DELIVERY</Text>
            <View style={styles.welcomeLogoLine} />
          </View>
        </View>

        <View style={styles.welcomeSpacer} />

        <View style={styles.welcomeCopy}>
          <Text style={styles.welcomeHeading}>Welcome Back</Text>
          <Text style={styles.welcomeSubheading}>Sign in to continue</Text>
        </View>

        <View style={styles.welcomeButtons}>
          <TouchableOpacity onPress={() => router.push("/login")} activeOpacity={0.88} style={styles.welcomeLoginOuter}>
            <LinearGradient colors={["#5CE4FF", "#14C8F3", "#0AB8E8"]} style={styles.welcomeLoginBtn}>
              <Feather name="user" size={18} color={flow.onCyan} />
              <Text style={styles.welcomeLoginText}>LOG IN</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.welcomeRegisterBtn} onPress={() => router.push("/register")} activeOpacity={0.88}>
            <Feather name="user-plus" size={18} color={flow.text} />
            <Text style={styles.welcomeRegisterText}>REGISTER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function WelcomeBackdrop() {
  const skyline = [38, 62, 48, 78, 54, 42, 68, 50, 72, 44, 58];
  return (
    <>
      <LinearGradient colors={["#000305", "#020810", "#010408"]} style={StyleSheet.absoluteFill} />
      <View style={styles.welcomeSkylineGlow} />
      <View style={styles.welcomeSkylineRow}>
        {skyline.map((height, index) => (
          <View key={index} style={[styles.welcomeBuilding, { height }]} />
        ))}
      </View>
      <View style={styles.welcomeGrid}>
        {[-32, -18, -6, 6, 18, 32].map((rotate) => (
          <View key={rotate} style={[styles.welcomeGridLine, { transform: [{ rotate: `${rotate}deg` }] }]} />
        ))}
      </View>
    </>
  );
}

export function LoginScreen() {
  const { login } = useAuth();
  const [driverId, setDriverId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!driverId.trim() || !password) {
      setError("Enter your Driver ID and password.");
      return;
    }
    setLoading(true);
    const result = await login(driverId, password);
    setLoading(false);
    if (result.success) router.replace("/(tabs)");
    else setError(result.error || "Login failed.");
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.page, scrollPads(24)]} keyboardShouldPersistTaps="handled">
          <HeaderBar title="Welcome Back" subtitle="Log in with your Driver ID and password" onBack={() => router.back()} />
          <View style={styles.loginBrand}><BrandLogo /></View>
          <Card style={{ gap: 12 }}>
            <Field label="Driver ID" icon="credit-card" placeholder="SD-12345" value={driverId} onChangeText={(v) => { setDriverId(v.toUpperCase()); setError(""); }} autoCapitalize="characters" />
            <Field label="Password" icon="lock" placeholder="Your password" value={password} onChangeText={(v) => { setPassword(v); setError(""); }} secureTextEntry />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <PrimaryButton label={loading ? "LOGGING IN..." : "LOG IN"} onPress={submit} disabled={loading} />
            <TouchableOpacity onPress={() => router.replace("/register")}>
              <Text style={styles.centerLink}>New driver? Register now</Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function RegisterStepper({ active = 1 }: { active?: number }) {
  const steps = ["Account", "Vehicle", "Photos", "Review"];
  return (
    <View style={styles.registerStepperWrap}>
      <View style={styles.registerStepperRail}>
        <View style={[styles.registerStepperRailFill, { width: `${((active - 1) / (steps.length - 1)) * 100}%` }]} />
      </View>
      <View style={styles.registerStepper}>
        {steps.map((label, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === active;
          const isDone = stepNum < active;
          const highlighted = isActive || isDone;
          return (
            <View key={label} style={styles.registerStep}>
              <View style={[styles.registerStepDot, highlighted && styles.registerStepDotActive]}>
                <Text style={[styles.registerStepNum, highlighted && styles.registerStepNumActive]}>{stepNum}</Text>
              </View>
              <Text style={[styles.registerStepLabel, isActive && styles.registerStepLabelActive]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function RegisterBrandMark() {
  return (
    <View style={styles.registerBrand}>
      <View style={styles.registerBrandRow}>
        <View style={styles.registerCubeWrap}>
          <View style={styles.registerCubeGlow} />
          <View style={styles.registerCube}>
            <View style={styles.registerCubeTop} />
            <View style={styles.registerCubeFront} />
            <View style={styles.registerCubeSide} />
          </View>
          <View style={styles.registerCubeLines}>
            <View style={[styles.registerCubeLine, { width: 14 }]} />
            <View style={[styles.registerCubeLine, { width: 10 }]} />
            <View style={[styles.registerCubeLine, { width: 6 }]} />
          </View>
        </View>
        <Text style={styles.registerBrandTitle}>
          <Text style={styles.registerBrandSd}>SD </Text>
          <Text style={styles.registerBrandDelivery}>DELIVERY</Text>
        </Text>
      </View>
      <Text style={styles.registerBrandTag}>Fast. Reliable. Secure.</Text>
    </View>
  );
}

function RegisterSectionHeader({ icon, title }: { icon: keyof typeof Feather.glyphMap; title: string }) {
  return (
    <View style={styles.registerSectionHeader}>
      <Feather name={icon} size={14} color={flow.cyan} />
      <Text style={styles.registerSectionTitle}>{title}</Text>
    </View>
  );
}

function RegisterInput({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  right,
  style,
}: {
  icon?: keyof typeof Feather.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  right?: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.registerField, style]}>
      {!!icon && <Feather name={icon} size={14} color={flow.cyan} />}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={flow.placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={styles.registerInput}
      />
      {right}
    </View>
  );
}

function RegisterUploadCard({
  title,
  hint,
  uri,
  onPress,
}: {
  title: string;
  hint: string;
  uri?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.registerUploadCard} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.registerUploadThumb}>
        {uri ? (
          <Image source={{ uri }} style={styles.registerUploadImage} resizeMode="cover" />
        ) : (
          <View style={styles.registerUploadPlaceholder}>
            <Feather name="image" size={22} color={flow.muted} />
          </View>
        )}
      </View>
      <Text style={styles.registerUploadTitle}>{title}</Text>
      <Text style={styles.registerUploadHint}>{hint}</Text>
      <View style={styles.registerUploadBtn}>
        <Feather name="upload" size={14} color={flow.onCyan} />
      </View>
    </TouchableOpacity>
  );
}

export function RegisterScreen() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [vehicleReg, setVehicleReg] = useState("");
  const [vehiclePhotoUri, setVehiclePhotoUri] = useState("");
  const [selfieUri, setSelfieUri] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function pickImage(target: "vehicle" | "selfie") {
    Alert.alert("Upload photo", "Choose a source", [
      {
        text: "Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Camera required", "Camera access is needed for verification.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: true,
            aspect: target === "selfie" ? [1, 1] : [4, 3],
          });
          if (!result.canceled && result.assets[0]) {
            target === "vehicle" ? setVehiclePhotoUri(result.assets[0].uri) : setSelfieUri(result.assets[0].uri);
          }
        },
      },
      {
        text: "Photo Library",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Photos required", "Photo library access is needed.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            quality: 0.8,
            allowsEditing: true,
            aspect: target === "selfie" ? [1, 1] : [4, 3],
          });
          if (!result.canceled && result.assets[0]) {
            target === "vehicle" ? setVehiclePhotoUri(result.assets[0].uri) : setSelfieUri(result.assets[0].uri);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function validate() {
    if (!firstName.trim() || !lastName.trim()) return "First and last name are required.";
    if (!dob.trim()) return "Date of birth is required.";
    if (!phone.trim()) return "Phone number is required.";
    if (!email.includes("@")) return "Valid email address is required.";
    if (!password || password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!vehicleReg.trim()) return "Vehicle registration is required.";
    if (!vehiclePhotoUri) return "Vehicle photo is required.";
    if (!selfieUri) return "Driver selfie is required.";
    return "";
  }

  async function submit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setLoading(true);
    const name = `${firstName.trim()} ${lastName.trim()}`;
    const fullPhone = phone.trim().startsWith("+") ? phone.trim() : `+44 ${phone.trim()}`;
    const result = await register({
      name,
      email,
      phone: fullPhone,
      password,
      vehicleType,
      vehicleRegistration: vehicleReg,
      vehiclePhotoUri,
      profilePhotoUri: selfieUri,
    });
    setLoading(false);
    if (result.success) {
      router.replace({
        pathname: "/register-success",
        params: {
          driverId: result.driverId ?? "",
          name,
          phone: fullPhone,
          email,
          vehicleRegistration: vehicleReg.toUpperCase(),
          vehicleType,
        },
      });
    } else {
      setError(result.error || "Registration failed.");
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.registerPage, scrollPads(20)]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.registerTopBar}>
            <TouchableOpacity style={styles.registerBackBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Feather name="chevron-left" size={22} color={flow.text} />
            </TouchableOpacity>
            <Text style={styles.registerScreenTitle}>REGISTER</Text>
            <View style={styles.registerBackSpacer} />
          </View>

          <RegisterStepper active={1} />
          <RegisterBrandMark />

          <RegisterSectionHeader icon="user" title="PERSONAL INFORMATION" />
          <View style={styles.registerNameRow}>
            <RegisterInput icon="user" placeholder="First Name" value={firstName} onChangeText={setFirstName} style={{ flex: 1 }} />
            <RegisterInput icon="user" placeholder="Last Name" value={lastName} onChangeText={setLastName} style={{ flex: 1 }} />
          </View>
          <RegisterInput icon="calendar" placeholder="Date of Birth" value={dob} onChangeText={setDob} />
          <View style={styles.registerPhoneRow}>
            <View style={styles.registerCountryCode}>
              <Text style={styles.registerFlag}>🇬🇧</Text>
              <Text style={styles.registerDialCode}>+44</Text>
              <Feather name="chevron-down" size={14} color={flow.muted} />
            </View>
            <View style={[styles.registerField, styles.registerPhoneField]}>
              <Feather name="phone" size={14} color={flow.cyan} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone Number"
                placeholderTextColor={flow.placeholder}
                keyboardType="phone-pad"
                style={styles.registerInput}
              />
            </View>
          </View>
          <RegisterInput icon="mail" placeholder="Email Address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <RegisterInput
            icon="lock"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            right={
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={flow.muted} />
              </TouchableOpacity>
            }
          />
          <RegisterInput
            icon="lock"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            right={
              <TouchableOpacity onPress={() => setShowConfirmPassword((v) => !v)} hitSlop={8}>
                <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={16} color={flow.muted} />
              </TouchableOpacity>
            }
          />

          <RegisterSectionHeader icon="truck" title="VEHICLE INFORMATION" />
          <RegisterInput
            icon="grid"
            placeholder="e.g. AB12 CDE"
            value={vehicleReg}
            onChangeText={(v) => setVehicleReg(v.toUpperCase())}
            autoCapitalize="characters"
          />
          <Text style={styles.registerVehicleLabel}>Vehicle Type</Text>
          <View style={styles.registerVehicleRow}>
            {[
              ["car", "car", "Car"],
              ["van", "truck", "Van"],
              ["motorcycle", "motorcycle", "Motorcycle"],
            ].map(([key, icon, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.registerVehicleChoice, vehicleType === key && styles.registerVehicleActive]}
                onPress={() => setVehicleType(key as VehicleType)}
                activeOpacity={0.88}
              >
                {key === "motorcycle" ? (
                  <FontAwesome5 name="motorcycle" size={22} color={vehicleType === key ? flow.cyan : flow.muted} />
                ) : (
                  <Feather name={icon as any} size={22} color={vehicleType === key ? flow.cyan : flow.muted} />
                )}
                <Text style={[styles.registerVehicleText, vehicleType === key && styles.registerVehicleTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <RegisterSectionHeader icon="camera" title="UPLOADS" />
          <View style={styles.registerUploadRow}>
            <RegisterUploadCard
              title="VEHICLE PHOTO"
              hint="Upload a clear photo of your vehicle"
              uri={vehiclePhotoUri}
              onPress={() => pickImage("vehicle")}
            />
            <RegisterUploadCard
              title="DRIVER SELFIE"
              hint="Take a clear selfie for verification"
              uri={selfieUri}
              onPress={() => pickImage("selfie")}
            />
          </View>

          {!!error && <Text style={styles.registerError}>{error}</Text>}

          <TouchableOpacity style={styles.registerContinueBtn} onPress={submit} disabled={loading} activeOpacity={0.88}>
            {loading ? (
              <ActivityIndicator color={flow.onCyan} />
            ) : (
              <>
                <Text style={styles.registerContinueText}>CONTINUE</Text>
                <Feather name="chevron-right" size={18} color={flow.onCyan} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/login")} activeOpacity={0.85}>
            <Text style={styles.registerLoginText}>
              Already have an account? <Text style={styles.registerLoginLink}>LOGIN</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function vehicleTypeLabel(type?: string) {
  if (type === "van") return "Van";
  if (type === "motorcycle") return "Motorcycle";
  return "Car";
}

function SuccessConfetti() {
  const dots = [
    { top: 8, left: 28, color: flow.cyan, size: 5 },
    { top: 18, right: 24, color: flow.green, size: 4 },
    { top: 42, left: 12, color: flow.cyan, size: 3 },
    { top: 52, right: 36, color: flow.green, size: 5 },
    { top: 6, right: 52, color: flow.cyan, size: 3 },
    { top: 64, left: 40, color: flow.green, size: 4 },
  ];
  return (
    <>
      {dots.map((dot, index) => (
        <View
          key={index}
          style={[
            styles.successConfettiDot,
            {
              top: dot.top,
              left: "left" in dot ? dot.left : undefined,
              right: "right" in dot ? dot.right : undefined,
              width: dot.size,
              height: dot.size,
              borderRadius: dot.size / 2,
              backgroundColor: dot.color,
            },
          ]}
        />
      ))}
    </>
  );
}

function AccountSummaryRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.successSummaryRow}>
      <Feather name={icon} size={14} color={flow.muted} />
      <Text style={styles.successSummaryLabel}>{label}</Text>
      <Text style={styles.successSummaryValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function ApprovalPendingScreen() {
  const params = useLocalSearchParams<{
    driverId?: string;
    name?: string;
    phone?: string;
    email?: string;
    vehicleRegistration?: string;
    vehicleType?: string;
  }>();
  const [copied, setCopied] = React.useState(false);
  const driverCode = (params.driverId || "SD-00000").toUpperCase();

  async function handleCopy() {
    const ok = await copyToClipboard(driverCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      Alert.alert("Copy failed", "Could not copy Driver ID. Please try again.");
    }
  }

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={[styles.successPage, scrollPads(16)]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successHero}>
          <View style={styles.successIconWrap}>
            <SuccessConfetti />
            <View style={styles.successIconGlow} />
            <View style={styles.successIconRing}>
              <Feather name="check" size={34} color={flow.text} />
            </View>
          </View>
          <Text style={styles.successTitle}>Registration Successful!</Text>
          <Text style={styles.successSubtitle}>Welcome to SD Delivery</Text>
        </View>

        <View style={styles.successCodeCard}>
          <Text style={styles.successCodeLabel}>YOUR DRIVER CODE</Text>
          <View style={styles.successCodeRow}>
            <Text style={styles.successCodeValue}>{driverCode}</Text>
            <TouchableOpacity style={styles.successCopyBtn} onPress={handleCopy} activeOpacity={0.85}>
              <Feather name="copy" size={18} color={flow.cyan} />
            </TouchableOpacity>
          </View>
          <Text style={styles.successCodeHint}>
            {copied ? "Driver ID copied to clipboard" : "Use this code to log in to your account"}
          </Text>
        </View>

        <View style={styles.successSummaryCard}>
          <View style={styles.successSummaryHeader}>
            <Feather name="user" size={14} color={flow.cyan} />
            <Text style={styles.successSummaryTitle}>ACCOUNT SUMMARY</Text>
          </View>
          <AccountSummaryRow icon="user" label="Full Name" value={params.name || "—"} />
          <View style={styles.successDivider} />
          <AccountSummaryRow icon="phone" label="Phone Number" value={params.phone || "—"} />
          <View style={styles.successDivider} />
          <AccountSummaryRow icon="mail" label="Email Address" value={params.email || "—"} />
          <View style={styles.successDivider} />
          <AccountSummaryRow icon="truck" label="Vehicle" value={params.vehicleRegistration || "—"} />
          <View style={styles.successDivider} />
          <AccountSummaryRow icon="truck" label="Vehicle Type" value={vehicleTypeLabel(params.vehicleType)} />
        </View>

        <View style={styles.successReviewCard}>
          <View style={styles.successReviewIcon}>
            <Feather name="shield" size={20} color={flow.cyan} />
          </View>
          <View style={styles.successReviewBody}>
            <Text style={styles.successReviewTitle}>Pending Review</Text>
            <Text style={styles.successReviewText}>Your account is awaiting admin approval.</Text>
            <Text style={styles.successReviewSub}>
              Our team will review your information. You will be notified once your account is approved.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.successLoginBtn} onPress={() => router.replace("/login")} activeOpacity={0.88}>
          <Text style={styles.successLoginText}>GO TO LOGIN</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => Linking.openURL("mailto:support@samedaydelivery.com")} activeOpacity={0.85}>
          <Text style={styles.successSupportText}>
            Need help? <Text style={styles.successSupportLink}>Contact Support</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

export function DashboardScreen() {
  const { driver, setOnline } = useAuth();
  const {
    myDeliveries,
    queuedDeliveries,
    currentOrder,
    currentOrderId,
    completedDeliveries,
    startDelivery,
    todayEarnings,
    refreshDeliveries,
  } = useDelivery();

  useFocusEffect(
    useCallback(() => {
      void refreshDeliveries();
    }, [refreshDeliveries])
  );
  const [idCopied, setIdCopied] = React.useState(false);
  const pickupCountdown = usePickupCountdown(38);
  const topPad = safeTop() + 4;
  const bottomPad = safeBottom() + 46;
  const online = !!driver?.isOnline;
  const activeDeliveries = myDeliveries.filter((o) => o.status !== "delivered");
  const priority =
    pickPriorityOrder(activeDeliveries) || currentOrder || undefined;
  const upcoming = myDeliveries.filter((o) => o.id !== priority?.id);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const completedToday = completedDeliveries.filter((d) => {
    const timestamp = Date.parse(d.date);
    return !Number.isNaN(timestamp) && timestamp >= todayStart.getTime();
  }).length;

  const activeCount = myDeliveries.length;
  const pendingCount = queuedDeliveries.length;
  const earningsToday = todayEarnings;
  const progress = deliveryProgress(priority?.status || "en_route");
  const driverCode = driver?.driverId || "SD-123456";

  async function handleCopyId() {
    const ok = await copyToClipboard(driverCode);
    if (ok) {
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
    }
  }

  async function handleContinue(order: (typeof myDeliveries)[0]) {
    await startDelivery(order.id);
    workflowPush(workflowRouteForOrder(order), order.id);
  }

  async function handleStartPickup(order: (typeof myDeliveries)[0]) {
    await startDelivery(order.id);
    workflowPush("/delivery-navigation", order.id);
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={[styles.dashboardPage, { paddingTop: topPad, paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        <View style={styles.dashboardHeader}>
          <View style={styles.dashboardProfile}>
            <DriverAvatar name={driver?.name} photoUri={driver?.profilePhotoUri} size={44} />
            <View style={styles.dashboardIdentity}>
              <Text style={styles.dashboardName} numberOfLines={1}>{driver?.name || "Sonny Davidkov"}</Text>
              <View style={styles.dashboardIdRow}>
                <Text style={styles.dashboardIdLabel}>Driver ID </Text>
                <Text style={styles.dashboardIdValue}>{driverCode}</Text>
                <TouchableOpacity onPress={handleCopyId} hitSlop={8} activeOpacity={0.85}>
                  <Feather name="copy" size={11} color={flow.cyan} />
                </TouchableOpacity>
              </View>
              {idCopied ? <Text style={styles.dashboardIdCopied}>Copied</Text> : null}
              <Text style={styles.dashboardVehicle} numberOfLines={1}>
                Vehicle {driver?.vehicleRegistration || "AB12 CDE"}
              </Text>
              <View style={styles.onlineRow}>
                <View style={[styles.onlineDot, { backgroundColor: online ? flow.green : flow.muted }]} />
                <Text style={[styles.onlineText, { color: online ? flow.green : flow.muted }]}>{online ? "ONLINE" : "OFFLINE"}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.dashboardPower} onPress={() => setOnline(!online)} activeOpacity={0.86}>
            <Feather name="power" size={17} color={flow.cyan} />
          </TouchableOpacity>
        </View>

        <View style={styles.dashboardStatsRow}>
          <DashboardStat icon="activity" label="Active" value={String(activeCount)} sub="Deliveries" color={flow.cyan} />
          <DashboardStat icon="clock" label="Pending" value={String(pendingCount)} sub="Deliveries" color={flow.amber} />
          <DashboardStat icon="check-circle" label="Completed" value={String(completedToday)} sub="Today" color={flow.green} />
          <DashboardStat icon="star" label="Rating" value="4.8" sub="Excellent" color={flow.purple} />
        </View>

        {!!priority && (
          <View style={styles.dashboardSectionHead}>
            <Feather name="package" size={11} color={flow.cyan} />
            <Text style={styles.dashboardSectionLabel}>CURRENT PRIORITY DELIVERY</Text>
          </View>
        )}
        {!!priority && (
          <View style={[styles.dashboardCard, styles.priorityCard]}>
            <View style={styles.priorityTop}>
              <View style={styles.priorityCustomer}>
                <View style={styles.priorityUserIcon}>
                  <Text style={styles.priorityInitial}>{(priority.recipientName || "E").charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.priorityOrderId} numberOfLines={1}>{getDriverOrderNumber(priority)}</Text>
                  <Text style={styles.priorityName} numberOfLines={1}>{priority.recipientName || "Customer"}</Text>
                  <Text style={styles.priorityStatus}>
                    {deliveryStatusLabel(priority.status, currentOrderId, priority.id).toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.priorityEarningsWrap}>
                <Text style={styles.priorityEarnings}>£{Number(priority.payout || 20).toFixed(2)}</Text>
                <Text style={styles.priorityEarningsLabel}>Earnings</Text>
              </View>
            </View>

            <View style={styles.priorityAddressStack}>
              <AddressBlock kind="Pickup" address={priority.pickupAddress} explicitPostcode={priority.pickupPostcode} />
              <View style={styles.priorityAddressConnector}>
                <View style={styles.priorityConnectorDot} />
                <View style={styles.priorityConnectorLine} />
                <Feather name="package" size={12} color={flow.cyan} />
                <View style={styles.priorityConnectorLine} />
                <View style={[styles.priorityConnectorDot, { backgroundColor: flow.green }]} />
              </View>
              <AddressBlock kind="Delivery" address={priority.deliveryAddress} explicitPostcode={priority.deliveryPostcode} alignRight />
            </View>

            <View style={styles.priorityDeadlineRow}>
              <Feather name="clock" size={11} color={flow.amber} />
              <Text style={styles.priorityDeadline}>{pickupCountdown}</Text>
            </View>

            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>{progress.label}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress.pct}%` }]} />
              </View>
              <Text style={styles.progressPct}>{progress.pct}%</Text>
            </View>

            <TouchableOpacity style={styles.continueDeliveryBtn} onPress={() => handleContinue(priority)} activeOpacity={0.88}>
              <Text style={styles.continueDeliveryText}>CONTINUE DELIVERY</Text>
              <Feather name="chevron-right" size={16} color={flow.onCyan} />
            </TouchableOpacity>
          </View>
        )}

        {upcoming.length > 0 && (
          <>
            <View style={styles.dashboardSectionHead}>
              <Feather name="calendar" size={11} color={flow.cyan} />
              <Text style={styles.dashboardSectionLabel}>UPCOMING DELIVERIES</Text>
              <TouchableOpacity style={styles.dashboardViewAllLink} onPress={() => router.push("/(tabs)/deliveries")}>
                <Text style={styles.dashboardViewAllText}>View all</Text>
                <Feather name="chevron-right" size={12} color={flow.cyan} />
              </TouchableOpacity>
            </View>
            {upcoming.map((order) => (
              <UpcomingDeliveryRow key={order.id} order={order} onStart={() => handleStartPickup(order)} />
            ))}
          </>
        )}

        {!priority && upcoming.length === 0 && (
          <View style={[styles.dashboardCard, styles.dashboardEmptyCard]}>
            <Feather name="inbox" size={22} color={flow.muted} />
            <Text style={styles.dashboardEmptyTitle}>No active deliveries</Text>
            <Text style={styles.dashboardEmptySub}>
              Accepted jobs will appear here. Go online and check Available Deliveries for new work.
            </Text>
          </View>
        )}

        <View style={[styles.dashboardCard, styles.todayEarningsCard]}>
          <View style={styles.todayEarningsHeader}>
            <Feather name="credit-card" size={14} color={flow.cyan} />
            <Text style={styles.todayEarningsTitle}>TODAY&apos;S EARNINGS</Text>
          </View>
          <Text style={styles.todayEarningsAmount}>£{earningsToday.toFixed(2)}</Text>
          <Text style={styles.todayEarningsSub}>
            {completedToday} {completedToday === 1 ? "delivery" : "deliveries"} completed today
          </Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

function DashboardStat({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <View style={styles.dashboardStat}>
      <Feather name={icon} size={11} color={color} style={styles.dashboardStatIcon} />
      <Text style={styles.dashboardStatLabel}>{label}</Text>
      <Text style={[styles.dashboardStatValue, { color: flow.text }]}>{value}</Text>
      <Text style={styles.dashboardStatSub}>{sub}</Text>
    </View>
  );
}

function UpcomingDeliveryRow({ order, onStart }: { order: any; onStart: () => void }) {
  const { currentOrderId } = useDelivery();
  const pickup = parseAddressLines(order.pickupAddress);
  const delivery = parseAddressLines(order.deliveryAddress);

  return (
    <View style={[styles.dashboardCard, styles.upcomingCard]}>
      <View style={styles.upcomingHeader}>
        <View style={styles.upcomingIcon}><Feather name="package" size={14} color={flow.cyan} /></View>
        <View style={styles.upcomingBody}>
          <Text style={styles.upcomingOrderId} numberOfLines={1}>{getDriverOrderNumber(order)}</Text>
          <Text style={styles.upcomingStatus}>
            {deliveryStatusLabel(order.status, currentOrderId, order.id)}
          </Text>
        </View>
        <Text style={styles.upcomingPrice}>£{Number(order.payout || 9.4).toFixed(2)}</Text>
      </View>

      <View style={styles.upcomingAddressGrid}>
        <View style={styles.upcomingAddressCol}>
          <Text style={styles.upcomingAddressLabel}>Pickup</Text>
          <Text style={styles.upcomingAddressStreet} numberOfLines={2}>{pickup.street}</Text>
          <Text style={styles.upcomingAddressMeta} numberOfLines={1}>{pickup.locality}</Text>
          <Text style={styles.upcomingAddressPostcode}>{pickup.postcode}</Text>
        </View>
        <View style={styles.upcomingAddressCol}>
          <Text style={[styles.upcomingAddressLabel, { textAlign: "right" }]}>Delivery</Text>
          <Text style={[styles.upcomingAddressStreet, { textAlign: "right" }]} numberOfLines={2}>{delivery.street}</Text>
          <Text style={[styles.upcomingAddressMeta, { textAlign: "right" }]} numberOfLines={1}>{delivery.locality}</Text>
          <Text style={[styles.upcomingAddressPostcode, { textAlign: "right" }]}>{delivery.postcode}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.startPickupBtn} onPress={onStart} activeOpacity={0.88}>
        <Feather name="navigation" size={12} color={flow.cyan} />
        <Text style={styles.startPickupText}>START PICKUP</Text>
        <Feather name="chevron-right" size={14} color={flow.cyan} />
      </TouchableOpacity>
    </View>
  );
}

type AvailableQueueOrder = {
  id: string;
  pickupAddress: string;
  pickupPostcode?: string | null;
  deliveryAddress: string;
  deliveryPostcode?: string | null;
  distance?: string | number | null;
  payout?: number;
  createdAt?: string;
  deliveryType?: string | null;
  orderNumber?: string;
  packageId?: string;
  scheduledPickup?: string;
};

function AvailableDeliveryCard({
  order,
  disabled,
  onAccept,
  onReject,
}: {
  order: AvailableQueueOrder;
  disabled?: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const tier = resolveServiceTier(order.deliveryType, {
    scheduledPickup: order.scheduledPickup,
  });
  const tierColor = serviceTierColor(tier);
  const pickupPc = extractPostcode(order.pickupAddress, order.pickupPostcode);
  const dropPc = extractPostcode(order.deliveryAddress, order.deliveryPostcode);

  return (
    <Card style={styles.dispatchCard}>
      <View style={styles.dispatchTopRow}>
        <Text style={styles.dispatchOrderId} numberOfLines={1}>
          {getDriverOrderNumber(order)}
        </Text>
        <View style={styles.dispatchTopMeta}>
          <View
            style={[
              styles.dispatchTierPill,
              { borderColor: `${tierColor}55`, backgroundColor: `${tierColor}14` },
            ]}
          >
            <Text style={[styles.dispatchTierText, { color: tierColor }]}>{tier}</Text>
          </View>
          <Text style={styles.dispatchEarnings}>£{Number(order.payout || 0).toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.dispatchRouteRow}>
        <Text style={styles.dispatchPostcode}>{pickupPc}</Text>
        <Feather name="arrow-right" size={12} color={flow.muted2} />
        <Text style={styles.dispatchPostcode}>{dropPc}</Text>
        <Text style={styles.dispatchAge}>{formatOrderAge(order.createdAt)}</Text>
      </View>

      <View style={styles.dispatchStatsRow}>
        <View style={styles.dispatchStat}>
          <Feather name="map" size={11} color={flow.cyan} />
          <Text style={styles.dispatchStatLabel}>DIST</Text>
          <Text style={styles.dispatchStatValue}>{formatTripDistance(order.distance)}</Text>
        </View>
        <View style={styles.dispatchStat}>
          <Feather name="clock" size={11} color={flow.cyan} />
          <Text style={styles.dispatchStatLabel}>DRIVE</Text>
          <Text style={styles.dispatchStatValue}>{formatTripEta(order.distance)}</Text>
        </View>
      </View>

      <View style={styles.dispatchActions}>
        <TouchableOpacity
          style={[styles.dispatchRejectBtn, disabled && styles.dispatchBtnDisabled]}
          onPress={onReject}
          disabled={disabled}
          activeOpacity={0.88}
        >
          <Feather name="x" size={14} color={flow.red} />
          <Text style={styles.dispatchRejectText}>REJECT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dispatchAcceptBtn, disabled && styles.dispatchBtnDisabled]}
          onPress={onAccept}
          disabled={disabled}
          activeOpacity={0.88}
        >
          <Feather name="check" size={14} color={flow.onCyan} />
          <Text style={styles.dispatchAcceptText}>ACCEPT</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

export function OrdersScreen() {
  const { incomingOrders, acceptOrder, rejectOrder, myDeliveries, refreshDeliveries } = useDelivery();
  const orders = incomingOrders;

  useFocusEffect(
    useCallback(() => {
      void refreshDeliveries();
    }, [refreshDeliveries])
  );
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const topInset = safeTop();
  const queueSubtitle =
    myDeliveries.length > 0
      ? `${orders.length} in queue · popups paused · accept compatible jobs here`
      : `${orders.length} in queue · scan route, earnings & distance`;

  async function handleAccept(order: (typeof incomingOrders)[0]) {
    await acceptOrder(order);
    setSuccessMessage(`Added to My Deliveries · accept more anytime`);
    setTimeout(() => setSuccessMessage(null), 1800);
  }

  return (
    <ScreenShell>
      {!!successMessage && (
        <View style={[styles.successBanner, { top: topInset + 8 }]}>
          <Feather name="check-circle" size={18} color={flow.green} />
          <Text style={styles.successBannerText}>{successMessage}</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={[styles.page, scrollPads()]} showsVerticalScrollIndicator={false}>
        <HeaderBar title="Available Deliveries" subtitle={queueSubtitle} />
        {orders.length === 0 ? (
          <View style={[styles.dashboardCard, styles.dashboardEmptyCard]}>
            <Feather name="package" size={22} color={flow.muted} />
            <Text style={styles.dashboardEmptyTitle}>No deliveries available</Text>
            <Text style={styles.dashboardEmptySub}>
              New jobs will appear here when dispatch assigns them to the queue.
            </Text>
          </View>
        ) : (
          orders.map((order) => (
            <AvailableDeliveryCard
              key={order.id}
              order={order}
              onAccept={() => handleAccept(order)}
              onReject={() => rejectOrder(order.id)}
            />
          ))
        )}
      </ScrollView>
    </ScreenShell>
  );
}

export function DeliveriesScreen() {
  const { driver, setOnline } = useAuth();
  const {
    myDeliveries,
    completedDeliveries,
    currentOrderId,
    startDelivery,
    todayEarnings,
    refreshDeliveries,
  } = useDelivery();

  useFocusEffect(
    useCallback(() => {
      void refreshDeliveries();
    }, [refreshDeliveries])
  );
  const [filter, setFilter] = React.useState<MyDeliveryFilter>("all");
  const topPad = safeTop() + 4;
  const bottomPad = safeBottom() + 46;
  const online = !!driver?.isOnline;
  const focusedOrderId = currentOrderId;

  const activeItems: MyDeliveryItem[] = myDeliveries.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    packageId: o.packageId,
    senderName: (o as MyDeliveryItem).senderName || o.recipientName,
    recipientName: o.recipientName,
    pickupAddress: o.pickupAddress,
    deliveryAddress: o.deliveryAddress,
    distance: o.distance,
    payout: o.payout,
    status: o.status,
    acceptedAt: (o as MyDeliveryItem).acceptedAt,
    scheduledPickup: (o as MyDeliveryItem).scheduledPickup,
  }));

  const completedItems: MyDeliveryItem[] = completedDeliveries.map((d) => ({
    id: d.orderId,
    orderNumber: d.orderNumber,
    packageId: d.packageId,
    senderName: d.recipientName,
    recipientName: d.recipientName || "Customer",
    pickupAddress: d.pickupAddress,
    deliveryAddress: d.deliveryAddress,
    distance: d.distance,
    payout: d.amount,
    status: "delivered",
    completedAt: new Date(d.date).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  const allItems = [...activeItems, ...completedItems];
  const stages = allItems.map((o) =>
    resolveWorkflowStage(o.status, { focusedOrderId, orderId: o.id })
  );

  const counts = {
    all: allItems.length,
    pickup_pending: stages.filter((s) => s === "Pickup Pending").length,
    in_progress: stages.filter(
      (s) => s === "Arrived At Pickup" || s === "En Route" || s === "Awaiting PIN"
    ).length,
    completed: stages.filter((s) => s === "Completed").length,
  };

  const filtered = allItems.filter((order, i) =>
    filterMatchesStage(filter, stages[i])
  );

  const earningsToday = todayEarnings;
  const datePart = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  async function handleAction(order: MyDeliveryItem) {
    const stage = resolveWorkflowStage(order.status, {
      focusedOrderId,
      orderId: order.id,
    });
    const action = getWorkflowAction(stage, order);
    if (action.focus) await startDelivery(order.id);
    workflowPush(action.path, order.id);
  }

  const tabs: { key: MyDeliveryFilter; label: string }[] = [
    { key: "all", label: `All (${counts.all})` },
    { key: "in_progress", label: `In Progress (${counts.in_progress})` },
    { key: "pickup_pending", label: `Pickup Pending (${counts.pickup_pending})` },
    { key: "completed", label: `Completed (${counts.completed})` },
  ];

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={[styles.myDeliveriesPage, { paddingTop: topPad, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <DriverHeaderStrip driver={driver} online={online} onToggleOnline={setOnline} />

        <View style={styles.myDeliveriesTitleRow}>
          <View style={styles.myDeliveriesTitleBlock}>
            <Text style={styles.myDeliveriesTitle}>My Deliveries</Text>
            <Text style={styles.myDeliveriesSubtitle}>All accepted deliveries for today.</Text>
          </View>
          <View style={styles.myDeliveriesDateRow}>
            <Feather name="calendar" size={13} color={flow.cyan} />
            <Text style={styles.myDeliveriesDateText}>Today, {datePart}</Text>
            <Feather name="chevron-down" size={14} color={flow.muted} />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.myDeliveriesTabs}>
          {tabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.myDeliveriesTab, active && styles.myDeliveriesTabActive]}
                onPress={() => setFilter(tab.key)}
                activeOpacity={0.88}
              >
                <Text style={[styles.myDeliveriesTabText, active && styles.myDeliveriesTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filtered.map((order) => {
          const stage = resolveWorkflowStage(order.status, {
            focusedOrderId,
            orderId: order.id,
          });
          return (
            <MyDeliveryCard
              key={order.id}
              order={order}
              stage={stage}
              onAction={() => handleAction(order)}
            />
          );
        })}

        <TouchableOpacity
          style={styles.myDeliveriesEarningsCard}
          onPress={() => router.push("/(tabs)/earnings")}
          activeOpacity={0.88}
        >
          <View style={styles.myDeliveriesEarningsLeft}>
            <Feather name="credit-card" size={14} color={flow.cyan} />
            <View>
              <Text style={styles.myDeliveriesEarningsTitle}>Today&apos;s Earnings</Text>
              <Text style={styles.myDeliveriesEarningsSub}>From completed deliveries</Text>
            </View>
          </View>
          <View style={styles.myDeliveriesEarningsRight}>
            <Text style={styles.myDeliveriesEarningsAmount}>£{earningsToday.toFixed(2)}</Text>
            <Feather name="chevron-right" size={14} color={flow.cyan} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

function DeliveryCard({ order, status, compact, accent = flow.cyan }: { order: any; status: string; compact?: boolean; accent?: string }) {
  return (
    <Card style={{ gap: compact ? 6 : 10, marginBottom: 10 }}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.name}>{order.recipientName || "Sarah Jenkins"}</Text>
          <Text style={styles.muted}>{getDriverOrderNumber(order)} • {order.distance || "3.7 km"}</Text>
        </View>
        <Text style={[styles.price, { color: accent }]}>£{Number(order.payout || 9.4).toFixed(2)}</Text>
      </View>
      <RouteSummary from={order.pickupAddress} to={order.deliveryAddress} compact />
      <View style={styles.rowBetween}>
        <StatusPill label={status} color={status === "En Route" ? flow.green : accent} />
        <Feather name="chevron-right" size={20} color={flow.cyan} />
      </View>
    </Card>
  );
}

export function DeliveryDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { startDelivery, currentOrderId } = useDelivery();
  const order = useOrderFromParam(id);
  if (!order) return null;
  const stage = resolveWorkflowStage(order.status, { focusedOrderId: currentOrderId, orderId: order.id });
  const action = getWorkflowAction(stage, order);

  async function handleAction() {
    if (action.focus) await startDelivery(order.id);
    workflowPush(action.path, order.id);
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={[styles.page, scrollPads()]} showsVerticalScrollIndicator={false}>
        <HeaderBar
          title="Delivery Details"
          subtitle={getDriverOrderNumber(order)}
          onBack={() => router.back()}
          right={<StatusPill label={stage} color={workflowStageColor(stage)} />}
        />
        <Card style={{ gap: 12 }}>
          <View style={styles.customerRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(order.recipientName || "E").charAt(0)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{order.recipientName || "Customer"}</Text>
              <Text style={styles.muted}>{order.recipientPhone || order.customerPhone || ""}</Text>
            </View>
            <Feather name="phone" size={18} color={flow.cyan} />
          </View>
          <RouteSummary from={order.pickupAddress} to={order.deliveryAddress} />
          <View style={styles.dashboardStats}>
            <Metric label="Earnings" value={`£${Number(order.payout || 9.4).toFixed(2)}`} color={flow.green} />
            <Metric label="Distance" value={order.distance || "3.7 km"} />
            <Metric label="ETA" value={estimateEta(order.distance)} />
          </View>
        </Card>
        <PrimaryButton label={action.label} icon="arrow-right" onPress={handleAction} />
      </ScrollView>
    </ScreenShell>
  );
}

export function PickupNavigationScreen() {
  const order = useWorkflowOrder();
  const { startDelivery, recordOrderEvent } = useDelivery();
  if (!order) return null;
  const statusLabel: WorkflowStage = "Pickup Pending";
  const pickup = parseAddressLines(order.pickupAddress, "Address pending", "", order.pickupPostcode);
  const pickupMapsQuery = formatMapsAddress(order.pickupAddress, order.pickupPostcode);
  const pickupDistance = order.distance || "4.2 miles";
  const travelTime = estimateTravelMinutes(pickupDistance);
  const instructions =
    order.pickupInstructions?.trim() ||
    "Please report to the reception desk and show your Driver ID. Collection point is at the loading bay on the right-hand side.";
  const senderName = order.senderName || order.recipientName || "Sender";
  const senderPhone = order.senderPhone || order.recipientPhone || order.customerPhone || "";

  async function handleStartNavigation() {
    try {
      await recordOrderEvent(order.id, "heading_to_pickup");
      await openMapsNavigation(mapsTargetFromPickup(order));
    } catch {
      Alert.alert("Unable to open maps", "Please check that a maps app is installed on your device.");
    }
  }

  function handleArrivalAtPickup() {
    Alert.alert(
      "Have you arrived at the pickup location?",
      undefined,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await recordOrderEvent(order.id, "arrived_pickup");
              await startDelivery(order.id);
              workflowPush("/pickup-verification", order.id);
            } catch {
              Alert.alert("Update failed", "Could not record arrival at pickup. Please try again.");
            }
          },
        },
      ]
    );
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={[styles.page, scrollPads(28)]} showsVerticalScrollIndicator={false}>
        <HeaderBar title="Pickup Details" onBack={() => router.back()} />

        <View style={styles.pickupOrderCard}>
          <View style={styles.pickupOrderIcon}>
            <Feather name="package" size={18} color={flow.cyan} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.pickupOrderLabel}>ORDER ID</Text>
            <Text style={styles.pickupOrderId}>{getDriverOrderNumber(order)}</Text>
          </View>
          <View style={[styles.pickupStatusBadge, { borderColor: `${workflowStageColor(statusLabel)}66` }]}>
            <Text style={[styles.pickupStatusText, { color: workflowStageColor(statusLabel) }]}>
              {statusLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.pickupSectionCard}>
          <View style={styles.pickupSectionHead}>
            <View style={styles.pickupSectionDot} />
            <Text style={styles.pickupSectionTitle}>PICKUP LOCATION</Text>
          </View>

          <View style={styles.pickupSenderRow}>
            <Feather name="user" size={14} color={flow.muted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pickupSenderLabel}>Sender Name</Text>
              <Text style={styles.pickupSenderValue}>{senderName}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.pickupSenderRow}
            onPress={() => Linking.openURL(`tel:${senderPhone.replace(/\s/g, "")}`)}
            activeOpacity={0.86}
          >
            <Feather name="phone" size={14} color={flow.muted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pickupSenderLabel}>Sender Phone</Text>
              <Text style={styles.pickupSenderValue}>{senderPhone}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.pickupSenderRow}>
            <Feather name="map-pin" size={14} color={flow.muted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pickupSenderLabel}>Pickup Address</Text>
              <Text style={styles.pickupAddressStreet}>{pickup.street}</Text>
              <Text style={styles.pickupAddressMeta}>{pickup.locality}</Text>
              <Text style={styles.pickupAddressMeta}>United Kingdom</Text>
              <Text style={styles.pickupAddressPostcode}>{pickup.postcode}</Text>
            </View>
          </View>

          <MiniMap destination={pickupMapsQuery} />
        </View>

        <View style={styles.pickupSectionCard}>
          <View style={styles.pickupSectionHead}>
            <Feather name="package" size={12} color={flow.cyan} />
            <Text style={styles.pickupSectionTitle}>PICKUP INSTRUCTIONS</Text>
          </View>
          <Text style={styles.pickupInstructionsText}>{instructions}</Text>
        </View>

        <View style={styles.pickupStatsRow}>
          <View style={styles.pickupStatCol}>
            <Feather name="navigation" size={13} color={flow.cyan} />
            <Text style={styles.pickupStatLabel}>DISTANCE</Text>
            <Text style={styles.pickupStatValue}>{pickupDistance}</Text>
          </View>
          <View style={styles.pickupStatDivider} />
          <View style={styles.pickupStatCol}>
            <Feather name="clock" size={13} color={flow.cyan} />
            <Text style={styles.pickupStatLabel}>ESTIMATED TIME</Text>
            <Text style={styles.pickupStatValue}>{travelTime}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.pickupNavBtn} onPress={handleStartNavigation} activeOpacity={0.88}>
          <Feather name="navigation" size={16} color={flow.onCyan} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pickupNavBtnTitle}>START NAVIGATION</Text>
            <Text style={styles.pickupNavBtnSub}>Open in {mapsAppLabel()}</Text>
          </View>
          <Feather name="chevron-right" size={16} color={flow.onCyan} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.pickupArrivalBtn} onPress={handleArrivalAtPickup} activeOpacity={0.88}>
          <Feather name="check-circle" size={16} color={flow.cyan} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pickupArrivalBtnTitle}>ARRIVAL AT PICKUP</Text>
            <Text style={styles.pickupArrivalBtnSub}>I have arrived at the pickup location</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.pickupFooterNote}>
          <Feather name="lock" size={11} color={flow.muted2} />
          <Text style={styles.pickupFooterText}>
            Please ensure you have arrived at the correct location before marking as arrived.
          </Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

export function CustomerNavigationScreen() {
  const order = useWorkflowOrder();
  const { recordOrderEvent } = useDelivery();
  if (!order) return null;
  const delivery = parseAddressLines(order.deliveryAddress, "Address pending", "", order.deliveryPostcode);
  const deliveryMapsQuery = formatMapsAddress(order.deliveryAddress, order.deliveryPostcode);
  const receiverName = order.recipientName || "Customer";
  const receiverPhone = order.recipientPhone || order.customerPhone || "";
  const orderCode = getDriverOrderNumber(order);
  const tripDistance = order.distance || "4.3 mi";
  const travelTime = estimateTravelMinutes(tripDistance);

  async function handleOpenNavigation() {
    try {
      await recordOrderEvent(order.id, "en_route");
      await openMapsNavigation(mapsTargetFromDelivery(order));
    } catch {
      Alert.alert("Unable to open maps", "Please check that a maps app is installed on your device.");
    }
  }

  function handleArrivalAtDelivery() {
    Alert.alert(
      "Have you arrived at the delivery location?",
      undefined,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await recordOrderEvent(order.id, "arriving");
              workflowPush("/customer-proof", order.id);
            } catch {
              Alert.alert("Update failed", "Could not record arrival at delivery. Please try again.");
            }
          },
        },
      ]
    );
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={[styles.page, scrollPads(28)]} showsVerticalScrollIndicator={false}>
        <HeaderBar title="En Route to Delivery" onBack={() => router.back()} />

        <View style={styles.deliveryNavOrderCard}>
          <View style={styles.deliveryNavOrderRow}>
            <View style={styles.deliveryNavOrderIcon}>
              <Feather name="package" size={16} color={flow.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryNavOrderLabel}>ORDER ID</Text>
              <Text style={styles.deliveryNavOrderValue}>{orderCode}</Text>
            </View>
            <View style={[styles.deliveryNavStatusBadge, { borderColor: `${flow.cyan}66` }]}>
              <Text style={[styles.deliveryNavStatusText, { color: flow.cyan }]}>PICKED UP</Text>
            </View>
          </View>
        </View>

        <View style={styles.deliveryNavSectionCard}>
          <View style={styles.deliveryNavSectionHead}>
            <View style={styles.deliveryNavSectionDot} />
            <Text style={styles.deliveryNavSectionTitle}>DELIVERY DETAILS</Text>
          </View>

          <View style={styles.deliveryNavInfoRow}>
            <Feather name="user" size={14} color={flow.muted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryNavInfoLabel}>Receiver Name</Text>
              <Text style={styles.deliveryNavInfoValue}>{receiverName}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.deliveryNavInfoRow}
            onPress={() => Linking.openURL(`tel:${receiverPhone.replace(/\s/g, "")}`)}
            activeOpacity={0.86}
          >
            <Feather name="phone" size={14} color={flow.muted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryNavInfoLabel}>Receiver Phone</Text>
              <Text style={styles.deliveryNavInfoValue}>{receiverPhone}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.deliveryNavInfoRow}>
            <Feather name="map-pin" size={14} color={flow.muted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryNavInfoLabel}>Delivery Address</Text>
              <Text style={styles.deliveryNavAddressStreet}>{delivery.street}</Text>
              <Text style={styles.deliveryNavAddressMeta}>{delivery.locality}</Text>
              <Text style={styles.deliveryNavAddressPostcode}>{delivery.postcode}</Text>
            </View>
          </View>
        </View>

        <View style={styles.deliveryNavDestinationCard}>
          <View style={styles.deliveryNavDestinationTop}>
            <Feather name="map-pin" size={16} color={flow.cyan} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.deliveryNavDestinationLabel}>En Route to Delivery</Text>
              <Text style={styles.deliveryNavDestinationStreet}>{delivery.street}</Text>
              <Text style={styles.deliveryNavDestinationMeta}>{delivery.locality}</Text>
            </View>
            <Feather name="navigation" size={16} color={flow.cyan} />
          </View>
          <View style={styles.deliveryNavMapWrap}>
            <MiniMap destination={deliveryMapsQuery} />
          </View>
        </View>

        <View style={styles.deliveryNavStatsRow}>
          <View style={styles.deliveryNavStatCol}>
            <Text style={styles.deliveryNavStatHighlight}>{travelTime}</Text>
            <Text style={styles.deliveryNavStatSub}>{tripDistance} · Fastest route</Text>
          </View>
          <View style={styles.deliveryNavStatDivider} />
          <View style={styles.deliveryNavStatCol}>
            <View style={styles.deliveryNavTrafficRow}>
              <Feather name="truck" size={12} color={flow.green} />
              <Text style={styles.deliveryNavTrafficText}>Light traffic</Text>
            </View>
            <Text style={styles.deliveryNavStatSub}>via main route</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.pickupNavBtn} onPress={handleOpenNavigation} activeOpacity={0.88}>
          <Feather name="navigation" size={16} color={flow.onCyan} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pickupNavBtnTitle}>OPEN NAVIGATION</Text>
            <Text style={styles.pickupNavBtnSub}>Open in {mapsAppLabel()}</Text>
          </View>
          <Feather name="chevron-right" size={16} color={flow.onCyan} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.deliveryNavArrivalBtn} onPress={handleArrivalAtDelivery} activeOpacity={0.88}>
          <Feather name="check-circle" size={16} color={flow.onCyan} />
          <Text style={styles.deliveryNavArrivalText}>ARRIVAL AT DELIVERY</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

export function PickupVerificationScreen() {
  const order = useWorkflowOrder();
  const { recordOrderEvent } = useDelivery();
  const orderId = order?.id;
  const [photoUri, setPhotoUri] = useState("");
  const [signatureUri, setSignatureUri] = useState<string | null>(null);
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const senderName = order?.senderName || order?.recipientName || "Sender";
  const orderCode = order ? getDriverOrderNumber(order) : "";
  const canConfirm = !!photoUri && signatureSaved && !!signatureUri;

  React.useEffect(() => {
    if (!orderId) return;
    let active = true;
    (async () => {
      const proof = await getPickupProof(orderId);
      if (!active || !proof) return;
      if (proof.photoUri) setPhotoUri(proof.photoUri);
      if (proof.signatureImageUri) {
        setSignatureUri(proof.signatureImageUri);
        setSignatureSaved(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId]);

  if (!order) return null;

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return Alert.alert("Camera required", "Camera access is needed.");
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      await savePickupPhoto(order.id, uri);
    }
  }

  async function handleSaveSignature(uri: string) {
    const timestamp = new Date().toISOString();
    await savePickupSignature(order.id, uri, timestamp);
    setSignatureUri(uri);
    setSignatureSaved(true);
  }

  function handleClearSignature() {
    setSignatureUri(null);
    setSignatureSaved(false);
  }

  async function confirm() {
    if (!canConfirm || !signatureUri) {
      Alert.alert("Incomplete pickup", "Capture the parcel photo and save the sender signature first.");
      return;
    }

    setIsConfirming(true);
    try {
      logConfirmPickup("start", { orderId: order.id });

      logConfirmPickup("pickup_photo_upload_start", { orderId: order.id });
      const pickupPhotoUrl = await uploadPickupPhoto(order.id, photoUri);
      console.log("[ConfirmPickup] uploaded pickup photo URL:", pickupPhotoUrl);
      logConfirmPickup("pickup_photo_upload_ok", { url: pickupPhotoUrl });

      logConfirmPickup("pickup_signature_upload_start", { orderId: order.id });
      const signatureUrl = await uploadPickupSignature(order.id, signatureUri);
      console.log("[ConfirmPickup] uploaded pickup signature URL:", signatureUrl);
      logConfirmPickup("pickup_signature_upload_ok", { url: signatureUrl });

      const dbPayload = {
        pickup_photo_url: pickupPhotoUrl,
        signature_url: signatureUrl,
      };
      console.log("[ConfirmPickup] database update payload:", dbPayload);
      logConfirmPickup("database_update_payload", dbPayload);

      const now = new Date().toISOString();
      await savePickupProof({
        orderId: order.id,
        signatureImageUri: signatureUri,
        signatureTimestamp: now,
        photoUri: pickupPhotoUrl,
        photoTimestamp: now,
      });

      await recordOrderEvent(order.id, "collected", dbPayload);
      logConfirmPickup("database_update_ok", { orderId: order.id });
      await recordOrderEvent(order.id, "en_route");
      try {
        await openMapsNavigation(mapsTargetFromDelivery(order));
      } catch {
        // Maps may be unavailable on web/simulator — still continue to delivery navigation.
      }
      router.replace({ pathname: "/navigate-customer", params: { id: order.id } });
    } catch (error) {
      const message = supabaseErrorMessage(error);
      logConfirmPickup("failed", message);
      Alert.alert("Pickup failed", message);
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={[styles.page, scrollPads(28)]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
      >
        <HeaderBar title="Pickup Confirmation" onBack={() => router.back()} />

        <View style={styles.pickupConfirmCard}>
          <View style={styles.pickupConfirmRow}>
            <View style={styles.pickupConfirmIcon}>
              <Feather name="user" size={16} color={flow.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pickupConfirmLabel}>SENDER NAME</Text>
              <Text style={styles.pickupConfirmValue}>{senderName}</Text>
            </View>
          </View>
          <View style={styles.pickupConfirmDivider} />
          <View style={styles.pickupConfirmRow}>
            <View style={styles.pickupConfirmIcon}>
              <Feather name="package" size={16} color={flow.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pickupConfirmLabel}>ORDER ID</Text>
              <Text style={styles.pickupConfirmValue}>{orderCode}</Text>
            </View>
          </View>
        </View>

        <View style={styles.pickupConfirmCard}>
          <View style={styles.pickupConfirmSectionHead}>
            <Text style={styles.pickupConfirmSectionTitle}>PACKAGE PHOTO</Text>
            <TouchableOpacity style={styles.pickupConfirmCameraBtn} onPress={takePhoto} activeOpacity={0.88}>
              <Feather name="camera" size={14} color={flow.cyan} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.pickupConfirmPhotoBox} onPress={takePhoto} activeOpacity={0.88}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.pickupConfirmPhoto} resizeMode="cover" />
            ) : (
              <View style={styles.pickupConfirmPhotoEmpty}>
                <Feather name="camera" size={28} color={flow.muted} />
                <Text style={styles.pickupConfirmPhotoHint}>Tap to capture parcel photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.pickupConfirmCard}>
          <View style={styles.pickupConfirmSectionHead}>
            <Text style={styles.pickupConfirmSectionTitle}>SENDER SIGNATURE</Text>
            {signatureSaved ? (
              <TouchableOpacity onPress={handleClearSignature} activeOpacity={0.88}>
                <Text style={styles.pickupConfirmClearLink}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <SignaturePad
            key={`${order.id}-${signatureSaved ? "saved" : "draft"}-${signatureUri ?? "none"}`}
            savedUri={signatureUri}
            onSave={handleSaveSignature}
            onClear={handleClearSignature}
            onSigningChange={(signing) => setScrollEnabled(!signing)}
            storageFolder="pickup-signatures"
            height={170}
          />
          <View style={styles.pickupConfirmDisclaimer}>
            <Feather name="shield" size={12} color={flow.cyan} />
            <Text style={styles.pickupConfirmDisclaimerText}>
              By signing above, the sender confirms that the package has been handed over in good condition.
            </Text>
          </View>
        </View>

        <PrimaryButton
          label="CONFIRM PICKUP"
          tone="cyan"
          icon="check-circle"
          onPress={confirm}
          disabled={!canConfirm || isConfirming}
        />
      </ScrollView>
    </ScreenShell>
  );
}

export function AfterPickupScreen() {
  const order = useWorkflowOrder();
  React.useEffect(() => {
    if (!order) return;
    router.replace({ pathname: "/navigate-customer", params: { id: order.id } });
  }, [order]);
  return (
    <ScreenShell>
      <View style={[styles.page, styles.center, { paddingTop: safeTop(), paddingBottom: safeBottom() + 18 }]}>
        <ActivityIndicator size="large" color={flow.cyan} />
      </View>
    </ScreenShell>
  );
}

export function CustomerPinScreen() {
  return <DeliveryConfirmationScreen />;
}

export function DeliveryConfirmationScreen() {
  const order = useWorkflowOrder();
  const { completeDelivery, recordOrderEvent } = useDelivery();
  const orderId = order?.id;
  const [pin, setPin] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState("");
  const [expectedPin, setExpectedPin] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(true);
  const [pinVerifying, setPinVerifying] = useState(false);
  const [signatureUri, setSignatureUri] = useState<string | null>(null);
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [photoUri, setPhotoUri] = useState("");
  const [photoRemoteUrl, setPhotoRemoteUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const pinInputRef = React.useRef<TextInput>(null);

  const senderName = order?.senderName || order?.recipientName || "Sender";
  const receiverName = order?.recipientName || "Customer";
  const receiverPhone = order?.recipientPhone || order?.customerPhone || "";
  const orderCode = order ? getDriverOrderNumber(order) : "";
  const displayPhotoUri = photoRemoteUrl || photoUri;
  const canComplete =
    pinVerified && signatureSaved && !!signatureUri && !!photoRemoteUrl && !photoUploading;

  React.useEffect(() => {
    if (!orderId) return;
    let active = true;

    (async () => {
      setPinLoading(true);
      setPinError("");
      const result = await fetchOrderDeliveryConfirmationPin(orderId);
      if (!active) return;

      if (result.pin) {
        setExpectedPin(result.pin);
      } else {
        setExpectedPin(null);
        setPinError(result.error || "Unable to load delivery PIN for this order.");
      }
      setPinLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [orderId]);

  React.useEffect(() => {
    if (!orderId) return;
    let active = true;
    (async () => {
      const proof = await getDeliveryProof(orderId);
      if (!active || !proof) return;
      if (proof.pinVerifiedAt) setPinVerified(true);
      if (proof.signatureImageUri) {
        setSignatureUri(proof.signatureImageUri);
        setSignatureSaved(true);
      }
      if (proof.photoUri || proof.photoRemoteUrl) {
        const display = deliveryPhotoDisplayUri(proof);
        setPhotoUri(display);
        if (proof.photoRemoteUrl) setPhotoRemoteUrl(proof.photoRemoteUrl);
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId]);

  if (!order) return null;

  async function verifyPin() {
    if (pinVerified || pinVerifying) return;

    if (pin.length !== 6) {
      setPinError("Enter the full 6-digit code.");
      return;
    }

    if (pinLoading) {
      setPinError("Loading delivery PIN. Please wait.");
      return;
    }

    if (!expectedPin) {
      setPinError("Unable to load delivery PIN for this order.");
      return;
    }

    setPinVerifying(true);
    setPinError("");

    const entered = pin.replace(/\D/g, "").slice(0, 6);
    const latest = await fetchOrderDeliveryConfirmationPin(order.id);
    const storedPin = latest.pin ?? expectedPin;

    if (!storedPin) {
      setPinVerifying(false);
      setPinError(latest.error || "Unable to load delivery PIN for this order.");
      return;
    }

    setExpectedPin(storedPin);

    if (entered !== storedPin) {
      setPinVerifying(false);
      setPinError("Invalid PIN");
      setPin("");
      return;
    }

    setPinError("");
    setPinVerified(true);
    setPinVerifying(false);
    pinInputRef.current?.blur();

    try {
      await recordOrderEvent(order.id, "pin_verified");
    } catch {
      setPinVerified(false);
      setPinError("PIN verified locally but failed to sync. Please try again.");
    }
  }

  async function handleSaveSignature(uri: string) {
    setSignatureUri(uri);
    setSignatureSaved(true);
  }

  function handleClearSignature() {
    setSignatureUri(null);
    setSignatureSaved(false);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return Alert.alert("Camera required", "Camera access is needed.");
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [4, 3] });
    if (result.canceled || !result.assets[0]) return;

    const localUri = result.assets[0].uri;
    setPhotoUri(localUri);
    setPhotoRemoteUrl(null);
    setPhotoUploadError("");
    setPhotoUploading(true);

    try {
      const remoteUrl = await uploadDeliveryPhoto(order.id, localUri);
      setPhotoRemoteUrl(remoteUrl);
      setPhotoUri(remoteUrl);
      const now = new Date().toISOString();
      await saveDeliveryProof({
        orderId: order.id,
        photoUri: remoteUrl,
        photoRemoteUrl: remoteUrl,
        photoTimestamp: now,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload delivery photo. Please try again.";
      setPhotoUploadError(message);
      setPhotoUri("");
      setPhotoRemoteUrl(null);
      Alert.alert("Upload error", message);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleComplete() {
    if (!pinVerified) {
      Alert.alert("PIN not verified");
      return;
    }
    if (!signatureSaved || !signatureUri) {
      Alert.alert("Signature required");
      return;
    }
    if (!photoUri && !photoRemoteUrl) {
      Alert.alert("Delivery photo required");
      return;
    }

    setIsCompleting(true);
    setPhotoUploadError("");

    try {
      let uploadedUrl = photoRemoteUrl;
      if (!uploadedUrl) {
        setPhotoUploading(true);
        logCompleteDelivery("photo_upload_start", { orderId: order.id });
        try {
          uploadedUrl = await uploadDeliveryPhoto(order.id, photoUri);
          logCompleteDelivery("photo_upload_ok", { url: uploadedUrl });
          setPhotoRemoteUrl(uploadedUrl);
          setPhotoUri(uploadedUrl);
        } catch (error) {
          const message = supabaseErrorMessage(error);
          logCompleteDelivery("photo_upload_failed", message);
          setPhotoUploadError(message);
          Alert.alert("Upload error", message);
          return;
        } finally {
          setPhotoUploading(false);
        }
      } else {
        logCompleteDelivery("photo_upload_skipped", "Using existing remote URL");
      }

      logCompleteDelivery("receiver_signature_upload_start", { orderId: order.id });
      const receiverSignatureUrl = await uploadDeliverySignature(order.id, signatureUri);
      console.log("[CompleteDelivery] uploaded receiver signature URL:", receiverSignatureUrl);
      logCompleteDelivery("receiver_signature_upload_ok", { url: receiverSignatureUrl });

      const now = new Date().toISOString();
      logCompleteDelivery("save_local_proof");
      await saveDeliveryProof({
        orderId: order.id,
        pinVerifiedAt: now,
        signatureImageUri: signatureUri,
        signatureTimestamp: now,
        photoUri: uploadedUrl,
        photoRemoteUrl: uploadedUrl,
        photoTimestamp: now,
      });
      logCompleteDelivery("save_local_proof_ok");

      await completeDelivery(order, uploadedUrl, receiverSignatureUrl);
      router.replace({ pathname: "/complete-delivery", params: { id: order.id } });
    } catch (error) {
      const message = supabaseErrorMessage(error);
      logCompleteDelivery("flow_failed", message);
      Alert.alert("Delivery failed", message);
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={[styles.page, scrollPads(28)]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
      >
        <HeaderBar title="Delivery Confirmation" onBack={() => router.back()} />

        <View style={styles.deliveryConfirmCard}>
          <View style={styles.deliveryConfirmRow}>
            <View style={styles.deliveryConfirmIcon}>
              <Feather name="user" size={16} color={flow.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryConfirmLabel}>SENDER</Text>
              <Text style={styles.deliveryConfirmValue}>{senderName}</Text>
              <Text style={styles.deliveryConfirmSub}>Order ID: {orderCode}</Text>
            </View>
          </View>
          <View style={styles.deliveryConfirmDivider} />
          <View style={styles.deliveryConfirmRow}>
            <View style={styles.deliveryConfirmIcon}>
              <Feather name="user" size={16} color={flow.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryConfirmLabel}>RECEIVER NAME</Text>
              <Text style={styles.deliveryConfirmValue}>{receiverName}</Text>
            </View>
          </View>
          <View style={styles.deliveryConfirmDivider} />
          <TouchableOpacity
            style={styles.deliveryConfirmRow}
            onPress={() => Linking.openURL(`tel:${receiverPhone.replace(/\s/g, "")}`)}
            activeOpacity={0.86}
          >
            <View style={styles.deliveryConfirmIcon}>
              <Feather name="phone" size={16} color={flow.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryConfirmLabel}>RECEIVER PHONE</Text>
              <Text style={styles.deliveryConfirmValue}>{receiverPhone}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.deliveryConfirmCard}>
          <View style={styles.deliveryConfirmVerifyHead}>
            <Feather name="shield" size={14} color={flow.cyan} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryConfirmSectionTitle}>DELIVERY VERIFICATION</Text>
              <Text style={styles.deliveryConfirmInstruction}>Please ask the receiver for the 6-digit code</Text>
              <Text style={styles.deliveryConfirmSub}>The code was sent to the receiver&apos;s phone</Text>
            </View>
            {pinVerified ? <Feather name="check-circle" size={18} color={flow.green} /> : null}
          </View>

          <Text style={styles.deliveryConfirmPinTitle}>ENTER 6-DIGIT CODE</Text>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => !pinVerified && pinInputRef.current?.focus()}
          >
            <View style={styles.deliveryConfirmPinRow}>
              {Array.from({ length: 6 }).map((_, index) => (
                <View key={index} style={[styles.deliveryConfirmPinBox, pinVerified && styles.deliveryConfirmPinBoxDone]}>
                  <Text style={styles.deliveryConfirmPinChar}>{pin[index] || "—"}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
          <TextInput
            ref={pinInputRef}
            value={pin}
            onChangeText={(value) => {
              if (pinVerified) return;
              setPin(value.replace(/\D/g, "").slice(0, 6));
              setPinError("");
            }}
            keyboardType="number-pad"
            maxLength={6}
            editable={!pinVerified}
            style={styles.deliveryConfirmHiddenInput}
            caretHidden
          />
          {pinError ? <Text style={styles.deliveryConfirmPinError}>{pinError}</Text> : null}
          {pinLoading ? (
            <Text style={styles.deliveryConfirmSub}>Loading delivery PIN...</Text>
          ) : null}
          {!pinVerified ? (
            <PrimaryButton
              label={pinVerifying ? "VERIFYING..." : "VERIFY PIN"}
              onPress={() => void verifyPin()}
              disabled={pin.length !== 6 || pinLoading || !expectedPin || pinVerifying}
            />
          ) : (
            <Text style={styles.deliveryConfirmPinSuccess}>PIN verified successfully</Text>
          )}
        </View>

        <View style={[styles.deliveryConfirmCard, !pinVerified && styles.deliveryConfirmLockedSection]}>
          <View style={styles.deliveryConfirmSectionHead}>
            <Text style={styles.deliveryConfirmSectionTitle}>RECEIVER SIGNATURE</Text>
            {signatureSaved ? (
              <TouchableOpacity onPress={handleClearSignature} activeOpacity={0.88} disabled={!pinVerified}>
                <Text style={styles.deliveryConfirmClearLink}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <SignaturePad
            key={`${order.id}-delivery-sig-${signatureSaved ? "saved" : "draft"}-${signatureUri ?? "none"}`}
            savedUri={signatureUri}
            onSave={handleSaveSignature}
            onClear={handleClearSignature}
            disabled={!pinVerified}
            onSigningChange={(signing) => setScrollEnabled(!signing)}
            storageFolder="delivery-signatures"
            height={170}
          />
        </View>

        <View style={styles.deliveryConfirmCard}>
          <View style={styles.deliveryConfirmSectionHead}>
            <Text style={styles.deliveryConfirmSectionTitle}>DELIVERY PHOTO</Text>
            <TouchableOpacity style={styles.pickupConfirmCameraBtn} onPress={takePhoto} activeOpacity={0.88}>
              <Feather name="camera" size={14} color={flow.cyan} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.pickupConfirmPhotoBox}
            onPress={takePhoto}
            activeOpacity={0.88}
            disabled={photoUploading}
          >
            {displayPhotoUri ? (
              <Image source={{ uri: displayPhotoUri }} style={styles.pickupConfirmPhoto} resizeMode="cover" />
            ) : (
              <View style={styles.pickupConfirmPhotoEmpty}>
                {photoUploading ? (
                  <ActivityIndicator color={flow.cyan} />
                ) : (
                  <Feather name="camera" size={28} color={flow.muted} />
                )}
                <Text style={styles.pickupConfirmPhotoHint}>
                  {photoUploading ? "Uploading photo..." : "Tap to capture delivery photo"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {photoUploadError ? (
            <Text style={styles.deliveryConfirmPinError}>{photoUploadError}</Text>
          ) : null}
          {photoRemoteUrl && !photoUploading ? (
            <Text style={styles.deliveryConfirmPinSuccess}>Photo uploaded successfully</Text>
          ) : null}
        </View>

        <View style={styles.deliveryConfirmDisclaimer}>
          <Feather name="shield" size={12} color={flow.cyan} />
          <Text style={styles.deliveryConfirmDisclaimerText}>
            By completing the delivery, you confirm the package has been handed over to the receiver in good condition.
          </Text>
        </View>

        <PrimaryButton
          label="COMPLETE DELIVERY"
          tone="cyan"
          icon="check-circle"
          onPress={handleComplete}
          disabled={!canComplete || isCompleting}
        />
      </ScrollView>
    </ScreenShell>
  );
}

export function CustomerProofScreen() {
  return <DeliveryConfirmationScreen />;
}

function formatDeliveryCompletedAt(dateStr?: string) {
  const parsed = dateStr ? new Date(dateStr) : new Date();
  const value = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const datePart = value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = value.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} • ${timePart}`;
}

function DeliverySummaryRow({
  icon,
  label,
  value,
  valueColor,
  multiline,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.deliveryCompletedSummaryRow}>
      <View style={styles.deliveryCompletedSummaryIcon}>
        <Feather name={icon} size={14} color={flow.cyan} />
      </View>
      <Text style={styles.deliveryCompletedSummaryLabel}>{label}</Text>
      <Text
        style={[
          styles.deliveryCompletedSummaryValue,
          multiline && styles.deliveryCompletedSummaryValueMulti,
          valueColor ? { color: valueColor } : null,
        ]}
        numberOfLines={multiline ? 3 : 1}
      >
        {value}
      </Text>
    </View>
  );
}

export function CompleteDeliveryScreen() {
  const order = useWorkflowOrder();
  const { completedDeliveries, availableBalance } = useDelivery();
  if (!order) return null;

  const completedRecord =
    completedDeliveries.find((d) => d.orderId === order.id) ||
    completedDeliveries.find((d) => d.packageId === order.packageId) ||
    completedDeliveries[0];
  const deliveryEarnings = Number(order.payout || completedRecord?.amount || 9.4);
  const newBalance = availableBalance;
  const previousBalance = Math.max(0, newBalance - deliveryEarnings);
  const orderCode = getDriverOrderNumber({
    orderNumber: order.orderNumber ?? completedRecord?.orderNumber,
    packageId: order.packageId ?? completedRecord?.packageId,
  });
  const pickup = parseAddressLines(order.pickupAddress || completedRecord?.pickupAddress);
  const delivery = parseAddressLines(order.deliveryAddress || completedRecord?.deliveryAddress);
  const completedAt = formatDeliveryCompletedAt(completedRecord?.date);

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={[styles.deliveryCompletedPage, scrollPads(28)]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.deliveryCompletedHeader}>Delivery Completed</Text>

        <View style={styles.deliveryCompletedSuccessCard}>
          <View style={styles.deliveryCompletedSuccessIconWrap}>
            {[styles.dot1, styles.dot2, styles.dot3, styles.dot4, styles.dot5].map((dotStyle, index) => (
              <View key={index} style={[styles.deliveryCompletedConfettiDot, dotStyle]} />
            ))}
            <View style={styles.deliveryCompletedSuccessRingOuter}>
              <View style={styles.deliveryCompletedSuccessRingInner}>
                <Feather name="check" size={34} color={flow.cyan} />
              </View>
            </View>
          </View>
          <Text style={styles.deliveryCompletedSuccessTitle}>Delivery Completed!</Text>
          <Text style={styles.deliveryCompletedSuccessSub}>Great job! You&apos;ve completed the delivery.</Text>

          <View style={styles.deliveryCompletedEarningsRow}>
            <View style={styles.deliveryCompletedEarningsIcon}>
              <Feather name="credit-card" size={16} color={flow.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryCompletedEarningsLabel}>EARNINGS ADDED</Text>
              <Text style={styles.deliveryCompletedEarningsValue}>£{deliveryEarnings.toFixed(2)}</Text>
            </View>
            <Text style={styles.deliveryCompletedEarningsDelta}>+£{deliveryEarnings.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.deliveryCompletedBalanceCard}>
          <Text style={styles.deliveryCompletedBalanceLabel}>AVAILABLE BALANCE</Text>
          <View style={styles.deliveryCompletedBalanceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryCompletedBalanceAmount}>£{newBalance.toFixed(2)}</Text>
              <Text style={styles.deliveryCompletedBalanceMeta}>
                Previous £{previousBalance.toFixed(2)} + £{deliveryEarnings.toFixed(2)} delivery
              </Text>
              <Text style={styles.deliveryCompletedBalanceSub}>Your earnings are ready to transfer.</Text>
            </View>
            <View style={styles.deliveryCompletedWalletArt}>
              <Feather name="credit-card" size={22} color={flow.cyan} />
            </View>
          </View>

          <TouchableOpacity
            style={styles.deliveryCompletedCashOutBtn}
            onPress={() => Alert.alert("Cash Out Coming Soon")}
            activeOpacity={0.88}
          >
            <Feather name="briefcase" size={16} color={flow.onCyan} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryCompletedCashOutTitle}>CASH OUT COMING SOON</Text>
              <Text style={styles.deliveryCompletedCashOutSub}>Bank transfers will be available in a future update</Text>
            </View>
            <Feather name="chevron-right" size={16} color={flow.onCyan} />
          </TouchableOpacity>
        </View>

        <View style={styles.deliveryCompletedSummaryCard}>
          <Text style={styles.deliveryCompletedSummaryTitle}>DELIVERY SUMMARY</Text>
          <DeliverySummaryRow icon="package" label="Order ID" value={orderCode} />
          <View style={styles.deliveryCompletedSummaryDivider} />
          <DeliverySummaryRow
            icon="map-pin"
            label="Pickup Address"
            value={`${pickup.street}, ${pickup.locality}`}
            multiline
          />
          <View style={styles.deliveryCompletedSummaryDivider} />
          <DeliverySummaryRow
            icon="map-pin"
            label="Delivery Address"
            value={`${delivery.street}, ${delivery.locality}`}
            multiline
          />
          <View style={styles.deliveryCompletedSummaryDivider} />
          <DeliverySummaryRow icon="clock" label="Completed At" value={completedAt} />
          <View style={styles.deliveryCompletedSummaryDivider} />
          <DeliverySummaryRow
            icon="dollar-sign"
            label="Total Earnings"
            value={`£${deliveryEarnings.toFixed(2)}`}
            valueColor={flow.green}
          />
        </View>

        <TouchableOpacity
          style={styles.deliveryCompletedDashboardBtn}
          onPress={() => router.replace("/(tabs)/")}
          activeOpacity={0.88}
        >
          <Feather name="home" size={16} color={flow.cyan} />
          <Text style={styles.deliveryCompletedDashboardText}>BACK TO DASHBOARD</Text>
          <Feather name="chevron-right" size={16} color={flow.cyan} />
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

export function EarningsScreen() {
  const { completedDeliveries, availableBalance } = useDelivery();
  const [period, setPeriod] = React.useState<EarningsPeriod>("today");
  const topPad = safeTop() + 4;
  const bottomPad = safeBottom() + 46;
  const periodRows = filterEarningsByPeriod(completedDeliveries, period);
  const totalEarnings = periodRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const deliveryCount = periodRows.length;
  const milesDriven = periodRows.reduce((sum, row) => sum + parseMilesFromDistance(row.distance), 0);
  const onlineMinutes = periodRows.reduce(
    (sum, row) => sum + Number(row.durationMinutes || 0),
    0
  );
  const averagePerDelivery = deliveryCount ? totalEarnings / deliveryCount : 0;
  const changePct = computeEarningsChangePct(completedDeliveries, period, totalEarnings);
  const listRows = periodRows.slice(0, 5);

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={[styles.earningsPage, { paddingTop: topPad, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.earningsHeader}>
          <TouchableOpacity style={styles.earningsHeaderIcon} activeOpacity={0.86}>
            <Feather name="menu" size={20} color={flow.text} />
          </TouchableOpacity>
          <Text style={styles.earningsHeaderTitle}>Earnings</Text>
          <TouchableOpacity style={styles.earningsHeaderIcon} activeOpacity={0.86}>
            <Feather name="calendar" size={18} color={flow.cyan} />
          </TouchableOpacity>
        </View>

        <View style={styles.earningsTotalCard}>
          <View style={styles.earningsTotalTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.earningsTotalLabel}>TOTAL EARNINGS</Text>
              <Text style={styles.earningsTotalAmount}>£{totalEarnings.toFixed(2)}</Text>
              <Text style={styles.earningsTotalMeta}>
                {deliveryCount} {deliveryCount === 1 ? "Delivery" : "Deliveries"} Completed
              </Text>
              <View style={styles.earningsTotalDeltaRow}>
                <Feather name="trending-up" size={11} color={flow.green} />
                <Text style={styles.earningsTotalDelta}>{Math.abs(changePct)}% vs yesterday</Text>
              </View>
            </View>
            <View style={styles.earningsTotalChartWrap}>
              <View style={styles.earningsTotalBadge}>
                <Feather name="arrow-up" size={10} color={flow.green} />
                <Text style={styles.earningsTotalBadgeText}>{Math.abs(changePct)}%</Text>
              </View>
              <EarningsSparkline />
            </View>
          </View>
        </View>

        <View style={styles.earningsPeriodTabs}>
          {(["today", "week", "month"] as EarningsPeriod[]).map((key) => {
            const active = period === key;
            const label = key === "today" ? "Today" : key === "week" ? "Week" : "Month";
            return (
              <TouchableOpacity
                key={key}
                style={[styles.earningsPeriodTab, active && styles.earningsPeriodTabActive]}
                onPress={() => setPeriod(key)}
                activeOpacity={0.88}
              >
                <Text style={[styles.earningsPeriodTabText, active && styles.earningsPeriodTabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.earningsStatsGrid}>
          <EarningsStatCard
            icon={<Feather name="shopping-bag" size={16} color={flow.cyan} />}
            value={String(deliveryCount)}
            label="Deliveries Completed"
          />
          <EarningsStatCard
            icon={<MaterialCommunityIcons name="road-variant" size={16} color={flow.cyan} />}
            value={String(Math.round(milesDriven))}
            label="Miles Driven"
          />
          <EarningsStatCard
            icon={<MaterialCommunityIcons name="currency-gbp" size={16} color={flow.cyan} />}
            value={`£${averagePerDelivery.toFixed(2)}`}
            label="Average per Delivery"
          />
          <EarningsStatCard
            icon={<Feather name="clock" size={16} color={flow.cyan} />}
            value={formatOnlineTime(onlineMinutes)}
            label="Online Time"
          />
        </View>

        <View style={styles.earningsListHead}>
          <Text style={styles.earningsListTitle}>COMPLETED DELIVERIES</Text>
          <Text style={styles.earningsListCount}>{deliveryCount}</Text>
        </View>

        <View style={styles.earningsListCard}>
          {listRows.map((row, index) => (
            <EarningsDeliveryRow
              key={row.id}
              row={row}
              isLast={index === listRows.length - 1}
              onPress={() =>
                router.push({
                  pathname: "/complete-delivery",
                  params: { id: row.orderId },
                })
              }
            />
          ))}
          <TouchableOpacity
            style={styles.earningsViewAllBtn}
            onPress={() => router.push("/(tabs)/deliveries")}
            activeOpacity={0.88}
          >
            <Text style={styles.earningsViewAllText}>View all deliveries</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.earningsBalanceCard}>
          <View style={styles.earningsBalanceTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.earningsBalanceLabel}>AVAILABLE BALANCE</Text>
              <Text style={styles.earningsBalanceAmount}>£{availableBalance.toFixed(2)}</Text>
              <Text style={styles.earningsBalanceSub}>Your earnings are ready to withdraw.</Text>
            </View>
            <View style={styles.earningsWalletArt}>
              <Feather name="credit-card" size={22} color={flow.cyan} />
              <Feather name="briefcase" size={16} color={flow.cyan2} style={{ marginTop: -8, marginLeft: 12 }} />
            </View>
          </View>

          <TouchableOpacity
            style={styles.earningsWithdrawBtn}
            onPress={() => Alert.alert("Coming Soon", "Withdrawals will be available in a future update.")}
            activeOpacity={0.88}
          >
            <MaterialCommunityIcons name="bank-transfer-out" size={18} color={flow.onCyan} />
            <View style={{ flex: 1 }}>
              <Text style={styles.earningsWithdrawTitle}>WITHDRAW FUNDS</Text>
              <Text style={styles.earningsWithdrawSub}>Coming Soon</Text>
            </View>
            <Feather name="chevron-right" size={16} color={flow.onCyan} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

type EarningsPeriod = "today" | "week" | "month";

type EarningsRow = {
  id: string;
  orderId: string;
  orderNumber?: string;
  packageId?: string;
  pickupAddress: string;
  deliveryAddress: string;
  amount: number;
  distance: string;
  date: string;
  durationMinutes: number;
};

function earningsPeriodStart(period: EarningsPeriod) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "week") {
    start.setDate(start.getDate() - 7);
  } else if (period === "month") {
    start.setMonth(start.getMonth() - 1);
  }
  return start;
}

function filterEarningsByPeriod(rows: EarningsRow[], period: EarningsPeriod) {
  const start = earningsPeriodStart(period);
  return rows.filter((row) => {
    const timestamp = Date.parse(row.date);
    return !Number.isNaN(timestamp) && timestamp >= start.getTime();
  });
}

function parseMilesFromDistance(distance?: string | number | null) {
  if (distance == null) return 0;
  if (typeof distance === "number") {
    return Number.isNaN(distance) ? 0 : distance;
  }
  if (typeof distance !== "string") return 0;
  const distanceText = distance.trim();
  if (!distanceText) return 0;
  const match = distanceText.match(/([\d.]+)/);
  if (!match) return 0;
  const value = Number.parseFloat(match[1]);
  if (Number.isNaN(value)) return 0;
  return distanceText.toLowerCase().includes("km") ? value * 0.621371 : value;
}

function formatOnlineTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function earningsAreaLabel(address?: string) {
  const parsed = parseAddressLines(address);
  const outward = parsed.postcode.split(" ")[0] || "BT1";
  const city =
    address
      ?.split(",")
      .map((part) => part.trim())
      .find((part) => !/\b[A-Z]{1,2}\d/.test(part) && part.length > 2) || "Belfast";
  return `${city} ${outward}`;
}

function earningsRouteLabel(pickup?: string, delivery?: string) {
  return `${earningsAreaLabel(pickup)} → ${earningsAreaLabel(delivery)}`;
}

function computeEarningsChangePct(
  rows: EarningsRow[],
  period: EarningsPeriod,
  currentTotal: number
) {
  if (period !== "today") return 0;
  const yesterdayStart = new Date();
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);
  const yesterdayEnd = new Date(yesterdayStart);
  yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);
  const yesterdayTotal = rows
    .filter((row) => {
      const timestamp = Date.parse(row.date);
      return (
        !Number.isNaN(timestamp) &&
        timestamp >= yesterdayStart.getTime() &&
        timestamp < yesterdayEnd.getTime()
      );
    })
    .reduce((sum, row) => sum + row.amount, 0);
  if (yesterdayTotal <= 0) return currentTotal > 0 ? 100 : 0;
  return Math.round(((currentTotal - yesterdayTotal) / yesterdayTotal) * 100);
}

function EarningsSparkline() {
  const heights = [18, 24, 20, 30, 26, 34, 42];
  return (
    <View style={styles.earningsSparkline}>
      {heights.map((height, index) => (
        <View
          key={index}
          style={[
            styles.earningsSparklineBar,
            {
              height,
              opacity: 0.35 + index * 0.08,
            },
          ]}
        />
      ))}
    </View>
  );
}

function EarningsStatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.earningsStatCard}>
      <View style={styles.earningsStatIconWrap}>{icon}</View>
      <Text style={styles.earningsStatValue}>{value}</Text>
      <Text style={styles.earningsStatLabel}>{label}</Text>
    </View>
  );
}

function EarningsDeliveryRow({
  row,
  isLast,
  onPress,
}: {
  row: EarningsRow;
  isLast: boolean;
  onPress: () => void;
}) {
  const completedTime = new Date(row.date).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <TouchableOpacity
      style={[styles.earningsDeliveryRow, !isLast && styles.earningsDeliveryRowBorder]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.earningsDeliveryIcon}>
        <Feather name="package" size={14} color={flow.cyan} />
      </View>
      <View style={styles.earningsDeliveryBody}>
        <Text style={styles.earningsDeliveryId}>{getDriverOrderNumber(row)}</Text>
        <Text style={styles.earningsDeliveryRoute} numberOfLines={1}>
          {earningsRouteLabel(row.pickupAddress, row.deliveryAddress)}
        </Text>
        <Text style={styles.earningsDeliveryTime}>{completedTime}</Text>
      </View>
      <View style={styles.earningsDeliveryRight}>
        <Text style={styles.earningsDeliveryAmount}>£{Number(row.amount).toFixed(2)}</Text>
        <View style={styles.earningsDeliveryStatusRow}>
          <Text style={styles.earningsDeliveryStatus}>Completed</Text>
          <Feather name="check-circle" size={11} color={flow.green} />
        </View>
      </View>
      <Feather name="chevron-right" size={14} color={flow.cyan} />
    </TouchableOpacity>
  );
}

export function ProfileScreen() {
  const { driver, logout, updateDriver } = useAuth();
  const topPad = safeTop() + 4;
  const bottomPad = safeBottom() + 46;
  const [bankDetails, setBankDetails] = React.useState<LocalBankDetails | null>(null);
  const [settings, setSettings] = React.useState<LocalDriverSettings>({
    notifications: true,
    soundAlerts: true,
    darkMode: true,
  });
  const [savingBank, setSavingBank] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const { firstName, lastName } = splitDriverName(driver?.name);
  const isVerified = driver?.status === "verified";

  const refreshProfileData = useCallback(async () => {
    if (!driver?.id) return;
    const [bank, prefs] = await Promise.all([
      loadLocalBankDetails(driver.id),
      loadLocalDriverSettings(driver.id),
    ]);
    setBankDetails(bank);
    setSettings(prefs);
  }, [driver?.id]);

  useFocusEffect(
    useCallback(() => {
      void refreshProfileData();
    }, [refreshProfileData])
  );

  async function handleSaveBankDetails() {
    if (!driver?.id || !bankDetails) return;
    setSavingBank(true);
    try {
      const saved = await saveLocalBankDetails(driver.id, bankDetails);
      setBankDetails(saved);
      Alert.alert("Saved", "Bank details saved locally.");
    } finally {
      setSavingBank(false);
    }
  }

  async function updateSetting(key: keyof LocalDriverSettings, value: boolean) {
    if (!driver?.id) return;
    const next = { ...settings, [key]: value };
    setSettings(next);
    await saveLocalDriverSettings(driver.id, next);
  }

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    console.log("Logout started");

    try {
      await logout();
      console.log("Logout completed");
      console.log("User session:", null);
      console.log("Auth state:", null);
      console.log("Navigating to splash");
      router.replace("/");
    } catch (error) {
      console.error("Driver logout failed", error);
      console.log("User session:", null);
      console.log("Auth state:", null);
      console.log("Navigating to splash");
      router.replace("/");
    }
  }

  async function handlePhotoPress() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow photo access to update your profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await updateDriver({ profilePhotoUri: result.assets[0].uri });
    }
  }

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={[styles.profilePage, { paddingTop: topPad, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={styles.profileHeaderSpacer} />
          <Text style={styles.profileHeaderTitle}>Profile</Text>
          <TouchableOpacity style={styles.profileHeaderIcon} activeOpacity={0.86}>
            <Feather name="settings" size={18} color={flow.cyan} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileHeroCard}>
          <View style={styles.profileHeroTop}>
            <TouchableOpacity style={styles.profilePhotoWrap} onPress={handlePhotoPress} activeOpacity={0.88}>
              <DriverAvatar name={driver?.name} photoUri={driver?.profilePhotoUri} size={62} />
              <View style={styles.profilePhotoCamera}>
                <Feather name="camera" size={11} color={flow.onCyan} />
              </View>
            </TouchableOpacity>
            <View style={styles.profileHeroInfo}>
              <Text style={styles.profileHeroName}>{driver?.name || "Sonny Davidkov"}</Text>
              <View style={styles.profileVerifiedBadge}>
                <Feather name="check-circle" size={11} color={flow.cyan} />
                <Text style={styles.profileVerifiedText}>
                  {isVerified ? "Verified Driver" : "Pending Approval"}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.profileHeroMetaRow}>
            <View style={styles.profileHeroMetaCol}>
              <Text style={styles.profileHeroMetaLabel}>Driver ID</Text>
              <Text style={styles.profileHeroMetaValue}>{driver?.driverId || "SD-123456"}</Text>
            </View>
            <View style={styles.profileHeroMetaCol}>
              <Text style={styles.profileHeroMetaLabel}>Vehicle</Text>
              <Text style={styles.profileHeroMetaValue}>{driver?.vehicleRegistration || "AB12 CDE"}</Text>
            </View>
          </View>
        </View>

        <ProfileSection title="PERSONAL INFORMATION" icon="user">
          <ProfileInfoRow icon="user" label="First Name" value={firstName} />
          <ProfileInfoRow icon="user" label="Last Name" value={lastName} />
          <ProfileInfoRow icon="mail" label="Email" value={driver?.email || "sonny@email.com"} />
          <ProfileInfoRow icon="phone" label="Phone" value={driver?.phone || "+44 7123 456789"} />
          <TouchableOpacity
            style={styles.profileOutlineBtn}
            onPress={() => router.push("/edit-profile")}
            activeOpacity={0.88}
          >
            <Text style={styles.profileOutlineBtnText}>EDIT DETAILS</Text>
            <Feather name="chevron-right" size={14} color={flow.cyan} />
          </TouchableOpacity>
        </ProfileSection>

        <ProfileSection title="BANK DETAILS" icon="briefcase">
          <ProfileInfoRow icon="briefcase" label="Bank Name" value={bankDetails?.bankName || "HSBC"} />
          <ProfileInfoRow
            icon="hash"
            label="Account Number"
            value={maskAccountNumber(bankDetails?.accountNumber || "12344321")}
          />
          <ProfileInfoRow
            icon="grid"
            label="Sort Code"
            value={maskSortCode(bankDetails?.sortCode || "40-47-21")}
          />
          <TouchableOpacity
            style={styles.profileOutlineBtn}
            onPress={() => router.push("/bank-details")}
            activeOpacity={0.88}
          >
            <MaterialCommunityIcons name="credit-card-outline" size={15} color={flow.cyan} />
            <Text style={[styles.profileOutlineBtnText, { flex: 1 }]}>CHANGE BANK DETAILS</Text>
            <Feather name="chevron-right" size={14} color={flow.cyan} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileSaveBankBtn}
            onPress={handleSaveBankDetails}
            activeOpacity={0.88}
            disabled={savingBank}
          >
            <Feather name="save" size={15} color={flow.onCyan} />
            <Text style={styles.profileSaveBankText}>
              {savingBank ? "SAVING..." : "SAVE BANK DETAILS"}
            </Text>
          </TouchableOpacity>
        </ProfileSection>

        <ProfileSection title="SETTINGS" icon="settings">
          <ProfileToggleRow
            icon="bell"
            label="Notifications"
            value={settings.notifications}
            onValueChange={(value) => void updateSetting("notifications", value)}
          />
          <ProfileToggleRow
            icon="volume-2"
            label="Sound Alerts"
            value={settings.soundAlerts}
            onValueChange={(value) => void updateSetting("soundAlerts", value)}
          />
          <TouchableOpacity
            style={styles.profileSettingsRow}
            onPress={() => Alert.alert("Dark Mode", "Dark mode is enabled for the SD Driver app.")}
            activeOpacity={0.88}
          >
            <Feather name="moon" size={14} color={flow.cyan} />
            <Text style={styles.profileSettingsLabel}>Dark Mode</Text>
            <Feather name="chevron-right" size={14} color={flow.cyan} />
          </TouchableOpacity>
        </ProfileSection>

        <TouchableOpacity
          style={styles.profileLogoutBtn}
          onPress={() => void handleLogout()}
          activeOpacity={0.88}
          disabled={isLoggingOut}
        >
          <Feather name="log-out" size={16} color={flow.red} />
          <Text style={styles.profileLogoutText}>LOG OUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

export function EditProfileScreen() {
  const { driver, updateDriver } = useAuth();
  const { firstName: initialFirst, lastName: initialLast } = splitDriverName(driver?.name);
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [email, setEmail] = useState(driver?.email || "");
  const [phone, setPhone] = useState(driver?.phone || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert("Missing details", "Please complete all personal information fields.");
      return;
    }
    setSaving(true);
    try {
      await updateDriver({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      });
      Alert.alert("Saved", "Your profile details have been updated.");
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.page, scrollPads(24)]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <HeaderBar title="Edit Details" subtitle="Update your personal information" onBack={() => router.back()} />
          <Card style={{ gap: 12 }}>
            <Field label="First Name" icon="user" value={firstName} onChangeText={setFirstName} placeholder="First Name" />
            <Field label="Last Name" icon="user" value={lastName} onChangeText={setLastName} placeholder="Last Name" />
            <Field
              label="Email"
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label="Phone"
              icon="phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
            <PrimaryButton label={saving ? "SAVING..." : "SAVE DETAILS"} icon="save" onPress={handleSave} disabled={saving} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function splitDriverName(name?: string) {
  const parts = (name || "Sonny Davidkov").trim().split(/\s+/);
  return {
    firstName: parts[0] || "Sonny",
    lastName: parts.slice(1).join(" ") || "Davidkov",
  };
}

function ProfileSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.profileSectionCard}>
      <View style={styles.profileSectionHead}>
        <Feather name={icon} size={13} color={flow.cyan} />
        <Text style={styles.profileSectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ProfileInfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.profileInfoRow}>
      <Feather name={icon} size={14} color={flow.cyan} />
      <Text style={styles.profileInfoLabel}>{label}</Text>
      <Text style={styles.profileInfoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ProfileToggleRow({
  icon,
  label,
  value,
  onValueChange,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.profileSettingsRow}>
      <Feather name={icon} size={14} color={flow.cyan} />
      <Text style={styles.profileSettingsLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: flow.line, true: flow.cyan }}
        thumbColor={flow.text}
        ios_backgroundColor={flow.line}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: flow.space.page, gap: flow.space.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  welcomeScreen: { flex: 1, backgroundColor: "#000305" },
  welcomeRoot: { flex: 1, paddingHorizontal: flow.space.xl, zIndex: 1 },
  welcomeSkylineGlow: {
    position: "absolute",
    top: "38%",
    alignSelf: "center",
    width: 320,
    height: 180,
    borderRadius: 160,
    backgroundColor: "rgba(20,200,243,0.07)",
  },
  welcomeSkylineRow: {
    position: "absolute",
    top: "42%",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 8,
  },
  welcomeBuilding: {
    width: 24,
    backgroundColor: "#0B1520",
    borderTopWidth: 1,
    borderTopColor: "rgba(20,200,243,0.15)",
  },
  welcomeGrid: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 118,
    height: 120,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  welcomeGridLine: {
    position: "absolute",
    bottom: 0,
    width: 1,
    height: 110,
    backgroundColor: "rgba(20,200,243,0.22)",
    transformOrigin: "bottom center",
  },
  welcomeLogoBlock: { alignItems: "center", position: "relative" },
  welcomeLogoGlow: {
    position: "absolute",
    top: 18,
    width: 180,
    height: 100,
    borderRadius: 90,
    backgroundColor: "rgba(20,200,243,0.12)",
  },
  welcomeLogoMarkRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  welcomeSpeedLines: { alignItems: "flex-end", gap: 5, marginRight: 4, paddingBottom: 8 },
  welcomeSpeedLine: { height: 2, borderRadius: 1, backgroundColor: flow.cyan, opacity: 0.85 },
  welcomeLogoSd: {
    color: flow.cyan,
    fontSize: 92,
    fontFamily: "Inter_700Bold",
    fontStyle: "italic",
    letterSpacing: -8,
    textShadowColor: "rgba(20,200,243,0.9)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  welcomeLogoTitle: {
    color: flow.text,
    fontSize: 25,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.6,
    marginTop: -8,
  },
  welcomeLogoSubRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  welcomeLogoLine: { width: 32, height: 1, backgroundColor: flow.cyan, opacity: 0.9 },
  welcomeLogoSub: {
    color: flow.cyan,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2.4,
  },
  welcomeCopy: { alignItems: "center", marginBottom: 28 },
  welcomeHeading: { color: flow.text, fontSize: 30, fontFamily: "Inter_700Bold" },
  welcomeSubheading: { color: flow.muted, fontSize: 14, fontFamily: "Inter_400Regular", marginTop: flow.space.sm },
  welcomeSpacer: { flex: 1 },
  welcomeButtons: { gap: flow.space.md },
  welcomeLoginOuter: {
    borderRadius: flow.radius,
    shadowColor: flow.cyan,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  welcomeLoginBtn: {
    height: flow.buttonHeight,
    borderRadius: flow.radius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  welcomeLoginText: { color: flow.onCyan, fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  welcomeRegisterBtn: {
    height: flow.buttonHeight,
    borderRadius: flow.radius,
    borderWidth: 1.5,
    borderColor: flow.cyan,
    backgroundColor: "rgba(2,8,14,0.65)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  welcomeRegisterText: { color: flow.text, fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  registerPage: { paddingHorizontal: 14, gap: 8 },
  registerTopBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  registerBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: flow.line,
    backgroundColor: flow.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  registerBackSpacer: { width: 34 },
  registerScreenTitle: { color: flow.text, fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  registerStepperWrap: { marginTop: 4, marginBottom: 6, paddingHorizontal: 4 },
  registerStepperRail: {
    position: "absolute",
    left: "12%",
    right: "12%",
    top: 13,
    height: 2,
    backgroundColor: "#2A3440",
    borderRadius: 1,
    overflow: "hidden",
  },
  registerStepperRailFill: { height: "100%", backgroundColor: flow.cyan },
  registerStepper: { flexDirection: "row", justifyContent: "space-between" },
  registerStep: { flex: 1, alignItems: "center" },
  registerStepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#2A3440",
    backgroundColor: "#0C1218",
    alignItems: "center",
    justifyContent: "center",
  },
  registerStepDotActive: {
    borderColor: flow.cyan,
    backgroundColor: "rgba(20,200,243,0.12)",
    shadowColor: flow.cyan,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  registerStepNum: { color: flow.muted, fontSize: 11, fontFamily: "Inter_700Bold" },
  registerStepNumActive: { color: flow.cyan },
  registerStepLabel: { color: flow.muted, fontSize: 8, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  registerStepLabelActive: { color: flow.cyan },
  registerBrand: { alignItems: "center", marginTop: 2, marginBottom: 4 },
  registerBrandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  registerCubeWrap: { width: 42, height: 34, position: "relative" },
  registerCubeGlow: {
    position: "absolute",
    left: 4,
    top: 2,
    width: 34,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(20,200,243,0.15)",
  },
  registerCube: { width: 34, height: 28, position: "relative" },
  registerCubeTop: {
    position: "absolute",
    left: 6,
    top: 0,
    width: 22,
    height: 10,
    backgroundColor: "rgba(20,200,243,0.35)",
    borderWidth: 1,
    borderColor: flow.cyan,
    transform: [{ skewX: "-28deg" }],
  },
  registerCubeFront: {
    position: "absolute",
    left: 4,
    top: 8,
    width: 24,
    height: 18,
    backgroundColor: "rgba(20,200,243,0.12)",
    borderWidth: 1,
    borderColor: flow.cyan,
  },
  registerCubeSide: {
    position: "absolute",
    left: 24,
    top: 10,
    width: 10,
    height: 16,
    backgroundColor: "rgba(20,200,243,0.22)",
    borderWidth: 1,
    borderColor: flow.cyan,
    transform: [{ skewY: "-28deg" }],
  },
  registerCubeLines: { position: "absolute", left: -16, top: 10, gap: 3 },
  registerCubeLine: { height: 2, borderRadius: 1, backgroundColor: flow.cyan, opacity: 0.75 },
  registerBrandTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  registerBrandSd: { color: flow.text },
  registerBrandDelivery: { color: flow.cyan },
  registerBrandTag: { color: flow.muted, fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  registerSectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 2 },
  registerSectionTitle: { color: flow.cyan, fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  registerField: {
    height: 42,
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  registerInput: { flex: 1, color: flow.text, fontSize: 12, fontFamily: "Inter_500Medium", padding: 0 },
  registerNameRow: { flexDirection: "row", gap: 8 },
  registerPhoneRow: { flexDirection: "row", gap: 8 },
  registerCountryCode: {
    height: 42,
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: 10,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  registerFlag: { fontSize: 14 },
  registerDialCode: { color: flow.text, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  registerPhoneField: { flex: 1 },
  registerVehicleLabel: { color: flow.cyan, fontSize: 10, fontFamily: "Inter_600SemiBold", marginTop: 2, marginBottom: 2 },
  registerVehicleRow: { flexDirection: "row", gap: 8 },
  registerVehicleChoice: {
    flex: 1,
    height: 64,
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  registerVehicleActive: {
    borderColor: flow.cyan,
    backgroundColor: "rgba(20,200,243,0.08)",
    shadowColor: flow.cyan,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  registerVehicleText: { color: flow.muted, fontSize: 10, fontFamily: "Inter_700Bold" },
  registerVehicleTextActive: { color: flow.cyan },
  registerUploadRow: { flexDirection: "row", gap: 8 },
  registerUploadCard: {
    flex: 1,
    minHeight: 148,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.45)",
    backgroundColor: flow.inputBg,
    borderRadius: 10,
    padding: 8,
    position: "relative",
  },
  registerUploadThumb: {
    width: "100%",
    height: 58,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#0C141C",
    marginBottom: 6,
  },
  registerUploadImage: { width: "100%", height: "100%" },
  registerUploadPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  registerUploadTitle: { color: flow.cyan, fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  registerUploadHint: { color: flow.muted, fontSize: 8, fontFamily: "Inter_500Medium", lineHeight: 11, marginTop: 2, paddingRight: 24 },
  registerUploadBtn: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: flow.cyan,
    alignItems: "center",
    justifyContent: "center",
  },
  registerError: { color: flow.red, fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  registerContinueBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: flow.cyan,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
    shadowColor: flow.cyan,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  registerContinueText: { color: flow.onCyan, fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  registerLoginText: { color: flow.muted, textAlign: "center", fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 8, marginBottom: 4 },
  registerLoginLink: { color: flow.cyan, fontFamily: "Inter_700Bold" },
  successPage: { paddingHorizontal: 16, gap: 12 },
  successHero: { alignItems: "center", marginTop: 8, marginBottom: 4 },
  successIconWrap: { width: 96, height: 96, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  successConfettiDot: { position: "absolute", opacity: 0.85 },
  successIconGlow: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(20,200,243,0.18)",
  },
  successIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: flow.cyan,
    backgroundColor: "rgba(20,200,243,0.12)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: flow.cyan,
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  successTitle: { color: flow.text, fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  successSubtitle: { color: flow.muted, fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 4, textAlign: "center" },
  successCodeCard: {
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.45)",
    backgroundColor: flow.inputBg,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    shadowColor: flow.cyan,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  successCodeLabel: { color: flow.cyan, fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  successCodeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  successCodeValue: {
    color: flow.cyan,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    textShadowColor: "rgba(20,200,243,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  successCopyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.35)",
    backgroundColor: "rgba(20,200,243,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  successCodeHint: { color: flow.muted, fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 10, textAlign: "center" },
  successSummaryCard: {
    borderWidth: 1,
    borderColor: flow.line,
    backgroundColor: flow.inputBg,
    borderRadius: 12,
    padding: 12,
  },
  successSummaryHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  successSummaryTitle: { color: flow.cyan, fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  successSummaryRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7 },
  successSummaryLabel: { flex: 1, color: flow.muted, fontSize: 11, fontFamily: "Inter_500Medium" },
  successSummaryValue: { color: flow.text, fontSize: 11, fontFamily: "Inter_600SemiBold", maxWidth: "46%", textAlign: "right" },
  successDivider: { height: 1, backgroundColor: flow.line, opacity: 0.7 },
  successReviewCard: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: flow.line,
    backgroundColor: flow.inputBg,
    borderRadius: 12,
    padding: 12,
  },
  successReviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.3)",
    backgroundColor: "rgba(20,200,243,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  successReviewBody: { flex: 1, gap: 3 },
  successReviewTitle: { color: flow.text, fontSize: 13, fontFamily: "Inter_700Bold" },
  successReviewText: { color: flow.cyan, fontSize: 11, fontFamily: "Inter_600SemiBold" },
  successReviewSub: { color: flow.muted, fontSize: 10, fontFamily: "Inter_500Medium", lineHeight: 15 },
  successLoginBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: flow.cyan,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: flow.cyan,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  successLoginText: { color: flow.onCyan, fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  successSupportText: { color: flow.muted, textAlign: "center", fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 4, marginBottom: 8 },
  successSupportLink: { color: flow.cyan, fontFamily: "Inter_700Bold" },
  loginBrand: { alignItems: "center", marginVertical: 26 },
  error: { color: flow.red, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  centerLink: { color: flow.cyan, textAlign: "center", fontSize: 11, fontFamily: "Inter_700Bold", marginVertical: 6 },
  cardTitle: { color: flow.text, fontSize: 13, fontFamily: "Inter_700Bold" },
  sectionTitle: { color: flow.text, fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 4 },
  vehicleRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  vehicleChoice: { flex: 1, height: 74, borderWidth: 1, borderColor: flow.inputBorder, backgroundColor: flow.inputBg, borderRadius: flow.radius, alignItems: "center", justifyContent: "center", gap: 6 },
  vehicleActive: { borderColor: flow.cyan, backgroundColor: "rgba(20,200,243,0.08)" },
  vehicleLabel: { color: flow.muted, fontSize: 10, fontFamily: "Inter_700Bold" },
  photoSlot: { aspectRatio: 4 / 3, borderRadius: flow.radius, overflow: "hidden", position: "relative" },
  cameraChip: { position: "absolute", right: 10, bottom: 10, backgroundColor: flow.cyan, borderRadius: flow.radius, paddingHorizontal: 9, paddingVertical: 6, flexDirection: "row", gap: 5, alignItems: "center" },
  cameraChipText: { color: flow.onCyan, fontSize: 10, fontFamily: "Inter_700Bold" },
  mutedCenter: { color: flow.muted, textAlign: "center", fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
  muted: { color: flow.muted, fontSize: 11, fontFamily: "Inter_500Medium" },
  selfieCircle: { width: 166, height: 166, borderRadius: 83, borderWidth: 2, borderColor: flow.cyan, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: flow.inputBg },
  selfieImage: { width: "100%", height: "100%" },
  approvalRing: { width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: flow.cyan, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20,200,243,0.08)" },
  headerTitleBig: { color: flow.text, fontSize: 22, fontFamily: "Inter_700Bold" },
  title: { color: flow.text, fontSize: 18, fontFamily: "Inter_700Bold" },
  greenText: { color: flow.green, fontSize: 12, fontFamily: "Inter_700Bold" },
  dashboardStats: { flexDirection: "row", gap: 7 },
  headerIcon: { width: flow.headerIconSize, height: flow.headerIconSize, borderRadius: flow.radius, borderWidth: 1, borderColor: flow.line, backgroundColor: flow.panel, alignItems: "center", justifyContent: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  row: { flexDirection: "row", gap: 8 },
  name: { color: flow.text, fontSize: 13, fontFamily: "Inter_700Bold" },
  price: { color: flow.cyan, fontSize: 14, fontFamily: "Inter_700Bold" },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 14 },
  successBanner: {
    position: "absolute",
    left: flow.space.page,
    right: flow.space.page,
    zIndex: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: flow.space.sm,
    borderWidth: 1,
    borderColor: "rgba(23,201,100,0.45)",
    backgroundColor: "rgba(7,16,12,0.96)",
    borderRadius: flow.radius,
    paddingHorizontal: flow.space.md,
    paddingVertical: 10,
  },
  successBannerText: { color: flow.text, fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  popup: { borderWidth: 1, borderColor: "rgba(20,200,243,0.45)", backgroundColor: flow.inputBg, borderRadius: flow.radius, padding: flow.space.md, gap: flow.space.sm },
  popupTop: { flexDirection: "row", justifyContent: "space-between" },
  popupTitle: { color: flow.amber, fontSize: 12, fontFamily: "Inter_700Bold" },
  timer: { color: flow.red, fontSize: 14, fontFamily: "Inter_700Bold" },
  popupCustomer: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 64 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: flow.cyan, backgroundColor: "#101827", alignItems: "center", justifyContent: "center" },
  avatarText: { color: flow.text, fontSize: 17, fontFamily: "Inter_700Bold" },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: flow.line },
  tab: { flex: 1, color: flow.muted, fontSize: 11, textAlign: "center", paddingBottom: 8, fontFamily: "Inter_700Bold" },
  tabActive: { color: flow.cyan, borderBottomWidth: 2, borderBottomColor: flow.cyan },
  customerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  flowStep: { flexDirection: "row", alignItems: "center", gap: 10 },
  flowNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: flow.cyan, color: flow.onCyan, textAlign: "center", paddingTop: 3, fontSize: 11, fontFamily: "Inter_700Bold", overflow: "hidden" },
  pinDisplay: { color: flow.text, fontSize: 28, letterSpacing: 8, textAlign: "center", fontFamily: "Inter_700Bold", marginVertical: 10 },
  keypad: { flexDirection: "row", flexWrap: "wrap", gap: flow.space.sm, justifyContent: "center" },
  key: { width: "29%", height: flow.inputHeight, borderRadius: flow.radius, backgroundColor: flow.panel2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: flow.line },
  keyText: { color: flow.text, fontSize: 18, fontFamily: "Inter_700Bold" },
  bigMoney: { color: flow.text, fontSize: 32, fontFamily: "Inter_700Bold" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { color: flow.text, fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  dashboardPage: { gap: flow.space.xs, paddingHorizontal: 10 },
  dashboardCard: {
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: flow.space.sm,
  },
  dashboardEmptyCard: {
    alignItems: "center",
    gap: 6,
    paddingVertical: flow.space.lg,
  },
  dashboardEmptyTitle: {
    color: flow.text,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  dashboardEmptySub: {
    color: flow.muted,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 16,
    maxWidth: 280,
  },
  dashboardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 0 },
  dashboardProfile: { flexDirection: "row", alignItems: "center", gap: 9, flex: 1 },
  dashboardPhoto: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: flow.cyan },
  dashboardPhotoFallback: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: flow.cyan, backgroundColor: "#101827", alignItems: "center", justifyContent: "center" },
  dashboardPhotoInitial: { color: flow.text, fontSize: 18, fontFamily: "Inter_700Bold" },
  dashboardIdentity: { flex: 1, gap: 0, minWidth: 0 },
  dashboardName: { color: flow.text, fontSize: 15, fontFamily: "Inter_700Bold" },
  dashboardIdRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  dashboardIdLabel: { color: flow.muted, fontSize: 9, fontFamily: "Inter_500Medium" },
  dashboardIdValue: { color: flow.cyan, fontSize: 10, fontFamily: "Inter_700Bold" },
  dashboardIdCopied: { color: flow.green, fontSize: 8, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  dashboardVehicle: { color: flow.muted, fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 1 },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  dashboardPower: { width: flow.headerIconSize, height: flow.headerIconSize, borderRadius: flow.radius, borderWidth: 1, borderColor: flow.line, backgroundColor: flow.panel, alignItems: "center", justifyContent: "center" },
  dashboardStatsRow: { flexDirection: "row", gap: 5, marginTop: 2 },
  dashboardStat: { flex: 1, minHeight: 58, borderWidth: 1, borderColor: flow.inputBorder, backgroundColor: flow.inputBg, borderRadius: flow.radius, alignItems: "center", justifyContent: "center", paddingVertical: 5, paddingHorizontal: 2 },
  dashboardStatIcon: { position: "absolute", top: 5, left: 6 },
  dashboardStatLabel: { color: flow.muted, fontSize: 7, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  dashboardStatValue: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 1 },
  dashboardStatSub: { color: flow.muted2, fontSize: 7, fontFamily: "Inter_500Medium", marginTop: 1 },
  dashboardSectionHead: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4, marginBottom: 2 },
  dashboardSectionLabel: { color: flow.cyan, fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.7, flex: 1 },
  dashboardViewAllLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  dashboardViewAllText: { color: flow.cyan, fontSize: 9, fontFamily: "Inter_600SemiBold" },
  priorityCard: { gap: 7, marginBottom: 2, borderColor: "rgba(20,200,243,0.35)" },
  priorityTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  priorityCustomer: { flexDirection: "row", gap: 7, flex: 1, minWidth: 0 },
  priorityUserIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(124,58,237,0.2)", borderWidth: 1, borderColor: "rgba(124,58,237,0.45)", alignItems: "center", justifyContent: "center" },
  priorityInitial: { color: flow.text, fontSize: 12, fontFamily: "Inter_700Bold" },
  priorityName: { color: flow.text, fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 1 },
  priorityOrderId: { color: flow.muted, fontSize: 9, fontFamily: "Inter_600SemiBold" },
  priorityStatus: { color: flow.cyan, fontSize: 8, fontFamily: "Inter_700Bold", marginTop: 2 },
  priorityEarningsWrap: { alignItems: "flex-end" },
  priorityEarnings: { color: flow.cyan, fontSize: 16, fontFamily: "Inter_700Bold" },
  priorityEarningsLabel: { color: flow.muted, fontSize: 8, fontFamily: "Inter_500Medium", marginTop: 1 },
  priorityAddressStack: { flexDirection: "row", alignItems: "stretch", gap: 6 },
  priorityAddressConnector: { width: 22, alignItems: "center", justifyContent: "center", gap: 2, paddingVertical: 4 },
  priorityConnectorDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: flow.cyan },
  priorityConnectorLine: { width: 1, flex: 1, backgroundColor: "rgba(20,200,243,0.35)" },
  priorityDeadlineRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  priorityDeadline: { color: flow.muted, fontSize: 9, fontFamily: "Inter_500Medium", flex: 1 },
  dashAddressBlock: { flex: 1, minWidth: 0, gap: 1 },
  dashAddressLabelRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  dashAddressKind: { color: flow.muted2, fontSize: 7, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  dashAddressStreet: { color: flow.text, fontSize: 9, fontFamily: "Inter_600SemiBold", lineHeight: 12 },
  dashAddressLocality: { color: flow.muted, fontSize: 8, fontFamily: "Inter_500Medium" },
  dashAddressPostcode: { color: flow.cyan, fontSize: 8, fontFamily: "Inter_700Bold" },
  continueDeliveryBtn: {
    height: 40,
    borderRadius: 10,
    backgroundColor: flow.cyan,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  continueDeliveryText: { color: flow.onCyan, fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  progressLabel: { color: flow.cyan, fontSize: 9, fontFamily: "Inter_600SemiBold", width: 68 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: flow.inputBorder, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2, backgroundColor: flow.cyan },
  progressPct: { color: flow.text, fontSize: 9, fontFamily: "Inter_700Bold", width: 28, textAlign: "right" },
  upcomingCard: { gap: 6, marginBottom: 4, paddingVertical: 7 },
  upcomingHeader: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  upcomingIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "rgba(20,200,243,0.25)", backgroundColor: "rgba(20,200,243,0.08)", alignItems: "center", justifyContent: "center" },
  upcomingBody: { flex: 1, gap: 2, minWidth: 0 },
  upcomingOrderId: { color: flow.text, fontSize: 11, fontFamily: "Inter_700Bold" },
  upcomingStatus: { color: flow.amber, fontSize: 9, fontFamily: "Inter_600SemiBold" },
  upcomingPrice: { color: flow.cyan, fontSize: 12, fontFamily: "Inter_700Bold" },
  upcomingAddressGrid: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: flow.line, paddingTop: 6 },
  upcomingAddressCol: { flex: 1, minWidth: 0, gap: 1 },
  upcomingAddressLabel: { color: flow.muted2, fontSize: 7, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  upcomingAddressStreet: { color: flow.text, fontSize: 9, fontFamily: "Inter_600SemiBold", lineHeight: 12 },
  upcomingAddressMeta: { color: flow.muted, fontSize: 8, fontFamily: "Inter_500Medium" },
  upcomingAddressPostcode: { color: flow.cyan, fontSize: 8, fontFamily: "Inter_700Bold" },
  dispatchCard: { gap: 6, marginBottom: 8, paddingVertical: 10, paddingHorizontal: 10 },
  dispatchTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  dispatchOrderId: { flex: 1, color: flow.text, fontSize: 12, fontFamily: "Inter_700Bold" },
  dispatchTopMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  dispatchTierPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  dispatchTierText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  dispatchEarnings: { color: flow.cyan, fontSize: 14, fontFamily: "Inter_700Bold" },
  dispatchRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: flow.line,
    paddingTop: 6,
  },
  dispatchPostcode: { color: flow.cyan, fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  dispatchAge: {
    marginLeft: "auto",
    color: flow.muted,
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
  },
  dispatchStatsRow: { flexDirection: "row", gap: 6 },
  dispatchStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: flow.line,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "rgba(7,11,16,0.65)",
  },
  dispatchStatLabel: { color: flow.muted2, fontSize: 7, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  dispatchStatValue: { color: flow.text, fontSize: 10, fontFamily: "Inter_700Bold" },
  dispatchActions: { flexDirection: "row", gap: 8, marginTop: 2 },
  dispatchRejectBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: flow.red,
    backgroundColor: "rgba(239,35,60,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dispatchAcceptBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: flow.cyan,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dispatchRejectText: { color: flow.red, fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  dispatchAcceptText: { color: flow.onCyan, fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  dispatchBtnDisabled: { opacity: 0.45 },
  startPickupBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: flow.cyan,
    backgroundColor: "rgba(20,200,243,0.06)",
  },
  startPickupText: { color: flow.cyan, fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  todayEarningsCard: { gap: 4, marginTop: 4, marginBottom: 6 },
  todayEarningsHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  todayEarningsTitle: { color: flow.cyan, fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  todayEarningsAmount: { color: flow.cyan, fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 2 },
  todayEarningsSub: { color: flow.muted, fontSize: 10, fontFamily: "Inter_500Medium" },
  myDeliveriesPage: { gap: flow.space.sm, paddingHorizontal: 10 },
  myDeliveriesTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginTop: 4 },
  myDeliveriesTitleBlock: { flex: 1, gap: 2 },
  myDeliveriesTitle: { color: flow.text, fontSize: 22, fontFamily: "Inter_700Bold" },
  myDeliveriesSubtitle: { color: flow.muted, fontSize: 11, fontFamily: "Inter_500Medium" },
  myDeliveriesDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 4,
  },
  myDeliveriesDateText: { color: flow.text, fontSize: 10, fontFamily: "Inter_600SemiBold" },
  myDeliveriesTabs: { gap: 6, paddingVertical: 4 },
  myDeliveriesTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: flow.line,
    backgroundColor: flow.inputBg,
  },
  myDeliveriesTabActive: {
    backgroundColor: flow.cyan,
    borderColor: flow.cyan,
  },
  myDeliveriesTabText: { color: flow.muted, fontSize: 10, fontFamily: "Inter_700Bold" },
  myDeliveriesTabTextActive: { color: flow.onCyan },
  myDeliveryCard: {
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: flow.space.sm,
    gap: 8,
    marginBottom: 4,
  },
  myDeliveryTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  myDeliveryTopRight: { alignItems: "flex-end", gap: 4, maxWidth: 120 },
  myDeliveryTime: { color: flow.muted, fontSize: 8, fontFamily: "Inter_500Medium" },
  myDeliveryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  myDeliveryOrderId: { color: flow.text, fontSize: 12, fontFamily: "Inter_700Bold" },
  myDeliverySender: { color: flow.muted, fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 1 },
  myDeliveryStatusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    maxWidth: 130,
  },
  myDeliveryStatusText: { fontSize: 7, fontFamily: "Inter_700Bold", letterSpacing: 0.3, textAlign: "center" },
  myDeliveryBody: { flexDirection: "row", gap: 8 },
  myDeliveryRouteCol: { flex: 1, flexDirection: "row", gap: 8, minWidth: 0 },
  myDeliveryRouteLine: { width: 12, alignItems: "center", paddingVertical: 2 },
  myDeliveryDot: { width: 7, height: 7, borderRadius: 4 },
  myDeliveryLine: {
    width: 1,
    flex: 1,
    backgroundColor: "rgba(20,200,243,0.35)",
    marginVertical: 2,
  },
  myDeliveryAddresses: { flex: 1, gap: 10, minWidth: 0 },
  myDeliveryAddressBlock: { gap: 1 },
  myDeliveryAddressKind: { color: flow.muted2, fontSize: 7, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  myDeliveryStreet: { color: flow.text, fontSize: 10, fontFamily: "Inter_600SemiBold", lineHeight: 13 },
  myDeliveryLocality: { color: flow.muted, fontSize: 9, fontFamily: "Inter_500Medium" },
  myDeliveryPostcode: { color: flow.cyan, fontSize: 9, fontFamily: "Inter_700Bold" },
  myDeliveryStats: { alignItems: "flex-end", justifyContent: "flex-start", gap: 4, minWidth: 72 },
  myDeliveryEarnings: { color: flow.cyan, fontSize: 16, fontFamily: "Inter_700Bold" },
  myDeliveryMetaRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  myDeliveryMeta: { color: flow.muted, fontSize: 8, fontFamily: "Inter_500Medium" },
  myDeliveryScheduledRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  myDeliveryScheduledText: { color: flow.muted, fontSize: 9, fontFamily: "Inter_500Medium" },
  myDeliveryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: 10,
  },
  myDeliveryActionBtnActive: {
    backgroundColor: flow.cyan,
    borderWidth: 0,
  },
  myDeliveryActionBtnCompleted: {
    borderWidth: 1,
    borderColor: flow.green,
    backgroundColor: "rgba(23,201,100,0.06)",
  },
  myDeliveryActionTextActive: { color: flow.onCyan, fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  myDeliveryActionTextCompleted: { color: flow.green, fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  myDeliveriesEarningsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: flow.space.sm,
    marginTop: 4,
    marginBottom: 6,
  },
  myDeliveriesEarningsLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  myDeliveriesEarningsTitle: { color: flow.text, fontSize: 11, fontFamily: "Inter_700Bold" },
  myDeliveriesEarningsSub: { color: flow.muted, fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 1 },
  myDeliveriesEarningsRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  myDeliveriesEarningsAmount: { color: flow.cyan, fontSize: 16, fontFamily: "Inter_700Bold" },
  pickupOrderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: flow.space.sm,
  },
  pickupOrderIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.35)",
    backgroundColor: "rgba(20,200,243,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupOrderLabel: { color: flow.muted2, fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  pickupOrderId: { color: flow.text, fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 1 },
  pickupStatusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pickupStatusText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  pickupSectionCard: {
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: flow.space.sm,
    gap: 10,
  },
  pickupSectionHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  pickupSectionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: flow.cyan },
  pickupSectionTitle: { color: flow.cyan, fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  pickupSenderRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  pickupSenderLabel: { color: flow.muted2, fontSize: 9, fontFamily: "Inter_500Medium" },
  pickupSenderValue: { color: flow.text, fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  pickupAddressStreet: { color: flow.text, fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 1 },
  pickupAddressMeta: { color: flow.muted, fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 1 },
  pickupAddressPostcode: { color: flow.cyan, fontSize: 11, fontFamily: "Inter_700Bold", marginTop: 2 },
  pickupInstructionsText: { color: flow.text, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
  pickupStatsRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    overflow: "hidden",
  },
  pickupStatCol: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 12 },
  pickupStatDivider: { width: 1, backgroundColor: flow.line },
  pickupStatLabel: { color: flow.muted2, fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  pickupStatValue: { color: flow.text, fontSize: 13, fontFamily: "Inter_700Bold" },
  pickupNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: flow.buttonHeight,
    borderRadius: flow.radius,
    backgroundColor: flow.cyan,
    paddingHorizontal: flow.space.md,
  },
  pickupNavBtnTitle: { color: flow.onCyan, fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  pickupNavBtnSub: { color: "rgba(0,16,24,0.65)", fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 1 },
  pickupArrivalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: flow.buttonHeight,
    borderRadius: flow.radius,
    borderWidth: 1,
    borderColor: flow.cyan,
    backgroundColor: flow.inputBg,
    paddingHorizontal: flow.space.md,
    paddingVertical: 10,
  },
  pickupArrivalBtnTitle: { color: flow.text, fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  pickupArrivalBtnSub: { color: flow.muted, fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 1 },
  pickupFooterNote: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingHorizontal: 2, marginTop: 2 },
  pickupFooterText: { color: flow.muted2, fontSize: 10, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 14 },
  pickupConfirmCard: {
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: flow.space.sm,
    gap: 10,
  },
  pickupConfirmRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pickupConfirmIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.35)",
    backgroundColor: "rgba(20,200,243,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupConfirmLabel: { color: flow.cyan, fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  pickupConfirmValue: { color: flow.text, fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2 },
  pickupConfirmDivider: { height: 1, backgroundColor: flow.line },
  pickupConfirmSectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickupConfirmSectionTitle: { color: flow.cyan, fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  pickupConfirmCameraBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupConfirmPhotoBox: {
    height: 180,
    borderRadius: flow.radius,
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.panel,
    overflow: "hidden",
  },
  pickupConfirmPhoto: { width: "100%", height: "100%" },
  pickupConfirmPhotoEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  pickupConfirmPhotoHint: { color: flow.muted, fontSize: 11, fontFamily: "Inter_500Medium" },
  pickupConfirmClearLink: { color: flow.cyan, fontSize: 10, fontFamily: "Inter_700Bold" },
  pickupConfirmDisclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 2 },
  pickupConfirmDisclaimerText: { color: flow.muted, fontSize: 10, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 14 },
  deliveryNavOrderCard: {
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: flow.space.sm,
  },
  deliveryNavOrderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  deliveryNavOrderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.35)",
    backgroundColor: "rgba(20,200,243,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryNavOrderLabel: { color: flow.muted2, fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  deliveryNavOrderValue: { color: flow.text, fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 1 },
  deliveryNavStatusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deliveryNavStatusText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  deliveryNavSectionCard: {
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: flow.space.sm,
    gap: 10,
  },
  deliveryNavSectionHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  deliveryNavSectionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: flow.green },
  deliveryNavSectionTitle: { color: flow.cyan, fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  deliveryNavInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  deliveryNavInfoLabel: { color: flow.muted2, fontSize: 9, fontFamily: "Inter_500Medium" },
  deliveryNavInfoValue: { color: flow.text, fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  deliveryNavAddressStreet: { color: flow.text, fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 1 },
  deliveryNavAddressMeta: { color: flow.muted, fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 1 },
  deliveryNavAddressPostcode: { color: flow.cyan, fontSize: 11, fontFamily: "Inter_700Bold", marginTop: 2 },
  deliveryNavDestinationCard: {
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    overflow: "hidden",
    gap: 0,
  },
  deliveryNavDestinationTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: flow.space.sm,
  },
  deliveryNavDestinationLabel: { color: flow.cyan, fontSize: 10, fontFamily: "Inter_700Bold" },
  deliveryNavDestinationStreet: { color: flow.text, fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 2 },
  deliveryNavDestinationMeta: { color: flow.muted, fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  deliveryNavMapWrap: { height: 220, borderTopWidth: 1, borderTopColor: flow.line },
  deliveryNavStatsRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    overflow: "hidden",
  },
  deliveryNavStatCol: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 12, paddingHorizontal: 8 },
  deliveryNavStatDivider: { width: 1, backgroundColor: flow.line },
  deliveryNavStatHighlight: { color: flow.cyan, fontSize: 18, fontFamily: "Inter_700Bold" },
  deliveryNavStatSub: { color: flow.muted, fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center" },
  deliveryNavTrafficRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  deliveryNavTrafficText: { color: flow.green, fontSize: 11, fontFamily: "Inter_600SemiBold" },
  deliveryNavArrivalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: flow.buttonHeight,
    borderRadius: flow.radius,
    backgroundColor: flow.cyan,
    paddingHorizontal: flow.space.md,
  },
  deliveryNavArrivalText: { color: flow.onCyan, fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  deliveryConfirmCard: {
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: flow.space.sm,
    gap: 10,
  },
  deliveryConfirmRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  deliveryConfirmIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.35)",
    backgroundColor: "rgba(20,200,243,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryConfirmLabel: { color: flow.cyan, fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  deliveryConfirmValue: { color: flow.text, fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2 },
  deliveryConfirmSub: { color: flow.muted, fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  deliveryConfirmDivider: { height: 1, backgroundColor: flow.line },
  deliveryConfirmVerifyHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  deliveryConfirmSectionTitle: { color: flow.cyan, fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  deliveryConfirmInstruction: { color: flow.text, fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  deliveryConfirmSectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  deliveryConfirmClearLink: { color: flow.cyan, fontSize: 10, fontFamily: "Inter_700Bold" },
  deliveryConfirmPinTitle: {
    color: flow.text,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginTop: 4,
  },
  deliveryConfirmPinRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 8 },
  deliveryConfirmPinBox: {
    width: 42,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: flow.cyan,
    backgroundColor: flow.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryConfirmPinBoxDone: { borderColor: flow.green },
  deliveryConfirmPinChar: { color: flow.text, fontSize: 18, fontFamily: "Inter_700Bold" },
  deliveryConfirmHiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },
  deliveryConfirmPinError: { color: flow.red, fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  deliveryConfirmPinSuccess: { color: flow.green, fontSize: 11, fontFamily: "Inter_700Bold", textAlign: "center" },
  deliveryConfirmLockedSection: { opacity: 0.92 },
  deliveryConfirmDisclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 2 },
  deliveryConfirmDisclaimerText: { color: flow.muted, fontSize: 10, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 14 },
  deliveryCompletedPage: { gap: flow.space.md, paddingHorizontal: flow.space.page },
  deliveryCompletedHeader: {
    color: flow.text,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginTop: 4,
  },
  deliveryCompletedSuccessCard: {
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.35)",
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: flow.space.lg,
    alignItems: "center",
    gap: 8,
  },
  deliveryCompletedSuccessIconWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  deliveryCompletedConfettiDot: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: flow.cyan,
  },
  dot1: { top: 8, left: 18 },
  dot2: { top: 16, right: 12 },
  dot3: { bottom: 20, left: 8 },
  dot4: { bottom: 12, right: 22 },
  dot5: { top: 42, right: 4 },
  deliveryCompletedSuccessRingOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "rgba(20,200,243,0.45)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,200,243,0.06)",
  },
  deliveryCompletedSuccessRingInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: flow.cyan,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,200,243,0.12)",
  },
  deliveryCompletedSuccessTitle: {
    color: flow.text,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  deliveryCompletedSuccessSub: {
    color: flow.muted,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginBottom: 6,
  },
  deliveryCompletedEarningsRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: flow.line,
    paddingTop: 12,
    marginTop: 4,
  },
  deliveryCompletedEarningsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.35)",
    backgroundColor: "rgba(20,200,243,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryCompletedEarningsLabel: {
    color: flow.green,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  deliveryCompletedEarningsValue: {
    color: flow.text,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  deliveryCompletedEarningsDelta: {
    color: flow.green,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  deliveryCompletedBalanceCard: {
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: flow.space.sm,
    gap: 10,
  },
  deliveryCompletedBalanceLabel: {
    color: flow.cyan,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  deliveryCompletedBalanceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  deliveryCompletedBalanceAmount: {
    color: flow.text,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  deliveryCompletedBalanceMeta: {
    color: flow.muted2,
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  deliveryCompletedBalanceSub: {
    color: flow.muted,
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  deliveryCompletedWalletArt: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.35)",
    backgroundColor: "rgba(20,200,243,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryCompletedCashOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: flow.radius,
    backgroundColor: flow.cyan,
    paddingHorizontal: flow.space.md,
    paddingVertical: 12,
  },
  deliveryCompletedCashOutTitle: {
    color: flow.onCyan,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  deliveryCompletedCashOutSub: {
    color: "rgba(0,16,24,0.65)",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },
  deliveryCompletedSummaryCard: {
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: flow.space.sm,
    gap: 8,
  },
  deliveryCompletedSummaryTitle: {
    color: flow.cyan,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  deliveryCompletedSummaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    minHeight: 34,
  },
  deliveryCompletedSummaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryCompletedSummaryLabel: {
    color: flow.muted,
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    width: 88,
    paddingTop: 6,
  },
  deliveryCompletedSummaryValue: {
    flex: 1,
    color: flow.text,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
    paddingTop: 6,
  },
  deliveryCompletedSummaryValueMulti: { lineHeight: 15 },
  deliveryCompletedSummaryDivider: { height: 1, backgroundColor: flow.line },
  deliveryCompletedDashboardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: flow.buttonHeight,
    borderRadius: flow.radius,
    borderWidth: 1,
    borderColor: flow.cyan,
    backgroundColor: flow.inputBg,
    marginBottom: 8,
  },
  deliveryCompletedDashboardText: {
    color: flow.cyan,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    flex: 1,
    textAlign: "center",
  },
  earningsPage: { paddingHorizontal: flow.space.page, gap: 10 },
  earningsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
    marginBottom: 2,
  },
  earningsHeaderIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  earningsHeaderTitle: {
    color: flow.text,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  earningsTotalCard: {
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.35)",
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: 12,
    shadowColor: flow.cyan,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  earningsTotalTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  earningsTotalLabel: {
    color: flow.cyan,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  earningsTotalAmount: {
    color: flow.text,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  earningsTotalMeta: {
    color: flow.muted2,
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  earningsTotalDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  earningsTotalDelta: {
    color: flow.green,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  earningsTotalChartWrap: {
    width: 92,
    alignItems: "flex-end",
    gap: 6,
  },
  earningsTotalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(23,201,100,0.12)",
    borderWidth: 1,
    borderColor: "rgba(23,201,100,0.35)",
  },
  earningsTotalBadgeText: {
    color: flow.green,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  earningsSparkline: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 44,
    marginTop: 4,
  },
  earningsSparklineBar: {
    width: 8,
    borderRadius: 4,
    backgroundColor: flow.cyan,
  },
  earningsPeriodTabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: 3,
    gap: 3,
  },
  earningsPeriodTab: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  earningsPeriodTabActive: {
    backgroundColor: flow.cyan,
  },
  earningsPeriodTabText: {
    color: flow.muted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  earningsPeriodTabTextActive: {
    color: flow.onCyan,
  },
  earningsStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  earningsStatCard: {
    width: "48.5%",
    minHeight: 78,
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: 9,
    gap: 4,
  },
  earningsStatIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.25)",
    backgroundColor: "rgba(20,200,243,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  earningsStatValue: {
    color: flow.text,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  earningsStatLabel: {
    color: flow.muted2,
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
  earningsListHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  earningsListTitle: {
    color: flow.cyan,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  earningsListCount: {
    color: flow.cyan,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  earningsListCard: {
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    overflow: "hidden",
  },
  earningsDeliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  earningsDeliveryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: flow.line,
  },
  earningsDeliveryIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.35)",
    backgroundColor: "rgba(20,200,243,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  earningsDeliveryBody: { flex: 1, minWidth: 0, gap: 1 },
  earningsDeliveryId: {
    color: flow.text,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  earningsDeliveryRoute: {
    color: flow.muted,
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  earningsDeliveryTime: {
    color: flow.muted2,
    fontSize: 9,
    fontFamily: "Inter_400Regular",
  },
  earningsDeliveryRight: { alignItems: "flex-end", gap: 2, marginRight: 2 },
  earningsDeliveryAmount: {
    color: flow.cyan,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  earningsDeliveryStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  earningsDeliveryStatus: {
    color: flow.green,
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
  },
  earningsViewAllBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: flow.line,
  },
  earningsViewAllText: {
    color: flow.cyan,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  earningsBalanceCard: {
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.35)",
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: 12,
    gap: 10,
    marginTop: 2,
  },
  earningsBalanceTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  earningsBalanceLabel: {
    color: flow.cyan,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  earningsBalanceAmount: {
    color: flow.text,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  earningsBalanceSub: {
    color: flow.muted2,
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  earningsWalletArt: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.25)",
    backgroundColor: "rgba(20,200,243,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  earningsWithdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: flow.buttonHeight,
    borderRadius: flow.radius,
    backgroundColor: flow.cyan,
    paddingHorizontal: 12,
  },
  earningsWithdrawTitle: {
    color: flow.onCyan,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  earningsWithdrawSub: {
    color: flow.onCyan,
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    opacity: 0.75,
    marginTop: 1,
  },
  profilePage: { paddingHorizontal: flow.space.page, gap: 10 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
    marginBottom: 2,
  },
  profileHeaderSpacer: { width: 36 },
  profileHeaderTitle: {
    color: flow.text,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  profileHeaderIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  profileHeroCard: {
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.35)",
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: 12,
    gap: 12,
  },
  profileHeroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  profilePhotoWrap: { position: "relative" },
  profilePhotoCamera: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: flow.cyan,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: flow.inputBg,
  },
  profileHeroInfo: { flex: 1, minWidth: 0, gap: 6 },
  profileHeroName: {
    color: flow.text,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  profileVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(20,200,243,0.35)",
    backgroundColor: "rgba(20,200,243,0.08)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  profileVerifiedText: {
    color: flow.cyan,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  profileHeroMetaRow: { flexDirection: "row", gap: 10 },
  profileHeroMetaCol: { flex: 1, gap: 2 },
  profileHeroMetaLabel: {
    color: flow.cyan,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  profileHeroMetaValue: {
    color: flow.text,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  profileSectionCard: {
    borderWidth: 1,
    borderColor: flow.inputBorder,
    backgroundColor: flow.inputBg,
    borderRadius: flow.radius,
    padding: 12,
    gap: 2,
  },
  profileSectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  profileSectionTitle: {
    color: flow.cyan,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  profileInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 34,
    borderTopWidth: 1,
    borderTopColor: flow.line,
    paddingVertical: 4,
  },
  profileInfoLabel: {
    color: flow.muted,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  profileInfoValue: {
    color: flow.text,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    maxWidth: "52%",
    textAlign: "right",
  },
  profileOutlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 42,
    borderRadius: flow.radius,
    borderWidth: 1,
    borderColor: flow.cyan,
    backgroundColor: "rgba(20,200,243,0.04)",
    marginTop: 8,
    paddingHorizontal: 12,
  },
  profileOutlineBtnText: {
    color: flow.cyan,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  profileSaveBankBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: flow.buttonHeight,
    borderRadius: flow.radius,
    backgroundColor: flow.cyan,
    marginTop: 8,
  },
  profileSaveBankText: {
    color: flow.onCyan,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  profileSettingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
    borderTopWidth: 1,
    borderTopColor: flow.line,
    paddingVertical: 4,
  },
  profileSettingsLabel: {
    color: flow.text,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  profileLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: flow.buttonHeight,
    borderRadius: flow.radius,
    borderWidth: 1,
    borderColor: flow.red,
    backgroundColor: "rgba(239,35,60,0.06)",
    marginTop: 2,
  },
  profileLogoutText: {
    color: flow.red,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
});
