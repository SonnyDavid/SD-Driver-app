/**
 * Live Supabase `orders_status_check` allowed values (do not write others).
 */
export const DB_ORDER_STATUSES = [
  "pending",
  "accepted",
  "heading_to_pickup",
  "collected",
  "en_route",
  "arriving",
  "no_driver_found",
] as const;

export type DbOrderStatus = (typeof DB_ORDER_STATUSES)[number];

/** App workflow status used in UI — mapped when persisting to Supabase. */
export type AppOrderStatus =
  | "pending"
  | "driver_assigned"
  | "package_collected"
  | "en_route"
  | "arriving"
  | "delivered"
  | "cancelled";

export function isDbOrderStatus(value: string): value is DbOrderStatus {
  return (DB_ORDER_STATUSES as readonly string[]).includes(value);
}

/** Map in-app workflow status to a value accepted by orders_status_check. */
export function mapAppStatusToDb(status: AppOrderStatus): DbOrderStatus {
  switch (status) {
    case "pending":
      return "pending";
    case "driver_assigned":
      return "accepted";
    case "package_collected":
      return "collected";
    case "en_route":
      return "en_route";
    case "arriving":
      return "arriving";
    case "cancelled":
      return "no_driver_found";
    case "delivered":
      // Completion is recorded via completed_at / deliveries row, not status.
      return "arriving";
    default:
      return "pending";
  }
}

/** Map Supabase status to in-app workflow status for UI. */
export function mapDbStatusToApp(status: string): AppOrderStatus {
  if (status === "accepted" || status === "heading_to_pickup") return "driver_assigned";
  if (status === "collected") return "package_collected";
  if (status === "en_route") return "en_route";
  if (status === "arriving") return "arriving";
  if (status === "no_driver_found") return "cancelled";
  if (status === "pending") return "pending";
  if (isDbOrderStatus(status)) return status as AppOrderStatus;
  return "pending";
}
