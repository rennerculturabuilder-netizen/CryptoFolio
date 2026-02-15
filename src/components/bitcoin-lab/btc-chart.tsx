"use client";

import { useEffect, useRef } from "react";
import { type PricePoint, type IndicatorValue } from "@/lib/bitcoin-lab/types";
import { INDICATOR_CONFIGS } from "@/lib/bitcoin-lab/config";
import { Skeleton } from "@/components/ui/skeleton";

interface BtcChartProps {
  priceHistory: PricePoint[];
  indicators: IndicatorValue[];
  isLoading?: boolean;
}

const LINE_COLORS: Record<string, string> = {
  EXTREMO: "#22c55e",
  FORTE: "#f97316",
  OBSERVAÇÃO: "#f59e0b",
};

export function BtcChart({ priceHistory, indicators, isLoading }: BtcChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!containerRef.current || priceHistory.length === 0) return;

    // Prevent double init in strict mode
    if (initialized.current) return;
    initialized.current = true;

    let chart: import("lightweight-charts").IChartApi;
    let observer: ResizeObserver;

    (async () => {
      const container = containerRef.current;
      if (!container) return;

      const lc = await import("lightweight-charts");

      chart = lc.createChart(container, {
        width: container.clientWidth,
        height: 500,
        layout: {
          background: { type: lc.ColorType.Solid, color: "transparent" },
          textColor: "#a1a1aa",
          fontFamily: "inherit",
        },
        grid: {
          vertLines: { color: "rgba(255, 255, 255, 0.04)" },
          horzLines: { color: "rgba(255, 255, 255, 0.04)" },
        },
        crosshair: {
          vertLine: {
            color: "rgba(255, 255, 255, 0.2)",
            labelBackgroundColor: "#27272a",
          },
          horzLine: {
            color: "rgba(255, 255, 255, 0.2)",
            labelBackgroundColor: "#27272a",
          },
        },
        rightPriceScale: {
          borderColor: "rgba(255, 255, 255, 0.1)",
        },
        timeScale: {
          borderColor: "rgba(255, 255, 255, 0.1)",
          timeVisible: false,
        },
        handleScroll: { vertTouchDrag: false },
      });

      const series = chart.addSeries(lc.CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });

      // Usar dados OHLC reais da API
      const seen = new Set<string>();
      const candles: Array<{
        time: string;
        open: number;
        high: number;
        low: number;
        close: number;
      }> = [];
      for (const p of priceHistory) {
        if (seen.has(p.date)) continue;
        seen.add(p.date);
        candles.push({
          time: p.date,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
        });
      }
      series.setData(candles as never);

      // Add price lines for all indicators
      for (const indicator of indicators) {
        const config = INDICATOR_CONFIGS.find((c) => c.id === indicator.id);
        if (!config) continue;

        for (const level of indicator.priceLevels) {
          if (level.price === null) continue;
          const color = LINE_COLORS[level.zone] ?? "#71717a";

          series.createPriceLine({
            price: level.price,
            color,
            lineWidth: 1,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: `${config.name} ${level.zone}`,
          });
        }
      }

      chart.timeScale().fitContent();

      // Resize observer
      observer = new ResizeObserver(() => {
        if (container) {
          chart.applyOptions({ width: container.clientWidth });
        }
      });
      observer.observe(container);
    })();

    return () => {
      observer?.disconnect();
      chart?.remove();
      initialized.current = false;
    };
    // Re-run when data changes
  }, [priceHistory, indicators]);

  if (isLoading || priceHistory.length === 0) {
    return (
      <div className="h-[500px] w-full">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="h-[500px] w-full rounded-lg" />
      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0 border-t-2 border-dashed border-green-500" />
          <span>Extremo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0 border-t-2 border-dashed border-orange-500" />
          <span>Forte</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0 border-t-2 border-dashed border-amber-500" />
          <span>Observação</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-0 border-t-2 border-solid"
            style={{ borderColor: "hsl(199, 89%, 48%)" }}
          />
          <span>Preço BTC</span>
        </div>
      </div>
    </div>
  );
}
