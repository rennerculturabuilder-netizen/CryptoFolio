"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Camera, Loader2, DollarSign, TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { formatUsd, formatPct } from "@/lib/utils";

type Snapshot = {
  id: string;
  timestamp: string;
  valueUsd: string;
  costBasisUsd: string;
  unrealizedPnl: string;
  unrealizedPct: string;
  positionsSnapshot: unknown[];
};

type Portfolio = { id: string; name: string };

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [days, setDays] = useState("30");

  const { data: portfolio } = useQuery<Portfolio>({
    queryKey: ["portfolio", id],
    queryFn: async () => {
      const res = await fetch(`/api/portfolios/${id}`);
      return res.json();
    },
  });

  const { data: snapshots = [], isLoading } = useQuery<Snapshot[]>({
    queryKey: ["snapshots", id, days],
    queryFn: async () => {
      const res = await fetch(`/api/portfolios/${id}/snapshots?limit=${days}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/portfolios/${id}/snapshots`, { method: "POST" });
      if (!res.ok) throw new Error("Erro ao criar snapshot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", id] });
    },
  });

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const chartData = sorted.map((s) => ({
    date: new Date(s.timestamp).toLocaleDateString("pt-BR"),
    valor: parseFloat(s.valueUsd),
    custo: parseFloat(s.costBasisUsd),
    pnl: parseFloat(s.unrealizedPnl),
  }));

  const latest = snapshots[0];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[350px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/portfolio/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </Link>
          <h1 className="text-xl font-bold">{portfolio?.name || "..."} — Histórico</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-1" />
            )}
            Criar Snapshot
          </Button>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="365">365 dias</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary">{snapshots.length} snapshots</Badge>
        </div>
      </div>

      {/* Summary Cards */}
      {latest && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Atual</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{formatUsd(parseFloat(latest.valueUsd))}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Base</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{formatUsd(parseFloat(latest.costBasisUsd))}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">P&L</CardTitle>
              {parseFloat(latest.unrealizedPnl) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold font-mono ${parseFloat(latest.unrealizedPnl) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatUsd(parseFloat(latest.unrealizedPnl))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">P&L %</CardTitle>
              {parseFloat(latest.unrealizedPct) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold font-mono ${parseFloat(latest.unrealizedPct) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatPct(parseFloat(latest.unrealizedPct))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Evolução do Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <Tooltip
                  formatter={(value) => `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Line type="monotone" dataKey="valor" name="Valor (USD)" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="custo" name="Custo Base" stroke="#9ca3af" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="pnl" name="P&L" stroke="#16a34a" strokeWidth={1} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {chartData.length === 0
              ? "Nenhum snapshot encontrado. Crie um snapshot para começar."
              : "Pelo menos 2 snapshots necessários para gerar o gráfico."}
          </CardContent>
        </Card>
      )}

      {/* Snapshots Table */}
      {snapshots.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-3">Snapshots</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead className="text-right">P&L %</TableHead>
                <TableHead className="text-right">Posições</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(s.timestamp).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatUsd(parseFloat(s.valueUsd))}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatUsd(parseFloat(s.costBasisUsd))}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${parseFloat(s.unrealizedPnl) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatUsd(parseFloat(s.unrealizedPnl))}
                  </TableCell>
                  <TableCell className={`text-right font-mono ${parseFloat(s.unrealizedPct) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatPct(parseFloat(s.unrealizedPct))}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {Array.isArray(s.positionsSnapshot) ? s.positionsSnapshot.length : 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
