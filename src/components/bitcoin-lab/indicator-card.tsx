"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { ZoneBar } from "./zone-bar";
import { INDICATOR_CONFIGS, STATUS_COLORS } from "@/lib/bitcoin-lab/config";
import { type IndicatorValue } from "@/lib/bitcoin-lab/types";
import { cn, formatUsd } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface IndicatorCardProps {
  indicator: IndicatorValue;
  isLoading?: boolean;
}

export function IndicatorCard({ indicator, isLoading }: IndicatorCardProps) {
  const config = INDICATOR_CONFIGS.find((c) => c.id === indicator.id);
  if (!config) return null;

  const colors = STATUS_COLORS[indicator.status];

  if (isLoading) {
    return (
      <Card className="glass border-border/30">
        <CardContent className="p-5 space-y-4">
          <Skeleton className="h-6 w-24 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-10 w-24 mx-auto" />
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "glass border-border/30 transition-all duration-200 hover:border-border/50",
        indicator.status !== "NORMAL" && colors.glow && `shadow-lg ${colors.glow}`
      )}
    >
      <CardContent className="p-5 space-y-4">
        {/* Badge no topo */}
        <StatusBadge status={indicator.status} size="sm" />

        {/* Nome + descrição */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold">{config.name}</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {config.description}
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            {getSubtitle(config.id)}
          </p>
        </div>

        {/* Valor principal */}
        <div className="text-center py-2">
          <span
            className={cn(
              "text-4xl font-extrabold tabular-nums tracking-tight",
              colors.text
            )}
          >
            {indicator.value !== null
              ? indicator.value.toFixed(indicator.value >= 10 ? 2 : 3)
              : "—"}
          </span>
        </div>

        {/* Zone bar */}
        <ZoneBar config={config} value={indicator.value} />

        {/* Price levels */}
        {indicator.priceLevels.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border/20">
            {indicator.priceLevels.map((level, i) => {
              // Encontrar a zona específica pelo índice (para lidar com zonas duplicadas)
              const nonNormalZones = config.zones.filter(
                (z) => z.status !== "NORMAL"
              );
              const zoneConfig = nonNormalZones[i];
              if (!zoneConfig) return null;

              const zoneColors = STATUS_COLORS[level.zone];

              return (
                <div
                  key={`${level.zone}-${zoneConfig.threshold}-${i}`}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full flex-shrink-0",
                        zoneColors.dot
                      )}
                    />
                    <span className={cn("font-semibold", zoneColors.text)}>
                      {level.zone}
                    </span>
                    <span className="text-muted-foreground/50 text-[10px]">
                      ({zoneConfig.label})
                    </span>
                  </div>
                  <span className="text-muted-foreground tabular-nums font-medium">
                    {level.price !== null ? formatUsd(level.price) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getSubtitle(id: string): string {
  switch (id) {
    case "mvrv":
      return "Market Value / Realized Value";
    case "sth_mvrv":
      return "Short-Term Holder MVRV";
    case "mayer":
      return "Price / 200-day SMA";
    case "lth_mvrv":
      return "Long-Term Holder MVRV";
    case "lth_sopr":
      return "Long-Term Holder Profit Ratio";
    case "aviv":
      return "Active Value / Investor Value";
    case "price_realized":
      return "BTC Price vs Realized Price";
    default:
      return "";
  }
}
