const DEFAULT_RATE = 1600; // Fallback rate (₦1,600 / $)
const STT_USD_VALUE = 0.01; // 1 STT = $0.01

interface CachedRate {
  rate: number;
  timestamp: number;
}

export async function fetchNgnRate(): Promise<number> {
  if (typeof window === "undefined") return DEFAULT_RATE;

  try {
    const cached = localStorage.getItem("predictnaija_ngn_rate");
    if (cached) {
      const parsed: CachedRate = JSON.parse(cached);
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp < oneHour) {
        return parsed.rate;
      }
    }

    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    const rate = data?.rates?.NGN || DEFAULT_RATE;

    localStorage.setItem(
      "predictnaija_ngn_rate",
      JSON.stringify({ rate, timestamp: Date.now() })
    );

    return rate;
  } catch (error) {
    console.error("Error fetching NGN rate, using fallback:", error);
    return DEFAULT_RATE;
  }
}

export function convertSttToNgn(sttAmount: number, usdToNgnRate: number): number {
  const usdValue = sttAmount * STT_USD_VALUE;
  return Math.round(usdValue * usdToNgnRate);
}

export function formatSttWithNgn(sttAmount: number, usdToNgnRate: number): string {
  const ngn = convertSttToNgn(sttAmount, usdToNgnRate);
  return `${sttAmount} STT (≈ ₦${ngn.toLocaleString()})`;
}
