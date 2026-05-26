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
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  vehicle_type: "car" | "van" | "motorcycle";
  vehicle_registration: string;
  vehicle_photo_uri: string | null;
  status: "pending" | "verified" | "suspended";
  is_online: boolean;
  created_at: string;
}

export interface OrderRow {
  id: string;
  pickup_address: string;
  delivery_address: string;
  distance: string;
  pickup_lat: number;
  pickup_lng: number;
  delivery_lat: number;
  delivery_lng: number;
  payout: number;
  package_type: string;
  customer_phone: string;
  recipient_phone: string;
  recipient_name: string;
  package_id: string;
  delivery_notes: string;
  pin: string;
  status:
    | "pending"
    | "driver_assigned"
    | "package_collected"
    | "en_route"
    | "arriving"
    | "delivered"
    | "cancelled";
  driver_id: string | null;
  created_at: string;
}

export interface DeliveryRow {
  id: string;
  order_id: string;
  driver_id: string;
  pickup_address: string;
  delivery_address: string;
  distance: string;
  amount: number;
  duration_minutes: number;
  route: string;
  completed_at: string;
  created_at: string;

  recipient_phone: string;
  recipient_name: string;
  package_id: string;
  delivery_notes: string;
}
