import { supabase } from "./supabase";
import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";

type PaymentSheetResult =
  | { status: "success" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

/**
 * Prepare and present the Stripe PaymentSheet using our Supabase edge function.
 * amount should be in major currency units (e.g., 9.99 for USD).
 */
export async function launchPaymentSheet(params: {
  amount: number;
  currency?: string;
  metadata?: Record<string, string | number | boolean>;
}): Promise<PaymentSheetResult> {
  const { amount, currency = "usd", metadata = {} } = params;

  const { data, error } = await supabase.functions.invoke<{
    paymentIntentClientSecret: string;
    ephemeralKeySecret: string;
    customerId: string;
  }>("create-mobile-payment-intent", {
    body: { amount, currency, metadata },
  });

  if (error || !data) {
    return { status: "error", message: error?.message || "Unable to start payment" };
  }

  const init = await initPaymentSheet({
    customerId: data.customerId,
    customerEphemeralKeySecret: data.ephemeralKeySecret,
    paymentIntentClientSecret: data.paymentIntentClientSecret,
    merchantDisplayName: "Pluggd",
    style: "automatic",
  });

  if (init.error) {
    return { status: "error", message: init.error.message };
  }

  const present = await presentPaymentSheet();
  if (present.error) {
    if (present.error.code === "Canceled") {
      return { status: "cancelled" };
    }
    return { status: "error", message: present.error.message };
  }

  return { status: "success" };
}
