import { Linking, Platform } from "react-native";

type MapsTarget = {
  address: string;
  lat?: number;
  lng?: number;
};

export function mapsAppLabel() {
  return Platform.OS === "ios" ? "Apple Maps" : "Google Maps";
}

export async function openMapsNavigation({ address, lat, lng }: MapsTarget) {
  const hasCoords = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);

  if (Platform.OS === "ios") {
    const url = hasCoords
      ? `http://maps.apple.com/?daddr=${lat},${lng}`
      : `http://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
    return Linking.openURL(url);
  }

  if (hasCoords) {
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    const canOpenGoogle = await Linking.canOpenURL(googleUrl);
    if (canOpenGoogle) return Linking.openURL(googleUrl);
    return Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(address)})`);
  }

  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  const canOpenGoogle = await Linking.canOpenURL(googleUrl);
  if (canOpenGoogle) return Linking.openURL(googleUrl);
  return Linking.openURL(`geo:0,0?q=${encodeURIComponent(address)}`);
}
