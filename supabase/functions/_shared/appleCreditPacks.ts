export type AppleCreditPack = {
  label: string;
  priceGBP: number;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
};

// Server-owned fulfilment catalogue. App Store Connect owns the customer-facing
// price; these reference prices are retained only for ledger/audit metadata.
export const APPLE_CREDIT_PACKS: Record<string, AppleCreditPack> = {
  pluggd_credits_starter: {
    label: "Starter",
    priceGBP: 5,
    baseCredits: 500,
    bonusCredits: 0,
    totalCredits: 500,
  },
  pluggd_credits_popular: {
    label: "Popular",
    priceGBP: 10,
    baseCredits: 1000,
    bonusCredits: 50,
    totalCredits: 1050,
  },
  pluggd_credits_value: {
    label: "Value",
    priceGBP: 25,
    baseCredits: 2500,
    bonusCredits: 250,
    totalCredits: 2750,
  },
  pluggd_credits_premium: {
    label: "Premium",
    priceGBP: 50,
    baseCredits: 5000,
    bonusCredits: 750,
    totalCredits: 5750,
  },
  pluggd_credits_ultimate: {
    label: "Ultimate",
    priceGBP: 100,
    baseCredits: 10000,
    bonusCredits: 2000,
    totalCredits: 12000,
  },
};
