import * as Location from "expo-location";
import { Linking, Platform } from "react-native";

type MapsTarget = {
  address: string;
  lat?: number;
  lng?: number;
};

export type NavigationOrderFields = {
  id?: string;
  orderNumber?: string;
  address: string;
  postcode?: string | null;
  lat?: number | null;
  lng?: number | null;
};

const UK_POSTCODE_RE = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i;

const SYNTHETIC_ZONE_ADDRESS_RE =
  /^\d+\s+(North|South|East|West)\s+Belfast\b/i;

/** Extract a UK postcode from free text (no demo fallback). */
export function extractUkPostcode(value?: string | null): string {
  if (!value) return "";
  const match = value.match(UK_POSTCODE_RE);
  return match ? match[1].replace(/\s+/g, " ").trim().toUpperCase() : "";
}

function normalizePostcode(value?: string | null): string {
  if (!value) return "";
  return value.replace(/\s+/g, "").toUpperCase();
}

function stripPostcodeFromText(text: string, postcode: string): string {
  if (!text || !postcode) return text.trim();
  const pattern = new RegExp(postcode.replace(/\s+/g, "\\s*"), "gi");
  return text.replace(pattern, "").replace(/,\s*$/, "").replace(/\s+/g, " ").trim();
}

export function isPostcodeOnly(value?: string | null): boolean {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return false;
  const pc = extractUkPostcode(trimmed);
  if (!pc) return false;
  return stripPostcodeFromText(trimmed, pc) === "";
}

