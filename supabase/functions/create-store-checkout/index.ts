import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STORE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Store checkout function started");

    const { cartItems, shippingAddress } = await req.json();
    
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error("Cart items are required");
    }

    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    logStep("Customer lookup complete", { customerId });

    // Get product details from database
    const productIds = cartItems.map(item => item.productId);
    const { data: products, error: productsError } = await supabaseClient
      .from('store_products')
      .select('*')
      .in('id', productIds);

    if (productsError) throw productsError;
    if (!products || products.length === 0) {
      throw new Error("No valid products found");
    }

    logStep("Products fetched", { count: products.length });

    // Create line items for Stripe
    const lineItems = [];
    let totalAmount = 0;

    for (const cartItem of cartItems) {
      const product = products.find(p => p.id === cartItem.productId);
      if (!product) continue;

      const quantity = cartItem.quantity || 1;
      const pricePerItem = product.price * 100; // Convert to cents
      totalAmount += pricePerItem * quantity;

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: product.title,
            description: product.description || "Store product",
            images: product.image_url ? [product.image_url] : undefined,
          },
          unit_amount: pricePerItem,
        },
        quantity: quantity,
      });
    }

    logStep("Line items created", { totalAmount, itemCount: lineItems.length });

    // Create Stripe checkout session
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/store?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/store?payment=cancelled`,
      metadata: {
        userId: user.id,
        cartItems: JSON.stringify(cartItems),
        type: 'store_purchase'
      }
    };

    // Add shipping for physical products
    const hasPhysicalProducts = products.some(p => 
      p.product_type === 'physical' || p.product_type === 'merchandise'
    );

    if (hasPhysicalProducts) {
      sessionConfig.shipping_address_collection = {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'EU']
      };
      sessionConfig.shipping_options = [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 999, // $9.99 shipping
              currency: 'usd',
            },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 5,
              },
              maximum: {
                unit: 'business_day',
                value: 10,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 1999, // $19.99 express shipping
              currency: 'usd',
            },
            display_name: 'Express Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 1,
              },
              maximum: {
                unit: 'business_day',
                value: 3,
              },
            },
          },
        }
      ];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Stripe session created", { sessionId: session.id });

    // Create order record using service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: order, error: orderError } = await supabaseService
      .from("orders")
      .insert({
        user_id: user.id,
        total_amount: totalAmount / 100, // Convert back to dollars
        status: 'pending',
        payment_id: session.id,
        shipping_address: shippingAddress,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) throw orderError;

    logStep("Order created", { orderId: order.id });

    // Create order items with creator attribution
    const orderItems = cartItems.map(cartItem => {
      const product = products.find(p => p.id === cartItem.productId);
      return {
        order_id: order.id,
        product_id: cartItem.productId,
        quantity: cartItem.quantity || 1,
        price: product?.price || 0,
        creator_id: product?.user_id || product?.owner_id || null,
        kind: product?.product_type || 'product',
      };
    });

    const { error: orderItemsError } = await supabaseService
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) throw orderItemsError;

    logStep("Order items created", { count: orderItems.length });

    return new Response(JSON.stringify({ 
      url: session.url,
      orderId: order.id,
      sessionId: session.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in store-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});