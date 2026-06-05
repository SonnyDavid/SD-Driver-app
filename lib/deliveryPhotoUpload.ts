import { logCompleteDelivery } from "@/lib/completeDeliveryLog";
import { isRemotePhotoUri } from "@/lib/driverProfilePhoto";
import { DELIVERY_PHOTOS_BUCKET } from "@/lib/storageBuckets";
import { supabase } from "@/lib/supabase";

/** Upload delivery proof photo to Supabase Storage and return a persistent public URL. */
export async function uploadDeliveryPhoto(orderId: string, localUri: string): Promise<string> {
  if (isRemotePhotoUri(localUri)) {
    return localUri;
  }

  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error("Could not read delivery photo from device.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("Content-Type") || "image/jpeg";
  const path = `${orderId}/delivery-${Date.now()}.jpg`;

  logCompleteDelivery("storage_upload", { bucket: DELIVERY_PHOTOS_BUCKET, path });

  const { error } = await supabase.storage.from(DELIVERY_PHOTOS_BUCKET).upload(path, arrayBuffer, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });

  if (error) {
    const message = error.message || "Failed to upload delivery photo.";
    if (/bucket not found/i.test(message)) {
      throw new Error(
        `Storage bucket "${DELIVERY_PHOTOS_BUCKET}" is missing. Run supabase-schema.sql storage section in the Supabase SQL editor.`
      );
    }
    throw new Error(message);
  }

  const { data } = supabase.storage.from(DELIVERY_PHOTOS_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error("Could not generate delivery photo URL.");
  }

  return data.publicUrl;
}
