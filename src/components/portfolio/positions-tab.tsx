"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatUsd, formatPct, formatQty } from "@/lib/utils";
import { DollarSign, TrendingUp, TrendingDown, PieChart } from "lucide-react";

type Position = {
  assetId: string;
  symbol: string;
  name: string;
  balance: string;
  totalCost: string;
  wac: string;
};

type PriceLookup = Record<string, number>;

export function PositionsTab({
  positions,
  prices,
}: {
  positions: Position[];
  prices: PriceLookup;
}) {
  const active = positions.filter((p) => parseFloat(p.balance) > 0);

  let totalValue = 0;
  let totalCost = 0;

  const rows = active.map((p) => {
    const bal = parseFloat(p.balance);
    const cost = parseFloat(p.totalCost);
    const avgCost = parseFloat(p.wac);
    const currentPrice = prices[p.symbol] || 0;
    const value = bal * currentPrice;
    const pnl = value - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

    totalValue += value;
    totalCost += cost;

    return { ...p, bal, cost, avgCost, currentPrice, value, pnl, pnlPct };
  });

  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUsd(totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Base</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUsd(totalCost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">P&L Total</CardTitle>
            {totalPnl >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatUsd(totalPnl)}
            </div>
            <p className={`text-xs ${totalPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatPct(totalPnlPct)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Positions Table */}
      {active.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">
          Nenhuma posição aberta. Adicione transações.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Custo Médio</TableHead>
              <TableHead className="text-right">Preço Atual</TableHead>
              <TableHead className="text-right">Valor USD</TableHead>
              <TableHead className="text-right">P&L USD</TableHead>
              <TableHead className="text-right">P&L %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.assetId}>
                <TableCell>
                  <span className="font-medium">{r.symbol}</span>
                  <span className="text-muted-foreground ml-1 text-xs">{r.name}</span>
                </TableCell>
                <TableCell className="text-right font-mono">{formatQty(r.bal)}</TableCell>
                <TableCell className="text-right font-mono">{formatUsd(r.avgCost)}</TableCell>
                <TableCell className="text-right font-mono">
                  {r.currentPrice > 0 ? formatUsd(r.currentPrice) : (
                    <Badge variant="outline" className="text-xs">sem preço</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">{formatUsd(r.value)}</TableCell>
                <TableCell className={`text-right font-mono ${r.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatUsd(r.pnl)}
                </TableCell>
                <TableCell className={`text-right font-mono ${r.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatPct(r.pnlPct)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
