import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { supabase, DriverRow } from "@/lib/supabase";

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  vehicleType: "car" | "van" | "motorcycle";
  vehicleRegistration: string;
  vehiclePhotoUri?: string;
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
  vehiclePhotoUri: string;
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
const AuthContext = createContext<AuthContextValue | null>(null);

function generateDriverId(): string {
  const num = Math.floor(10000 + Math.random() * 89999);
  return `SD-${num}`;
}

function rowToDriver(row: DriverRow): Driver {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    password: row.password_hash,
    vehicleType: row.vehicle_type,
    vehicleRegistration: row.vehicle_registration,
    vehiclePhotoUri: row.vehicle_photo_uri ?? undefined,
    status: row.status,
    isOnline: row.is_online,
    createdAt: row.created_at,
  };
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
          if (data) setDriver(rowToDriver(data as DriverRow));
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (driverId: string, password: string) => {
    const trimmedId = driverId.trim().toUpperCase();
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", trimmedId)
      .single();

    if (error || !data) return { success: false, error: "Driver ID not found. Please check and try again." };
    const row = data as DriverRow;
    if (row.password_hash !== password) return { success: false, error: "Incorrect password. Please try again." };

    await AsyncStorage.setItem(CURRENT_DRIVER_KEY, trimmedId);
    setDriver(rowToDriver(row));
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
      const { data: check } = await supabase.from("drivers").select("id").eq("id", driverId).maybeSingle();
      taken = !!check;
      if (taken) driverId = generateDriverId();
    }

    const { error } = await supabase.from("drivers").insert({
      id: driverId,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      password_hash: data.password,
      vehicle_type: data.vehicleType,
      vehicle_registration: data.vehicleRegistration.trim().toUpperCase(),
      vehicle_photo_uri: data.vehiclePhotoUri || null,
      status: "pending",
      is_online: false,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, driverId };
  }, []);

  const logout = useCallback(async () => {
    if (driver) {
      await supabase.from("drivers").update({ is_online: false }).eq("id", driver.id);
    }
    await AsyncStorage.removeItem(CURRENT_DRIVER_KEY);
    setDriver(null);
  }, [driver]);

  const updateDriver = useCallback(async (updates: Partial<Driver>) => {
    if (!driver) return;
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.isOnline !== undefined) dbUpdates.is_online = updates.isOnline;

    await supabase.from("drivers").update(dbUpdates).eq("id", driver.id);
    setDriver((prev) => (prev ? { ...prev, ...updates } : null));
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
