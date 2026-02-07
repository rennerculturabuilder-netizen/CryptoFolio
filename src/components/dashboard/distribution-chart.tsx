"use client";

import { CHART_COLORS } from "@/lib/utils";
import type { AssetRow } from "./asset-table";

type DistributionChartProps = {
  assets: AssetRow[];
};

export function DistributionChart({ assets }: DistributionChartProps) {
  if (assets.length === 0) return null;

  // Top 7 + "Outros"
  const sorted = [...assets].sort((a, b) => b.allocationPct - a.allocationPct);
  const top = sorted.slice(0, 7);
  const othersValue = sorted.slice(7).reduce((acc, a) => acc + a.allocationPct, 0);

  const items =
    othersValue > 0
      ? [...top, { symbol: "Outros", allocationPct: othersValue } as AssetRow]
      : top;

  return (
    <div className="space-y-3">
      {/* Barra horizontal empilhada */}
      <div className="flex h-4 rounded-full overflow-hidden bg-secondary/50">
        {items.map((item, i) => (
          <div
            key={item.symbol}
            className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${Math.max(item.allocationPct, 0.5)}%`,
              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
            }}
            title={`${item.symbol}: ${item.allocationPct.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {items.map((item, i) => (
          <div key={item.symbol} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
            <span className="text-sm text-muted-foreground">
              {item.symbol}
            </span>
            <span className="text-sm font-medium">
              {item.allocationPct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
