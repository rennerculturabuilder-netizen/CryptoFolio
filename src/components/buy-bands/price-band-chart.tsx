"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  ComposedChart,
  Area,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatPrice } from "@/lib/utils";

type Asset = { id: string; symbol: string; name: string };
type BuyBand = {
  id: string;
  targetPrice: string;
  quantity: string;
  order: number;
  asset: Asset;
};

type PriceData = {
  symbol: string;
  price: number;
  sparkline7d: number[];
};

const ZONE_COLORS: Record<number, string> = {
  1: "#34d399", // emerald
  2: "#facc15", // yellow
  3: "#fb923c", // orange
};

function getZoneColor(order: number): string {
  return ZONE_COLORS[order] || "#f87171"; // red fallback
}

export function PriceBandChart({
  bands,
  prices,
}: {
  bands: BuyBand[];
  prices: Record<string, number>;
}) {
  // Agrupar bands por asset
  const groupedByAsset = useMemo(() => {
    const groups = new Map<string, BuyBand[]>();
    for (const band of bands) {
      const symbol = band.asset.symbol;
      if (!groups.has(symbol)) groups.set(symbol, []);
      groups.get(symbol)!.push(band);
    }
    return groups;
  }, [bands]);

  const symbols = useMemo(
    () => Array.from(groupedByAsset.keys()),
    [groupedByAsset]
  );

  // Buscar sparkline data
  const { data: sparklineData = [] } = useQuery<PriceData[]>({
    queryKey: ["sparkline", symbols.join(",")],
    queryFn: async () => {
      if (symbols.length === 0) return [];
      const res = await fetch(
        `/api/prices/coingecko?symbols=${symbols.join(",")}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.prices || [];
    },
    enabled: symbols.length > 0,
    refetchInterval: 300000, // 5min
  });

  const sparklineMap = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const item of sparklineData) {
      if (item.sparkline7d?.length > 0) {
        map.set(item.symbol, item.sparkline7d);
      }
    }
    return map;
  }, [sparklineData]);

  if (symbols.length === 0) return null;

  return (
    <div className="space-y-4">
      {symbols.map((symbol) => {
        const assetBands = groupedByAsset.get(symbol) || [];
        const sparkline = sparklineMap.get(symbol);
        const currentPrice = prices[symbol];

        if (!sparkline || sparkline.length === 0) return null;

        // Preparar dados do chart
        const step = Math.max(1, Math.floor(sparkline.length / 168)); // ~168 pontos (7d * 24h)
        const chartData = sparkline
          .filter((_, i) => i % step === 0 || i === sparkline.length - 1)
          .map((price, i) => ({
            idx: i,
            price,
          }));

        // Calcular range do Y axis para incluir bands
        const allPrices = [
          ...chartData.map((d) => d.price),
          ...assetBands.map((b) => parseFloat(b.targetPrice)),
        ];
        const minPrice = Math.min(...allPrices) * 0.98;
        const maxPrice = Math.max(...allPrices) * 1.02;

        return (
          <Card key={symbol} className="glass border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{symbol} — Zonas de Compra</h3>
                {currentPrice && (
                  <span className="text-sm font-mono text-muted-foreground">
                    Atual: {formatPrice(currentPrice)}
                  </span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="idx" hide />
                  <YAxis
                    domain={[minPrice, maxPrice]}
                    hide
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
                          <span className="font-mono">
                            {formatPrice(payload[0].value as number)}
                          </span>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(199, 89%, 48%)"
                    strokeWidth={1.5}
                    fill={`url(#grad-${symbol})`}
                  />
                  {/* Reference lines para cada buy band */}
                  {assetBands.map((band) => (
                    <ReferenceLine
                      key={band.id}
                      y={parseFloat(band.targetPrice)}
                      stroke={getZoneColor(band.order)}
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Zone ${band.order} — ${formatPrice(parseFloat(band.targetPrice))}`,
                        position: "right",
                        fill: getZoneColor(band.order),
                        fontSize: 11,
                      }}
                    />
                  ))}
                  {/* Linha do preço atual */}
                  {currentPrice && (
                    <ReferenceLine
                      y={currentPrice}
                      stroke="hsl(262, 83%, 58%)"
                      strokeDasharray="2 2"
                      strokeWidth={1}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
              {/* Legenda */}
              <div className="flex flex-wrap gap-3 mt-2">
                {assetBands
                  .sort((a, b) => a.order - b.order)
                  .map((band) => {
                    const target = parseFloat(band.targetPrice);
                    const dist = currentPrice
                      ? ((currentPrice - target) / target) * 100
                      : null;
                    return (
                      <div
                        key={band.id}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: getZoneColor(band.order) }}
                        />
                        <span className="text-muted-foreground">
                          Zone {band.order}: {formatPrice(target)}
                          {dist !== null && (
                            <span
                              className={`ml-1 ${
                                dist <= 0
                                  ? "text-emerald-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              ({dist > 0 ? "+" : ""}
                              {dist.toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
