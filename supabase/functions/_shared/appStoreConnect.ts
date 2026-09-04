import { importPKCS8, SignJWT } from "npm:jose@6.1.0";

const API_ROOT = "https://api.appstoreconnect.apple.com";
const TOKEN_TTL_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 4;

type JsonApiResource = {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: JsonApiResource | JsonApiResource[] | null }>;
};

type JsonApiDocument = {
  data?: JsonApiResource | JsonApiResource[] | null;
  included?: JsonApiResource[];
  links?: { next?: string | null };
  errors?: Array<{ status?: string; code?: string; title?: string; detail?: string }>;
};

type UploadOperation = {
  method?: string;
  url?: string;
  length?: number;
  offset?: number;
  requestHeaders?: Array<{ name?: string; value?: string }>;
};

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function normalizedPrivateKey(value: string): string {
  return value.includes("\\n") ? value.replaceAll("\\n", "\n") : value;
}

function wait(delayMs: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}

export class AppStoreConnectClient {
  readonly appId: string;
  private readonly issuerId: string;
  private readonly keyId: string;
  private readonly privateKey: string;
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor() {
    this.appId = requiredEnvironment("ASC_APP_ID");
    this.issuerId = requiredEnvironment("ASC_ISSUER_ID");
    this.keyId = requiredEnvironment("ASC_KEY_ID");
    this.privateKey = normalizedPrivateKey(requiredEnvironment("ASC_PRIVATE_KEY"));
  }

  private async token() {
    const now = Math.floor(Date.now() / 1000);
    if (this.cachedToken && this.cachedToken.expiresAt > now + 30) {
      return this.cachedToken.value;
    }
    const key = await importPKCS8(this.privateKey, "ES256");
    const value = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: this.keyId, typ: "JWT" })
      .setIssuer(this.issuerId)
      .setAudience("appstoreconnect-v1")
      .setIssuedAt(now)
      .setExpirationTime(now + TOKEN_TTL_SECONDS)
      .sign(key);
    this.cachedToken = { value, expiresAt: now + TOKEN_TTL_SECONDS };
    return value;
  }

  async request(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    pathOrUrl: string,
    body?: unknown,
  ): Promise<JsonApiDocument> {
    const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_ROOT}${pathOrUrl}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${await this.token()}`,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const document = await response.json().catch(() => ({})) as JsonApiDocument;
      if (response.ok) return document;

      const detail = document.errors
        ?.map((entry) => entry.detail || entry.title || entry.code)
        .filter(Boolean)
        .join("; ") || `App Store Connect returned ${response.status}`;
      lastError = new Error(`${response.status} ${method} ${new URL(url).pathname}: ${detail}`);

      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === MAX_ATTEMPTS - 1) {
        throw lastError;
      }
      const retryAfter = Number(response.headers.get("retry-after"));
      await wait(Number.isFinite(retryAfter) ? retryAfter * 1000 : 500 * 2 ** attempt);
    }

    throw lastError ?? new Error("App Store Connect request failed");
  }

  async list(path: string): Promise<JsonApiResource[]> {
    const rows: JsonApiResource[] = [];
    let next: string | null = path;
    while (next) {
      const document: JsonApiDocument = await this.request("GET", next);
      const page = Array.isArray(document.data) ? document.data : [];
      rows.push(...page);
      next = document.links?.next ?? null;
    }
    return rows;
  }

  async uploadReservedAsset(resource: JsonApiResource, bytes: Uint8Array) {
    const operations = (resource.attributes?.uploadOperations ?? []) as UploadOperation[];
    if (!operations.length) throw new Error("Apple returned no asset upload operations");

    for (const operation of operations) {
      if (!operation.url || !operation.method) {
        throw new Error("Apple returned an invalid asset upload operation");
      }
      const offset = Math.max(0, Number(operation.offset ?? 0));
      const length = Math.max(0, Number(operation.length ?? bytes.byteLength));
      const chunk = bytes.slice(offset, offset + length);
      const headers = Object.fromEntries(
        (operation.requestHeaders ?? [])
          .filter((header) => header.name && header.value)
          .map((header) => [header.name!, header.value!]),
      );
      const response = await fetch(operation.url, {
        method: operation.method,
        headers,
        body: chunk,
      });
      if (!response.ok) {
        throw new Error(`Apple asset upload returned ${response.status}`);
      }
    }
  }
}

export type { JsonApiDocument, JsonApiResource };
