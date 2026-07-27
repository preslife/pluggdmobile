export type ClientFactory = (url: string, key: string, options?: Record<string, unknown>) => any;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const EXPORT_TABLES: Array<{ table: string; owner: string }> = [
  { table: "profiles", owner: "user_id" },
  { table: "releases", owner: "user_id" },
  { table: "beats", owner: "producer_id" },
  { table: "social_posts", owner: "user_id" },
  { table: "social_comments", owner: "user_id" },
  { table: "social_stories", owner: "user_id" },
  { table: "session_messages", owner: "user_id" },
  { table: "session_feedback", owner: "user_id" },
  { table: "session_files", owner: "user_id" },
  { table: "session_members", owner: "user_id" },
  { table: "notifications", owner: "user_id" },
  { table: "fan_subscriptions", owner: "fan_id" },
  { table: "iap_transactions", owner: "user_id" },
  { table: "user_blocks", owner: "blocker_id" },
  { table: "content_reports", owner: "reporter_id" },
];

const EXPORT_STORAGE_BUCKETS = [
  "avatars",
  "release-artwork",
  "social-media",
  "user-uploads",
] as const;

export function createExportMyDataHandler(input: {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
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

    const { data: request, error: requestError } = await admin
      .from("data_export_requests")
      .insert({ user_id: user.id, status: "processing" })
      .select("id")
      .single();
    if (requestError || !request) return respond({ error: "Unable to create export request" }, 500);

    try {
      const records: Record<string, unknown[]> = {};
      const omitted: Array<{ table: string; reason: string }> = [];
      for (const source of EXPORT_TABLES) {
        const { data, error } = await admin.from(source.table).select("*").eq(source.owner, user.id);
        if (error) {
          omitted.push({ table: source.table, reason: "not available" });
          continue;
        }
        records[source.table] = data ?? [];
      }

      const storage: Array<{ bucket: string; path: string; size: number | null; updatedAt: string | null }> = [];
      for (const bucket of EXPORT_STORAGE_BUCKETS) {
        const { data, error } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
        if (error) {
          omitted.push({ table: `storage:${bucket}`, reason: "not available" });
          continue;
        }
        for (const object of data ?? []) {
          storage.push({
            bucket,
            path: `${user.id}/${object.name}`,
            size: typeof object.metadata?.size === "number" ? object.metadata.size : null,
            updatedAt: object.updated_at ?? null,
          });
        }
      }

      const archive = {
        format: "PLUGGD portable account archive",
        version: 1,
        generatedAt: new Date().toISOString(),
        account: {
          id: user.id,
          email: user.email ?? null,
          createdAt: user.created_at,
          metadata: user.user_metadata ?? {},
        },
        records,
        storage,
        omitted,
      };
      const objectPath = `${user.id}/${request.id}.json`;
      const encoded = new TextEncoder().encode(JSON.stringify(archive, null, 2));
      const { error: uploadError } = await admin.storage
        .from("user-data-exports")
        .upload(objectPath, encoded, { contentType: "application/json", upsert: false });
      if (uploadError) throw uploadError;

      const expiresIn = 60 * 60 * 24;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      const { data: signed, error: signedError } = await admin.storage
        .from("user-data-exports")
        .createSignedUrl(objectPath, expiresIn, { download: `pluggd-data-${request.id}.json` });
      if (signedError || !signed?.signedUrl) throw signedError ?? new Error("Unable to sign archive");

      await admin.from("data_export_requests").update({
        status: "ready",
        object_path: objectPath,
        expires_at: expiresAt,
        completed_at: new Date().toISOString(),
      }).eq("id", request.id);

      return respond({ requestId: request.id, downloadUrl: signed.signedUrl, expiresAt });
    } catch (error) {
      await admin.from("data_export_requests").update({
        status: "failed",
        error_message: error instanceof Error ? error.message.slice(0, 500) : "Export failed",
        completed_at: new Date().toISOString(),
      }).eq("id", request.id);
      return respond({ error: "Unable to prepare your archive. Please try again." }, 500);
    }
  };
}
