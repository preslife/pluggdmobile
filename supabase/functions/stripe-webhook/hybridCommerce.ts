import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "https://esm.sh/pdf-lib@1.17.1";
import type { Logger } from "./helpers.ts";

const COMPLETED = new Set(["completed"]);
const REVERSAL_STATUSES = new Set([
  "partially_refunded",
  "refunded",
  "disputed",
]);

const asId = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const isIosPhysicalBasket = (checkout: any) =>
  checkout?.purchase_kind === "physical_merch" &&
  checkout?.provider_metadata?.ios_physical_basket === true;

async function releaseIosPhysicalBasketInventory(
  client: any,
  checkout: any,
  checkoutStatus: "failed" | "expired" | "cancelled" | "refunded",
  orderStatus: "cancelled" | "refunded",
  refundedAmountCents: number | null = null,
  refundReason: "refund" | null = null,
) {
  if (!isIosPhysicalBasket(checkout)) return false;
  const released = await client.rpc(
    "release_ios_physical_basket_inventory",
    {
      p_checkout_id: checkout.id,
      p_checkout_status: checkoutStatus,
      p_order_status: orderStatus,
      p_refunded_amount_cents: refundedAmountCents,
      p_refund_reason: refundReason,
    },
  );
  if (released.error) {
    throw new Error(
      `Basket inventory release failed: ${released.error.message ?? "database transaction failed"}`,
    );
  }
  return true;
}

function assertWrites(
  results: Array<{ error?: { message?: string } | null }>,
  label: string,
) {
  const failed = results.find((result) => result?.error);
  if (failed?.error) {
    throw new Error(`${label}: ${failed.error.message ?? "database write failed"}`);
  }
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function wrapText(text: string, max = 92) {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      if (!line) line = word;
      else if (`${line} ${word}`.length <= max) line += ` ${word}`;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

// Standard PDF fonts only support WinAnsi. Replace unsupported characters
// rather than allowing creator-entered terms or signatures to break fulfilment.
function pdfSafe(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E£€¥©®™–—‘’“”…]/g, "?");
}

async function createLicencePdf(
  client: any,
  contract: any,
  purchaseId: string,
) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  let page = pdf.addPage(pageSize);
  let y = 790;

  const addLine = (
    value: string,
    options: { bold?: boolean; size?: number; color?: any } = {},
  ) => {
    if (y < 55) {
      page = pdf.addPage(pageSize);
      y = 790;
    }
    page.drawText(pdfSafe(value), {
      x: 48,
      y,
      size: options.size ?? 9.5,
      font: options.bold ? bold : regular,
      color: options.color ?? rgb(0.1, 0.1, 0.12),
    });
    y -= (options.size ?? 9.5) + 5;
  };

  addLine("PLUGGD PROFESSIONAL BEAT LICENCE", {
    bold: true,
    size: 17,
    color: rgb(0.96, 0.31, 0),
  });
  addLine(`Contract: ${contract.id}`, { bold: true, size: 10 });
  addLine(`Payment record: ${purchaseId}`, { size: 9 });
  addLine(
    `Completed: ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`,
    { size: 9 },
  );
  y -= 8;
  for (
    const line of wrapText(
      pdfSafe(contract.legal_text ?? "Licence terms on file."),
    )
  ) {
    addLine(line || " ", { size: 8.5 });
  }
  y -= 8;
  addLine(`Licensee signature: ${contract.artist_signature ?? "Recorded"}`, {
    bold: true,
    size: 9,
  });
  addLine(`Licensor signature: ${contract.producer_signature ?? "Recorded"}`, {
    bold: true,
    size: 9,
  });
  addLine(
    `Immediate digital delivery requested: ${contract.digital_delivery_requested === true ? "Yes" : "No"}`,
    { bold: true, size: 9 },
  );
  if (contract.digital_delivery_requested === true) {
    addLine(
      `Consent version: ${contract.digital_delivery_consent_version ?? "Not recorded"}`,
      { size: 8.5 },
    );
    addLine(
      `Consent recorded: ${contract.digital_delivery_consented_at ?? "Not recorded"}`,
      { size: 8.5 },
    );
    for (const line of wrapText(pdfSafe(contract.digital_delivery_consent_text))) {
      addLine(line || " ", { size: 8 });
    }
  }
  const producerAuthorization = contract.producer_authorization_snapshot ?? {};
  addLine(
    `Producer authorization version: ${producerAuthorization.version ?? "Published offer"}`,
    { size: 8.5 },
  );
  addLine(
    `Producer authorization recorded: ${producerAuthorization.authorized_at ?? "Recorded with offer"}`,
    { size: 8.5 },
  );
  addLine(
    "The authoritative contract record and payment verification are retained by PLUGGD.",
    { size: 8 },
  );

  const bytes = await pdf.save();
  const documentHash = (await sha256(JSON.stringify({
    id: contract.id,
    legalText: contract.legal_text,
    artistSignature: contract.artist_signature,
    producerSignature: contract.producer_signature,
    consentText: contract.digital_delivery_consent_text,
    consentVersion: contract.digital_delivery_consent_version,
    consentedAt: contract.digital_delivery_consented_at,
    producerAuthorization,
  }))).slice(0, 20);
  const path = `${contract.artist_id}/licences/${contract.id}-${documentHash}.pdf`;
  const { error } = await client.storage.from("receipts").upload(path, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error && !/already exists|duplicate/i.test(error.message ?? "")) {
    throw new Error(`Licence PDF upload failed: ${error.message}`);
  }
  return `receipts/${path}`;
}

