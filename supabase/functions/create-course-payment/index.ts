import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseService =
    supabaseServiceRoleKey
      ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } })
      : null;

  let rawPayload: Record<string, unknown> = {};
  try {
    rawPayload = await req.json();
  } catch {
    rawPayload = {};
  }

  const courseId = typeof rawPayload?.courseId === "string" ? (rawPayload.courseId as string) : undefined;
  const amount = typeof rawPayload?.amount === "number" ? (rawPayload.amount as number) : undefined;
  const requestCorrelationId =
    (typeof rawPayload?.correlationId === "string" ? (rawPayload.correlationId as string) : undefined) ??
    req.headers.get("x-correlation-id") ??
    generateCorrelationId();

  const logger =
    supabaseService && supabaseUrl
      ? createSystemLogger(supabaseService, {
          component: "create_course_payment",
          feature: "billing",
          correlationId: requestCorrelationId,
          message: "Create one-time course payment",
        })
      : null;

  let userId: string | null = null;

  try {
    await logger?.info("create_course_payment_request_received", {
      has_course: Boolean(courseId),
      amount_minor: amount,
    });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    userId = user.id;

    await logger?.info("create_course_payment_user_authenticated", {
      user_id: user.id,
    });

    if (!courseId || !amount || amount <= 0) {
      throw new Error("Invalid course purchase payload");
    }

    const { data: course } = await supabaseClient
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single();

    await logger?.info("create_course_payment_course_loaded", {
      user_id: user.id,
      course_id: courseId,
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      await logger?.info("create_course_payment_customer_reused", {
        user_id: user.id,
        customer_id: customerId,
      });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await logger?.info("create_course_payment_customer_created", {
        user_id: user.id,
        customer_id: customerId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Course: ${course?.title || "Course Purchase"}`,
              description: "One-time course access",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/education?payment=success&course=${courseId}`,
      cancel_url: `${req.headers.get("origin")}/education?payment=canceled`,
      metadata: {
        courseId,
        userId: user.id,
        type: "course_purchase",
      },
    });

    await logger?.info("create_course_payment_session_created", {
      user_id: user.id,
      course_id: courseId,
      checkout_session_id: session.id,
      amount_minor: amount,
    });

    return new Response(JSON.stringify({ url: session.url, correlationId: requestCorrelationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger?.error("create_course_payment_failed", error, {
      user_id: userId,
      course_id: courseId ?? null,
      amount_minor: amount,
    });

    return new Response(JSON.stringify({ error: errorMessage, correlationId: requestCorrelationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
