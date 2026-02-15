"use client";

import { type IndicatorConfig } from "@/lib/bitcoin-lab/types";
import { cn } from "@/lib/utils";

interface ZoneBarProps {
  config: IndicatorConfig;
  value: number | null;
}

const STATUS_BAR_COLORS: Record<string, string> = {
  EXTREMO: "bg-green-500/60",
  FORTE: "bg-orange-500/60",
  OBSERVAÇÃO: "bg-amber-500/40",
  NORMAL: "bg-zinc-700/60",
};

export function ZoneBar({ config, value }: ZoneBarProps) {
  const zones = config.zones;

  // Calcular posição da seta (0-100%)
  const getArrowPosition = () => {
    if (value === null) return null;

    const nonNormalZones = zones.filter((z) => z.status !== "NORMAL");
    const maxThreshold = nonNormalZones[nonNormalZones.length - 1]?.threshold ?? 1;
    const range = maxThreshold * 1.5;
    const clamped = Math.max(0, Math.min(value, range));
    return (clamped / range) * 100;
  };

  const arrowPos = getArrowPosition();

  return (
    <div className="space-y-1.5">
      <div className="relative">
        {/* Barra de zonas */}
        <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
          {zones.map((zone, i) => (
            <div
              key={`${zone.status}-${zone.threshold}-${i}`}
              className={cn(
                "flex-1 transition-all",
                STATUS_BAR_COLORS[zone.status] ?? "bg-zinc-700/60",
                i === 0 && "rounded-l-full",
                i === zones.length - 1 && "rounded-r-full"
              )}
            />
          ))}
        </div>

        {/* Seta indicadora */}
        {arrowPos !== null && (
          <div
            className="absolute -top-1.5 transition-all duration-500"
            style={{ left: `${arrowPos}%`, transform: "translateX(-50%)" }}
          >
            <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-white drop-shadow-sm" />
          </div>
        )}
      </div>

      {/* Labels abaixo da barra */}
      <div className="flex text-[10px] text-muted-foreground">
        {zones.map((zone, i) => (
          <span
            key={`label-${zone.threshold}-${i}`}
            className="flex-1 text-center truncate"
          >
            {zone.label}
          </span>
        ))}
      </div>
    </div>
  );
}
