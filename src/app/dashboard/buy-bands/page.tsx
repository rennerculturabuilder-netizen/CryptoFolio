"use client";

import { DcaStrategyPanelV2 } from "@/components/dca/dca-strategy-panel-v2";
import { usePortfolio } from "@/lib/hooks/use-portfolio";
import { Target } from "lucide-react";

export default function BuyBandsPage() {
  const { selectedId } = usePortfolio();

  // Se "Todas as Carteiras" está selecionado, mostrar mensagem
  if (selectedId === "ALL") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground animate-slide-up">
        <Target className="h-16 w-16 mb-4 opacity-30" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          DCA requer carteira individual
        </h2>
        <p className="text-sm text-center max-w-md">
          Selecione uma carteira individualmente para planejar suas entradas de Dollar Cost Average.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DCA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zonas de compra configuradas automaticamente
          </p>
        </div>
      </div>

      {/* DCA Adaptativo */}
      {selectedId && (
        <DcaStrategyPanelV2
          portfolioId={selectedId}
        />
      )}
    </div>
  );
}
