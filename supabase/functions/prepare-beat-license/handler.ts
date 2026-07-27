export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export type CommerceUser = { id: string; email?: string | null };

export type BeatRecord = {
  id: string;
  user_id: string;
  title: string;
  producer_name?: string | null;
  artwork_url?: string | null;
  is_published: boolean;
};

export type LicenseOptionRecord = {
  id: string;
  beat_id: string;
  license_type: string;
  price_pence: number;
  is_available: boolean;
};

export type ContractTemplateRecord = {
  template_type: string;
  title: string;
  description?: string | null;
  legal_text: string;
  features?: unknown;
  restrictions?: unknown;
  deliverables?: unknown;
  is_active: boolean;
};

export type ContractRecord = {
  id: string;
  status: string;
  legal_text: string;
  amount_cents: number;
  currency: string;
  producer_signature?: string | null;
  artist_signature?: string | null;
};

export interface PrepareBeatLicenseDependencies {
  authenticate(req: Request): Promise<CommerceUser | null>;
  loadBeat(beatId: string): Promise<BeatRecord | null>;
  loadLicenseOption(
    beatId: string,
    optionId: string,
  ): Promise<LicenseOptionRecord | null>;
  loadContractTemplate(
    templateType: string,
  ): Promise<ContractTemplateRecord | null>;
  loadDisplayName(userId: string): Promise<string | null>;
  findPendingContract(input: {
    beatId: string;
    artistId: string;
    optionId: string;
  }): Promise<ContractRecord | null>;
  createContract(input: Record<string, unknown>): Promise<ContractRecord>;
  now(): Date;
}

type Body = { beatId?: unknown; licenseOptionId?: unknown };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const asId = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

function renderLegalText(
  template: string,
  values: Record<string, string>,
): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

export async function handlePrepareBeatLicense(
  req: Request,
  deps: PrepareBeatLicenseDependencies,
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

  const beatId = asId(body.beatId);
  const licenseOptionId = asId(body.licenseOptionId);
  if (!beatId || !licenseOptionId) {
    return json({ error: "beatId and licenseOptionId are required" }, 400);
  }

  const beat = await deps.loadBeat(beatId);
  if (!beat || !beat.is_published) {
    return json({ error: "Published beat not found" }, 404);
  }
  if (beat.user_id === user.id) {
    return json({ error: "You cannot license your own beat" }, 403);
  }

  const option = await deps.loadLicenseOption(beatId, licenseOptionId);
  if (!option || !option.is_available || option.price_pence <= 0) {
    return json({ error: "Licence option is unavailable" }, 404);
  }

  const template = await deps.loadContractTemplate(option.license_type);
  if (!template || !template.is_active) {
    return json({ error: "Licence terms are unavailable" }, 409);
  }

  const existing = await deps.findPendingContract({
    beatId,
    artistId: user.id,
    optionId: option.id,
  });

  const producerName = beat.producer_name ||
    await deps.loadDisplayName(beat.user_id) || "Producer";
  const artistName = await deps.loadDisplayName(user.id) || "Artist";
  const amount = (option.price_pence / 100).toFixed(2);
  const legalText = renderLegalText(template.legal_text, {
    purchase_date: deps.now().toISOString().slice(0, 10),
    producer_name: producerName,
    artist_name: artistName,
    beat_title: beat.title,
    amount,
  });

  const reusable = existing &&
      existing.amount_cents === option.price_pence &&
      existing.currency === "GBP"
    ? existing
    : null;
  const contract = reusable ?? await deps.createContract({
    beat_id: beat.id,
    producer_id: beat.user_id,
    artist_id: user.id,
    template_type: template.template_type,
    license_fee: option.price_pence / 100,
    license_fee_pence: option.price_pence,
    amount_cents: option.price_pence,
    currency: "GBP",
    permitted_rail: "stripe_checkout",
    policy_version: "2026-07-27.1",
    legal_text: legalText,
    status: "pending",
    producer_signature: `catalogue-offer:${option.id}`,
    contract_data: {
      license_option_id: option.id,
      template_id: template.template_type,
      producer_catalogue_acceptance: {
        accepted: true,
        option_id: option.id,
        price_cents: option.price_pence,
        currency: "GBP",
      },
    },
    pricing_snapshot: {
      beat_id: beat.id,
      beat_title: beat.title,
      producer_id: beat.user_id,
      license_option_id: option.id,
      license_type: option.license_type,
      amount_cents: option.price_pence,
      currency: "GBP",
    },
  });

  return json({
    beat: {
      id: beat.id,
      title: beat.title,
      producerId: beat.user_id,
      producerName,
      artworkUrl: beat.artwork_url ?? null,
    },
    option: {
      id: option.id,
      licenseType: option.license_type,
      name: template.title,
      title: template.title,
      description: template.description ?? null,
      amountCents: option.price_pence,
      priceCents: option.price_pence,
      priceLabel: `£${amount}`,
      currency: "GBP",
      usageRights: list(template.features),
      features: list(template.features),
      restrictions: list(template.restrictions),
      deliverables: list(template.deliverables),
      territory: "As defined in the licence contract",
      term: "As defined in the licence contract",
    },
    contract: {
      id: contract.id,
      status: contract.status,
      legalText: contract.legal_text,
      amountCents: contract.amount_cents,
      currency: contract.currency,
      producerAccepted: Boolean(contract.producer_signature),
      artistSigned: Boolean(contract.artist_signature),
      requiresArtistSignature: !contract.artist_signature,
      acceptanceRequired: !contract.artist_signature,
    },
    contractId: contract.id,
  });
}
