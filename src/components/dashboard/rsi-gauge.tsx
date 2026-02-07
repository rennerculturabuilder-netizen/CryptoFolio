"use client";

import { Skeleton } from "@/components/ui/skeleton";

type RsiGaugeProps = {
  value: number | null;
  symbol: string;
  isLoading: boolean;
};

function getRsiLabel(rsi: number): { text: string; color: string } {
  if (rsi <= 20) return { text: "Muito Sobrevendido", color: "#22c55e" };
  if (rsi <= 30) return { text: "Sobrevendido", color: "#4ade80" };
  if (rsi <= 45) return { text: "Baixo", color: "#86efac" };
  if (rsi <= 55) return { text: "Neutro", color: "#94a3b8" };
  if (rsi <= 70) return { text: "Alto", color: "#fbbf24" };
  if (rsi <= 80) return { text: "Sobrecomprado", color: "#f97316" };
  return { text: "Muito Sobrecomprado", color: "#ef4444" };
}

function getGaugeColor(rsi: number): string {
  if (rsi <= 30) return "#22c55e";
  if (rsi <= 45) return "#4ade80";
  if (rsi <= 55) return "#94a3b8";
  if (rsi <= 70) return "#fbbf24";
  return "#ef4444";
}

export function RsiGauge({ value, symbol, isLoading }: RsiGaugeProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-32 w-64" />
        <Skeleton className="h-5 w-24" />
      </div>
    );
  }

  const rsi = value ?? 50;
  const label = getRsiLabel(rsi);
  const gaugeColor = getGaugeColor(rsi);

  // SVG semicircular gauge
  const cx = 120;
  const cy = 110;
  const r = 90;
  const strokeWidth = 12;

  // Arco de 180° (π) — de 180° a 0° (esquerda pra direita)
  const startAngle = Math.PI; // 180°
  const endAngle = 0; // 0°
  const totalAngle = startAngle - endAngle;

  // Circunferência do arco
  const arcLength = r * totalAngle;

  // Posição do valor (0-100 mapeado no arco)
  const valueAngle = startAngle - (rsi / 100) * totalAngle;
  const needleX = cx + r * Math.cos(valueAngle);
  const needleY = cy - r * Math.sin(valueAngle);

  // Arco path
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  // Calcular dasharray pra mostrar progresso
  const filledLength = (rsi / 100) * arcLength;

  return (
    <div className="flex flex-col items-center">
      <svg
        width="240"
        height="140"
        viewBox="0 0 240 140"
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Colored arc (progress) */}
        <path
          d={arcPath}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${arcLength}`}
          style={{
            transition: "stroke-dasharray 0.8s ease-out, stroke 0.3s",
          }}
        />

        {/* Needle dot */}
        <circle
          cx={needleX}
          cy={needleY}
          r={6}
          fill={gaugeColor}
          stroke="hsl(var(--background))"
          strokeWidth={2}
          style={{ transition: "cx 0.8s ease-out, cy 0.8s ease-out" }}
        />

        {/* Scale labels */}
        <text
          x={cx - r - 5}
          y={cy + 20}
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
        >
          0
        </text>
        <text
          x={cx}
          y={cy - r + 5}
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
        >
          50
        </text>
        <text
          x={cx + r + 5}
          y={cy + 20}
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
        >
          100
        </text>

        {/* Value */}
        <text
          x={cx}
          y={cy - 5}
          textAnchor="middle"
          className="text-3xl font-bold"
          fill={gaugeColor}
        >
          {rsi.toFixed(1)}
        </text>

        {/* Zone labels */}
        <text
          x={cx - r + 15}
          y={cy + 5}
          textAnchor="middle"
          className="fill-emerald-500 text-[9px]"
        >
          OV
        </text>
        <text
          x={cx + r - 15}
          y={cy + 5}
          textAnchor="middle"
          className="fill-red-500 text-[9px]"
        >
          OC
        </text>
      </svg>

      <div className="text-center -mt-2">
        <p className="text-sm font-semibold" style={{ color: label.color }}>
          {label.text}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          RSI 14 — {symbol}
        </p>
      </div>
    </div>
  );
}
