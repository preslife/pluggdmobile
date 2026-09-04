export const BEAT_LICENCE_TERMS_VERSION = "2026-08-01.1";

export const DIGITAL_DELIVERY_CONSENT_VERSION = "2026-08-01.1";

export const DIGITAL_DELIVERY_CONSENT_TEXT =
  "I request immediate access to the digital files and understand that, once the download begins, I lose my 14-day right to cancel to the extent permitted by law.";

export const EXCLUSIVE_PRODUCER_AUTHORIZATION_VERSION = "2026-08-01.1";

export const EXCLUSIVE_PRODUCER_AUTHORIZATION_TEXT =
  "I confirm that I control the rights needed to offer this Beat under PLUGGD's Exclusive Beat Licence v1.0. I authorise PLUGGD to generate that agreement for buyers on the published price and terms, subject to prior valid licences.";

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ?? "unknown";
}
