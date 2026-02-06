"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUsd, formatPct } from "@/lib/utils";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

type MAResult = {
  period: number;
  value: number | null;
  distance: number | null;
  distancePct: number | null;
};

type IndicatorResponse = {
  symbol: string;
  current: number | null;
  mas: MAResult[];
};

type Asset = { id: string; symbol: string; name: string };

const DEFAULT_PERIODS = [21, 35, 50, 200, 305, 610, 1200];

export function MovingAveragesTab({ assets }: { assets: Asset[] }) {
  const cryptoAssets = assets.filter(
    (a) => !["USDT", "USDC"].includes(a.symbol)
  );
  const [selectedSymbol, setSelectedSymbol] = useState(
    cryptoAssets[0]?.symbol || "BTC"
  );

  const { data, isLoading } = useQuery<IndicatorResponse>({
    queryKey: ["indicators", selectedSymbol],
    queryFn: async () => {
      const res = await fetch(
        `/api/indicators/${selectedSymbol}?periods=${DEFAULT_PERIODS.join(",")}`
      );
      return res.json();
    },
    enabled: !!selectedSymbol,
  });

  const aboveCount = data?.mas.filter(
    (m) => m.value !== null && data.current !== null && data.current >= m.value
  ).length || 0;
  const totalMas = data?.mas.filter((m) => m.value !== null).length || 0;

  return (
    <div className="space-y-4">
      {/* Asset Selector */}
      <div className="flex items-center gap-4">
        <div className="w-40">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cryptoAssets.map((a) => (
                <SelectItem key={a.id} value={a.symbol}>
                  {a.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {data?.current && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Preço atual:</span>
            <span className="font-semibold">{formatUsd(data.current)}</span>
          </div>
        )}
        {totalMas > 0 && (
          <Badge variant={aboveCount > totalMas / 2 ? "success" : "destructive"}>
            Acima de {aboveCount}/{totalMas} MAs
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.current ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Preço Atual</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatUsd(data.current)}</div>
            </CardContent>
          </Card>
          {data.mas.filter((m) => m.value !== null).slice(0, 2).map((m) => {
            const above = data.current! >= m.value!;
            return (
              <Card key={m.period}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">MA {m.period}</CardTitle>
                  {above ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatUsd(m.value!)}</div>
                  <p className={`text-xs ${above ? "text-green-600" : "text-red-600"}`}>
                    {formatPct(m.distancePct!)} ({formatUsd(m.distance!)})
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Sem dados de preço disponíveis para {selectedSymbol}.</p>
            <p className="text-sm">Adicione snapshots de preço para calcular médias móveis.</p>
          </CardContent>
        </Card>
      )}

      {/* MA Table */}
      {data && data.mas.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Valor MA</TableHead>
              <TableHead className="text-right">Distância USD</TableHead>
              <TableHead className="text-right">Distância %</TableHead>
              <TableHead className="text-center">Posição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.mas.map((m) => {
              const hasValue = m.value !== null;
              const above = hasValue && data.current !== null && data.current >= m.value!;

              return (
                <TableRow key={m.period}>
                  <TableCell className="font-medium">MA {m.period}</TableCell>
                  <TableCell className="text-right font-mono">
                    {hasValue ? formatUsd(m.value!) : "—"}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${hasValue ? (above ? "text-green-600" : "text-red-600") : ""}`}>
                    {hasValue && m.distance !== null ? formatUsd(m.distance) : "—"}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${hasValue ? (above ? "text-green-600" : "text-red-600") : ""}`}>
                    {hasValue && m.distancePct !== null ? formatPct(m.distancePct) : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {hasValue ? (
                      <Badge variant={above ? "success" : "destructive"} className="text-xs">
                        {above ? "Acima" : "Abaixo"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Dados insuficientes
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
