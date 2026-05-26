import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  supabase,
  OrderRow,
  DeliveryRow,
} from "../lib/supabase";
import { useAuth } from "./AuthContext";

type Order = {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  distance: string;
  payout: number;
  packageType: string;
  customerPhone: string;
  recipientName?: string;
  recipientPhone?: string;
  packageId?: string;
  deliveryNotes?: string;
  pin?: string;
  status: string;
  driverId?: string | null;
};

type CompletedDelivery = {
  id: string;
  orderId: string;
  date: string;
  pickupAddress: string;
  deliveryAddress: string;
  distance: string;
  amount: number;
  durationMinutes: number;
  route: string;
};

type DeliveryContextType = {
  availableOrders: Order[];
  activeDeliveries: Order[];
  completedDeliveries: CompletedDelivery[];

  isOnline: boolean;
  isLoadingOrders: boolean;

  setIsOnline: (value: boolean) => Promise<void>;

  acceptOrder: (order: Order) => Promise<void>;
  rejectOrder: (orderId: string) => void;

  updateDeliveryStatus: (
    orderId: string,
    status: Order["status"]
  ) => Promise<void>;

  completeDelivery: (
    order: Order
  ) => Promise<CompletedDelivery>;

  cancelActiveDelivery: (
    orderId: string
  ) => Promise<void>;

  todayEarnings: number;
  weeklyEarnings: number;
};

const DeliveryContext =
  createContext<DeliveryContextType | null>(null);

function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    pickupAddress: row.pickup_address,
    deliveryAddress: row.delivery_address,
    pickupLat: row.pickup_lat,
    pickupLng: row.pickup_lng,
    deliveryLat: row.delivery_lat,
    deliveryLng: row.delivery_lng,
    distance: row.distance,
    payout: Number(row.payout),
    packageType: row.package_type,
    customerPhone: row.recipient_phone,
    recipientPhone: row.recipient_phone,
    recipientName: row.recipient_name,
    packageId: row.package_id,
    deliveryNotes: row.delivery_notes,
    pin: row.pin,
    status: row.status,
    driverId: row.driver_id,
  };
}

function rowToDelivery(
  row: DeliveryRow
): CompletedDelivery {
  return {
    id: row.id,
    orderId: row.order_id,
    date: new Date(
      row.completed_at
    ).toLocaleString(),

    pickupAddress: row.pickup_address,
    deliveryAddress: row.delivery_address,
    distance: row.distance,
    amount: Number(row.amount),
    durationMinutes: row.duration_minutes,
    route: row.route,
  };
}

