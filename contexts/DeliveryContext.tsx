import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";

import { postcode } from "@/components/DriverFlowUI";
import {
  logCompleteDelivery,
  supabaseErrorMessage,
} from "@/lib/completeDeliveryLog";
import {
  getDriverOrderNumber,
  resolvePublicOrderNumber,
} from "@/lib/orderDisplay";
import {
  syncOrderLifecycle,
  type OrderLifecycleEvent,
} from "@/lib/orderLifecycle";
import {
  mapAppStatusToDb,
  mapDbStatusToApp,
  resolveAppStatusFromRow,
  type AppOrderStatus,
} from "@/lib/orderStatus";
import { notifyNewOrder } from "@/lib/orderNotifications";
import { supabase, OrderRow } from "../lib/supabase";
import { useAuth } from "./AuthContext";

const CURRENT_ORDER_KEY = "sd_current_order_id";

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
  /** ISO timestamp from `orders.created_at` — used for queue age display. */
  createdAt?: string;
  /** Service tier from `orders.delivery_type` (Priority / Standard / Scheduled). */
  deliveryType?: string | null;
  customerPhone: string;
  recipientName?: string;
  recipientPhone?: string;
  /** Public order number (`orders.order_id`), e.g. SD-ORD-10007. */
  orderNumber?: string;
  packageId?: string;
  deliveryNotes?: string;
  pickupInstructions?: string;
  senderName?: string;
  senderPhone?: string;
  pin?: string;
  status: AppOrderStatus;
  driverId?: string | null;
  completedAt?: string | null;
};

type CompletedDelivery = {
  id: string;
  orderId: string;
  orderNumber?: string;
  packageId?: string;
  recipientName?: string;
  date: string;
  pickupAddress: string;
  deliveryAddress: string;
  distance: string;
  amount: number;
  durationMinutes: number;
  route: string;
};

function completedToOrder(delivery: CompletedDelivery): Order {
  return {
    id: delivery.orderId,
    pickupAddress: delivery.pickupAddress,
    deliveryAddress: delivery.deliveryAddress,
    pickupLat: 0,
    pickupLng: 0,
    deliveryLat: 0,
    deliveryLng: 0,
    distance: delivery.distance,
    payout: delivery.amount,
    packageType: "Parcel",
    customerPhone: "",
    recipientName: delivery.recipientName,
    orderNumber: delivery.orderNumber,
    packageId: delivery.packageId,
    status: "delivered",
  };
}

type DeliveryContextType = {
  /** Pending orders shown in the incoming popup / Available tab */
  incomingOrders: Order[];
  /** @deprecated use incomingOrders */
  availableOrders: Order[];
  /** Accepted and in-progress orders (My Deliveries) */
  myDeliveries: Order[];
  /** @deprecated use myDeliveries */
  activeDeliveries: Order[];
  queuedDeliveries: Order[];
  currentOrderId: string | null;
  currentOrder: Order | null;
  completedDeliveries: CompletedDelivery[];

  isOnline: boolean;
  isLoadingOrders: boolean;

  setIsOnline: (value: boolean) => Promise<void>;

  acceptOrder: (order: Order) => Promise<boolean>;
  rejectOrder: (orderId: string) => void;
  startDelivery: (orderId: string) => Promise<void>;

  updateDeliveryStatus: (
    orderId: string,
    status: Order["status"]
  ) => Promise<void>;

  /** Write a driver lifecycle event to `orders` (DB source of truth). */
  recordOrderEvent: (
    orderId: string,
    event: OrderLifecycleEvent,
    extra?: Record<string, unknown>
  ) => Promise<void>;

  completeDelivery: (
    order: Order,
    deliveryPhotoUrl: string,
    receiverSignatureUrl?: string
  ) => Promise<CompletedDelivery>;

  /** Local test-mode completion — no Supabase calls. */
  completeDeliveryLocal: (
    order: Order
  ) => Promise<CompletedDelivery>;

  cancelActiveDelivery: (
    orderId: string
  ) => Promise<void>;

  getOrderById: (orderId: string) => Order | undefined;

  focusIncomingPopup: boolean;
  setFocusIncomingPopup: (value: boolean) => void;

  todayEarnings: number;
  weeklyEarnings: number;
  availableBalance: number;
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
    createdAt: row.created_at,
    deliveryType: row.delivery_type ?? null,
    customerPhone: row.recipient_phone,
    recipientPhone: row.recipient_phone,
    recipientName: row.recipient_name,
    orderNumber: resolvePublicOrderNumber(row.order_id, row.package_id),
    packageId: row.package_id ?? undefined,
    deliveryNotes: row.delivery_notes,
    pickupInstructions: row.pickup_instructions || "",
    senderName: row.sender_name || row.recipient_name,
    senderPhone: row.sender_phone || row.recipient_phone || row.customer_phone,
    pin: row.delivery_confirmation_pin ?? row.pin,
    status: resolveAppStatusFromRow(row),
    driverId: row.driver_id,
    completedAt: row.completed_at ?? null,
  };
}

