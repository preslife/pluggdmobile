export type ClientFactory = (url: string, key: string, options?: Record<string, unknown>) => any;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const REJECT_PATTERNS = [
  /\b(kill|murder|shoot)\s+(yourself|them|him|her)\b/i,
  /\bchild\s+(porn|sexual|nude)\b/i,
];
const REVIEW_PATTERNS = [
  /\b(hate|threat|doxx|nudes?)\b/i,
  /\bhttps?:\/\/\S+\b.*\bhttps?:\/\/\S+\b.*\bhttps?:\/\/\S+\b/i,
];

export function classifyContent(text: string, mediaUrls: string[]) {
  const reasonCodes: string[] = [];
  if (REJECT_PATTERNS.some((pattern) => pattern.test(text))) reasonCodes.push("high_risk_text");
  if (reasonCodes.length) return { decision: "reject" as const, reasonCodes };
  if (REVIEW_PATTERNS.some((pattern) => pattern.test(text))) reasonCodes.push("review_text");
  if (mediaUrls.length) reasonCodes.push("media_review");
  return reasonCodes.length
    ? { decision: "review" as const, reasonCodes }
    : { decision: "allow" as const, reasonCodes };
}

export function createModerateUserContentHandler(input: {
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
    if (authError || !authData?.user) return respond({ error: "Authentication failed" }, 401);

    const body = await req.json().catch(() => null) as {
      contentKind?: string;
      text?: string;
      mediaUrls?: string[];
      destination?: Record<string, unknown>;
    } | null;
    if (!body?.contentKind || typeof body.text !== "string") {
      return respond({ error: "contentKind and text are required" }, 400);
    }
    const text = body.text.trim().slice(0, 5000);
    const mediaUrls = Array.isArray(body.mediaUrls) ? body.mediaUrls.slice(0, 8) : [];
    const classification = classifyContent(text, mediaUrls);
    if (classification.decision === "allow") return respond({ decision: "allow" });

    const { data: submission, error } = await admin
      .from("ugc_moderation_submissions")
      .insert({
        user_id: authData.user.id,
        content_kind: body.contentKind,
        text_content: text,
        media_urls: mediaUrls,
        destination: body.destination ?? null,
        decision: classification.decision === "reject" ? "rejected" : "review",
        reason_codes: classification.reasonCodes,
        status: classification.decision === "reject" ? "rejected" : "pending",
      })
      .select("id")
      .single();
    if (error) return respond({ error: "Unable to complete safety review" }, 500);
    return respond({
      decision: classification.decision,
      submissionId: submission.id,
      message: classification.decision === "review"
        ? "Your post is being reviewed before it appears."
        : "This content cannot be posted under the Community Guidelines.",
    });
  };
}
