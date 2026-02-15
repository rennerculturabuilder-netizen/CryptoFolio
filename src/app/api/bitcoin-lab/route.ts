import { apiSuccess, apiServerError } from "@/lib/api-response";
import { fetchBGeometricsData, getLastValidValue } from "@/lib/services/bgeometrics";
import { INDICATOR_CONFIGS, getIndicatorStatus } from "@/lib/bitcoin-lab/config";
import {
  type IndicatorValue,
  type PriceLevel,
  type PricePoint,
  type BitcoinLabData,
} from "@/lib/bitcoin-lab/types";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

interface CoinGeckoMarketChart {
  prices: [number, number][];
}

interface CoinGeckoSimplePrice {
  bitcoin: {
    usd: number;
    usd_24h_change: number;
  };
}

async function fetchBtcPrice(): Promise<{
  price: number;
  change24h: number;
}> {
  const res = await fetch(
    `${COINGECKO_BASE}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`
  );
  if (!res.ok) throw new Error("CoinGecko price fetch failed");
  const data: CoinGeckoSimplePrice = await res.json();
  return {
    price: data.bitcoin.usd,
    change24h: data.bitcoin.usd_24h_change,
  };
}

interface CryptoCompareDay {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CryptoCompareResponse {
  Response: string;
  Data: { Data: CryptoCompareDay[] };
}

async function fetchBtcPriceHistory(): Promise<{
  history: PricePoint[];
  sma200: number | null;
}> {
  // CryptoCompare: OHLC diário real desde 2010 (grátis, sem API key)
  // CoinGecko: 365 dias para SMA200
  const [ccRes, cgRes] = await Promise.all([
    fetch(
      "https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&allData=true"
    ),
    fetch(
      `${COINGECKO_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily`
    ),
  ]);

  if (!ccRes.ok) throw new Error("CryptoCompare fetch failed");
  const ccData: CryptoCompareResponse = await ccRes.json();
  const allDays = ccData.Data.Data;

  // Filtrar a partir de 2013 e ignorar dias sem preço — OHLC diário
  const start2013 = Date.UTC(2013, 0, 1) / 1000;
  const history: PricePoint[] = allDays
    .filter((d) => d.time >= start2013 && d.close > 0)
    .map((d) => ({
      date: new Date(d.time * 1000).toISOString().split("T")[0],
      price: d.close,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

  // SMA200 calculada com CoinGecko (365 dias diários)
  let sma200: number | null = null;
  if (cgRes.ok) {
    const chartData: CoinGeckoMarketChart = await cgRes.json();
    const dailyPrices = chartData.prices.map(([, price]) => price);
    if (dailyPrices.length >= 200) {
      const last200 = dailyPrices.slice(-200);
      sma200 = last200.reduce((sum, p) => sum + p, 0) / 200;
    }
  }

  return { history, sma200 };
}

function calculatePriceLevels(
  config: (typeof INDICATOR_CONFIGS)[number],
  currentValue: number | null,
  btcPrice: number,
  realizedPrice: number | null
): PriceLevel[] {
  // LTH SOPR não se converte em price levels (não é ratio de preço)
  if (config.id === "lth_sopr") return [];

  if (currentValue === null || currentValue === 0) {
    return config.zones
      .filter((z) => z.status !== "NORMAL")
      .map((z) => ({ zone: z.status, price: null }));
  }

  return config.zones
    .filter((z) => z.status !== "NORMAL")
    .map((z) => {
      let price: number | null = null;

      if (config.id === "price_realized" && realizedPrice) {
        // targetPrice = threshold * realizedPrice
        price = z.threshold * realizedPrice;
      } else {
        // ratio-based: threshold / currentValue * btcPrice
        price = (z.threshold / currentValue) * btcPrice;
      }

      return { zone: z.status, price };
    });
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch CoinGecko em paralelo
    const [btcData, historyData] = await Promise.all([
      fetchBtcPrice(),
      fetchBtcPriceHistory(),
    ]);

    // BGeometrics sequencial (rate limit: 8 req/hora no plano free)
    const bgeometricsConfigs = INDICATOR_CONFIGS.filter((c) => c.endpoint);
    const bgeometricsResults: Array<{
      id: string;
      data: import("@/lib/bitcoin-lab/types").BGeometricsDataPoint[];
    }> = [];

    for (const c of bgeometricsConfigs) {
      const data = await fetchBGeometricsData(
        c.endpoint!,
        c.valueKey!,
        c.dateKey
      );
      bgeometricsResults.push({ id: c.id, data });
    }

    const btcPrice = btcData.price;
    const { history, sma200 } = historyData;

    // Extrair realized price para cálculos
    const realizedPriceData = bgeometricsResults.find(
      (r) => r.id === "price_realized"
    );
    let realizedPrice: number | null = null;
    if (realizedPriceData) {
      const last = getLastValidValue(realizedPriceData.data);
      if (last) realizedPrice = last.value;
    }

    // Processar cada indicador
    const indicators: IndicatorValue[] = INDICATOR_CONFIGS.map((config) => {
      let value: number | null = null;

      if (config.id === "mayer") {
        // Calculado: preço / SMA200
        if (sma200 && sma200 > 0) {
          value = btcPrice / sma200;
        }
      } else if (config.id === "price_realized") {
        // Razão preço / preço realizado
        if (realizedPrice && realizedPrice > 0) {
          value = btcPrice / realizedPrice;
        }
      } else {
        // BGeometrics direto
        const result = bgeometricsResults.find((r) => r.id === config.id);
        if (result) {
          const last = getLastValidValue(result.data);
          if (last) value = last.value;
        }
        // AVIV vem como percentual da BGeometrics (ex: 88.5), converter pra ratio (0.885)
        if (config.id === "aviv" && value !== null) {
          value = value / 100;
        }
      }

      const status = getIndicatorStatus(config, value);
      const priceLevels = calculatePriceLevels(
        config,
        value,
        btcPrice,
        realizedPrice
      );

      return {
        id: config.id,
        value: value !== null ? Math.round(value * 1000) / 1000 : null,
        status,
        priceLevels,
      };
    });

    const responseData: BitcoinLabData = {
      btcPrice,
      btcChange24h: btcData.change24h,
      indicators,
      priceHistory: history,
      realizedPrice,
      updatedAt: new Date().toISOString(),
    };

    return apiSuccess(responseData);
  } catch (error) {
    return apiServerError(error, "GET /api/bitcoin-lab");
  }
}
