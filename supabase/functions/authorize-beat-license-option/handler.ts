import {
  clientIp,
  EXCLUSIVE_PRODUCER_AUTHORIZATION_TEXT,
  EXCLUSIVE_PRODUCER_AUTHORIZATION_VERSION,
} from "../_shared/beatLicenseCompliance.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type User = { id: string };
type Option = {
  id: string;
  beat_id: string;
  license_type: string;
  beat_owner_id: string;
};

export interface AuthorizeBeatLicenseDependencies {
  authenticate(req: Request): Promise<User | null>;
  loadOption(beatId: string, optionId: string): Promise<Option | null>;
  authorize(optionId: string, input: Record<string, unknown>): Promise<void>;
  now(): Date;
}

type Body = {
  beatId?: unknown;
  licenseOptionId?: unknown;
  accepted?: unknown;
  authorizationVersion?: unknown;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const id = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export async function handleAuthorizeBeatLicenseOption(
  req: Request,
  deps: AuthorizeBeatLicenseDependencies,
): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const user = await deps.authenticate(req);
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const beatId = id(body.beatId);
  const optionId = id(body.licenseOptionId);
  if (!beatId || !optionId || body.accepted !== true ||
    body.authorizationVersion !== EXCLUSIVE_PRODUCER_AUTHORIZATION_VERSION) {
    return json({ error: "Explicit producer authorization is required" }, 400);
  }

  const option = await deps.loadOption(beatId, optionId);
  if (!option) return json({ error: "Licence option not found" }, 404);
  if (option.beat_owner_id !== user.id) return json({ error: "Forbidden" }, 403);
  if (option.license_type !== "exclusive_rights") {
    return json({ error: "This authorization applies only to Exclusive licences" }, 400);
  }

  const authorizedAt = deps.now().toISOString();
  await deps.authorize(option.id, {
    producer_authorization_text: EXCLUSIVE_PRODUCER_AUTHORIZATION_TEXT,
    producer_authorization_version: EXCLUSIVE_PRODUCER_AUTHORIZATION_VERSION,
    producer_authorized_by: user.id,
    producer_authorized_at: authorizedAt,
    producer_authorization_ip: clientIp(req),
    producer_authorization_user_agent: req.headers.get("user-agent") ?? "unknown",
    is_available: true,
    updated_at: authorizedAt,
  });

  return json({
    success: true,
    authorizationVersion: EXCLUSIVE_PRODUCER_AUTHORIZATION_VERSION,
    authorizedAt,
  });
}
