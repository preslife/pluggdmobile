#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";

const recipient = process.env.STAGING_SMOKE_RECIPIENT;
if (!recipient) {
  console.error("STAGING_SMOKE_RECIPIENT environment variable is required.");
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for staging smoke tests.");
  process.exit(1);
}

const title = process.env.STAGING_SMOKE_TITLE ?? "Staging broadcast smoke";
const message =
  process.env.STAGING_SMOKE_MESSAGE ?? `Automated staging broadcast triggered at ${new Date().toISOString()}`;

const sendScript = fileURLToPath(new URL("./send-broadcast-notification.mjs", import.meta.url));

const child = spawn(process.execPath, [sendScript, recipient, title, message], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
