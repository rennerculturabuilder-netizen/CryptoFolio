"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TradingViewWidget } from "@/components/tradingview-widget";
import { Plus, Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatUsd, formatPct } from "@/lib/utils";

type Portfolio = {
  id: string;
  name: string;
  baseFiat: string;
  createdAt: string;
};

type Position = {
  assetId: string;
  symbol: string;
  balance: string;
  totalCost: string;
  wac: string;
};

type PriceLookup = Record<string, number>;

async function fetchPortfolios(): Promise<Portfolio[]> {
  const res = await fetch("/api/portfolios");
  return res.json();
}

async function fetchWac(id: string): Promise<Position[]> {
  const res = await fetch(`/api/portfolios/${id}/wac`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchPrices(symbols: string[]): Promise<PriceLookup> {
  if (symbols.length === 0) return {};
  const res = await fetch(`/api/prices/latest?symbols=${symbols.join(",")}`);
  const data = await res.json();
  const lookup: PriceLookup = {};
  if (Array.isArray(data)) {
    for (const p of data) {
      lookup[p.symbol] = parseFloat(p.price);
    }
  }
  return lookup;
}

type PortfolioSummary = {
  totalValue: number;
  totalCost: number;
  pnl: number;
  pnlPct: number;
  assetCount: number;
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFiat, setNewFiat] = useState("USD");

  const { data: portfolios = [], isLoading } = useQuery({
    queryKey: ["portfolios"],
    queryFn: fetchPortfolios,
  });

  const { data: summaries = {} } = useQuery({
    queryKey: ["portfolio-summaries", portfolios.map((p) => p.id).join(",")],
    queryFn: async () => {
      if (portfolios.length === 0) return {};

      const allPositions: Record<string, Position[]> = {};
      const symbolSet = new Set<string>();

      await Promise.all(
        portfolios.map(async (p) => {
          const positions = await fetchWac(p.id);
          allPositions[p.id] = positions;
          positions.forEach((pos) => {
            if (parseFloat(pos.balance) > 0) symbolSet.add(pos.symbol);
          });
        })
      );

      const prices = await fetchPrices(Array.from(symbolSet));

      const result: Record<string, PortfolioSummary> = {};
      for (const p of portfolios) {
        const positions = allPositions[p.id] || [];
        const active = positions.filter((pos) => parseFloat(pos.balance) > 0);
        let totalValue = 0;
        let totalCost = 0;

        for (const pos of active) {
          const bal = parseFloat(pos.balance);
          const cost = parseFloat(pos.totalCost);
          const price = prices[pos.symbol] || 0;
          totalValue += bal * price;
          totalCost += cost;
        }

        const pnl = totalValue - totalCost;
        const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

        result[p.id] = {
          totalValue,
          totalCost,
          pnl,
          pnlPct,
          assetCount: active.length,
        };
      }
      return result;
    },
    enabled: portfolios.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, baseFiat: newFiat }),
      });
      if (!res.ok) throw new Error("Erro ao criar portfolio");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      setNewName("");
      setNewFiat("USD");
      setDialogOpen(false);
    },
  });

  // Totais globais
  const globalValue = Object.values(summaries).reduce((acc, s) => acc + s.totalValue, 0);
  const globalCost = Object.values(summaries).reduce((acc, s) => acc + s.totalCost, 0);
  const globalPnl = globalValue - globalCost;
  const globalPnlPct = globalCost > 0 ? (globalPnl / globalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{formatUsd(globalValue)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">P&L Global</CardTitle>
            {globalPnl >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${globalPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatUsd(globalPnl)}
                </div>
                <p className={`text-xs ${globalPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatPct(globalPnlPct)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolios</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{portfolios.length}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Portfolio List */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Meus Portfolios</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Novo Portfolio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Portfolio</DialogTitle>
              <DialogDescription>Adicione um novo portfolio para rastrear seus investimentos.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Binance Principal"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Moeda base</Label>
                <Select value={newFiat} onValueChange={setNewFiat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="BRL">BRL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : portfolios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Wallet className="h-12 w-12 mb-3 opacity-50" />
            <p>Nenhum portfolio ainda.</p>
            <p className="text-sm">Crie seu primeiro portfolio acima.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {portfolios.map((p) => {
            const summary = summaries[p.id];
            return (
              <Link key={p.id} href={`/dashboard/portfolio/${p.id}`}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{p.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {p.baseFiat}
                          </Badge>
                          {summary && (
                            <span className="text-xs text-muted-foreground">
                              {summary.assetCount} ativo{summary.assetCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {summary ? (
                          <>
                            <p className="font-semibold">{formatUsd(summary.totalValue)}</p>
                            <p
                              className={`text-sm ${
                                summary.pnl >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {formatUsd(summary.pnl)} ({formatPct(summary.pnlPct)})
                            </p>
                          </>
                        ) : (
                          <Skeleton className="h-5 w-20" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* TradingView Widget */}
      <div>
        <h2 className="text-lg font-semibold mb-3">BTC/USDT — Médias Móveis (21, 50, 200)</h2>
        <TradingViewWidget />
      </div>
    </div>
  );
}