async function createReceiptPdf(
  client: any,
  checkout: any,
  recordId: string,
) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]);
  const title = pdfSafe(
    checkout.pricing_snapshot?.beat_title ??
      checkout.pricing_snapshot?.event_title ??
      checkout.pricing_snapshot?.release_title ??
      checkout.pricing_snapshot?.product_title ??
      "PLUGGD purchase",
  );
  const kind = pdfSafe(String(checkout.purchase_kind).replaceAll("_", " "));
  const currency = String(checkout.currency ?? "GBP").toUpperCase();
  const total = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(Number(checkout.amount_cents) / 100);
  page.drawText("PLUGGD PAYMENT RECEIPT", {
    x: 48,
    y: 785,
    size: 17,
    font: bold,
    color: rgb(0.96, 0.31, 0),
  });
  const rows = [
    ["Item", title],
    ["Purchase", kind],
    ["Quantity", String(checkout.quantity ?? 1)],
    ["Total", total],
    ["Currency", currency],
    ["Order reference", recordId],
    ["Payment reference", checkout.stripe_payment_intent_id ?? "Verified"],
    ["Completed", `${new Date().toISOString().slice(0, 19)} UTC`],
  ];
  let y = 738;
  for (const [label, value] of rows) {
    page.drawText(pdfSafe(label).toUpperCase(), {
      x: 48,
      y,
      size: 8,
      font: bold,
      color: rgb(0.42, 0.4, 0.38),
    });
    page.drawText(pdfSafe(value), {
      x: 180,
      y: y - 1,
      size: 10,
      font: regular,
      color: rgb(0.1, 0.1, 0.12),
      maxWidth: 355,
    });
    y -= 42;
  }
  page.drawText(
    "Access and fulfilment are governed by the terms accepted at checkout.",
    {
      x: 48,
      y: 80,
      size: 8.5,
      font: regular,
      color: rgb(0.42, 0.4, 0.38),
    },
  );
  const path =
    `${checkout.user_id}/receipts/${checkout.purchase_kind}-${recordId}.pdf`;
  const bytes = await pdf.save();
  const { error } = await client.storage.from("receipts").upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw new Error(`Receipt upload failed: ${error.message}`);
  return `receipts/${path}`;
}

