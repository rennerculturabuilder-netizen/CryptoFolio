"use client";

import { useQuery } from "@tanstack/react-query";
import { usePortfolio } from "@/lib/hooks/use-portfolio";
import { HeroCards } from "@/components/dashboard/hero-cards";
import { AssetTable, buildAssetRows, type AssetRow } from "@/components/dashboard/asset-table";
import { DistributionChart } from "@/components/dashboard/distribution-chart";
import { RsiGauge } from "@/components/dashboard/rsi-gauge";
import { FearGreedGauge } from "@/components/dashboard/fear-greed-gauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet } from "lucide-react";
import type { PriceData } from "@/lib/services/coingecko";

type Position = {
  assetId: string;
  symbol: string;
  name: string;
  balance: string;
  totalCost: string;
  wac: string;
};

type CoingeckoResponse = {
  prices: PriceData[];
  rsi: { symbol: string; rsi: number; period: number } | null;
  fearGreed: { value: number; classification: string } | null;
};

async function fetchWac(portfolioId: string | null): Promise<Position[]> {
  if (!portfolioId) return [];
  const endpoint = portfolioId === "ALL" 
    ? "/api/portfolios/all/wac"
    : `/api/portfolios/${portfolioId}/wac`;
  const res = await fetch(endpoint);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchCoingeckoPrices(
  symbols: string[],
  rsiSymbol?: string
): Promise<CoingeckoResponse> {
  if (symbols.length === 0) return { prices: [], rsi: null, fearGreed: null };
  const rsiParam = rsiSymbol ? `&rsi=${rsiSymbol}` : "";
  const res = await fetch(
    `/api/prices/coingecko?symbols=${symbols.join(",")}${rsiParam}`
  );
  if (!res.ok) return { prices: [], rsi: null, fearGreed: null };
  return res.json();
}

export default function DashboardPage() {
  const { selectedId, selected, portfolios, isLoading: portfolioLoading } = usePortfolio();

  // Buscar posições do portfolio selecionado
  const { data: positions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ["wac", selectedId],
    queryFn: () => fetchWac(selectedId!),
    enabled: !!selectedId,
  });

  // Extrair símbolos com saldo
  const activePositions = positions.filter(
    (p) => parseFloat(p.balance) > 0
  );
  const symbols = activePositions.map((p) => p.symbol);

  // Buscar preços via CoinGecko (com RSI do BTC como default)
  const primarySymbol =
    symbols.includes("BTC") ? "BTC" : symbols[0] || "BTC";

  const { data: coingeckoData, isLoading: pricesLoading } = useQuery({
    queryKey: ["coingecko-prices", symbols.join(","), primarySymbol],
    queryFn: () => fetchCoingeckoPrices(symbols.length > 0 ? symbols : ["BTC"], primarySymbol),
    enabled: true,
    staleTime: 60_000,
    refetchInterval: 60_000, // refresh a cada 60s
  });

  const priceMap: Record<string, PriceData> = {};
  for (const p of coingeckoData?.prices || []) {
    priceMap[p.symbol] = p;
  }

  // Build asset rows
  const assetRows: AssetRow[] = buildAssetRows(activePositions, priceMap);

  // Calcular totais
  const totalValue = assetRows.reduce((acc, a) => acc + a.value, 0);
  const totalCost = assetRows.reduce((acc, a) => acc + a.totalCost, 0);
  const pnl = totalValue - totalCost;
  const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

  // Sparkline: usar o sparkline7d do ativo principal (BTC) ou o de maior valor
  const primaryAsset = priceMap[primarySymbol];
  const sparklineData = primaryAsset?.sparkline7d || [];

  const isLoading = portfolioLoading || positionsLoading || pricesLoading;

  // Se não tem nenhum portfolio
  if (!portfolioLoading && portfolios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <Wallet className="h-16 w-16 mb-4 opacity-30" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Nenhum portfolio encontrado
        </h2>
        <p className="text-sm">
          Crie seu primeiro portfolio usando o botão no topo da página.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {selectedId === "ALL" 
            ? "Todas as Carteiras" 
            : selected 
            ? selected.name 
            : "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {selectedId === "ALL"
            ? "Visão consolidada de todos os seus portfolios"
            : "Visão geral do seu portfolio"}
        </p>
      </div>

      {/* Hero Cards */}
      <HeroCards
        totalValue={totalValue}
        totalCost={totalCost}
        pnl={pnl}
        pnlPct={pnlPct}
        sparklineData={sparklineData}
        isLoading={isLoading}
      />

      {/* RSI + Fear & Greed + Distribuição (horizontal) */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* RSI Gauge */}
        <Card className="glass border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              RSI Index
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex justify-center">
            <RsiGauge
              value={coingeckoData?.rsi?.rsi ?? null}
              symbol={primarySymbol}
              isLoading={pricesLoading}
            />
          </CardContent>
        </Card>

        {/* Fear & Greed Index */}
        <Card className="glass border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Fear &amp; Greed Index
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex justify-center">
            <FearGreedGauge
              value={coingeckoData?.fearGreed?.value ?? null}
              isLoading={pricesLoading}
            />
          </CardContent>
        </Card>

        {/* Distribuição */}
        <Card className="glass border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Distribuição
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded-full" />
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ) : (
              <DistributionChart assets={assetRows} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Ativos (full width) */}
      <Card className="glass border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Ativos</span>
            {!isLoading && (
              <span className="text-sm text-muted-foreground font-normal">
                {assetRows.length} ativo{assetRows.length !== 1 ? "s" : ""}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <AssetTable assets={assetRows} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
