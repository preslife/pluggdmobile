#!/usr/bin/env node

/**
 * Simple helper to call the broadcast-notification edge function.
 *
 * Usage:
 *   SUPABASE_URL="https://xyz.supabase.co"
 *   SUPABASE_SERVICE_ROLE_KEY="service-role-key"
 *   node scripts/send-broadcast-notification.mjs <recipientUUID> "Title" "Message"
 */

import process from "node:process";

const [recipient, title, message] = process.argv.slice(2);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

if (!recipient || !title || !message) {
  console.error("Usage: node scripts/send-broadcast-notification.mjs <recipientUUID> \"Title\" \"Message\"");
  process.exit(1);
}

const body = {
  recipients: [recipient],
  type: "system",
  title,
  message,
  payload: { sent_via: "scripts/send-broadcast-notification.mjs" },
};

async function main() {
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/broadcast-notification`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Failed to send notification", response.status, json);
    process.exit(1);
  }

  console.log("Notification dispatched:", JSON.stringify(json, null, 2));
}

main().catch((error) => {
  console.error("Unexpected error", error);
  process.exit(1);
});
