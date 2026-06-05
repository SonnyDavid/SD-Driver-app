import { supabase } from "@/lib/supabase";
import { DRIVER_PROFILE_BUCKET } from "@/lib/storageBuckets";

export { DRIVER_PROFILE_BUCKET };

export function isRemotePhotoUri(uri?: string | null) {
  return !!uri && (uri.startsWith("http://") || uri.startsWith("https://"));
}

export function isLocalPhotoUri(uri?: string | null) {
  return (
    !!uri &&
    (uri.startsWith("file://") ||
      uri.startsWith("content://") ||
      uri.startsWith("ph://") ||
      uri.startsWith("assets-library://"))
  );
}

/** Upload registration selfie to Supabase Storage and return a persistent public URL. */
export async function uploadDriverProfilePhoto(driverId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error("Could not read profile photo from device.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("Content-Type") || "image/jpeg";
  const path = `${driverId}/profile.jpg`;

  const { error } = await supabase.storage.from(DRIVER_PROFILE_BUCKET).upload(path, arrayBuffer, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });

  if (error) throw error;

  const { data } = supabase.storage.from(DRIVER_PROFILE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