const APP_STATUS_TO_LIFECYCLE: Partial<
  Record<Order["status"], OrderLifecycleEvent>
> = {
  package_collected: "collected",
  en_route: "en_route",
  arriving: "arriving",
  delivered: "delivered",
};

const LIFECYCLE_TO_APP: Record<OrderLifecycleEvent, AppOrderStatus> = {
  accepted: "driver_assigned",
  heading_to_pickup: "driver_assigned",
  arrived_pickup: "driver_assigned",
  collected: "package_collected",
  en_route: "en_route",
  arriving: "arriving",
  pin_verified: "arriving",
  delivered: "delivered",
};

function applyOrderRowToMyDeliveries(
  row: OrderRow,
  setMyDeliveries: React.Dispatch<React.SetStateAction<Order[]>>
) {
  const order = rowToOrder(row);
  if (row.completed_at) {
    setMyDeliveries((prev) => prev.filter((d) => d.id !== order.id));
    return;
  }
  setMyDeliveries((prev) => {
    const exists = prev.some((d) => d.id === order.id);
    if (!exists) return [order, ...prev];
    return prev.map((d) => (d.id === order.id ? order : d));
  });
}

function parseDistanceNumeric(distance: string | number | null | undefined): number {
  if (typeof distance === "number" && Number.isFinite(distance)) {
    return distance;
  }
  const match = String(distance ?? "").match(/[\d.]+/);
  const parsed = match ? parseFloat(match[0]) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIso8601(value: string | null | undefined): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function rowToCompletedDelivery(row: OrderRow): CompletedDelivery {
  const completedAt = row.completed_at ?? row.delivered_at ?? row.created_at;
  const route = `${row.pickup_address ?? ""} → ${row.delivery_address ?? ""}`;
  return {
    id: row.id,
    orderId: row.id,
    orderNumber: resolvePublicOrderNumber(row.order_id, row.package_id),
    packageId: row.package_id ?? undefined,
    recipientName: row.recipient_name,
    date: toIso8601(completedAt),
    pickupAddress: row.pickup_address,
    deliveryAddress: row.delivery_address,
    distance: String(row.distance ?? ""),
    amount: Number(row.payout || 0),
    durationMinutes: 0,
    route,
  };
}

function buildCompletedDeliveryFromOrder(
  order: Order,
  completedAt: string
): CompletedDelivery {
  const route = `${order.pickupAddress} → ${order.deliveryAddress}`;
  return {
    id: order.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    packageId: order.packageId,
    recipientName: order.recipientName,
    date: toIso8601(completedAt),
    pickupAddress: order.pickupAddress,
    deliveryAddress: order.deliveryAddress,
    distance: String(order.distance ?? ""),
    amount: Number(order.payout || 0),
    durationMinutes: 0,
    route,
  };
}

function isCompletedOnOrAfter(isoDate: string, start: Date): boolean {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) return false;
  return timestamp >= start.getTime();
}

function applyCompletedDeliveryState(
  order: Order,
  setMyDeliveries: React.Dispatch<React.SetStateAction<Order[]>>,
  currentOrderId: string | null,
  setCurrentOrderId: React.Dispatch<React.SetStateAction<string | null>>
) {
  setMyDeliveries((prev) => prev.filter((delivery) => delivery.id !== order.id));

  if (currentOrderId === order.id) {
    setCurrentOrderId(null);
    void AsyncStorage.removeItem(CURRENT_ORDER_KEY);
  }
}

