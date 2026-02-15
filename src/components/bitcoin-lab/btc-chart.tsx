"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type PricePoint, type IndicatorValue } from "@/lib/bitcoin-lab/types";
import { INDICATOR_CONFIGS, STATUS_COLORS } from "@/lib/bitcoin-lab/config";
import { StatusBadge } from "./status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  CandlestickChart,
  LineChart,
  Maximize2,
  Minimize2,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ChartMode = "candle" | "line";

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

/* ── Toolbar ── */
function ChartToolbar({
  mode,
  logScale,
  fullscreen,
  onModeChange,
  onLogToggle,
  onFullscreenToggle,
}: {
  mode: ChartMode;
  logScale: boolean;
  fullscreen: boolean;
  onModeChange: (m: ChartMode) => void;
  onLogToggle: () => void;
  onFullscreenToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2.5 gap-1.5 text-xs",
            mode === "candle"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground"
          )}
          onClick={() => onModeChange("candle")}
        >
          <CandlestickChart className="h-3.5 w-3.5" />
          Candle
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2.5 gap-1.5 text-xs",
            mode === "line"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground"
          )}
          onClick={() => onModeChange("line")}
        >
          <LineChart className="h-3.5 w-3.5" />
          Linha
        </Button>
        <div className="w-px h-5 bg-border/30 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2.5 text-xs font-mono",
            logScale
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground"
          )}
          onClick={onLogToggle}
        >
          LOG
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2.5 gap-1.5 text-xs text-muted-foreground"
        onClick={onFullscreenToggle}
      >
        {fullscreen ? (
          <>
            <Minimize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </>
        ) : (
          <>
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Expandir</span>
          </>
        )}
      </Button>
    </div>
  );
}

/* ── Legend ── */
function ChartLegend({ mode }: { mode: ChartMode }) {
  return (
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
          style={{ borderColor: mode === "candle" ? "#22c55e" : "#3b82f6" }}
        />
        <span>Preço BTC</span>
      </div>
    </div>
  );
}

/* ── Toggle Switch ── */
function Toggle({
  checked,
  onChange,
  color,
}: {
  checked: boolean;
  onChange: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-[18px] w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        checked ? (color ?? "bg-primary") : "bg-zinc-700"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[14px]" : "translate-x-0"
        )}
      />
    </button>
  );
}

