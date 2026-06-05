import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { Platform, Vibration } from "react-native";

/** Android notification channel id */
export const NEW_ORDERS_CHANNEL_ID = "new-orders";

/** Bundled sound filenames (also listed in app.json expo-notifications plugin) */
export const NOTIFICATION_SOUNDS = {
  new_order: "new_order.wav",
  order_cancelled: "order_cancelled.wav",
  pickup_confirmed: "pickup_confirmed.wav",
  pin_verified: "pin_verified.wav",
  delivery_completed: "delivery_completed.wav",
} as const;

export type OrderNotificationType = keyof typeof NOTIFICATION_SOUNDS;

export type NewOrderNotificationPayload = {
  orderId: string;
  pickupPostcode: string;
  deliveryPostcode: string;
  earnings: number;
};

let initialized = false;
let foregroundSound: Audio.Sound | null = null;

export async function initOrderNotifications(): Promise<boolean> {
  if (initialized || Platform.OS === "web") return false;
  initialized = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NEW_ORDERS_CHANNEL_ID, {
      name: "New Orders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: "#14C8F3",
      sound: NOTIFICATION_SOUNDS.new_order,
      enableVibrate: true,
      bypassDnd: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status === "granted";
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
    const loaded = await Audio.Sound.createAsync(
      require("@/assets/sounds/new-order.wav"),
      { volume: 1, shouldPlay: false }
    );
    foregroundSound = loaded.sound;
  }

  return foregroundSound;
}

/** Plays custom sound immediately (foreground / in-app, independent of popup visibility). */
export async function playNewOrderSound() {
  if (Platform.OS === "web") return;

  try {
    const sound = await loadForegroundSound();
    if (!sound) return;
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // System notification sound remains the fallback.
  }
}

export async function vibrateForNewOrder() {
  if (Platform.OS === "web") return;

  try {
    if (Platform.OS === "ios") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTimeout(
        () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
        280
      );
    } else {
      Vibration.vibrate([0, 400, 200, 400]);
    }
  } catch {
    Vibration.vibrate(400);
  }
}

export async function notifyNewOrder(payload: NewOrderNotificationPayload) {
  if (Platform.OS === "web") return;

  await playNewOrderSound();
  await vibrateForNewOrder();

  const title = "New Order Received!";
  const body = `${payload.orderId}\nPickup: ${payload.pickupPostcode} → Delivery: ${payload.deliveryPostcode}\nEarnings: £${payload.earnings.toFixed(2)}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: NOTIFICATION_SOUNDS.new_order,
      data: {
        type: "new_order" satisfies OrderNotificationType,
        orderId: payload.orderId,
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
        ? ({ channelId: NEW_ORDERS_CHANNEL_ID } as Notifications.NotificationTriggerInput)
        : null,
  });
}

export function isNewOrderNotification(data: unknown): data is {
  type: "new_order";
  orderId: string;
} {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: string }).type === "new_order"
  );
}
