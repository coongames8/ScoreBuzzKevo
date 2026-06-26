// Country detection + currency conversion utilities
// Base currency for all plans is KES (Kenyan Shilling)

export const BASE_CURRENCY = "KES";

// Supported countries with their currency details
export const COUNTRIES = {
  KE: { name: "Kenya", currency: "KES", symbol: "KSH", flag: "🇰🇪", rate: 1 },
  NG: { name: "Nigeria", currency: "NGN", symbol: "₦", flag: "🇳🇬", rate: 10.63 },
  GH: { name: "Ghana", currency: "GHS", symbol: "₵", flag: "🇬🇭", rate: 0.084 },
  ZA: { name: "South Africa", currency: "ZAR", symbol: "R", flag: "🇿🇦", rate: 0.13 },
  UG: { name: "Uganda", currency: "UGX", symbol: "USh", flag: "🇺🇬", rate: 28.67 },
  TZ: { name: "Tanzania", currency: "TZS", symbol: "TSh", flag: "🇹🇿", rate: 19.97 },
  US: { name: "United States", currency: "USD", symbol: "$", flag: "🇺🇸", rate: 0.0078 },
  GB: { name: "United Kingdom", currency: "GBP", symbol: "£", flag: "🇬🇧", rate: 0.0061 },
  EU: { name: "Europe", currency: "EUR", symbol: "€", flag: "🇪🇺", rate: 0.0071 },
};

// Fallback static rates (KES -> target) used if the live API fails
const FALLBACK_RATES = {
  KES: 1,
  NGN: 10.63,
  GHS: 0.084,
  ZAR: 0.13,
  UGX: 28.67,
  TZS: 19.97,
  USD: 0.0078,
  GBP: 0.0061,
  EUR: 0.0071,
};

const cacheKey = "sb_geo_v1";
const cacheTTL = 1000 * 60 * 60 * 24; // 24 hours

// Detect user country via ipapi.co (free, no key required)
export async function detectCountry() {
  // Check cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < cacheTTL && parsed.countryCode) {
        return parsed.countryCode;
      }
    }
  } catch (e) {
    // ignore cache read errors
  }

  const endpoints = [
    "https://ipapi.co/json/",
    "https://ipwho.is/",
    "https://api.country.is/",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();

      let code = "";
      if (url.includes("ipapi.co")) code = data.country_code;
      else if (url.includes("ipwho.is")) code = data.country_code;
      else if (url.includes("country.is")) code = data.country;

      if (code) {
        code = code.toUpperCase();
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ countryCode: code, ts: Date.now() }));
        } catch (e) {
          // ignore write errors
        }
        return code;
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}

// Fetch live KES -> target exchange rate from a free API
async function fetchLiveRate(targetCurrency) {
  if (targetCurrency === BASE_CURRENCY) return 1;

  try {
    // frankfurter.app is free and keyless, but doesn't support KES reliably for all pairs.
    // Use open.er-api.com (free, no key) which supports KES base.
    const res = await fetch(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`);
    if (!res.ok) throw new Error("rate fetch failed");
    const data = await res.json();
    const rate = data?.rates?.[targetCurrency];
    if (typeof rate === "number" && rate > 0) return rate;
    throw new Error("rate not found");
  } catch (e) {
    return FALLBACK_RATES[targetCurrency] ?? 1;
  }
}

// Resolve country code -> country config, falling back to Kenya (base)
export function getCountryConfig(countryCode) {
  if (countryCode && COUNTRIES[countryCode]) return COUNTRIES[countryCode];
  return COUNTRIES.KE;
}

// Convert a KES amount to the user's currency using a live rate (with fallback)
export async function convertAmount(kesAmount, targetCurrency) {
  const rate = await fetchLiveRate(targetCurrency);
  return { amount: Math.round(kesAmount * rate), rate };
}

// Batch-convert multiple KES amounts at once (one API call)
export async function convertAmounts(kesAmounts, targetCurrency) {
  if (targetCurrency === BASE_CURRENCY) {
    const result = {};
    for (const key of Object.keys(kesAmounts)) {
      result[key] = Math.round(kesAmounts[key]);
    }
    return { converted: result, rate: 1 };
  }

  const rate = await fetchLiveRate(targetCurrency);
  const converted = {};
  for (const key of Object.keys(kesAmounts)) {
    converted[key] = Math.round(kesAmounts[key] * rate);
  }
  return { converted, rate };
}
