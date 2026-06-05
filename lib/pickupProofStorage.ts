import AsyncStorage from "@react-native-async-storage/async-storage";

export type PickupProofRecord = {
  orderId: string;
  signatureImageUri: string;
  signatureTimestamp: string;
  photoUri?: string;
  photoTimestamp?: string;
};

const KEY_PREFIX = "sd_pickup_proof_";

function storageKey(orderId: string) {
  return `${KEY_PREFIX}${orderId}`;
}

export async function getPickupProof(orderId: string): Promise<PickupProofRecord | null> {
  const raw = await AsyncStorage.getItem(storageKey(orderId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PickupProofRecord;
  } catch {
    return null;
  }
}

export async function savePickupSignature(
  orderId: string,
  signatureImageUri: string,
  timestamp = new Date().toISOString()
): Promise<PickupProofRecord> {
  const existing = (await getPickupProof(orderId)) || { orderId, signatureImageUri: "", signatureTimestamp: "" };
  const record: PickupProofRecord = {
    ...existing,
    orderId,
    signatureImageUri,
    signatureTimestamp: timestamp,
  };
  await AsyncStorage.setItem(storageKey(orderId), JSON.stringify(record));
  return record;
}

export async function savePickupPhoto(
  orderId: string,
  photoUri: string,
  timestamp = new Date().toISOString()
): Promise<PickupProofRecord> {
  const existing = (await getPickupProof(orderId)) || { orderId, signatureImageUri: "", signatureTimestamp: "" };
  const record: PickupProofRecord = {
    ...existing,
    orderId,
    photoUri,
    photoTimestamp: timestamp,
  };
  await AsyncStorage.setItem(storageKey(orderId), JSON.stringify(record));
  return record;
}

export async function savePickupProof(record: PickupProofRecord): Promise<PickupProofRecord> {
  await AsyncStorage.setItem(storageKey(record.orderId), JSON.stringify(record));
  return record;
}
