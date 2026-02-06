"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PositionsTab } from "@/components/portfolio/positions-tab";
import { TransactionsTab } from "@/components/portfolio/transactions-tab";
import { BuyBandsTab } from "@/components/portfolio/buy-bands-tab";
import { MovingAveragesTab } from "@/components/portfolio/moving-averages-tab";
import { ArrowLeft, History } from "lucide-react";

type Asset = { id: string; symbol: string; name: string };
type Portfolio = { id: string; name: string; baseFiat: string };
type Position = { assetId: string; symbol: string; name: string; balance: string; totalCost: string; wac: string };
type Transaction = {
  id: string; type: string; timestamp: string; venue?: string; notes?: string;
  baseAsset?: Asset | null; baseQty?: string;
  quoteAsset?: Asset | null; quoteQty?: string;
  price?: string; feeAsset?: Asset | null; feeQty?: string;
  costBasisUsd?: string; valueUsd?: string;
};
type BuyBand = {
  id: string; targetPrice: string; quantity: string; executed: boolean;
  order: number; asset: Asset;
};
type PriceLookup = Record<string, number>;

export default function PortfolioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: portfolio, isLoading: loadingPortfolio } = useQuery<Portfolio>({
    queryKey: ["portfolio", id],
    queryFn: async () => {
      const res = await fetch(`/api/portfolios/${id}`);
      if (!res.ok) throw new Error("Portfolio não encontrado");
      return res.json();
    },
  });

  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ["positions", id],
    queryFn: async () => {
      const res = await fetch(`/api/portfolios/${id}/wac`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["transactions", id],
    queryFn: async () => {
      const res = await fetch(`/api/portfolios/${id}/transactions`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: buyBands = [] } = useQuery<BuyBand[]>({
    queryKey: ["buyBands", id],
    queryFn: async () => {
      const res = await fetch(`/api/portfolios/${id}/buy-bands`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["assets"],
    queryFn: async () => {
      const res = await fetch("/api/assets");
      return res.json();
    },
  });

  const activeSymbols = positions
    .filter((p) => parseFloat(p.balance) > 0)
    .map((p) => p.symbol);

  const { data: prices = {} } = useQuery<PriceLookup>({
    queryKey: ["prices", activeSymbols.join(",")],
    queryFn: async () => {
      if (activeSymbols.length === 0) return {};
      const res = await fetch(`/api/prices/latest?symbols=${activeSymbols.join(",")}`);
      const data = await res.json();
      const lookup: PriceLookup = {};
      if (Array.isArray(data)) {
        for (const p of data) lookup[p.symbol] = parseFloat(p.price);
      }
      return lookup;
    },
    enabled: activeSymbols.length > 0,
  });

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ["positions", id] });
    queryClient.invalidateQueries({ queryKey: ["transactions", id] });
    queryClient.invalidateQueries({ queryKey: ["buyBands", id] });
    queryClient.invalidateQueries({ queryKey: ["prices"] });
  }

  if (loadingPortfolio) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive text-lg font-medium">Portfolio não encontrado</p>
        <Link href="/dashboard">
          <Button variant="link" className="mt-2">Voltar ao Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </Link>
          <h1 className="text-xl font-bold">{portfolio.name}</h1>
          <Badge variant="outline">{portfolio.baseFiat}</Badge>
        </div>
        <Link href={`/dashboard/portfolio/${id}/history`}>
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-1" /> Histórico
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="positions">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="positions">Posições</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="buyBands">Buy Bands</TabsTrigger>
          <TabsTrigger value="mas">Médias Móveis</TabsTrigger>
        </TabsList>

        <TabsContent value="positions">
          <PositionsTab positions={positions} prices={prices} />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsTab
            portfolioId={id}
            transactions={transactions}
            assets={assets}
            onRefresh={refreshAll}
          />
        </TabsContent>

        <TabsContent value="buyBands">
          <BuyBandsTab
            portfolioId={id}
            buyBands={buyBands}
            assets={assets}
            onRefresh={refreshAll}
          />
        </TabsContent>

        <TabsContent value="mas">
          <MovingAveragesTab assets={assets} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