export function DeliveryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [availableOrders, setAvailableOrders] =
    useState<Order[]>([]);

  const [activeDeliveries, setActiveDeliveries] =
    useState<Order[]>([]);

  const [
    completedDeliveries,
    setCompletedDeliveries,
  ] = useState<CompletedDelivery[]>([]);

  const [isOnline, setIsOnlineState] =
    useState(false);

  const [isLoadingOrders, setIsLoadingOrders] =
    useState(false)
  
  const { driver } = useAuth();
  
  useEffect(() => {
    fetchOrders();
    fetchMyDeliveries();
  }, []);

  async function fetchOrders() {
    setIsLoadingOrders(true);

    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "pending");

    if (data) {
      setAvailableOrders(
        (data as OrderRow[]).map(rowToOrder)
      );
    }

    setIsLoadingOrders(false);
  }

  async function fetchMyDeliveries() {
    if (!driver) return;
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("driver_id", driver.id)
      .order("created_at", {
        ascending: false,
      });

    if (data) {
      setActiveDeliveries(
        (data as OrderRow[]).map(
          rowToOrder
        )
      );
    }
  }

  const setIsOnline = useCallback(
    async (value: boolean) => {
      setIsOnlineState(value);
    },
    []
  );

  const acceptOrder = useCallback(
    async (order: Order) => {
      if (!driver) return;
      const { error } = await supabase
        .from("orders")
        .update({
          status: "pickup_pending",
          driver_id: driver.id,
        })
        .eq("id", order.id)
      .eq("status", "pending");
      console.log("SUPABASE ERROR:", error);
      if (!error) {
        console.log("NEW ACTIVE DELIVERY:", order);
        setActiveDeliveries((prev) => [
          ...prev,
          {
            ...order,
            status: "pickup_pending",
            driverId: driver.id,
          },
        ]);

        setAvailableOrders((prev) =>
          prev.filter(
            (o) => o.id !== order.id
          )
        );
      }
    },
    []
  );

  const rejectOrder = useCallback(
    (orderId: string) => {
      setAvailableOrders((prev) =>
        prev.filter(
          (o) => o.id !== orderId
        )
      );
    },
    []
  );

  const updateDeliveryStatus =
    useCallback(
      async (
        orderId: string,
        status: Order["status"]
      ) => {
        await supabase
          .from("orders")
          .update({ status })
          .eq("id", orderId);

        setActiveDeliveries((prev) =>
          prev.map((delivery) =>
            delivery.id === orderId
              ? {
                  ...delivery,
                  status,
                }
              : delivery
          )
        );
      },
      []
    );

  const completeDelivery = useCallback(
    async (
      order: Order
    ): Promise<CompletedDelivery> => {
      const durationMinutes =
        Math.floor(
          15 + Math.random() * 20
        );

      const route =
        `${order.pickupAddress} → ${order.deliveryAddress}`;

      await supabase
        .from("orders")
        .update({
          status: "delivered",
        })
        .eq("id", order.id);

      const deliveryId =
        `DEL-${Date.now()}`;

      const { data, error } =
        await supabase
          .from("deliveries")
          .insert({
            id: deliveryId,
            order_id: order.id,
            driver_id: driver!.id,

            pickup_address:
              order.pickupAddress,

            delivery_address:
              order.deliveryAddress,

            distance: order.distance,

            amount: order.payout,

            duration_minutes:
              durationMinutes,

            route,

            completed_at:
              new Date().toISOString(),

            recipient_phone:
              order.customerPhone,

            recipient_name:
              order.recipientName || "",

            package_id:
              order.packageId || "",

            delivery_notes:
              order.deliveryNotes || "",
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      const completed =
        rowToDelivery(
          data as DeliveryRow
        );

      setCompletedDeliveries((prev) => [
        completed,
        ...prev,
      ]);

      setActiveDeliveries((prev) =>
        prev.filter(
          (d) => d.id !== order.id
        )
      );

      return completed;
    },
    []
  );

  const cancelActiveDelivery =
    useCallback(
      async (orderId: string) => {
        await supabase
          .from("orders")
          .update({
            status: "pending",
            driver_id: null,
          })
          .eq("id", orderId);

        setActiveDeliveries((prev) =>
          prev.filter(
            (d) => d.id !== orderId
          )
        );
      },
      []
    );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEarnings =
    completedDeliveries
      .filter(
        (d) =>
          new Date(d.date) >=
          todayStart
      )
      .reduce(
        (sum, d) => sum + d.amount,
        0
      );

  const weekStart = new Date();
  weekStart.setDate(
    weekStart.getDate() - 7
  );

  const weeklyEarnings =
    completedDeliveries
      .filter(
        (d) =>
          new Date(d.date) >=
          weekStart
      )
      .reduce(
        (sum, d) => sum + d.amount,
        0
      );

  return (
    <DeliveryContext.Provider
      value={{
        availableOrders,
        activeDeliveries,
        completedDeliveries,

        isOnline,
        setIsOnline,

        acceptOrder,
        rejectOrder,

        updateDeliveryStatus,
        completeDelivery,
        cancelActiveDelivery,

        todayEarnings,
        weeklyEarnings,

        isLoadingOrders,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
}

export function useDelivery() {
  const ctx =
    useContext(DeliveryContext);

  if (!ctx) {
    throw new Error(
      "useDelivery must be used within DeliveryProvider"
    );
  }

  return ctx;
}