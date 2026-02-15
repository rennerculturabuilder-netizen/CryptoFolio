"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { countActiveSignals, STATUS_COLORS, INDICATOR_CONFIGS } from "@/lib/bitcoin-lab/config";
import { type IndicatorValue, type SignalStatus } from "@/lib/bitcoin-lab/types";
import { cn, formatUsd, formatPct } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp } from "lucide-react";

interface ScoreHeaderProps {
  btcPrice: number;
  btcChange24h: number;
  indicators: IndicatorValue[];
  isLoading?: boolean;
}

function getOverallStatus(indicators: IndicatorValue[]): SignalStatus {
  const counts = countActiveSignals(indicators);
  if (counts.extremo >= 2) return "EXTREMO";
  if (counts.extremo >= 1 || counts.forte >= 3) return "FORTE";
  if (counts.forte >= 1 || counts.observacao >= 3) return "OBSERVAÇÃO";
  return "NORMAL";
}

function getScoreDescription(
  counts: ReturnType<typeof countActiveSignals>,
  status: SignalStatus,
  total: number
): string {
  if (counts.total === 0) {
    return "Nenhum indicador sinalizando fundo. Mercado em território normal.";
  }

  const parts: string[] = [];
  if (counts.extremo > 0)
    parts.push(
      `${counts.extremo} de ${total} indicador${counts.extremo > 1 ? "es" : ""} em nível EXTREMO`
    );
  if (counts.forte > 0) parts.push(`${counts.forte} em nível FORTE`);
  if (counts.observacao > 0) parts.push(`${counts.observacao} em OBSERVAÇÃO`);

  const detail = parts.join(", ");

  switch (status) {
    case "EXTREMO":
      return `${detail}. Múltiplos sinais de fundo extremo — historicamente zona de acumulação forte.`;
    case "FORTE":
      return `${detail}. Estresse significativo no mercado — se aproximando de território de fundo.`;
    case "OBSERVAÇÃO":
      return `${detail}. Sinais iniciais aparecendo — mercado esfriando, vale acompanhar.`;
    default:
      return `${detail}.`;
  }
}

export function ScoreHeader({
  btcPrice,
  btcChange24h,
  indicators,
  isLoading,
}: ScoreHeaderProps) {
  if (isLoading) {
    return (
      <Card className="glass border-border/30">
        <CardContent className="py-8 px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-2 w-64 rounded-full" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const counts = countActiveSignals(indicators);
  const overallStatus = getOverallStatus(indicators);
  const isPositive = btcChange24h >= 0;

  return (
    <Card className="glass border-border/30">
      <CardContent className="py-8 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Lado esquerdo — Score */}
          <div className="flex flex-col items-center text-center gap-3">
            {/* BTC Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl md:text-5xl font-bold tabular-nums">
                {formatUsd(btcPrice)}
              </span>
              <span
                className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  isPositive ? "text-gain" : "text-loss"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {formatPct(btcChange24h)}
              </span>
            </div>

            {/* Question */}
            <p className="text-sm uppercase tracking-widest text-muted-foreground font-medium">
              O Bitcoin está fazendo fundo?
            </p>

            {/* Score count */}
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={cn(
                  "text-5xl font-extrabold tabular-nums",
                  counts.total > 0
                    ? STATUS_COLORS[overallStatus].text
                    : "text-zinc-500"
                )}
              >
                {counts.total}
              </span>
              <span className="text-2xl text-muted-foreground font-light">
                / {indicators.length}
              </span>
            </div>

            {/* Overall badge */}
            <StatusBadge status={overallStatus} />

            {/* Signal bar */}
            <div className="flex items-center gap-1.5 mt-1">
              {indicators.map((ind) => {
                const c = STATUS_COLORS[ind.status];
                return (
                  <div
                    key={ind.id}
                    className={cn(
                      "h-2 w-8 rounded-sm transition-colors",
                      ind.status !== "NORMAL" ? c.dot : "bg-zinc-700"
                    )}
                  />
                );
              })}
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mt-1">
              {getScoreDescription(counts, overallStatus, indicators.length)}
            </p>
          </div>

          {/* Lado direito — Tabela de indicadores */}
          <div className="rounded-lg border border-border/20 bg-zinc-900/50 overflow-hidden">
            {/* Header da tabela */}
            <div className="grid grid-cols-[1fr_80px_90px] gap-2 px-4 py-2.5 border-b border-border/20 bg-zinc-800/30">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Indicador
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                Valor
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                Status
              </span>
            </div>

            {/* Rows */}
            {indicators.map((ind) => {
              const config = INDICATOR_CONFIGS.find((c) => c.id === ind.id);
              const colors = STATUS_COLORS[ind.status];
              return (
                <div
                  key={ind.id}
                  className="grid grid-cols-[1fr_80px_90px] gap-2 px-4 py-2 border-b border-border/10 last:border-b-0 hover:bg-zinc-800/20 transition-colors"
                >
                  <span className="text-xs font-medium truncate">
                    {config?.name ?? ind.id}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold tabular-nums text-right",
                      colors.text
                    )}
                  >
                    {ind.value !== null ? ind.value.toFixed(ind.value >= 10 ? 2 : 3) : "—"}
                  </span>
                  <div className="flex justify-end">
                    <StatusBadge status={ind.status} size="sm" />
                  </div>
                </div>
              );
            })}

            {/* Legenda */}
            <div className="px-4 py-2.5 bg-zinc-800/20 border-t border-border/20">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Extremo — fundo histórico
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  Forte — acumulação
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Observação — esfriando
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                  Normal — sem sinal
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
