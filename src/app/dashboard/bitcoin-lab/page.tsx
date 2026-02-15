"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreHeader } from "@/components/bitcoin-lab/score-header";
import { IndicatorGrid } from "@/components/bitcoin-lab/indicator-grid";
import { BtcChart } from "@/components/bitcoin-lab/btc-chart";
import { type BitcoinLabData } from "@/lib/bitcoin-lab/types";
import { TrendingDown, TrendingUp } from "lucide-react";

async function fetchBitcoinLab(): Promise<BitcoinLabData> {
  const res = await fetch("/api/bitcoin-lab");
  if (!res.ok) throw new Error("Falha ao carregar dados do Bitcoin Lab");
  return res.json();
}

export default function BitcoinLabPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["bitcoin-lab"],
    queryFn: fetchBitcoinLab,
    staleTime: 300_000,
    refetchInterval: 300_000,
  });

  const indicators = data?.indicators ?? [];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Score Header */}
      <ScoreHeader
        btcPrice={data?.btcPrice ?? 0}
        btcChange24h={data?.btcChange24h ?? 0}
        indicators={indicators}
        isLoading={isLoading}
      />

      {/* Tabs */}
      <Tabs defaultValue="bottom">
        <TabsList>
          <TabsTrigger value="bottom" className="gap-1.5">
            <TrendingDown className="h-3.5 w-3.5" />
            Sinais de Fundo
          </TabsTrigger>
          <TabsTrigger value="top" disabled className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Sinais de Topo (em breve)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bottom" className="space-y-6 mt-4">
          {/* Chart */}
          <Card className="glass border-border/30">
            <CardContent className="p-4 md:p-6">
              <div className="space-y-1 mb-4">
                <h2 className="text-base font-bold">
                  BTC Price & On-Chain Signal Levels
                </h2>
                <p className="text-xs text-muted-foreground/60">
                  Linhas tracejadas mostram onde o preço BTC ativaria cada zona
                  de indicador
                </p>
              </div>
              <BtcChart
                priceHistory={data?.priceHistory ?? []}
                indicators={indicators}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          {/* Indicator Grid */}
          <IndicatorGrid indicators={indicators} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
