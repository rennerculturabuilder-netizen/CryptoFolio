"use client";

import { IndicatorCard } from "./indicator-card";
import { type IndicatorValue } from "@/lib/bitcoin-lab/types";

interface IndicatorGridProps {
  indicators: IndicatorValue[];
  isLoading?: boolean;
}

export function IndicatorGrid({ indicators, isLoading }: IndicatorGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 stagger-children">
        {Array.from({ length: 7 }).map((_, i) => (
          <IndicatorCard
            key={i}
            indicator={{ id: "", value: null, status: "NORMAL", priceLevels: [] }}
            isLoading
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 stagger-children">
      {indicators.map((indicator) => (
        <IndicatorCard key={indicator.id} indicator={indicator} />
      ))}
    </div>
  );
}
