/** Step-by-step logging for the complete-delivery transaction. */
export function logCompleteDelivery(
  step: string,
  detail?: Record<string, unknown> | string
) {
  const prefix = "[CompleteDelivery]";
  if (typeof detail === "string") {
    console.log(`${prefix} ${step}: ${detail}`);
  } else if (detail) {
    console.log(`${prefix} ${step}`, detail);
  } else {
    console.log(`${prefix} ${step}`);
  }
}

export function supabaseErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;
    if (message) return message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
