const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SD_ORD_RE = /^SD-ORD-/i;

export type DriverOrderLabelSource = {
  /** Public order number from `orders.order_id` (e.g. SD-ORD-10007). */
  orderNumber?: string | null;
  /** Physical package reference from `orders.package_id` — not the driver-facing order number. */
  packageId?: string | null;
  /** Internal primary key — never shown to drivers. */
  id?: string;
};

export function isInternalUuid(value: string | undefined | null): boolean {
  if (!value) return false;
  return UUID_RE.test(value.trim());
}

/** Pick the best driver-visible order reference from DB fields. */
export function resolvePublicOrderNumber(
  orderId?: string | null,
  packageId?: string | null
): string | undefined {
  for (const candidate of [orderId, packageId]) {
    if (!candidate?.trim()) continue;
    const trimmed = candidate.trim();
    if (isInternalUuid(trimmed)) continue;
    if (SD_ORD_RE.test(trimmed)) return trimmed;
  }
  for (const candidate of [orderId, packageId]) {
    if (!candidate?.trim()) continue;
    const trimmed = candidate.trim();
    if (!isInternalUuid(trimmed)) return trimmed;
  }
  return undefined;
}

/** Label for any driver-facing order card, popup, or header. Never returns a UUID. */
export function getDriverOrderNumber(source: DriverOrderLabelSource): string {
  const resolved = resolvePublicOrderNumber(source.orderNumber, source.packageId);
  if (resolved) return resolved;
  return "—";
}
