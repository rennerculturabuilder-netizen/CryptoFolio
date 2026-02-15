import { type BGeometricsDataPoint } from "@/lib/bitcoin-lab/types";

const BASE_URL = "https://bitcoin-data.com/v1";
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

interface CacheEntry {
  data: BGeometricsDataPoint[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Busca dados on-chain da API BGeometrics (bitcoin-data.com).
 * Cada endpoint retorna campos com nomes diferentes:
 *   /v1/mvrv → { d, mvrv }
 *   /v1/sth-mvrv → { d, sthMvrv }
 *   /v1/realized-price → { theDay, realizedPrice }
 */
export async function fetchBGeometricsData(
  endpoint: string,
  valueKey: string,
  dateKey = "d"
): Promise<BGeometricsDataPoint[]> {
  const cacheKey = endpoint;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const url = `${BASE_URL}/${endpoint}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    console.error(`[BGeometrics] Falha ao buscar ${endpoint}: ${res.status}`);
    return cached?.data ?? [];
  }

  const raw: unknown = await res.json();

  let data: BGeometricsDataPoint[] = [];

  if (Array.isArray(raw)) {
    data = raw
      .map((item: Record<string, unknown>) => {
        const d = String(item[dateKey] ?? "");
        const v = Number(item[valueKey] ?? NaN);
        return { d, v };
      })
      .filter((p) => p.d && !isNaN(p.v));
  }

  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

export function getLastValidValue(
  data: BGeometricsDataPoint[]
): { value: number; date: string } | null {
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].v != null && !isNaN(data[i].v) && data[i].v !== 0) {
      return { value: data[i].v, date: data[i].d };
    }
  }
  return null;
}
