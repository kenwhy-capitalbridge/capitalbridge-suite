/**
 * Regional markets for pricing UI and checkout (IP / user selection).
 *
 * Billplz (Malaysia) creates bills in MYR only — amount is in sen (1/100 MYR). The public
 * API does not expose a currency field per bill. We therefore charge `MARKET_PLAN_BILLPLZ_MYR_SEN`
 * per market+plan: MY matches list prices in RM; other markets use MYR amounts tuned to each
 * regional list price (issuer may apply FX when the payer uses a non‑MYR card).
 */

export type MarketId = "MY" | "SG" | "TH" | "PH" | "US" | "AU" | "CN" | "HK";

export type PlanPriceKey = "trial" | "monthly" | "quarterly" | "strategic";

/** Preformatted display strings (no space between symbol and amount, per product currency rules). */
export const MARKET_PLAN_PRICES: Record<MarketId, Record<PlanPriceKey, string>> = {
  MY: {
    trial: "RM29",
    monthly: "RM200",
    quarterly: "RM540",
    strategic: "RM3,000",
  },
  SG: {
    trial: "S$29",
    monthly: "S$200",
    quarterly: "S$540",
    strategic: "S$3,000",
  },
  TH: {
    trial: "฿249",
    monthly: "฿1,690",
    quarterly: "฿4,590",
    strategic: "฿25,000",
  },
  PH: {
    trial: "₱399",
    monthly: "₱2,290",
    quarterly: "₱6,290",
    strategic: "₱36,000",
  },
  US: {
    trial: "$7.50",
    monthly: "$24.99",
    quarterly: "$69.99",
    strategic: "$399",
  },
  AU: {
    trial: "A$11",
    monthly: "A$34.99",
    quarterly: "A$99",
    strategic: "A$549",
  },
  CN: {
    trial: "¥50",
    monthly: "¥168",
    quarterly: "¥468",
    strategic: "¥2,880",
  },
  HK: {
    trial: "HK$48",
    monthly: "HK$188",
    quarterly: "HK$580",
    strategic: "HK$3,800",
  },
};

/**
 * Amount sent to Billplz for each market + plan — **MYR sen** (Billplz native unit).
 *
 * MY / SG: list prices in RM / parallel S$ numerals → same MYR sen for SG as MY.
 * Other markets: MYR sen = round(regional list amount × MYR-per-unit), using reference
 * rates (revise with finance): THB 1/7.5 MYR, PHP 0.083, USD 4.45, AUD 2.85, CNY 0.65, HKD 0.55.
 */
export const MARKET_PLAN_BILLPLZ_MYR_SEN: Record<MarketId, Record<PlanPriceKey, number>> = {
  MY: { trial: 2900, monthly: 20000, quarterly: 54000, strategic: 300000 },
  SG: { trial: 2900, monthly: 20000, quarterly: 54000, strategic: 300000 },
  TH: { trial: 3320, monthly: 22533, quarterly: 61200, strategic: 333333 },
  PH: { trial: 3312, monthly: 19007, quarterly: 52207, strategic: 298800 },
  US: { trial: 3338, monthly: 111206, quarterly: 311456, strategic: 177555 },
  AU: { trial: 3135, monthly: 99722, quarterly: 28215, strategic: 156465 },
  CN: { trial: 3250, monthly: 10920, quarterly: 30420, strategic: 187200 },
  HK: { trial: 2640, monthly: 10340, quarterly: 31900, strategic: 209000 },
};

export const MARKET_LABELS: Record<MarketId, string> = {
  MY: "MY",
  SG: "SG",
  TH: "TH",
  PH: "PH",
  US: "US",
  AU: "AU/NZ",
  CN: "CN",
  HK: "HK",
};

/** ISO 3166-1 alpha-2 → default market (Vercel / geo). */
export function marketFromCountryCode(iso: string | null | undefined): MarketId {
  const u = (iso ?? "").trim().toUpperCase();
  const map: Record<string, MarketId> = {
    MY: "MY",
    SG: "SG",
    TH: "TH",
    PH: "PH",
    US: "US",
    AU: "AU",
    NZ: "AU",
    CN: "CN",
    HK: "HK",
  };
  return map[u] ?? "MY";
}

export type CheckoutCountryCode =
  | "MY"
  | "SG"
  | "US"
  | "AU"
  | "CN"
  | "HK"
  | "TH"
  | "PH";

export const CHECKOUT_COUNTRIES: {
  code: CheckoutCountryCode;
  label: string;
  flag: string;
  market: MarketId;
  dial: string;
}[] = [
  { code: "MY", label: "Malaysia", flag: "🇲🇾", market: "MY", dial: "+60" },
  { code: "SG", label: "Singapore", flag: "🇸🇬", market: "SG", dial: "+65" },
  { code: "US", label: "United States", flag: "🇺🇸", market: "US", dial: "+1" },
  { code: "AU", label: "Australia", flag: "🇦🇺", market: "AU", dial: "+61" },
  { code: "CN", label: "China", flag: "🇨🇳", market: "CN", dial: "+86" },
  { code: "HK", label: "Hong Kong", flag: "🇭🇰", market: "HK", dial: "+852" },
  { code: "TH", label: "Thailand", flag: "🇹🇭", market: "TH", dial: "+66" },
  { code: "PH", label: "Philippines", flag: "🇵🇭", market: "PH", dial: "+63" },
];

export function getCheckoutCountry(code: string): (typeof CHECKOUT_COUNTRIES)[number] | undefined {
  return CHECKOUT_COUNTRIES.find((c) => c.code === code);
}

