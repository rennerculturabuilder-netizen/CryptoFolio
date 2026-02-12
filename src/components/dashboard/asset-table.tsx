"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatUsd, formatPct, formatQty, formatPrice } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { PriceData } from "@/lib/services/coingecko";

export type AssetRow = {
  assetId: string;
  symbol: string;
  name: string;
  balance: number;
  totalCost: number;
  wac: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPct: number;
  change24h: number;
  changePct24h: number;
  allocationPct: number;
};

type AssetTableProps = {
  assets: AssetRow[];
  isLoading: boolean;
};

const CRYPTO_ICONS: Record<string, string> = {
  BTC: "₿",
  ETH: "Ξ",
  SOL: "◎",
  USDT: "₮",
  USDC: "$",
  BNB: "⬡",
  XRP: "✕",
  ADA: "₳",
  DOGE: "Ð",
  DOT: "●",
};

export function buildAssetRows(
  positions: { assetId: string; symbol: string; name: string; balance: string; totalCost: string; wac: string }[],
  priceMap: Record<string, PriceData>
): AssetRow[] {
  const activePositions = positions.filter(
    (p) => parseFloat(p.balance) > 0
  );

  // Calcular valor total pra allocation
  let totalPortfolioValue = 0;
  const rows = activePositions.map((pos) => {
    const balance = parseFloat(pos.balance);
    const totalCost = parseFloat(pos.totalCost);
    const wac = parseFloat(pos.wac);
    const priceData = priceMap[pos.symbol];
    const currentPrice = priceData?.price || 0;
    const value = balance * currentPrice;
    const pnl = value - totalCost;
    const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

    totalPortfolioValue += value;

    return {
      assetId: pos.assetId,
      symbol: pos.symbol,
      name: pos.name,
      balance,
      totalCost,
      wac,
      currentPrice,
      value,
      pnl,
      pnlPct,
      change24h: priceData?.change24h || 0,
      changePct24h: priceData?.changePct24h || 0,
      allocationPct: 0, // calculado depois
    };
  });

  // Set allocation %
  for (const row of rows) {
    row.allocationPct =
      totalPortfolioValue > 0 ? (row.value / totalPortfolioValue) * 100 : 0;
  }

  // Ordenar por valor desc
  rows.sort((a, b) => b.value - a.value);

  return rows;
}

export function AssetTable({ assets, isLoading }: AssetTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <div className="h-9 w-9 rounded-full skeleton-shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded skeleton-shimmer" />
              <div className="h-3 w-16 rounded skeleton-shimmer" />
            </div>
            <div className="h-4 w-20 rounded skeleton-shimmer" />
            <div className="h-4 w-20 rounded skeleton-shimmer hidden sm:block" />
            <div className="h-4 w-16 rounded skeleton-shimmer hidden sm:block" />
          </div>
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">Nenhum ativo encontrado</p>
        <p className="text-sm mt-1">Adicione transações para ver seus ativos aqui</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <Table className="tabular-nums">
        <TableHeader>
          <TableRow className="border-border/30 hover:bg-transparent">
            <TableHead className="text-muted-foreground font-medium">Ativo</TableHead>
            <TableHead className="text-right text-muted-foreground font-medium">Qtd</TableHead>
            <TableHead className="text-right text-muted-foreground font-medium">Custo Médio</TableHead>
            <TableHead className="text-right text-muted-foreground font-medium">Preço Atual</TableHead>
            <TableHead className="text-right text-muted-foreground font-medium">24h</TableHead>
            <TableHead className="text-right text-muted-foreground font-medium">Valor</TableHead>
            <TableHead className="text-right text-muted-foreground font-medium">P&L</TableHead>
            <TableHead className="text-right text-muted-foreground font-medium">Alocação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => {
            const isPositive = asset.pnl >= 0;
            const is24hPositive = asset.changePct24h >= 0;
            return (
              <TableRow
                key={asset.assetId}
                className="border-border/20 hover:bg-accent/50 transition-colors"
              >
                {/* Asset */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-lg font-bold">
                      {CRYPTO_ICONS[asset.symbol] || asset.symbol[0]}
                    </div>
                    <div>
                      <p className="font-semibold">{asset.symbol}</p>
                      <p className="text-xs text-muted-foreground">{asset.name}</p>
                    </div>
                  </div>
                </TableCell>

                {/* Qty */}
                <TableCell className="text-right font-mono text-sm">
                  {formatQty(asset.balance)}
                </TableCell>

                {/* Avg Cost */}
                <TableCell className="text-right font-mono text-sm">
                  {formatPrice(asset.wac)}
                </TableCell>

                {/* Current Price */}
                <TableCell className="text-right font-mono text-sm font-medium">
                  {formatPrice(asset.currentPrice)}
                </TableCell>

                {/* 24h Change */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {is24hPositive ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        is24hPositive ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {formatPct(asset.changePct24h)}
                    </span>
                  </div>
                </TableCell>

                {/* Value */}
                <TableCell className="text-right font-mono text-sm font-medium">
                  {formatUsd(asset.value)}
                </TableCell>

                {/* P&L */}
                <TableCell className="text-right">
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        isPositive ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {formatUsd(asset.pnl)}
                    </p>
                    <p
                      className={`text-xs ${
                        isPositive ? "text-emerald-400/70" : "text-red-400/70"
                      }`}
                    >
                      {formatPct(asset.pnlPct)}
                    </p>
                  </div>
                </TableCell>

                {/* Allocation */}
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className="font-mono text-xs border-border/50"
                  >
                    {asset.allocationPct != null ? `${asset.allocationPct.toFixed(1)}%` : 'N/A'}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
