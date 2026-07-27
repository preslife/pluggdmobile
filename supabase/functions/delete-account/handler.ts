export type ClientFactory = (url: string, key: string, options?: Record<string, unknown>) => any;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function removeStorageFolder(admin: any, bucket: string, userId: string) {
  const storage = admin.storage.from(bucket);
  const { data: objects, error } = await storage.list(userId, { limit: 1000 });
  if (error || !objects?.length) return;
  await storage.remove(objects.map((item: { name: string }) => `${userId}/${item.name}`));
}

async function bestEffortDelete(admin: any, table: string, owner: string, userId: string) {
  await admin.from(table).delete().eq(owner, userId);
}

export function createDeleteAccountHandler(input: {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
  auditSalt: string;
  createClient: ClientFactory;
}) {
  return async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { headers });
    if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Authentication required" }, 401);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const anon = input.createClient(input.supabaseUrl, input.anonKey);
    const admin = input.createClient(input.supabaseUrl, input.serviceKey, {
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await anon.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return respond({ error: "Authentication failed" }, 401);

    let body: { confirmation?: string; acknowledgeSubscription?: boolean };
    try {
      body = await req.json();
    } catch {
      return respond({ error: "Invalid request" }, 400);
    }
    if (body.confirmation !== "DELETE") {
      return respond({ error: "Type DELETE to confirm permanent account deletion." }, 400);
    }

    const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    if (!lastSignIn || Date.now() - lastSignIn > 15 * 60 * 1000) {
      return respond({ error: "For your security, sign out and sign in again before deleting your account.", code: "reauth_required" }, 403);
    }

    const { data: activeSubscriptions } = await admin
      .from("fan_subscriptions")
      .select("id")
      .eq("fan_id", user.id)
      .eq("status", "active")
      .limit(1);
    if ((activeSubscriptions?.length ?? 0) > 0 && !body.acknowledgeSubscription) {
      return respond({
        error: "Your App Store subscriptions are managed by Apple. Confirm that you understand deletion does not cancel them.",
        code: "subscription_ack_required",
      }, 409);
    }

    const userHash = await sha256(`${input.auditSalt}:${user.id}`);
    const { data: audit, error: auditError } = await admin
      .from("account_deletion_audit")
      .insert({ user_hash: userHash, status: "partial" })
      .select("id")
      .single();
    if (auditError || !audit) {
      return respond({ error: "We could not start secure account deletion. Contact support@pluggd.fm." }, 500);
    }

    try {
      // Explicitly remove security-sensitive and user-authored records. Database
      // cascades remain the final safety net for every auth-owned relationship.
      const ownedRecords = [
        ["mobile_push_tokens", "user_id"],
        ["social_story_views", "viewer_id"],
        ["social_comments", "user_id"],
        ["social_stories", "user_id"],
        ["social_posts", "user_id"],
        ["session_messages", "user_id"],
        ["session_feedback", "user_id"],
        ["session_files", "user_id"],
        ["session_members", "user_id"],
        ["notifications", "user_id"],
        ["user_blocks", "blocker_id"],
        ["content_reports", "reporter_id"],
        ["fan_subscriptions", "fan_id"],
      ] as const;
      for (const [table, owner] of ownedRecords) {
        await bestEffortDelete(admin, table, owner, user.id);
      }

      await admin
        .from("iap_transactions")
        .update({ user_id: null, account_hash: userHash, raw_receipt: null })
        .eq("user_id", user.id);
      await admin
        .from("apple_notification_log")
        .update({ app_account_token: null, payload: null })
        .eq("app_account_token", user.id);

      const buckets = [
        "avatars",
        "release-artwork",
        "social-media",
        "user-uploads",
        "ugc-quarantine",
        "user-data-exports",
      ];
      for (const bucket of buckets) await removeStorageFolder(admin, bucket, user.id);

      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;
      await admin.from("account_deletion_audit").update({ status: "completed" }).eq("id", audit.id);
      return respond({ deleted: true });
    } catch {
      await admin.from("account_deletion_audit").update({ status: "failed" }).eq("id", audit.id);
      return respond({ error: "We could not complete account deletion. Contact support@pluggd.fm." }, 500);
    }
  };
}