/** Plan card id: `yearly_full` → strategic price key */
export function planPriceKeyFromCardId(planId: string): PlanPriceKey {
  if (planId === "yearly_full" || planId === "strategic") return "strategic";
  if (planId === "trial" || planId === "monthly" || planId === "quarterly") return planId as PlanPriceKey;
  return "trial";
}

const KNOWN_MARKET_IDS = new Set<string>(Object.keys(MARKET_PLAN_PRICES));

export function normalizeMarketId(raw: string | null | undefined): MarketId {
  const u = (raw ?? "").trim().toUpperCase();
  return KNOWN_MARKET_IDS.has(u) ? (u as MarketId) : "MY";
}

export type BillingRegionValidationCode =
  | "region_mismatch"
  | "checkout_country_required"
  | "invalid_checkout_country";

export type BillingRegionValidationResult =
  | { ok: true; market: MarketId }
  | { ok: false; code: BillingRegionValidationCode };

/**
 * Lock billing to the market implied by IP geo. Client `market` and optional `checkoutCountry`
 * must match that market (prevents picking a cheaper region). Cookies/localStorage are not inputs.
 */
export function validateBillingRegionForRequest(args: {
  ipCountry: string | null | undefined;
  clientMarket: string | null | undefined;
  checkoutCountry: string | null | undefined;
  /** Payment-first checkout must send checkout country; other flows can omit. */
  requireCheckoutCountry: boolean;
}): BillingRegionValidationResult {
  const ipMarket = marketFromCountryCode(args.ipCountry);
  const clientM = typeof args.clientMarket === "string" ? args.clientMarket.trim() : "";
  if (clientM !== "" && normalizeMarketId(clientM) !== ipMarket) {
    return { ok: false, code: "region_mismatch" };
  }
  const rawCc = (args.checkoutCountry ?? "").trim().toUpperCase();
  if (args.requireCheckoutCountry) {
    if (!rawCc) return { ok: false, code: "checkout_country_required" };
    const row = getCheckoutCountry(rawCc.slice(0, 8));
    if (!row) return { ok: false, code: "invalid_checkout_country" };
    if (row.market !== ipMarket) return { ok: false, code: "region_mismatch" };
  } else if (rawCc) {
    const row = getCheckoutCountry(rawCc.slice(0, 8));
    if (!row) return { ok: false, code: "invalid_checkout_country" };
    if (row.market !== ipMarket) return { ok: false, code: "region_mismatch" };
  }
  return { ok: true, market: ipMarket };
}

/** MYR sen to pass to Billplz `amount` for this advisory market and plan slug. */
export function getBillplzChargeAmountSen(market: string | null | undefined, planSlug: string): number {
  const m = normalizeMarketId(market);
  const key = planPriceKeyFromCardId(planSlug);
  const row = MARKET_PLAN_BILLPLZ_MYR_SEN[m];
  const v = row[key];
  if (typeof v === "number" && v > 0) return v;
  return MARKET_PLAN_BILLPLZ_MYR_SEN.MY[key];
}

export function getMarketPlanPriceDisplay(market: MarketId, planId: string): string {
  const key = planPriceKeyFromCardId(planId);
  return MARKET_PLAN_PRICES[market]?.[key] ?? MARKET_PLAN_PRICES.MY[key];
}

export const STORAGE_MARKET_KEY = "cb_advisory_market";
export const STORAGE_CHECKOUT_COUNTRY_KEY = "cb_checkout_country";
export const STORAGE_CHECKOUT_PHONE_KEY = "cb_checkout_phone";
/** Model apps may read this to default currency (MYR, SGD, USD, …). */
export const STORAGE_DEFAULT_CURRENCY_CODE_KEY = "cb_default_currency_code";

/**
 * Map ISO 4217 codes (stored with login checkout) to model UI currency keys
 * (Forever/Income Engineering/Capital Health use RM; China uses RMB in UI).
 */
export function modelCurrencyPrefixFromIso4217(iso4217: string): string | null {
  const u = iso4217.trim().toUpperCase();
  const map: Record<string, string> = {
    MYR: "RM",
    SGD: "SGD",
    THB: "THB",
    PHP: "PHP",
    USD: "USD",
    AUD: "AUD",
    CNY: "RMB",
    HKD: "HKD",
  };
  return map[u] ?? null;
}

const CURRENCY_BY_MARKET: Record<MarketId, string> = {
  MY: "MYR",
  SG: "SGD",
  TH: "THB",
  PH: "PHP",
  US: "USD",
  AU: "AUD",
  CN: "CNY",
  HK: "HKD",
};

/** Model UI currency key (Forever / Income Engineering / Capital Health) from advisory market. */
export function marketToModelCurrencyPrefix(market: MarketId): string {
  const iso = CURRENCY_BY_MARKET[market];
  return modelCurrencyPrefixFromIso4217(iso ?? "MYR") ?? "RM";
}

/**
 * Billplz top-up in MYR sen when moving from `fromMarket` to `toMarket` for the same plan tier
 * (difference in regional list price encoded as MYR sen).
 */
export function computeMarketChangeDeltaSen(fromMarket: MarketId, toMarket: MarketId, planSlug: string): number {
  const oldSen = getBillplzChargeAmountSen(fromMarket, planSlug);
  const newSen = getBillplzChargeAmountSen(toMarket, planSlug);
  return Math.max(0, newSen - oldSen);
}

/** Persist market + default currency hint for advisory model apps (localStorage). */
export function persistAdvisoryMarketPreference(market: MarketId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_MARKET_KEY, market);
    localStorage.setItem(STORAGE_DEFAULT_CURRENCY_CODE_KEY, CURRENCY_BY_MARKET[market] ?? "MYR");
  } catch {
    /* private mode / quota */
  }
}