async function finalizeBeat(
  client: any,
  checkout: any,
  session: any,
  paymentIntentId: string | null,
  logger: Logger,
) {
  const contractId = asId(checkout.provider_metadata?.contract_id);
  if (!contractId) throw new Error("Beat checkout is missing its contract");

  const { data: contract, error: contractError } = await client
    .from("licensing_contracts")
    .select("*")
    .eq("id", contractId)
    .eq("artist_id", checkout.user_id)
    .maybeSingle();
  if (contractError || !contract || !["signed", "completed"].includes(contract.status)) {
    throw new Error("Signed beat licence contract was not found");
  }
  if (
    contract.digital_delivery_requested !== true ||
    !contract.digital_delivery_consent_text ||
    !contract.digital_delivery_consent_version ||
    !contract.digital_delivery_consented_at
  ) {
    throw new Error("Immediate digital delivery consent was not recorded");
  }

  const platformFeeCents = Number(
    checkout.provider_metadata?.platform_fee_cents ?? 0,
  );
  const producerAmountCents = Math.max(
    checkout.amount_cents - platformFeeCents,
    0,
  );
  const purchasePayload = {
    buyer_id: checkout.user_id,
    beat_id: checkout.resource_id,
    contract_id: contract.id,
    license_type: contract.template_type,
    amount: checkout.amount_cents / 100,
    amount_cents: checkout.amount_cents,
    currency: checkout.currency,
    permitted_rail: "stripe_checkout",
    status: "completed",
    pricing_snapshot: checkout.pricing_snapshot,
    policy_version: checkout.policy_version,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    idempotency_key: checkout.idempotency_key,
    commission_amount: platformFeeCents / 100,
    platform_fee_amount: platformFeeCents / 100,
    producer_amount: producerAmountCents / 100,
    payout_status: checkout.provider_metadata?.connect_destination
      ? "paid"
      : "pending",
    completed_at: new Date().toISOString(),
  };
  const { data: purchase, error: purchaseError } = await client
    .from("purchases")
    .upsert(purchasePayload, { onConflict: "contract_id" })
    .select("id,license_pdf_url")
    .single();
  if (purchaseError || !purchase) {
    throw new Error(`Beat purchase finalization failed: ${purchaseError?.message}`);
  }

  let pdfPath = purchase.license_pdf_url;
  if (!pdfPath) {
    pdfPath = await createLicencePdf(client, contract, purchase.id);
  }

  const feeRate = checkout.amount_cents > 0
    ? (platformFeeCents / checkout.amount_cents) * 100
    : 0;
  const { error: saleError } = await client.from("beat_sales").upsert({
    beat_id: checkout.resource_id,
    buyer_id: checkout.user_id,
    producer_id: contract.producer_id,
    license_type: contract.template_type,
    sale_price: checkout.amount_cents / 100,
    amount_cents: checkout.amount_cents,
    commission_rate: feeRate,
    producer_earnings: producerAmountCents / 100,
    platform_fee: platformFeeCents / 100,
    currency: checkout.currency,
    payout_status: checkout.provider_metadata?.connect_destination
      ? "completed"
      : "pending",
    permitted_rail: "stripe_checkout",
    sale_status: "completed",
    pricing_snapshot: checkout.pricing_snapshot,
    policy_version: checkout.policy_version,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    idempotency_key: checkout.idempotency_key,
    completed_at: new Date().toISOString(),
  }, { onConflict: "stripe_checkout_session_id" });
  if (saleError) throw new Error(`Beat sale finalization failed: ${saleError.message}`);

  const [purchaseUpdate, contractUpdate] = await Promise.all([
    client.from("purchases").update({ license_pdf_url: pdfPath })
      .eq("id", purchase.id),
    client.from("licensing_contracts").update({
      status: "completed",
      transaction_id: paymentIntentId ?? session.id,
      stripe_payment_intent_id: paymentIntentId,
      contract_pdf_url: pdfPath,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", contract.id),
  ]);
  if (purchaseUpdate.error || contractUpdate.error) {
    throw new Error(
      `Beat entitlement update failed: ${
        purchaseUpdate.error?.message ?? contractUpdate.error?.message
      }`,
    );
  }

  if (contract.template_type === "exclusive_rights") {
    const [optionsUpdate, beatUpdate] = await Promise.all([
      client.from("licensing_options").update({
        is_available: false,
        updated_at: new Date().toISOString(),
      }).eq("beat_id", checkout.resource_id),
      client.from("beats").update({
        available_licenses: [],
        license_prices: {},
        updated_at: new Date().toISOString(),
      }).eq("id", checkout.resource_id),
    ]);
    if (optionsUpdate.error || beatUpdate.error) {
      throw new Error(
        `Exclusive licence catalogue withdrawal failed: ${
          optionsUpdate.error?.message ?? beatUpdate.error?.message
        }`,
      );
    }
  }

  await logger.info("hybrid_beat_licence_completed", {
    checkoutId: checkout.id,
    contractId: contract.id,
    purchaseId: purchase.id,
  });
}

async function finalizeTicket(
  client: any,
  checkout: any,
  session: any,
  paymentIntentId: string | null,
  logger: Logger,
) {
  const orderId = asId(checkout.provider_metadata?.ticket_order_id);
  if (!orderId) throw new Error("Ticket checkout is missing its order");
  const { data: order, error } = await client.from("ticket_orders")
    .select("*").eq("id", orderId).eq("user_id", checkout.user_id).maybeSingle();
  if (error || !order) throw new Error("Reserved ticket order was not found");
  const receiptPath = order.receipt_pdf_url ??
    await createReceiptPdf(client, checkout, order.id);

  const { error: finalizationError } = await client.rpc(
    "finalize_paid_ticket_order",
    {
      p_ticket_order_id: order.id,
      p_payment_intent_id: paymentIntentId,
      p_receipt_pdf_url: receiptPath,
    },
  );
  if (finalizationError) {
    throw new Error(
      `Ticket inventory finalization failed: ${finalizationError.message}`,
    );
  }

  const qrToken = crypto.randomUUID();
  const qrHash = await sha256(qrToken);
  const ticketUpsert = await client.from("event_tickets").upsert({
      event_id: order.event_id,
      user_id: checkout.user_id,
      ticket_order_id: order.id,
      ticket_tier_id: order.ticket_tier_id,
      quantity: order.quantity,
      payment_status: "paid",
      status: "active",
      stripe_payment_intent_id: paymentIntentId,
      qr_token: null,
      qr_token_hash: qrHash,
      issued_at: new Date().toISOString(),
    }, { onConflict: "ticket_order_id" });
  if (ticketUpsert.error) {
    throw new Error(
      `Ticket entitlement issuance failed: ${ticketUpsert.error.message}`,
    );
  }
  await logger.info("hybrid_event_ticket_completed", {
    checkoutId: checkout.id,
    orderId: order.id,
    quantity: order.quantity,
  });
}

async function finalizeRelease(
  client: any,
  checkout: any,
  session: any,
  paymentIntentId: string | null,
  logger: Logger,
) {
  const { data: pendingPurchase, error: lookupError } = await client
    .from("release_purchases")
    .select("id,receipt_pdf_url")
    .eq("stripe_session_id", session.id)
    .eq("user_id", checkout.user_id)
    .maybeSingle();
  if (lookupError || !pendingPurchase) {
    throw new Error("Pending release purchase was not found");
  }
  const receiptPath = pendingPurchase.receipt_pdf_url ??
    await createReceiptPdf(client, checkout, pendingPurchase.id);
  const { data: purchase, error } = await client.from("release_purchases")
    .update({
      status: "completed",
      permitted_rail: "stripe_checkout",
      amount_cents: checkout.amount_cents,
      amount_paid: checkout.amount_cents / 100,
      currency: checkout.currency,
      stripe_payment_intent_id: paymentIntentId,
      paid_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      receipt_pdf_url: receiptPath,
    })
    .eq("stripe_session_id", session.id)
    .eq("user_id", checkout.user_id)
    .select("id")
    .maybeSingle();
  if (error || !purchase) throw new Error("Release purchase was not finalized");
  await logger.info("hybrid_release_purchase_completed", {
    checkoutId: checkout.id,
    purchaseId: purchase.id,
  });
}

async function finalizeMerch(
  client: any,
  checkout: any,
  session: any,
  paymentIntentId: string | null,
  logger: Logger,
) {
  const orderId = asId(checkout.provider_metadata?.merch_order_id);
  if (!orderId) throw new Error("Merchandise checkout is missing its order");
  const { data: pendingOrder, error: lookupError } = await client
    .from("physical_merch_orders")
    .select("id,receipt_pdf_url")
    .eq("id", orderId)
    .eq("user_id", checkout.user_id)
    .maybeSingle();
  if (lookupError || !pendingOrder) {
    throw new Error("Reserved merchandise order was not found");
  }
  const receiptPath = pendingOrder.receipt_pdf_url ??
    await createReceiptPdf(client, checkout, orderId);
  const shipping = session.shipping_details ?? session.collected_information
    ?.shipping_details ?? null;
  const { data: order, error } = await client.from("physical_merch_orders")
    .update({
      status: "completed",
      stripe_payment_intent_id: paymentIntentId,
      shipping_address: shipping,
      completed_at: new Date().toISOString(),
      reservation_expires_at: null,
      receipt_pdf_url: receiptPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("user_id", checkout.user_id)
    .select("id")
    .maybeSingle();
  if (error || !order) throw new Error("Merchandise order was not finalized");
  await logger.info("hybrid_physical_merch_completed", {
    checkoutId: checkout.id,
    orderId: order.id,
  });
}

export async function finalizeHybridCheckout(
  client: any,
  session: any,
  logger: Logger,
) {
  const checkoutId = asId(session.metadata?.external_checkout_id);
  const purchaseKind = asId(session.metadata?.purchase_kind);
  if (!checkoutId || !purchaseKind) return false;

  const { data: checkout, error } = await client
    .from("external_checkout_sessions")
    .select("*")
    .eq("id", checkoutId)
    .maybeSingle();
  if (error || !checkout) throw new Error("Trusted external checkout was not found");
  if (
    checkout.stripe_checkout_session_id &&
    checkout.stripe_checkout_session_id !== session.id
  ) {
    throw new Error("Checkout provider session does not match trusted state");
  }
  if (checkout.purchase_kind !== purchaseKind) {
    throw new Error("Checkout purchase kind does not match provider metadata");
  }
  if (COMPLETED.has(checkout.status)) return true;
  if (REVERSAL_STATUSES.has(checkout.status)) {
    throw new Error("Reversed checkout cannot be completed");
  }

  if (isIosPhysicalBasket(checkout)) {
    const orderId = asId(checkout.provider_metadata?.order_id);
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
    const subtotal = Number(session.amount_subtotal);
    const total = Number(session.amount_total);
    const currency = String(session.currency ?? "").toUpperCase();
    if (
      session.metadata?.type !== "ios_physical_basket" || !orderId ||
      session.payment_status !== "paid" || subtotal !== Number(checkout.amount_cents) ||
      !Number.isSafeInteger(total) || total < subtotal || currency !== checkout.currency
    ) {
      throw new Error("Provider payment did not match the trusted physical basket");
    }
    const shipping = session.shipping_details ?? session.collected_information
      ?.shipping_details ?? null;
    if (!shipping?.address) throw new Error("Physical basket shipping was not collected");
    if (!paymentIntentId) {
      throw new Error("Physical basket payment intent was not recorded");
    }
    const completion = await client.rpc(
      "complete_ios_physical_basket_checkout",
      {
        p_checkout_id: checkout.id,
        p_session_id: session.id,
        p_payment_intent_id: paymentIntentId,
        p_paid_total_cents: total,
        p_shipping_address: shipping,
      },
    );
    if (completion.error) {
      throw new Error(
        `Physical basket completion failed: ${completion.error.message ?? "database transaction failed"}`,
      );
    }
    await logger.info("ios_physical_basket_completed", { checkoutId: checkout.id, orderId });
    return true;
  }

  const amount = Number(session.amount_total);
  const currency = String(session.currency ?? "").toUpperCase();
  if (
    session.payment_status !== "paid" ||
    amount !== Number(checkout.amount_cents) ||
    currency !== checkout.currency
  ) {
    await client.from("external_checkout_sessions").update({
      status: "failed",
      provider_metadata: {
        ...(checkout.provider_metadata ?? {}),
        verification_error: "provider_amount_currency_or_status_mismatch",
      },
      updated_at: new Date().toISOString(),
    }).eq("id", checkout.id);
    throw new Error("Provider payment did not match the trusted checkout");
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
  if (purchaseKind === "beat_license") {
    await finalizeBeat(client, checkout, session, paymentIntentId, logger);
  } else if (purchaseKind === "event_ticket") {
    await finalizeTicket(client, checkout, session, paymentIntentId, logger);
  } else if (purchaseKind === "release_unlock") {
    await finalizeRelease(client, checkout, session, paymentIntentId, logger);
  } else if (purchaseKind === "physical_merch") {
    await finalizeMerch(client, checkout, session, paymentIntentId, logger);
  } else {
    throw new Error(`Unsupported hybrid checkout kind: ${purchaseKind}`);
  }

  const { error: completionError } = await client
    .from("external_checkout_sessions")
    .update({
      status: "completed",
      stripe_payment_intent_id: paymentIntentId,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", checkout.id);
  if (completionError) throw new Error("Checkout completion could not be recorded");
  return true;
}

async function restoreReservedInventory(
  client: any,
  checkout: any,
  checkoutStatus: "expired" | "failed",
) {
  if (isIosPhysicalBasket(checkout)) {
    await releaseIosPhysicalBasketInventory(
      client,
      checkout,
      checkoutStatus,
      "cancelled",
    );
    return true;
  }
  if (checkout.purchase_kind === "event_ticket") {
    const orderId = asId(checkout.provider_metadata?.ticket_order_id);
    const { data: order } = await client.from("ticket_orders").select("*")
      .eq("id", orderId).maybeSingle();
    if (order && ["reserved", "checkout_open"].includes(order.status)) {
      const { data: tier } = await client.from("event_ticket_tiers")
        .select("reserved_quantity").eq("id", order.ticket_tier_id).maybeSingle();
      if (tier) {
        await client.from("event_ticket_tiers").update({
          reserved_quantity: Math.max(0, tier.reserved_quantity - order.quantity),
        }).eq("id", order.ticket_tier_id)
          .eq("reserved_quantity", tier.reserved_quantity);
      }
      await client.from("ticket_orders").update({
        status: "expired",
        reservation_expires_at: null,
      }).eq("id", order.id);
    }
  }
  if (checkout.purchase_kind === "physical_merch") {
    const orderId = asId(checkout.provider_metadata?.merch_order_id);
    const { data: order } = await client.from("physical_merch_orders")
      .select("*").eq("id", orderId).maybeSingle();
    if (order && ["reserved", "checkout_open"].includes(order.status)) {
      if (order.pricing_snapshot?.inventory_reserved) {
        const table = order.product_source === "creator_merchandise"
          ? "creator_merchandise"
          : "store_products";
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const { data: product } = await client.from(table)
            .select("stock_quantity").eq("id", order.product_id).maybeSingle();
          if (
            product?.stock_quantity === null ||
            product?.stock_quantity === undefined
          ) break;
          const { data: restored } = await client.from(table).update({
            stock_quantity: Number(product.stock_quantity) + order.quantity,
          }).eq("id", order.product_id)
            .eq("stock_quantity", product.stock_quantity)
            .select("id");
          if (restored?.length) break;
          if (attempt === 2) {
            throw new Error("Merchandise stock restoration conflicted");
          }
        }
      }
      await client.from("physical_merch_orders").update({
        status: "expired",
        reservation_expires_at: null,
      }).eq("id", order.id);
    }
  }
  return false;
}

export async function expireHybridCheckout(
  client: any,
  session: any,
  logger: Logger,
  checkoutStatus: "expired" | "failed" = "expired",
) {
  const checkoutId = asId(session.metadata?.external_checkout_id);
  if (!checkoutId) return false;
  const { data: checkout, error } = await client.from("external_checkout_sessions")
    .select("*").eq("id", checkoutId).maybeSingle();
  if (error) throw new Error("Trusted external checkout lookup failed");
  if (!checkout || COMPLETED.has(checkout.status)) return Boolean(checkout);
  if (
    checkout.stripe_checkout_session_id &&
    checkout.stripe_checkout_session_id !== session.id
  ) {
    throw new Error("Checkout provider session does not match trusted state");
  }
  const transitionedAtomically = await restoreReservedInventory(
    client,
    checkout,
    checkoutStatus,
  );
  if (!transitionedAtomically) {
    const expiry = await client.from("external_checkout_sessions").update({
      status: checkoutStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", checkout.id);
    assertWrites([expiry], "Checkout expiry failed");
  }
  await logger.info(
    checkoutStatus === "failed"
      ? "hybrid_checkout_async_payment_failed"
      : "hybrid_checkout_expired",
    { checkoutId: checkout.id },
  );
  return true;
}

export async function reverseHybridCheckout(
  client: any,
  paymentIntentId: string,
  refundedAmountCents: number,
  reason: "refund" | "dispute",
  logger: Logger,
  providerCheckoutId: string | null = null,
) {
  let { data: checkout } = await client.from("external_checkout_sessions")
    .select("*").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle();
  if (!checkout && providerCheckoutId) {
    const fallback = await client.from("external_checkout_sessions")
      .select("*").eq("id", providerCheckoutId).maybeSingle();
    checkout = fallback.data ?? null;
  }
  if (!checkout) return false;
  if (
    checkout.stripe_payment_intent_id &&
    checkout.stripe_payment_intent_id !== paymentIntentId
  ) {
    throw new Error("Checkout payment intent does not match reversal");
  }
  const full = refundedAmountCents >= Number(checkout.amount_cents);
  const status = reason === "dispute"
    ? "disputed"
    : full
    ? "refunded"
    : "partially_refunded";
  const common = {
    status,
    refunded_amount_cents: Math.min(
      Math.max(refundedAmountCents, 0),
      Number(checkout.amount_cents),
    ),
    refund_reason: reason,
    refunded_at: new Date().toISOString(),
    stripe_payment_intent_id: paymentIntentId,
    updated_at: new Date().toISOString(),
  };

  if (checkout.purchase_kind === "beat_license") {
    const contractId = asId(checkout.provider_metadata?.contract_id);
    assertWrites(await Promise.all([
      client.from("licensing_contracts").update({
        status: full || reason === "dispute" ? "revoked" : "refunded",
        refunded_amount_cents: common.refunded_amount_cents,
        refunded_at: common.refunded_at,
      }).eq("id", contractId),
      client.from("purchases").update({
        status,
        refunded_amount_cents: common.refunded_amount_cents,
        refunded_at: common.refunded_at,
      }).eq("stripe_payment_intent_id", paymentIntentId),
      client.from("beat_sales").update({
        sale_status: status,
        refunded_amount_cents: common.refunded_amount_cents,
        refunded_at: common.refunded_at,
      }).eq("stripe_payment_intent_id", paymentIntentId),
    ]), "Beat reversal failed");
  } else if (checkout.purchase_kind === "event_ticket") {
    const orderId = asId(checkout.provider_metadata?.ticket_order_id);
    if (full && reason === "refund") {
      const { error: inventoryError } = await client.rpc(
        "release_ticket_inventory_for_refund",
        { p_ticket_order_id: orderId },
      );
      if (inventoryError) {
        throw new Error(
          `Ticket refund inventory failed: ${inventoryError.message}`,
        );
      }
    }
    assertWrites(await Promise.all([
      client.from("ticket_orders").update(common).eq("id", orderId),
      client.from("event_tickets").update({
        status: "revoked",
        payment_status: status,
        revoked_at: new Date().toISOString(),
      }).eq("ticket_order_id", orderId),
    ]), "Ticket reversal failed");
  } else if (checkout.purchase_kind === "release_unlock") {
    const result = await client.from("release_purchases").update({
      status: full || reason === "dispute" ? "revoked" : status,
      refunded_amount_cents: common.refunded_amount_cents,
      refunded_at: common.refunded_at,
    }).eq("stripe_payment_intent_id", paymentIntentId);
    assertWrites([result], "Release reversal failed");
  } else if (checkout.purchase_kind === "physical_merch") {
    if (isIosPhysicalBasket(checkout)) {
      if (full && reason === "refund") {
        await releaseIosPhysicalBasketInventory(
          client,
          checkout,
          "refunded",
          "refunded",
          common.refunded_amount_cents,
          "refund",
        );
      } else {
        const orderId = asId(checkout.provider_metadata?.order_id);
        if (orderId) {
          const result = await client.from("orders").update({
            status: "processing",
            updated_at: new Date().toISOString(),
          }).eq("id", orderId);
          assertWrites([result], "Physical basket reversal failed");
        }
      }
      await logger.warn("ios_physical_basket_reversed", {
        checkoutId: checkout.id,
        full,
        reason,
      });
      if (full && reason === "refund") return true;
    } else {
      const orderId = asId(checkout.provider_metadata?.merch_order_id);
      const result = await client.from("physical_merch_orders").update(common)
        .eq("id", orderId);
      assertWrites([result], "Merchandise reversal failed");
    }
  }
  const checkoutUpdate = await client.from("external_checkout_sessions").update(common)
    .eq("id", checkout.id);
  assertWrites([checkoutUpdate], "Checkout reversal failed");
  await logger.warn("hybrid_checkout_reversed", {
    checkoutId: checkout.id,
    purchaseKind: checkout.purchase_kind,
    status,
  });
  return true;
}

export async function reinstateHybridCheckout(
  client: any,
  paymentIntentId: string,
  logger: Logger,
) {
  const { data: checkout } = await client.from("external_checkout_sessions")
    .select("*").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle();
  if (!checkout || checkout.status !== "disputed") return Boolean(checkout);

  const now = new Date().toISOString();
  if (checkout.purchase_kind === "beat_license") {
    const contractId = asId(checkout.provider_metadata?.contract_id);
    assertWrites(await Promise.all([
      client.from("licensing_contracts").update({
        status: "completed",
        refunded_amount_cents: 0,
        refunded_at: null,
      }).eq("id", contractId),
      client.from("purchases").update({
        status: "completed",
        refunded_amount_cents: 0,
        refunded_at: null,
      }).eq("stripe_payment_intent_id", paymentIntentId),
      client.from("beat_sales").update({
        sale_status: "completed",
        refunded_amount_cents: 0,
        refunded_at: null,
      }).eq("stripe_payment_intent_id", paymentIntentId),
    ]), "Beat reinstatement failed");
  } else if (checkout.purchase_kind === "event_ticket") {
    const orderId = asId(checkout.provider_metadata?.ticket_order_id);
    assertWrites(await Promise.all([
      client.from("ticket_orders").update({
        status: "completed",
        refunded_amount_cents: 0,
        refund_reason: null,
        refunded_at: null,
      }).eq("id", orderId),
      client.from("event_tickets").update({
        status: "active",
        payment_status: "paid",
        revoked_at: null,
      }).eq("ticket_order_id", orderId),
    ]), "Ticket reinstatement failed");
  } else if (checkout.purchase_kind === "release_unlock") {
    const result = await client.from("release_purchases").update({
      status: "completed",
      refunded_amount_cents: 0,
      refunded_at: null,
    }).eq("stripe_payment_intent_id", paymentIntentId);
    assertWrites([result], "Release reinstatement failed");
  } else if (checkout.purchase_kind === "physical_merch") {
    if (isIosPhysicalBasket(checkout)) {
      const orderId = asId(checkout.provider_metadata?.order_id);
      if (orderId) {
        const result = await client.from("orders").update({
          status: "completed",
          updated_at: now,
        }).eq("id", orderId).eq("user_id", checkout.user_id).select("id");
        if (result.error || !result.data?.length) {
          throw new Error("Physical basket reinstatement failed");
        }
      }
      await logger.info("ios_physical_basket_dispute_won", {
        checkoutId: checkout.id,
        orderId,
      });
    } else {
      const orderId = asId(checkout.provider_metadata?.merch_order_id);
      const result = await client.from("physical_merch_orders").update({
        status: "completed",
        refunded_amount_cents: 0,
        refund_reason: null,
        refunded_at: null,
      }).eq("id", orderId);
      assertWrites([result], "Merchandise reinstatement failed");
    }
  }
  const checkoutUpdate = await client.from("external_checkout_sessions").update({
    status: "completed",
    refunded_amount_cents: 0,
    refund_reason: null,
    refunded_at: null,
    updated_at: now,
  }).eq("id", checkout.id).eq("status", "disputed").select("id");
  if (checkoutUpdate.error || !checkoutUpdate.data?.length) {
    throw new Error("Checkout reinstatement could not be recorded");
  }
  await logger.info("hybrid_checkout_dispute_won", {
    checkoutId: checkout.id,
    purchaseKind: checkout.purchase_kind,
  });
  return true;
}
