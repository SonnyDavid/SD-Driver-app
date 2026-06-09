import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { Platform, Vibration } from "react-native";

export const NEW_ORDERS_CHANNEL_ID = "new-orders";

export type NewOrderNotificationPayload = {
  orderId: string;
  orderUuid: string;
  pickupPostcode: string;
  deliveryPostcode: string;
  earnings: number;
};

let initialized = false;
let foregroundSound: Audio.Sound | null = null;
let soundAsset: number | null = null;
const lastRing = { orderUuid: "", at: 0 };

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function resolveSoundAsset(): number {
  if (soundAsset != null) return soundAsset;
  try {
    soundAsset = require("@/assets/sounds/new_order.wav") as number;
  } catch {
    soundAsset = require("@/assets/sounds/new-order.wav") as number;
  }
  return soundAsset;
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return requested.status === "granted";
}

async function configureAndroidChannel() {
  if (Platform.OS !== "android") return;

  try {
    await Notifications.deleteNotificationChannelAsync(NEW_ORDERS_CHANNEL_ID);
  } catch {
    // ignore
  }

  await Notifications.setNotificationChannelAsync(NEW_ORDERS_CHANNEL_ID, {
    name: "New Orders",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: "#14C8F3",
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function initOrderNotifications(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (!initialized) {
    initialized = true;
    await configureAndroidChannel();
  }
  return ensureNotificationPermissions();
}

async function loadForegroundSound() {
  if (Platform.OS === "web") return null;

  if (!foregroundSound) {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      staysActiveInBackground: true,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    });
    const loaded = await Audio.Sound.createAsync(resolveSoundAsset(), {
      volume: 1,
      shouldPlay: false,
    });
    foregroundSound = loaded.sound;
  }
  return foregroundSound;
}

export async function playNewOrderSound() {
  if (Platform.OS === "web") return;

  try {
    const sound = await loadForegroundSound();
    if (!sound) return;
    const status = await sound.getStatusAsync();
    if (status.isLoaded && status.isPlaying) await sound.stopAsync();
    await sound.replayAsync();
  } catch {
    // expo-av unavailable — system notification sound is the fallback
  }
}

export async function vibrateForNewOrder() {
  if (Platform.OS === "web") return;

  Vibration.vibrate([0, 400, 200, 400]);
  if (Platform.OS === "ios") {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // no-op
    }
  }
}

async function postSystemNotification(payload: NewOrderNotificationPayload) {
  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  const title = "New Order Received!";
  const body = `${payload.orderId}\nPickup: ${payload.pickupPostcode} → Delivery: ${payload.deliveryPostcode}\nEarnings: £${payload.earnings.toFixed(2)}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: {
        type: "new_order",
        orderId: payload.orderId,
        orderUuid: payload.orderUuid,
        pickupPostcode: payload.pickupPostcode,
        deliveryPostcode: payload.deliveryPostcode,
        earnings: payload.earnings,
      },
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 400, 200, 400],
      color: "#14C8F3",
    },
    trigger:
      Platform.OS === "android"
        ? { channelId: NEW_ORDERS_CHANNEL_ID }
        : null,
  });
}

export async function ringForNewOrder(payload: NewOrderNotificationPayload) {
  if (Platform.OS === "web") return;

  const now = Date.now();
  if (lastRing.orderUuid === payload.orderUuid && now - lastRing.at < 2500) return;
  lastRing.orderUuid = payload.orderUuid;
  lastRing.at = now;

  await initOrderNotifications();
  await playNewOrderSound();
  await vibrateForNewOrder();
  await postSystemNotification(payload);
}

export async function notifyNewOrder(payload: NewOrderNotificationPayload) {
  await ringForNewOrder(payload);
}

export function isNewOrderNotification(data: unknown): data is {
  type: "new_order";
  orderId: string;
  orderUuid?: string;
} {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: string }).type === "new_order"
  );
}
