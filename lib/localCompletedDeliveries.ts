import AsyncStorage from "@react-native-async-storage/async-storage";

export type LocalCompletedDelivery = {
  id: string;
  orderId: string;
  orderNumber?: string;
  packageId?: string;
  recipientName?: string;
  date: string;
  pickupAddress: string;
  deliveryAddress: string;
  distance: string;
  amount: number;
  durationMinutes: number;
  route: string;
};

const STORAGE_KEY = "sd_local_completed_deliveries";

export async function loadLocalCompletedDeliveries(): Promise<LocalCompletedDelivery[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LocalCompletedDelivery[];
  } catch {
    return [];
  }
}

export async function saveLocalCompletedDeliveries(
  deliveries: LocalCompletedDelivery[]
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(deliveries));
}

export async function appendLocalCompletedDelivery(
  delivery: LocalCompletedDelivery
): Promise<LocalCompletedDelivery[]> {
  const existing = await loadLocalCompletedDeliveries();
  const next = [delivery, ...existing.filter((d) => d.orderId !== delivery.orderId)];
  await saveLocalCompletedDeliveries(next);
  return next;
}