const ACTIVE_DB_STATUSES = [
  "accepted",
  "heading_to_pickup",
  "collected",
  "en_route",
  "arriving",
] as const;

function isIncomingOrder(
  order: Order,
  acceptedIds: Set<string>,
  dismissedIds: Set<string>
) {
  return (
    order.status === "pending" &&
    !order.driverId &&
    !acceptedIds.has(order.id) &&
    !dismissedIds.has(order.id)
  );
}

export function DeliveryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [incomingOrders, setIncomingOrders] =
    useState<Order[]>([]);

  const [myDeliveries, setMyDeliveries] =
    useState<Order[]>([]);

  const [
    completedDeliveries,
    setCompletedDeliveries,
  ] = useState<CompletedDelivery[]>([]);

  const [currentOrderId, setCurrentOrderId] =
    useState<string | null>(null);

  const [dismissedOrderIds, setDismissedOrderIds] =
    useState<Set<string>>(new Set());

  const [acceptedOrderIds, setAcceptedOrderIds] =
    useState<Set<string>>(new Set());

  const [isOnline, setIsOnlineState] =
    useState(false);

  const [isLoadingOrders, setIsLoadingOrders] =
    useState(false);

  const [focusIncomingPopup, setFocusIncomingPopup] =
    useState(false);

  const { driver } = useAuth();

  const knownIncomingRef = useRef<Set<string>>(new Set());
  const notifiedIncomingRef = useRef<Set<string>>(new Set());
  const initialIncomingLoadRef = useRef(false);
  const sessionClearedRef = useRef(false);

  const alertForNewOrder = useCallback(
    async (order: Order) => {
      if (!driver?.isOnline) return;
      if (notifiedIncomingRef.current.has(order.id)) return;
      if (
        !isIncomingOrder(
          order,
          acceptedOrderIds,
          dismissedOrderIds
        )
      ) {
        return;
      }

      notifiedIncomingRef.current.add(order.id);
      setFocusIncomingPopup(true);

      await notifyNewOrder({
        orderId: getDriverOrderNumber(order),
        pickupPostcode: postcode(order.pickupAddress),
        deliveryPostcode: postcode(order.deliveryAddress),
        earnings: Number(order.payout || 0),
      });
    },
    [acceptedOrderIds, dismissedOrderIds, driver?.isOnline]
  );

  const registerIncomingOrder = useCallback(
    async (order: Order, notify: boolean) => {
      if (
        !isIncomingOrder(
          order,
          acceptedOrderIds,
          dismissedOrderIds
        )
      ) {
        return;
      }

      const isNew = !knownIncomingRef.current.has(order.id);
      knownIncomingRef.current.add(order.id);

      setIncomingOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        return [...prev, order];
      });

      if (notify && isNew && initialIncomingLoadRef.current) {
        await alertForNewOrder(order);
      }
    },
    [acceptedOrderIds, alertForNewOrder, dismissedOrderIds]
  );

  const fetchIncomingOrders = useCallback(async () => {
    setIsLoadingOrders(true);

    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "pending")
      .is("driver_id", null)
      .order("created_at", { ascending: true });

    if (data) {
      const filtered = (data as OrderRow[])
        .map(rowToOrder)
        .filter((order) =>
          isIncomingOrder(
            order,
            acceptedOrderIds,
            dismissedOrderIds
          )
        );

      const newOrders = filtered.filter(
        (order) => !knownIncomingRef.current.has(order.id)
      );

      filtered.forEach((order) => {
        knownIncomingRef.current.add(order.id);
      });

      setIncomingOrders(filtered);

      if (initialIncomingLoadRef.current) {
        for (const order of newOrders) {
          void alertForNewOrder(order);
        }
      } else {
        initialIncomingLoadRef.current = true;
      }
    }

    setIsLoadingOrders(false);
  }, [acceptedOrderIds, alertForNewOrder, dismissedOrderIds]);

  const fetchCompletedDeliveries = useCallback(async () => {
    if (!driver) {
      setCompletedDeliveries([]);
      return;
    }

    const { data: orderRows } = await supabase
      .from("orders")
      .select("*")
      .eq("driver_id", driver.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false });

    setCompletedDeliveries(
      orderRows ? (orderRows as OrderRow[]).map(rowToCompletedDelivery) : []
    );
  }, [driver]);

  const fetchMyDeliveries = useCallback(async () => {
    if (!driver) return;

    const { data: orderRows } = await supabase
      .from("orders")
      .select("*")
      .eq("driver_id", driver.id)
      .in("status", [...ACTIVE_DB_STATUSES])
      .is("completed_at", null)
      .order("created_at", { ascending: false });

    if (orderRows) {
      const rows = (orderRows as OrderRow[]).map(rowToOrder);
      setMyDeliveries(rows);
      setAcceptedOrderIds((prev) => {
        const next = new Set(prev);
        rows.forEach((order) => next.add(order.id));
        return next;
      });
    }

    await fetchCompletedDeliveries();
  }, [driver, fetchCompletedDeliveries]);

  useEffect(() => {
    if (!driver) return;
    fetchIncomingOrders();
  }, [driver, fetchIncomingOrders]);

  useEffect(() => {
    if (!driver) return;
    fetchMyDeliveries();

    const poll = setInterval(() => {
      void fetchMyDeliveries();
    }, 2000);

    return () => clearInterval(poll);
  }, [driver, fetchMyDeliveries]);

  useEffect(() => {
    if (!driver?.isOnline) return;

    const channel = supabase
      .channel(`driver-incoming-${driver.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new as OrderRow;
          if (row.status !== "pending" || row.driver_id) return;
          void registerIncomingOrder(rowToOrder(row), true);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new as OrderRow;
          if (row.status === "pending" && !row.driver_id) {
            void registerIncomingOrder(rowToOrder(row), true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver?.id, driver?.isOnline, registerIncomingOrder]);

  useEffect(() => {
    if (!driver) return;

    const channel = supabase
      .channel(`driver-active-${driver.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `driver_id=eq.${driver.id}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as OrderRow | undefined;
          if (!row?.id) return;
          applyOrderRowToMyDeliveries(row, setMyDeliveries);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driver?.id]);

  useEffect(() => {
    if (!driver?.isOnline) return;

    const poll = setInterval(() => {
      void fetchIncomingOrders();
    }, 30000);

    return () => clearInterval(poll);
  }, [driver?.isOnline, fetchIncomingOrders]);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state === "active" && driver?.isOnline) {
        void fetchIncomingOrders();
      }
    };

    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [driver?.isOnline, fetchIncomingOrders]);

  useEffect(() => {
    if (driver) {
      sessionClearedRef.current = false;
      return;
    }
    if (sessionClearedRef.current) return;
    sessionClearedRef.current = true;

    setIncomingOrders([]);
    setMyDeliveries([]);
    setCurrentOrderId(null);
    setAcceptedOrderIds(new Set());
    setDismissedOrderIds(new Set());
    setIsOnlineState(false);
    setFocusIncomingPopup(false);
    knownIncomingRef.current.clear();
    notifiedIncomingRef.current.clear();
    initialIncomingLoadRef.current = false;
  }, [driver]);

  useEffect(() => {
    if (!driver) return;

    AsyncStorage.getItem(CURRENT_ORDER_KEY).then((storedId) => {
      if (storedId) setCurrentOrderId(storedId);
    });
  }, [driver]);

  useEffect(() => {
    if (!currentOrderId) return;
    const stillActive = myDeliveries.some(
      (o) => o.id === currentOrderId
    );
    if (!stillActive) {
      setCurrentOrderId(null);
      AsyncStorage.removeItem(CURRENT_ORDER_KEY);
    }
  }, [myDeliveries, currentOrderId]);

  const queuedDeliveries = useMemo(
    () =>
      myDeliveries.filter(
        (o) => o.status === "driver_assigned"
      ),
    [myDeliveries]
  );

  const currentOrder = useMemo(
    () =>
      currentOrderId
        ? myDeliveries.find(
            (o) => o.id === currentOrderId
          ) ?? null
        : null,
    [myDeliveries, currentOrderId]
  );

  const getOrderById = useCallback(
    (orderId: string) => {
      const active = myDeliveries.find((o) => o.id === orderId);
      if (active) return active;

      const completed = completedDeliveries.find(
        (d) =>
          d.orderId === orderId ||
          d.id === orderId ||
          d.packageId === orderId
      );
      return completed ? completedToOrder(completed) : undefined;
    },
    [completedDeliveries, myDeliveries]
  );

  const setIsOnline = useCallback(
    async (value: boolean) => {
      setIsOnlineState(value);
    },
    []
  );

  const recordOrderEvent = useCallback(
    async (
      orderId: string,
      event: OrderLifecycleEvent,
      extra?: Record<string, unknown>
    ) => {
      await syncOrderLifecycle(orderId, event, extra);

      const appStatus = LIFECYCLE_TO_APP[event];
      setMyDeliveries((prev) =>
        prev.map((delivery) =>
          delivery.id === orderId ? { ...delivery, status: appStatus } : delivery
        )
      );
    },
    []
  );

  const acceptOrder = useCallback(
    async (order: Order) => {
      if (!driver) return false;

      try {
        await syncOrderLifecycle(order.id, "accepted", {
          driver_id: driver.id,
          assigned_driver_id: driver.id,
          is_assigned: true,
        });
      } catch (error) {
        console.error("acceptOrder failed:", error);
        return false;
      }

      const accepted: Order = {
        ...order,
        status: "driver_assigned",
        driverId: driver.id,
      };

      setAcceptedOrderIds((prev) => new Set(prev).add(order.id));
      setIncomingOrders((prev) => prev.filter((o) => o.id !== order.id));
      setMyDeliveries((prev) => [
        accepted,
        ...prev.filter((o) => o.id !== order.id),
      ]);

      return true;
    },
    [driver]
  );

  const rejectOrder = useCallback(
    (orderId: string) => {
      setDismissedOrderIds((prev) =>
        new Set(prev).add(orderId)
      );
      setIncomingOrders((prev) =>
        prev.filter((o) => o.id !== orderId)
      );
    },
    []
  );

  const startDelivery = useCallback(
    async (orderId: string) => {
      setCurrentOrderId(orderId);
      await AsyncStorage.setItem(CURRENT_ORDER_KEY, orderId);
    },
    []
  );

  const updateDeliveryStatus = useCallback(
    async (orderId: string, status: Order["status"]) => {
      const event = APP_STATUS_TO_LIFECYCLE[status];
      if (event) {
        await recordOrderEvent(orderId, event);
        return;
      }

      const dbStatus = mapAppStatusToDb(status);
      const { error } = await supabase
        .from("orders")
        .update({ status: dbStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw new Error(error.message);

      setMyDeliveries((prev) =>
        prev.map((delivery) =>
          delivery.id === orderId ? { ...delivery, status } : delivery
        )
      );
    },
    [recordOrderEvent]
  );

  const completeDelivery = useCallback(
    async (
      order: Order,
      deliveryPhotoUrl: string,
      receiverSignatureUrl?: string
    ): Promise<CompletedDelivery> => {
      logCompleteDelivery("start", { orderId: order.id, driverId: driver?.id });

      if (!driver) {
        throw new Error("Driver not logged in");
      }

      if (!deliveryPhotoUrl?.trim()) {
        throw new Error("Delivery photo upload is required.");
      }

      const completedAt = new Date().toISOString();
      const deliveryId = `DEL-${Date.now()}`;

      logCompleteDelivery("save_photo_urls", {
        delivery_photo_url: deliveryPhotoUrl,
        delivery_proof_photo_url: deliveryPhotoUrl,
      });

      logCompleteDelivery("update_order_completion", {
        orderId: order.id,
        delivery_photo_url: deliveryPhotoUrl,
        receiver_signature_url: receiverSignatureUrl,
      });

      try {
        await syncOrderLifecycle(order.id, "delivered", {
          delivery_photo_url: deliveryPhotoUrl,
          delivery_proof_photo_url: deliveryPhotoUrl,
          receiver_signature_url: receiverSignatureUrl,
          completed_at: completedAt,
          delivered_at: completedAt,
          pin_verified: true,
          pin_verified_at: completedAt,
        });
        logCompleteDelivery("update_order_ok", { orderId: order.id });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save delivery proof on order.";
        logCompleteDelivery("update_order_failed", message);
        throw new Error(message);
      }

      const deliveryInsert = {
        id: deliveryId,
        order_id: order.id,
        driver_id: driver.id,
        pickup_address: order.pickupAddress,
        delivery_address: order.deliveryAddress,
        distance: parseDistanceNumeric(order.distance),
        payout: Number(order.payout || 0),
        status: "delivered" as const,
        recipient_phone: order.recipientPhone || order.customerPhone || null,
        recipient_name: order.recipientName || null,
        package_id: order.packageId || null,
        delivery_notes: order.deliveryNotes || null,
      };

      logCompleteDelivery("create_delivery_record", deliveryInsert);

      const { data, error: deliveryError } = await supabase
        .from("deliveries")
        .insert(deliveryInsert)
        .select()
        .single();

      if (deliveryError) {
        const message = supabaseErrorMessage(deliveryError);
        logCompleteDelivery("create_delivery_record_failed", message);
        logCompleteDelivery("using_order_completion", {
          reason: "Order already saved; delivery record is optional.",
        });
      } else {
        logCompleteDelivery("create_delivery_record_ok", { deliveryId: data?.id });
      }

      applyCompletedDeliveryState(
        order,
        setMyDeliveries,
        currentOrderId,
        setCurrentOrderId
      );
      await fetchCompletedDeliveries();

      const completed = buildCompletedDeliveryFromOrder(order, completedAt);
      logCompleteDelivery("complete", { orderId: order.id, deliveryId: completed.id });
      return completed;
    },
    [currentOrderId, driver, fetchCompletedDeliveries]
  );

  const completeDeliveryLocal = useCallback(
    async (order: Order): Promise<CompletedDelivery> => {
      const completed: CompletedDelivery = {
        id: `DEL-${Date.now()}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        packageId: order.packageId,
        recipientName: order.recipientName,
        date: new Date().toISOString(),
        pickupAddress: order.pickupAddress,
        deliveryAddress: order.deliveryAddress,
        distance: order.distance,
        amount: Number(order.payout || 0),
        durationMinutes: Math.floor(15 + Math.random() * 20),
        route: `${order.pickupAddress} → ${order.deliveryAddress}`,
      };

      setMyDeliveries((prev) => prev.filter((delivery) => delivery.id !== order.id));

      if (currentOrderId === order.id) {
        setCurrentOrderId(null);
        await AsyncStorage.removeItem(CURRENT_ORDER_KEY);
      }

      return completed;
    },
    [currentOrderId]
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

        setMyDeliveries((prev) =>
          prev.filter(
            (d) => d.id !== orderId
          )
        );

        setAcceptedOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });

        if (currentOrderId === orderId) {
          setCurrentOrderId(null);
          await AsyncStorage.removeItem(
            CURRENT_ORDER_KEY
          );
        }

        await fetchIncomingOrders();
      },
      [currentOrderId, fetchIncomingOrders]
    );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEarnings = completedDeliveries
    .filter((d) => isCompletedOnOrAfter(d.date, todayStart))
    .reduce((sum, d) => sum + d.amount, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const weeklyEarnings = completedDeliveries
    .filter((d) => isCompletedOnOrAfter(d.date, weekStart))
    .reduce((sum, d) => sum + d.amount, 0);

  const availableBalance = completedDeliveries.reduce(
    (sum, d) => sum + d.amount,
    0
  );

  return (
    <DeliveryContext.Provider
      value={{
        incomingOrders,
        availableOrders: incomingOrders,
        myDeliveries,
        activeDeliveries: myDeliveries,
        queuedDeliveries,
        currentOrderId,
        currentOrder,
        completedDeliveries,

        isOnline,
        setIsOnline,

        acceptOrder,
        rejectOrder,
        startDelivery,

        updateDeliveryStatus,
        recordOrderEvent,
        completeDelivery,
        completeDeliveryLocal,
        cancelActiveDelivery,

        getOrderById,

        focusIncomingPopup,
        setFocusIncomingPopup,

        todayEarnings,
        weeklyEarnings,
        availableBalance,

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
