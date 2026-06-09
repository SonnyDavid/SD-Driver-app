import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// React Native needs a custom storage adapter
const ExpoSecureStore = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : ExpoSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      drivers: {
        Row: DriverRow;
        Insert: Omit<DriverRow, "created_at">;
        Update: Partial<Omit<DriverRow, "id" | "created_at">>;
      };
      orders: {
        Row: OrderRow;
        Insert: Omit<OrderRow, "created_at">;
        Update: Partial<Omit<OrderRow, "id" | "created_at">>;
      };
      deliveries: {
        Row: DeliveryRow;
        Insert: Omit<DeliveryRow, "created_at">;
        Update: Partial<Omit<DeliveryRow, "id" | "created_at">>;
      };
    };
  };
};

export interface DriverRow {
  id: string;
  driver_id: string | null;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  vehicle_type: "car" | "van" | "motorcycle";
  vehicle_registration: string;
  vehicle_photo_uri: string | null;
  profile_photo_uri: string | null;
  status: "pending" | "verified" | "suspended";
  is_online: boolean;
  created_at: string;
}

export interface OrderRow {
  id: string;
  /** Public order number shown to drivers (e.g. SD-ORD-10007). */
  order_id?: string | null;
  pickup_address: string;
  pickup_postcode?: string | null;
  pickup_zone?: string | null;
  delivery_address: string;
  delivery_postcode?: string | null;
  delivery_zone?: string | null;
  distance: string;
  /** Not present on live `orders` table — reserved for future coordinate columns. */
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  payout: number;
  delivery_type?: string | null;
  package_type: string;
  customer_phone: string;
  recipient_phone: string;
  recipient_name: string;
  package_id: string;
  delivery_notes: string;
  pickup_instructions?: string | null;
  sender_name?: string | null;
  sender_phone?: string | null;
  delivery_confirmation_pin?: string | null;
  delivery_photo_url?: string | null;
  delivery_proof_photo_url?: string | null;
  completed_at?: string | null;
  delivered_at?: string | null;
  current_stage?: string | null;
  driver_status?: string | null;
  pin_verified?: boolean | null;
  pin_verified_at?: string | null;
  pin: string;
  status: string;
  driver_id: string | null;
  created_at: string;
}

/** Matches live `public.deliveries` (status includes `delivered`). */
export interface DeliveryRow {
  id: string;
  order_id: string;
  driver_id: string;
  customer_id?: string | null;
  pickup_address: string;
  delivery_address: string;
  distance?: number | string | null;
  payout?: number | string | null;
  price?: number | string | null;
  status?: string | null;
  created_at: string;
  recipient_phone?: string | null;
  recipient_name?: string | null;
  package_id?: string | null;
  delivery_notes?: string | null;
  sender_name?: string | null;
  sender_phone?: string | null;
}
