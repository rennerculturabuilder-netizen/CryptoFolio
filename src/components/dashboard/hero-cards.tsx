"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUsd, formatPct } from "@/lib/utils";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { DollarSign, TrendingUp, BarChart3 } from "lucide-react";

type HeroCardsProps = {
  totalValue: number;
  totalCost: number;
  pnl: number;
  pnlPct: number;
  sparklineData: number[];
  isLoading: boolean;
};

function MiniSparkline({
  data,
  color,
}: {
  data: number[];
  color: string;
}) {
  if (data.length < 2) return null;

  // Simplificar pra ~30 pontos
  const step = Math.max(1, Math.floor(data.length / 30));
  const points = data
    .filter((_, i) => i % step === 0)
    .map((value, i) => ({ i, value }));

  return (
    <ResponsiveContainer width="100%" height={50}>
      <LineChart data={points}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HeroCards({
  totalValue,
  totalCost,
  pnl,
  pnlPct,
  sparklineData,
  isLoading,
}: HeroCardsProps) {
  const isPositive = pnl >= 0;
  const pnlColor = isPositive ? "#34d399" : "#f87171";
  const sparkColor = isPositive ? "#34d399" : "#f87171";

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      {/* Balance Card */}
      <Card className="glass border-border/30 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">
                Saldo Total
              </span>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <p className="text-3xl font-bold tracking-tight">
              {formatUsd(totalValue)}
            </p>
          )}
          <div className="mt-3 h-[50px] -mx-2">
            <MiniSparkline data={sparklineData} color="hsl(199, 89%, 48%)" />
          </div>
        </CardContent>
      </Card>

      {/* Valuation Card */}
      <Card className="glass border-border/30 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-chart-purple/10 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-chart-purple" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">
                Custo Investido
              </span>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <p className="text-3xl font-bold tracking-tight">
              {formatUsd(totalCost)}
            </p>
          )}
          <div className="mt-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Base de custo total</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gain Card */}
      <Card
        className={`glass border-border/30 overflow-hidden ${
          isPositive ? "glow-green" : "glow-red"
        }`}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  isPositive ? "bg-emerald-400/10" : "bg-red-400/10"
                }`}
              >
                <TrendingUp
                  className={`h-4 w-4 ${
                    isPositive ? "text-emerald-400" : "text-red-400"
                  }`}
                />
              </div>
              <span className="text-sm text-muted-foreground font-medium">
                Lucro / Perda
              </span>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <>
              <p
                className="text-3xl font-bold tracking-tight"
                style={{ color: pnlColor }}
              >
                {formatUsd(pnl)}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className="text-sm font-semibold px-2 py-0.5 rounded-md"
                  style={{
                    color: pnlColor,
                    backgroundColor: isPositive
                      ? "rgba(52,211,153,0.1)"
                      : "rgba(248,113,113,0.1)",
                  }}
                >
                  {formatPct(pnlPct)}
                </span>
                <div className="flex-1 h-[50px]">
                  <MiniSparkline data={sparklineData} color={sparkColor} />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