/** Detect order-generator zone labels masquerading as street addresses. */
export function isLikelySyntheticZoneAddress(value?: string | null): boolean {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return false;
  const streetOnly = stripPostcodeFromText(trimmed, extractUkPostcode(trimmed));
  return (
    SYNTHETIC_ZONE_ADDRESS_RE.test(streetOnly) ||
    /Belfast City Centre \(City Hall/i.test(streetOnly) ||
    /\b(North|South|East|West)\s+Belfast\s+Belfast\b/i.test(streetOnly)
  );
}

/**
 * Build a UK geocoding-friendly address from Supabase order fields.
 * Always prefers "street, postcode, UK" — never postcode-only when a street line exists.
 */
export function formatMapsAddress(address?: string | null, postcode?: string | null): string {
  const rawAddress = typeof address === "string" ? address.trim() : "";
  const explicitPc =
    typeof postcode === "string" ? postcode.trim().toUpperCase() : "";
  const embeddedPc = extractUkPostcode(rawAddress);
  const pc = explicitPc || embeddedPc;

  let streetLine = rawAddress;
  if (embeddedPc) {
    streetLine = stripPostcodeFromText(rawAddress, embeddedPc);
  } else if (
    explicitPc &&
    normalizePostcode(rawAddress).includes(normalizePostcode(explicitPc))
  ) {
    streetLine = stripPostcodeFromText(rawAddress, explicitPc);
  }

  streetLine = streetLine.replace(/,\s*$/, "").trim();

  if (streetLine && pc && !isPostcodeOnly(streetLine)) {
    return `${streetLine}, ${pc}, UK`;
  }
  if (streetLine && !isPostcodeOnly(streetLine)) {
    return /,\s*UK$/i.test(streetLine) ? streetLine : `${streetLine}, UK`;
  }
  if (pc) return `${pc}, UK`;
  return rawAddress;
}

function areValidCoordinates(lat?: number | null, lng?: number | null): boolean {
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function buildMapsTarget(
  kind: "pickup" | "delivery",
  fields: NavigationOrderFields
): MapsTarget {
  const address = formatMapsAddress(fields.address, fields.postcode);
  const hasDbCoords = areValidCoordinates(fields.lat, fields.lng);
  const target: MapsTarget = { address };
  if (hasDbCoords) {
    target.lat = fields.lat!;
    target.lng = fields.lng!;
  }

  const audit = {
    order_id: fields.id ?? null,
    order_number: fields.orderNumber ?? null,
    [`supabase_${kind}_address`]: fields.address,
    [`supabase_${kind}_postcode`]: fields.postcode ?? null,
    [`supabase_${kind}_latitude`]: fields.lat ?? null,
    [`supabase_${kind}_longitude`]: fields.lng ?? null,
    maps_query: address,
    using_db_coordinates: hasDbCoords,
    postcode_only: isPostcodeOnly(address),
    likely_synthetic_address: isLikelySyntheticZoneAddress(fields.address),
    matches_supabase_text:
      normalizePostcode(fields.address).includes(normalizePostcode(address)) ||
      address.startsWith(stripPostcodeFromText(fields.address, extractUkPostcode(fields.address))),
  };

  console.log(`[MapsNavigation] ${kind} audit`, audit);

  if (audit.likely_synthetic_address) {
    console.warn(
      `[MapsNavigation] ${kind} address looks like a zone label, not a real street — maps accuracy depends on Order Generator data`,
      audit
    );
  }

  if (audit.postcode_only) {
    console.error(`[MapsNavigation] ${kind} destination is postcode-only`, audit);
  }

  return target;
}

/** Delivery navigation target — uses live Supabase fields only. */
export function mapsTargetFromDelivery(order: {
  id?: string;
  orderNumber?: string;
  deliveryAddress: string;
  deliveryPostcode?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
}): MapsTarget {
  return buildMapsTarget("delivery", {
    id: order.id,
    orderNumber: order.orderNumber,
    address: order.deliveryAddress,
    postcode: order.deliveryPostcode,
    lat: order.deliveryLat,
    lng: order.deliveryLng,
  });
}

/** Pickup navigation target — uses live Supabase fields only. */
export function mapsTargetFromPickup(order: {
  id?: string;
  orderNumber?: string;
  pickupAddress: string;
  pickupPostcode?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
}): MapsTarget {
  return buildMapsTarget("pickup", {
    id: order.id,
    orderNumber: order.orderNumber,
    address: order.pickupAddress,
    postcode: order.pickupPostcode,
    lat: order.pickupLat,
    lng: order.pickupLng,
  });
}

export function mapsAppLabel() {
  return Platform.OS === "ios" ? "Apple Maps" : "Google Maps";
}

function buildAppleMapsUrl(target: MapsTarget): string {
  const hasCoords = areValidCoordinates(target.lat, target.lng);
  return hasCoords
    ? `http://maps.apple.com/?daddr=${target.lat},${target.lng}`
    : `http://maps.apple.com/?daddr=${encodeURIComponent(target.address)}`;
}

function buildGoogleMapsUrl(target: MapsTarget): string {
  const hasCoords = areValidCoordinates(target.lat, target.lng);
  return hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target.address)}`;
}

/** Geocode formatted address when orders table has no lat/lng columns. */
async function resolveNavigationCoordinates(target: MapsTarget): Promise<MapsTarget> {
  if (areValidCoordinates(target.lat, target.lng)) {
    return target;
  }

  if (!target.address || isPostcodeOnly(target.address)) {
    return target;
  }

  try {
    const results = await Location.geocodeAsync(target.address);
    const hit = results.find((r) => areValidCoordinates(r.latitude, r.longitude));
    if (!hit) {
      console.warn("[MapsNavigation] geocode returned no coordinates", {
        maps_query: target.address,
      });
      return target;
    }

    console.log("[MapsNavigation] geocoded address", {
      maps_query: target.address,
      latitude: hit.latitude,
      longitude: hit.longitude,
    });

    return { ...target, lat: hit.latitude, lng: hit.longitude };
  } catch (error) {
    console.warn("[MapsNavigation] geocodeAsync failed", {
      maps_query: target.address,
      error,
    });
    return target;
  }
}

export async function openMapsNavigation(target: MapsTarget) {
  const resolved = await resolveNavigationCoordinates(target);
  const hasCoords = areValidCoordinates(resolved.lat, resolved.lng);
  const appleUrl = buildAppleMapsUrl(resolved);
  const googleUrl = buildGoogleMapsUrl(resolved);

  const payload = {
    platform: Platform.OS,
    maps_app: mapsAppLabel(),
    mode: hasCoords ? "coordinates" : "address",
    maps_query: resolved.address,
    latitude: hasCoords ? resolved.lat : null,
    longitude: hasCoords ? resolved.lng : null,
    coordinate_source: hasCoords
      ? areValidCoordinates(target.lat, target.lng)
        ? "supabase"
        : "geocoded"
      : null,
    postcode_only: isPostcodeOnly(resolved.address),
    apple_maps_url: appleUrl,
    google_maps_url: googleUrl,
    apple_maps_daddr_decoded: hasCoords
      ? `${resolved.lat},${resolved.lng}`
      : decodeURIComponent(appleUrl.split("daddr=")[1] ?? ""),
    google_maps_destination_decoded: hasCoords
      ? `${resolved.lat},${resolved.lng}`
      : decodeURIComponent(googleUrl.split("destination=")[1] ?? ""),
  };

  console.log("[MapsNavigation] opening maps — payload", payload);

  if (Platform.OS === "ios") {
    return Linking.openURL(appleUrl);
  }

  if (hasCoords) {
    const canOpenGoogle = await Linking.canOpenURL(googleUrl);
    if (canOpenGoogle) return Linking.openURL(googleUrl);
    return Linking.openURL(
      `geo:${resolved.lat},${resolved.lng}?q=${resolved.lat},${resolved.lng}(${encodeURIComponent(resolved.address)})`
    );
  }

  const canOpenGoogle = await Linking.canOpenURL(googleUrl);
  if (canOpenGoogle) return Linking.openURL(googleUrl);
  return Linking.openURL(`geo:0,0?q=${encodeURIComponent(resolved.address)}`);
}
