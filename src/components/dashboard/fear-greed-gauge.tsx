"use client";

import { Skeleton } from "@/components/ui/skeleton";

type FearGreedGaugeProps = {
  value: number | null;
  isLoading: boolean;
};

function getLabel(value: number): { text: string; color: string } {
  if (value <= 24) return { text: "Medo Extremo", color: "#ef4444" };
  if (value <= 44) return { text: "Medo", color: "#f97316" };
  if (value <= 55) return { text: "Neutro", color: "#94a3b8" };
  if (value <= 74) return { text: "Ganância", color: "#4ade80" };
  return { text: "Ganância Extrema", color: "#22c55e" };
}

function getGaugeColor(value: number): string {
  if (value <= 24) return "#ef4444";
  if (value <= 44) return "#f97316";
  if (value <= 55) return "#94a3b8";
  if (value <= 74) return "#4ade80";
  return "#22c55e";
}

export function FearGreedGauge({ value, isLoading }: FearGreedGaugeProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-32 w-64" />
        <Skeleton className="h-5 w-24" />
      </div>
    );
  }

  const v = value ?? 50;
  const label = getLabel(v);
  const gaugeColor = getGaugeColor(v);

  // SVG semicircular gauge (mesmas dimensões do RSI)
  const cx = 120;
  const cy = 110;
  const r = 90;
  const strokeWidth = 12;

  const startAngle = Math.PI;
  const endAngle = 0;
  const totalAngle = startAngle - endAngle;

  const arcLength = r * totalAngle;

  const valueAngle = startAngle - (v / 100) * totalAngle;
  const needleX = cx + r * Math.cos(valueAngle);
  const needleY = cy - r * Math.sin(valueAngle);

  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  const filledLength = (v / 100) * arcLength;

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
          {v}
        </text>

        {/* Zone labels */}
        <text
          x={cx - r + 15}
          y={cy + 5}
          textAnchor="middle"
          className="fill-red-500 text-[9px]"
        >
          Fear
        </text>
        <text
          x={cx + r - 15}
          y={cy + 5}
          textAnchor="middle"
          className="fill-emerald-500 text-[9px]"
        >
          Greed
        </text>
      </svg>

      <div className="text-center -mt-2">
        <p className="text-sm font-semibold" style={{ color: label.color }}>
          {label.text}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Fear &amp; Greed Index
        </p>
      </div>
    </div>
  );
}
