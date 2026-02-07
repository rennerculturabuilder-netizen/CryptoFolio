const SYMBOL_TO_COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  NEAR: "near",
  ARB: "arbitrum",
  OP: "optimism",
  APT: "aptos",
  SUI: "sui",
  SEI: "sei-network",
  TIA: "celestia",
  INJ: "injective-protocol",
  FET: "fetch-ai",
  RENDER: "render-token",
  PEPE: "pepe",
  WIF: "dogwifcoin",
  BONK: "bonk",
  SHIB: "shiba-inu",
};

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

function getCoingeckoId(symbol: string): string | null {
  return SYMBOL_TO_COINGECKO[symbol.toUpperCase()] || null;
}

export type PriceData = {
  symbol: string;
  price: number;
  change24h: number;
  changePct24h: number;
  marketCap: number;
  volume24h: number;
  sparkline7d: number[];
};

export type RsiData = {
  symbol: string;
  rsi: number;
  period: number;
};

/**
 * Busca preços atuais de múltiplos símbolos via CoinGecko
 */
export async function fetchPrices(symbols: string[]): Promise<PriceData[]> {
  const ids = symbols
    .map((s) => ({ symbol: s.toUpperCase(), id: getCoingeckoId(s) }))
    .filter((x) => x.id !== null);

  if (ids.length === 0) return [];

  const idString = ids.map((x) => x.id).join(",");
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${idString}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`;

  const res = await fetch(url, {
    next: { revalidate: 60 }, // cache 60s no Next.js
  });

  if (!res.ok) {
    console.error(`CoinGecko API error: ${res.status}`);
    return [];
  }

  const data = await res.json();

  // Map back to our symbols
  const idToSymbol = new Map(ids.map((x) => [x.id, x.symbol]));

  return data.map((coin: Record<string, unknown>) => ({
    symbol: idToSymbol.get(coin.id as string) || (coin.symbol as string).toUpperCase(),
    price: coin.current_price as number || 0,
    change24h: coin.price_change_24h as number || 0,
    changePct24h: coin.price_change_percentage_24h as number || 0,
    marketCap: coin.market_cap as number || 0,
    volume24h: coin.total_volume as number || 0,
    sparkline7d: (coin.sparkline_in_7d as { price: number[] })?.price || [],
  }));
}

/**
 * Busca preços simples (só preço) — mais leve
 */
export async function fetchSimplePrices(
  symbols: string[]
): Promise<Record<string, number>> {
  const ids = symbols
    .map((s) => ({ symbol: s.toUpperCase(), id: getCoingeckoId(s) }))
    .filter((x) => x.id !== null);

  if (ids.length === 0) return {};

  const idString = ids.map((x) => x.id).join(",");
  const url = `${COINGECKO_BASE}/simple/price?ids=${idString}&vs_currencies=usd`;

  const res = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!res.ok) return {};

  const data = await res.json();
  const result: Record<string, number> = {};
  const idToSymbol = new Map(ids.map((x) => [x.id!, x.symbol]));

  for (const [id, prices] of Object.entries(data)) {
    const symbol = idToSymbol.get(id);
    if (symbol) {
      result[symbol] = (prices as { usd: number }).usd;
    }
  }

  return result;
}

/**
 * Calcula RSI a partir de dados de mercado (14 períodos)
 */
export function calculateRsi(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50; // neutral fallback

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Pega os últimos `period` changes
  const recentChanges = changes.slice(-period);

  let avgGain = 0;
  let avgLoss = 0;

  for (const change of recentChanges) {
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Busca dados OHLC para cálculo de RSI via CoinGecko
 */
export async function fetchRsi(
  symbol: string,
  period = 14
): Promise<RsiData | null> {
  const id = getCoingeckoId(symbol);
  if (!id) return null;

  // Buscar 30 dias de dados pra ter margem pro cálculo
  const url = `${COINGECKO_BASE}/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`;

  const res = await fetch(url, {
    next: { revalidate: 300 }, // cache 5min
  });

  if (!res.ok) return null;

  const data = await res.json();
  const closePrices: number[] = data.prices.map(
    (p: [number, number]) => p[1]
  );

  const rsi = calculateRsi(closePrices, period);

  return { symbol: symbol.toUpperCase(), rsi, period };
}

export { getCoingeckoId, SYMBOL_TO_COINGECKO };
