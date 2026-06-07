import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { supabase, DriverRow } from "@/lib/supabase";
import {
  isLocalPhotoUri,
  isRemotePhotoUri,
  uploadDriverProfilePhoto,
} from "@/lib/driverProfilePhoto";

export interface Driver {
  id: string;
  driverId: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  vehicleType: "car" | "van" | "motorcycle";
  vehicleRegistration: string;
  vehiclePhotoUri?: string;
  profilePhotoUri?: string;
  status: "pending" | "verified" | "suspended";
  isOnline: boolean;
  createdAt: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  vehicleType: "car" | "van" | "motorcycle";
  vehicleRegistration: string;
  vehiclePhotoUri?: string;
  profilePhotoUri: string;
}

interface AuthContextValue {
  driver: Driver | null;
  isLoading: boolean;
  login: (driverId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; driverId?: string; error?: string }>;
  logout: () => Promise<void>;
  updateDriver: (updates: Partial<Driver>) => Promise<void>;
  setOnline: (online: boolean) => Promise<void>;
}

const CURRENT_DRIVER_KEY = "sd_current_driver_id";
const profilePhotoKey = (driverId: string) => `sd_profile_photo_${driverId}`;
const AuthContext = createContext<AuthContextValue | null>(null);

function generateDriverId(): string {
  const num = Math.floor(10000 + Math.random() * 89999);
  return `SD-${num}`;
}

function rowToDriver(row: DriverRow): Driver {
  return {
    id: row.id,
    driverId: row.driver_id ?? row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    password: row.password_hash,
    vehicleType: row.vehicle_type,
    vehicleRegistration: row.vehicle_registration,
    vehiclePhotoUri: row.vehicle_photo_uri ?? undefined,
    profilePhotoUri: row.profile_photo_uri ?? undefined,
    status: row.status,
    isOnline: row.is_online,
    createdAt: row.created_at,
  };
}

async function resolveProfilePhotoUri(driverId: string, dbUri?: string | null): Promise<string | undefined> {
  if (isRemotePhotoUri(dbUri)) return dbUri!;

  const cached = await AsyncStorage.getItem(profilePhotoKey(driverId));
  if (isRemotePhotoUri(cached)) return cached!;

  const localUri =
    (cached && isLocalPhotoUri(cached) ? cached : null) ||
    (isLocalPhotoUri(dbUri) ? dbUri! : null);

  if (localUri) {
    try {
      const remote = await uploadDriverProfilePhoto(driverId, localUri);
      await AsyncStorage.setItem(profilePhotoKey(driverId), remote);
      await supabase.from("drivers").update({ profile_photo_uri: remote }).eq("id", driverId);
      return remote;
    } catch {
      return localUri;
    }
  }

  return undefined;
}

async function hydrateDriver(row: DriverRow): Promise<Driver> {
  const driver = rowToDriver(row);
  driver.profilePhotoUri = await resolveProfilePhotoUri(row.id, row.profile_photo_uri);
  return driver;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const currentId = await AsyncStorage.getItem(CURRENT_DRIVER_KEY);
        if (currentId) {
          const { data } = await supabase
            .from("drivers")
            .select("*")
            .eq("id", currentId)
            .single();
          if (data) setDriver(await hydrateDriver(data as DriverRow));
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (driverId: string, password: string) => {
    const trimmedId = driverId.trim().toUpperCase();
    let { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("driver_id", trimmedId)
      .maybeSingle();

    if (!data) {
      const fallback = await supabase
        .from("drivers")
        .select("*")
        .eq("id", trimmedId)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) return { success: false, error: "Driver ID not found. Please check and try again." };
    const row = data as DriverRow;
    if (row.password_hash !== password) return { success: false, error: "Incorrect password. Please try again." };
    if (row.status === "pending") {
      return { success: false, error: "Your account is awaiting admin approval." };
    }
    if (row.status === "suspended") {
      return { success: false, error: "Your account has been suspended. Contact support." };
    }

    await AsyncStorage.setItem(CURRENT_DRIVER_KEY, row.id);
    setDriver(await hydrateDriver(row));
    return { success: true };
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    // Check email uniqueness
    const { data: existing } = await supabase
      .from("drivers")
      .select("id")
      .eq("email", data.email.trim().toLowerCase())
      .maybeSingle();

    if (existing) return { success: false, error: "An account with this email already exists." };

    // Generate unique driver ID
    let driverId = generateDriverId();
    let taken = true;
    while (taken) {
      const { data: check } = await supabase
        .from("drivers")
        .select("id")
        .or(`driver_id.eq.${driverId},id.eq.${driverId}`)
        .maybeSingle();
      taken = !!check;
      if (taken) driverId = generateDriverId();
    }

    let profilePhotoUri: string | null = null;
    if (data.profilePhotoUri) {
      try {
        profilePhotoUri = await uploadDriverProfilePhoto(driverId, data.profilePhotoUri);
      } catch {
        profilePhotoUri = data.profilePhotoUri;
      }
      await AsyncStorage.setItem(profilePhotoKey(driverId), profilePhotoUri);
    }

    const insertPayload = {
      id: driverId,
      driver_id: driverId,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      password_hash: data.password,
      vehicle_type: data.vehicleType,
      vehicle_registration: data.vehicleRegistration.trim().toUpperCase(),
      vehicle_photo_uri: data.vehiclePhotoUri || null,
      profile_photo_uri: profilePhotoUri,
      status: "pending" as const,
      is_online: false,
    };

    let { error } = await supabase.from("drivers").insert(insertPayload);
    if (error?.message?.includes("profile_photo_uri")) {
      const { profile_photo_uri: _ignored, ...withoutProfile } = insertPayload;
      ({ error } = await supabase.from("drivers").insert(withoutProfile));
    }

    if (error) return { success: false, error: error.message };

    return { success: true, driverId };
  }, []);

  const logout = useCallback(async () => {
    const driverId = driver?.id;

    setDriver(null);

    try {
      await AsyncStorage.multiRemove([
        CURRENT_DRIVER_KEY,
        "sd_current_order_id",
      ]);
    } catch (error) {
      console.warn("Failed to clear local session storage during logout", error);
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // Driver auth is local-session based; Supabase auth sign-out is best-effort.
    }

    if (driverId) {
      void supabase
        .from("drivers")
        .update({ is_online: false })
        .eq("id", driverId)
        .then(
          () => undefined,
          () => undefined
        );
    }
  }, [driver]);

  const updateDriver = useCallback(async (updates: Partial<Driver>) => {
    if (!driver) return;
    setDriver((prev) => (prev ? { ...prev, ...updates } : null));

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.isOnline !== undefined) dbUpdates.is_online = updates.isOnline;
    if (updates.profilePhotoUri !== undefined) dbUpdates.profile_photo_uri = updates.profilePhotoUri || null;

    if (Object.keys(dbUpdates).length === 0) return;

    try {
      await supabase.from("drivers").update(dbUpdates).eq("id", driver.id);
    } catch {
      // Keep local profile updates even when Supabase is unavailable.
    }
  }, [driver]);

  const setOnline = useCallback(async (online: boolean) => {
    if (!driver) return;
    await supabase.from("drivers").update({ is_online: online }).eq("id", driver.id);
    setDriver((prev) => (prev ? { ...prev, isOnline: online } : null));
  }, [driver]);

  return (
    <AuthContext.Provider value={{ driver, isLoading, login, register, logout, updateDriver, setOnline }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
