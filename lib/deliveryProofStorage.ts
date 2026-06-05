import AsyncStorage from "@react-native-async-storage/async-storage";

import { isRemotePhotoUri } from "@/lib/driverProfilePhoto";

export type DeliveryProofRecord = {
  orderId: string;
  pinVerifiedAt: string;
  signatureImageUri: string;
  signatureTimestamp: string;
  photoUri: string;
  photoRemoteUrl?: string;
  photoTimestamp: string;
};

const KEY_PREFIX = "sd_delivery_proof_";

function storageKey(orderId: string) {
  return `${KEY_PREFIX}${orderId}`;
}

export async function getDeliveryProof(orderId: string): Promise<DeliveryProofRecord | null> {
  const raw = await AsyncStorage.getItem(storageKey(orderId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeliveryProofRecord;
  } catch {
    return null;
  }
}

export async function saveDeliveryProof(
  record: Partial<DeliveryProofRecord> & Pick<DeliveryProofRecord, "orderId">
): Promise<DeliveryProofRecord> {
  const existing = await getDeliveryProof(record.orderId);
  const merged: DeliveryProofRecord = {
    orderId: record.orderId,
    pinVerifiedAt: record.pinVerifiedAt ?? existing?.pinVerifiedAt ?? "",
    signatureImageUri: record.signatureImageUri ?? existing?.signatureImageUri ?? "",
    signatureTimestamp: record.signatureTimestamp ?? existing?.signatureTimestamp ?? "",
    photoUri: record.photoUri ?? existing?.photoUri ?? "",
    photoRemoteUrl: record.photoRemoteUrl ?? existing?.photoRemoteUrl,
    photoTimestamp: record.photoTimestamp ?? existing?.photoTimestamp ?? "",
  };
  await AsyncStorage.setItem(storageKey(record.orderId), JSON.stringify(merged));
  return merged;
}

/** Display URI for delivery photo (prefers persisted remote URL). */
export function deliveryPhotoDisplayUri(record: Pick<DeliveryProofRecord, "photoUri" | "photoRemoteUrl">) {
  if (record.photoRemoteUrl && isRemotePhotoUri(record.photoRemoteUrl)) {
    return record.photoRemoteUrl;
  }
  return record.photoUri;
}
