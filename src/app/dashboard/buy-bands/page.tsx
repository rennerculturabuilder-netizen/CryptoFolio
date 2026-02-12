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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">DCA Adaptativo</h1>
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
