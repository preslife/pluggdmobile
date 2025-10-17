import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OptionValue = {
  name: string;
  value: string;
};

interface RequestBody {
  action?:
    | "list_products"
    | "get_product"
    | "create_variant"
    | "update_variant"
    | "delete_variant"
    | "adjust_inventory";
  productId?: string;
  variantId?: string;
  sku?: string;
  barcode?: string | null;
  priceOverride?: number | null;
  optionValues?: OptionValue[];
  inventoryQuantity?: number | null;
  lowStockThreshold?: number | null;
  quantityDelta?: number;
  reason?: string | null;
  reference?: string | null;
}

const parseOptionValues = (values?: OptionValue[]) =>
  (values ?? [])
    .map((entry) => ({
      name: entry?.name?.trim() ?? "",
      value: entry?.value?.trim() ?? "",
    }))
    .filter((entry) => entry.name && entry.value);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const action = body.action;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    switch (action) {
      case "list_products": {
        const { data, error } = await supabaseService
          .from("creator_merchandise")
          .select(
            "id, title, image_url, sku, status, track_inventory, price, stock_quantity, has_variants, user_id",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({
            products: (data ?? []).map(
              ({ user_id, ...rest }) => rest,
            ),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "get_product": {
        if (!body.productId) {
          return new Response(
            JSON.stringify({ error: "productId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: product, error: productError } = await supabaseService
          .from("creator_merchandise")
          .select(
            "id, title, image_url, track_inventory, price, stock_quantity, has_variants, user_id",
          )
          .eq("user_id", user.id)
          .eq("id", body.productId)
          .maybeSingle();

        if (productError) throw productError;
        if (!product) {
          return new Response(
            JSON.stringify({ error: "Product not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: variants, error: variantError } = await supabaseService
          .from("merch_variants")
          .select(
            "id, product_id, sku, option_values, barcode, price_override_cents, inventory_quantity, low_stock_threshold, created_at, updated_at",
          )
          .eq("product_id", product.id)
          .order("created_at", { ascending: true });

        if (variantError) throw variantError;

        const variantIds = (variants ?? []).map((variant) => variant.id);
        let adjustments: Record<string, unknown[]> = {};

        if (variantIds.length > 0) {
          const { data: adjustmentRows, error: adjustmentError } = await supabaseService
            .from("merch_inventory_adjustments")
            .select("id, variant_id, quantity_delta, reason, reference, created_by, created_at")
            .in("variant_id", variantIds)
            .order("created_at", { ascending: false })
            .limit(50);

          if (adjustmentError) throw adjustmentError;

          adjustments = (adjustmentRows ?? []).reduce<Record<string, unknown[]>>((acc, row) => {
            if (!acc[row.variant_id]) acc[row.variant_id] = [];
            acc[row.variant_id].push(row);
            return acc;
          }, {});
        }

        return new Response(
          JSON.stringify({
            product: {
              id: product.id,
              title: product.title,
              image_url: product.image_url,
              track_inventory: product.track_inventory,
              price: product.price,
              stock_quantity: product.stock_quantity,
              has_variants: product.has_variants,
            },
            variants: variants ?? [],
            adjustments,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "create_variant": {
        if (!body.productId || !body.sku) {
          return new Response(
            JSON.stringify({ error: "productId and sku are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: product, error: productError } = await supabaseService
          .from("creator_merchandise")
          .select("id")
          .eq("user_id", user.id)
          .eq("id", body.productId)
          .maybeSingle();

        if (productError) throw productError;
        if (!product) {
          return new Response(
            JSON.stringify({ error: "Product not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const optionValues = parseOptionValues(body.optionValues);
        const priceOverrideCents = body.priceOverride != null
          ? Math.round(Number(body.priceOverride) * 100)
          : null;

        const { data: inserted, error: insertError } = await supabaseService
          .from("merch_variants")
          .insert({
            product_id: product.id,
            sku: body.sku,
            option_values: optionValues,
            barcode: body.barcode ?? null,
            price_override_cents: priceOverrideCents,
            inventory_quantity: body.inventoryQuantity ?? 0,
            low_stock_threshold: body.lowStockThreshold ?? null,
          })
          .select("id, product_id, sku, option_values, barcode, price_override_cents, inventory_quantity, low_stock_threshold, created_at, updated_at")
          .maybeSingle();

        if (insertError) throw insertError;

        return new Response(
          JSON.stringify({ variant: inserted }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "update_variant": {
        if (!body.variantId) {
          return new Response(
            JSON.stringify({ error: "variantId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: variant, error: variantFetchError } = await supabaseService
          .from("merch_variants")
          .select("id, product_id")
          .eq("id", body.variantId)
          .maybeSingle();

        if (variantFetchError) throw variantFetchError;
        if (!variant) {
          return new Response(
            JSON.stringify({ error: "Variant not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: productOwner, error: productOwnerError } = await supabaseService
          .from("creator_merchandise")
          .select("id")
          .eq("user_id", user.id)
          .eq("id", variant.product_id)
          .maybeSingle();

        if (productOwnerError) throw productOwnerError;
        if (!productOwner) {
          return new Response(
            JSON.stringify({ error: "Not authorized to update this variant" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const optionValues = parseOptionValues(body.optionValues);
        const priceOverrideCents = body.priceOverride != null
          ? Math.round(Number(body.priceOverride) * 100)
          : null;

        const { data: updated, error: updateError } = await supabaseService
          .from("merch_variants")
          .update({
            sku: body.sku ?? undefined,
            barcode: body.barcode ?? null,
            price_override_cents: priceOverrideCents,
            option_values: optionValues.length > 0 ? optionValues : undefined,
            inventory_quantity: body.inventoryQuantity ?? undefined,
            low_stock_threshold: body.lowStockThreshold ?? undefined,
          })
          .eq("id", variant.id)
          .select("id, product_id, sku, option_values, barcode, price_override_cents, inventory_quantity, low_stock_threshold, created_at, updated_at")
          .maybeSingle();

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ variant: updated }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "delete_variant": {
        if (!body.variantId) {
          return new Response(
            JSON.stringify({ error: "variantId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: variant, error: variantFetchError } = await supabaseService
          .from("merch_variants")
          .select("id, product_id")
          .eq("id", body.variantId)
          .maybeSingle();

        if (variantFetchError) throw variantFetchError;
        if (!variant) {
          return new Response(
            JSON.stringify({ error: "Variant not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: productOwner, error: productOwnerError } = await supabaseService
          .from("creator_merchandise")
          .select("id")
          .eq("user_id", user.id)
          .eq("id", variant.product_id)
          .maybeSingle();

        if (productOwnerError) throw productOwnerError;
        if (!productOwner) {
          return new Response(
            JSON.stringify({ error: "Not authorized to delete this variant" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { error: deleteError } = await supabaseService
          .from("merch_variants")
          .delete()
          .eq("id", variant.id);

        if (deleteError) throw deleteError;

        return new Response(
          JSON.stringify({ ok: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "adjust_inventory": {
        if (!body.variantId || typeof body.quantityDelta !== "number") {
          return new Response(
            JSON.stringify({ error: "variantId and quantityDelta are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: variant, error: variantFetchError } = await supabaseService
          .from("merch_variants")
          .select("id, product_id, inventory_quantity")
          .eq("id", body.variantId)
          .maybeSingle();

        if (variantFetchError) throw variantFetchError;
        if (!variant) {
          return new Response(
            JSON.stringify({ error: "Variant not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data: productOwner, error: productOwnerError } = await supabaseService
          .from("creator_merchandise")
          .select("id")
          .eq("user_id", user.id)
          .eq("id", variant.product_id)
          .maybeSingle();

        if (productOwnerError) throw productOwnerError;
        if (!productOwner) {
          return new Response(
            JSON.stringify({ error: "Not authorized to adjust this inventory" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const currentQuantity = variant.inventory_quantity ?? 0;
        const nextQuantity = currentQuantity + body.quantityDelta;

        const { error: updateError } = await supabaseService
          .from("merch_variants")
          .update({ inventory_quantity: nextQuantity })
          .eq("id", variant.id);

        if (updateError) throw updateError;

        const { data: adjustment, error: adjustmentError } = await supabaseService
          .from("merch_inventory_adjustments")
          .insert({
            variant_id: variant.id,
            quantity_delta: body.quantityDelta,
            reason: body.reason ?? null,
            reference: body.reference ?? null,
            created_by: user.id,
          })
          .select("id, variant_id, quantity_delta, reason, reference, created_by, created_at")
          .maybeSingle();

        if (adjustmentError) throw adjustmentError;

        return new Response(
          JSON.stringify({
            inventory_quantity: nextQuantity,
            adjustment,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unsupported action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
  } catch (error) {
    console.error("[creator-merch-variants] unexpected error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
