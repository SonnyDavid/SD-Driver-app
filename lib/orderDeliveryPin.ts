import { supabase } from "@/lib/supabase";

function normalizePin(value: unknown): string {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 6);
}

/** PIN stored on the order for receiver verification (Supabase). */
export function pinFromOrderRow(row: {
  delivery_confirmation_pin?: string | null;
  pin?: string | null;
}): string {
  return normalizePin(row.delivery_confirmation_pin ?? row.pin);
}

export async function fetchOrderDeliveryConfirmationPin(
  orderId: string
): Promise<{ pin: string | null; error?: string }> {
  const { data, error } = await supabase
    .from("orders")
    .select("delivery_confirmation_pin, pin")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    const fallback = await supabase.from("orders").select("pin").eq("id", orderId).maybeSingle();
    if (fallback.error || !fallback.data) {
      return { pin: null, error: error.message };
    }
    const pin = normalizePin(fallback.data.pin);
    return pin ? { pin } : { pin: null, error: "No delivery PIN on this order." };
  }

  if (!data) {
    return { pin: null, error: "Order not found." };
  }

  const pin = pinFromOrderRow(data);
  if (!pin) {
    return { pin: null, error: "No delivery PIN on this order." };
  }

  return { pin };
}