/* ── Overlays Panel ── */
function OverlaysPanel({
  indicators,
  visible,
  onToggle,
}: {
  indicators: IndicatorValue[];
  visible: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const overlayIndicators = indicators.filter((ind) =>
    ind.priceLevels.some((l) => l.price !== null)
  );

  const activeCount = overlayIndicators.filter(
    (ind) => visible[ind.id] !== false
  ).length;


  return (
    <div className="hidden lg:flex flex-col rounded-xl border border-border/20 bg-card/60 w-[220px] shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/15 bg-zinc-800/30">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Overlays
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
          {activeCount}/{overlayIndicators.length} ativos
        </p>
      </div>

      {/* Indicator list */}
      <div className="flex-1 py-1">
        {overlayIndicators.map((ind) => {
          const config = INDICATOR_CONFIGS.find((c) => c.id === ind.id);
          if (!config) return null;
          const isOn = visible[ind.id] !== false;

          return (
            <div
              key={ind.id}
              className={cn(
                "flex items-center justify-between gap-2 px-4 py-2 transition-colors",
                isOn
                  ? "hover:bg-zinc-800/30"
                  : "opacity-50 hover:opacity-70"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-white/10",
                    STATUS_COLORS[ind.status].dot
                  )}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate leading-tight">
                    {config.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 tabular-nums">
                    {ind.value !== null
                      ? ind.value.toFixed(ind.value >= 10 ? 2 : 3)
                      : "—"}
                  </p>
                </div>
              </div>
              <Toggle
                checked={isOn}
                onChange={() => onToggle(ind.id)}
              />
            </div>
          );
        })}
      </div>

      {/* Footer legend */}
      <div className="px-4 py-2.5 border-t border-border/15 bg-zinc-800/20">
        <div className="grid grid-cols-2 gap-1 text-[9px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Extremo
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Forte
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Observação
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            Normal
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export function BtcChart({
  priceHistory,
  indicators,
  isLoading,
}: BtcChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<import("lightweight-charts").IChartApi | null>(null);
  const seriesRef = useRef<import("lightweight-charts").ISeriesApi<any> | null>(null);
  const priceLinesRef = useRef<import("lightweight-charts").IPriceLine[]>([]);
  const observerRef = useRef<ResizeObserver | null>(null);

  const [mode, setMode] = useState<ChartMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("btc-chart-mode") as ChartMode) || "candle";
    }
    return "candle";
  });

  const [logScale, setLogScale] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("btc-chart-log");
      return saved !== null ? saved === "true" : true; // LOG ativado por padrão
    }
    return true;
  });

  const [fullscreen, setFullscreen] = useState(false);
  const [seriesReady, setSeriesReady] = useState(0);

  // Overlay visibility — all on by default
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const toggleOverlay = (id: string) => {
    setVisible((prev) => ({
      ...prev,
      [id]: prev[id] === false ? true : false,
    }));
  };

  const toggleMode = (m: ChartMode) => {
    setMode(m);
    localStorage.setItem("btc-chart-mode", m);
  };

  const toggleLog = () => {
    setLogScale((prev) => {
      const next = !prev;
      localStorage.setItem("btc-chart-log", String(next));
      return next;
    });
  };

  // Escape to exit fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  // Build chart (does NOT depend on `visible`)
  useEffect(() => {
    const container = fullscreen
      ? fullContainerRef.current
      : containerRef.current;
    if (!container || priceHistory.length === 0) return;

    // Cleanup previous chart
    observerRef.current?.disconnect();
    chartRef.current?.remove();
    chartRef.current = null;
    seriesRef.current = null;
    priceLinesRef.current = [];

    let disposed = false;

    (async () => {
      if (disposed || !container) return;

      const lc = await import("lightweight-charts");
      if (disposed) return;

      const chart = lc.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight || 500,
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
          mode: logScale ? 1 : 0, // 1 = Logarithmic, 0 = Normal
        },
        timeScale: {
          borderColor: "rgba(255, 255, 255, 0.1)",
          timeVisible: false,
        },
        handleScroll: { vertTouchDrag: false },
      });

      chartRef.current = chart;

      // Deduplicate data
      const seen = new Set<string>();
      const points: Array<{
        time: string;
        open: number;
        high: number;
        low: number;
        close: number;
      }> = [];
      for (const p of priceHistory) {
        if (seen.has(p.date)) continue;
        seen.add(p.date);
        points.push({
          time: p.date,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
        });
      }

      let series: import("lightweight-charts").ISeriesApi<any>;

      if (mode === "candle") {
        series = chart.addSeries(lc.CandlestickSeries, {
          upColor: "#22c55e",
          downColor: "#ef4444",
          borderUpColor: "#22c55e",
          borderDownColor: "#ef4444",
          wickUpColor: "#22c55e",
          wickDownColor: "#ef4444",
        });
        series.setData(points as never);
      } else {
        series = chart.addSeries(lc.AreaSeries, {
          topColor: "rgba(59, 130, 246, 0.3)",
          bottomColor: "rgba(59, 130, 246, 0.02)",
          lineColor: "#3b82f6",
          lineWidth: 2,
        });
        const lineData = points.map((p) => ({
          time: p.time,
          value: p.close,
        }));
        series.setData(lineData as never);
      }

      seriesRef.current = series;
      setSeriesReady((n) => n + 1);
      chart.timeScale().fitContent();

      // Resize observer
      const observer = new ResizeObserver(() => {
        if (container && container.clientHeight > 0) {
          chart.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight,
          });
        }
      });
      observer.observe(container);
      observerRef.current = observer;
    })();

    return () => {
      disposed = true;
      observerRef.current?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, [priceHistory, mode, fullscreen, logScale]);

  // Manage price lines separately (no chart recreation)
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    // Remove all existing price lines
    for (const line of priceLinesRef.current) {
      series.removePriceLine(line);
    }
    priceLinesRef.current = [];

    // Add price lines for visible indicators
    for (const indicator of indicators) {
      if (visible[indicator.id] === false) continue;

      const config = INDICATOR_CONFIGS.find((c) => c.id === indicator.id);
      if (!config) continue;

      for (const level of indicator.priceLevels) {
        if (level.price === null) continue;
        const color = LINE_COLORS[level.zone] ?? "#71717a";

        const line = series.createPriceLine({
          price: level.price,
          color,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${config.name} ${level.zone}`,
        });
        priceLinesRef.current.push(line);
      }
    }
  }, [indicators, visible, seriesReady]);

  if (isLoading || priceHistory.length === 0) {
    return (
      <div className="h-[500px] w-full">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    );
  }

  return (
    <>
      {/* Normal (inline) */}
      <div
        className={cn(
          "space-y-3",
          fullscreen && "invisible h-0 overflow-hidden"
        )}
      >
        <ChartToolbar
          mode={mode}
          logScale={logScale}
          fullscreen={false}
          onModeChange={toggleMode}
          onLogToggle={toggleLog}
          onFullscreenToggle={() => setFullscreen(true)}
        />
        <div className="flex gap-4">
          <div
            ref={containerRef}
            className="h-[500px] flex-1 min-w-0 rounded-lg"
          />
          <OverlaysPanel
            indicators={indicators}
            visible={visible}
            onToggle={toggleOverlay}
          />
        </div>
        <ChartLegend mode={mode} />
      </div>

      {/* Fullscreen via Portal */}
      {fullscreen &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-background flex flex-col gap-3 p-4">
            <ChartToolbar
              mode={mode}
              logScale={logScale}
              fullscreen={true}
              onModeChange={toggleMode}
              onLogToggle={toggleLog}
              onFullscreenToggle={() => setFullscreen(false)}
            />
            <div className="flex gap-4 flex-1 min-h-0">
              <div
                ref={fullContainerRef}
                className="flex-1 min-w-0 min-h-0 rounded-lg"
              />
              <OverlaysPanel
                indicators={indicators}
                visible={visible}
                onToggle={toggleOverlay}
              />
            </div>
            <ChartLegend mode={mode} />
          </div>,
          document.body
        )}
    </>
  );
}
