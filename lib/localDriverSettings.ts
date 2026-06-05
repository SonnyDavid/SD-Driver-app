import AsyncStorage from "@react-native-async-storage/async-storage";

export type LocalDriverSettings = {
  notifications: boolean;
  soundAlerts: boolean;
  darkMode: boolean;
};

const DEFAULT_SETTINGS: LocalDriverSettings = {
  notifications: true,
  soundAlerts: true,
  darkMode: true,
};

function storageKey(driverId: string) {
  return `sd_driver_settings_${driverId}`;
}

export async function loadLocalDriverSettings(driverId: string): Promise<LocalDriverSettings> {
  const raw = await AsyncStorage.getItem(storageKey(driverId));
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as LocalDriverSettings) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveLocalDriverSettings(
  driverId: string,
  settings: LocalDriverSettings
): Promise<LocalDriverSettings> {
  await AsyncStorage.setItem(storageKey(driverId), JSON.stringify(settings));
  return settings;
}
