"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, TrendingDown, TrendingUp, AlertCircle, Clock, Target, Plus, Trash2 } from "lucide-react";
import { formatPrice, formatUsd } from "@/lib/utils";
import { toast } from "sonner";

type DcaEntryPoint = {
  id: string;
  targetPrice: number;
  value: number;
  preOrderPlaced: boolean;
  purchaseConfirmed: boolean;
  zoneOrder: number;
};

interface DCAZone {
  id: string;
  order: number;
  priceMin: number;
  priceMax: number;
  percentualBase: number;
  percentualAjustado: number;
  valorEmDolar: number;
  label: string;
  status: 'ATIVA' | 'PULADA' | 'ATUAL' | 'AGUARDANDO';
  distanciaPercentual: number;
}

interface PreOrder {
  id: string;
  zoneOrder: number;
  zoneLabel: string;
  targetPrice: number;
  value: number;
  active: boolean;
}

interface DCAStrategy {
  portfolioId: string;
  asset: string;
  precoAtual: number;
  capitalTotal: number;
  capitalDisponivel: number;
  capitalAlocado: number;
  zonasAtivas: number;
  zonasPuladas: number;
  zonasAguardando: number;
  zonas: DCAZone[];
  preOrders: PreOrder[];
}

// Componente inline para pontos de entrada de uma zona
function ZoneEntryPoints({
  portfolioId,
  zoneId,
  zoneValue,
  onUpdate,
}: {
  portfolioId: string;
  zoneId: string;
  zoneValue: number;
  onUpdate: () => void;
}) {
  const [numberOfEntries, setNumberOfEntries] = useState(5);
  const queryClient = useQueryClient();

  // Fetch entry points
  const { data: entryPointsData, isLoading: loadingPoints } = useQuery<{
    entryPoints: DcaEntryPoint[];
  }>({
    queryKey: ["entry-points", zoneId],
    queryFn: async () => {
      const res = await fetch(
        `/api/portfolios/${portfolioId}/dca-zones/${zoneId}/entry-points`
      );
      if (!res.ok) throw new Error("Failed to fetch entry points");
      return res.json();
    },
    enabled: !!zoneId,
  });

  const entryPoints = entryPointsData?.entryPoints || [];

  // Generate entry points mutation
  const generatePoints = useMutation({
    mutationFn: async (count: number) => {
      const res = await fetch(
        `/api/portfolios/${portfolioId}/dca-zones/${zoneId}/entry-points`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            numberOfEntries: count,
            zoneValueUsd: zoneValue,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to generate entry points");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entry-points", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["dca-strategy"] });
      toast.success(`${numberOfEntries} pontos de entrada gerados!`);
      onUpdate();
    },
    onError: () => {
      toast.error("Erro ao gerar pontos de entrada");
    },
  });

  // Update entry point mutation
  const updatePoint = useMutation({
    mutationFn: async ({
      pointId,
      updates,
    }: {
      pointId: string;
      updates: { preOrderPlaced?: boolean; purchaseConfirmed?: boolean };
    }) => {
      const res = await fetch(
        `/api/portfolios/${portfolioId}/entry-points/${pointId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );
      if (!res.ok) throw new Error("Failed to update entry point");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entry-points", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["dca-strategy"] });
      onUpdate();
    },
    onError: () => {
      toast.error("Erro ao atualizar ponto de entrada");
    },
  });

  // Delete entry point mutation
  const deletePoint = useMutation({
    mutationFn: async (pointId: string) => {
      const res = await fetch(
        `/api/portfolios/${portfolioId}/entry-points/${pointId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete entry point");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entry-points", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["dca-strategy"] });
      toast.success("Ponto de entrada removido");
      onUpdate();
    },
    onError: () => {
      toast.error("Erro ao remover ponto de entrada");
    },
  });

  return (
    <div className="border-t border-border/20 p-4 bg-secondary/20 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4" />
          Pontos de Entrada
        </h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={10}
            value={numberOfEntries}
            onChange={(e) => setNumberOfEntries(parseInt(e.target.value) || 5)}
            className="w-20 h-8"
          />
          <Button
            size="sm"
            onClick={() => generatePoints.mutate(numberOfEntries)}
            disabled={generatePoints.isPending}
            className="gap-2"
          >
            {generatePoints.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Gerar Pontos
          </Button>
        </div>
      </div>

      {loadingPoints ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : entryPoints.length > 0 ? (
        <div className="space-y-2">
          {entryPoints.map((point, idx) => {
            const btcQty = point.value / point.targetPrice;
            const percentOfTotal = (point.value / zoneValue) * 100;
            
            return (
              <div
                key={point.id}
                className={`p-4 rounded-lg border transition-all ${
                  point.purchaseConfirmed
                    ? "bg-green-500/10 border-green-500/30"
                    : point.preOrderPlaced
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : "bg-secondary/50 border-border"
                }`}
              >
                {/* Header com número e status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">
                      Ponto {idx + 1}
                    </span>
                    {point.purchaseConfirmed && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        Comprado
                      </Badge>
                    )}
                    {point.preOrderPlaced && !point.purchaseConfirmed && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                        Pré-ordem Ativa
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-400"
                    onClick={() => deletePoint.mutate(point.id)}
                    disabled={deletePoint.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Grid com informações */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Preço Alvo BTC</p>
                    <p className="text-sm font-mono font-bold">
                      ${formatPrice(point.targetPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Valor USD</p>
                    <p className="text-sm font-mono font-bold text-green-400">
                      {formatUsd(point.value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Quantidade BTC</p>
                    <p className="text-sm font-mono font-bold">
                      {btcQty.toFixed(8)} BTC
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">% da Zona</p>
                    <p className="text-sm font-mono font-bold text-blue-400">
                      {percentOfTotal.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex items-center gap-4 pt-3 border-t border-border/20">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`preorder-${point.id}`}
                      checked={point.preOrderPlaced}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        updatePoint.mutate({
                          pointId: point.id,
                          updates: { preOrderPlaced: isChecked },
                        });
                      }}
                      disabled={point.purchaseConfirmed}
                    />
                    <label
                      htmlFor={`preorder-${point.id}`}
                      className="text-sm cursor-pointer select-none"
                    >
                      Pré-ordem realizada
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`confirm-${point.id}`}
                      checked={point.purchaseConfirmed}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        updatePoint.mutate({
                          pointId: point.id,
                          updates: { purchaseConfirmed: isChecked },
                        });
                      }}
                    />
                    <label
                      htmlFor={`confirm-${point.id}`}
                      className="text-sm cursor-pointer select-none"
                    >
                      Confirme compra
                    </label>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Progress summary */}
          <div className="pt-3 border-t border-border mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progresso:</span>
              <div className="flex gap-4">
                <span className="text-yellow-400">
                  {entryPoints.filter((p) => p.preOrderPlaced).length}/
                  {entryPoints.length} pré-ordens
                </span>
                <span className="text-green-400">
                  {entryPoints.filter((p) => p.purchaseConfirmed).length}/
                  {entryPoints.length} compras
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-muted-foreground text-sm">
          <p>Nenhum ponto de entrada configurado.</p>
          <p className="text-xs mt-1">
            Defina quantas entradas deseja e clique em &quot;Gerar Pontos&quot;
          </p>
        </div>
      )}
    </div>
  );
}

export function DcaStrategyPanelV2({ portfolioId }: { portfolioId: string}) {
  const [selectedAsset, setSelectedAsset] = useState<string>("BTC");
  const [expandedZoneId, setExpandedZoneId] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery<DCAStrategy>({
    queryKey: ["dca-strategy", portfolioId, selectedAsset],
    queryFn: async () => {
      const res = await fetch(
        `/api/portfolios/${portfolioId}/dca-strategy?asset=${selectedAsset}`
      );
      if (!res.ok) throw new Error("Failed to fetch DCA strategy");
      return res.json();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ATIVA":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "ATUAL":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "AGUARDANDO":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "PULADA":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ATIVA":
        return <TrendingDown className="h-4 w-4" />;
      case "ATUAL":
        return <AlertCircle className="h-4 w-4" />;
      case "AGUARDANDO":
        return <Clock className="h-4 w-4" />;
      case "PULADA":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return null;
    }
  };

  function handleZoneClick(zoneId: string) {
    setExpandedZoneId(expandedZoneId === zoneId ? null : zoneId);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Erro ao carregar estratégia DCA
        </CardContent>
      </Card>
    );
  }

  // Calcular saldos disponíveis por zona (descontando pré-ordens)
  const zonasComSaldo = data.zonas.map((zona) => {
    const zonePreOrders = data.preOrders.filter(
      (po) => po.zoneOrder === zona.order && po.active
    );
    const preOrderValue = zonePreOrders.reduce((acc, po) => acc + po.value, 0);
    return {
      ...zona,
      valorDisponivel: zona.valorEmDolar - preOrderValue,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header com seleção de ativo */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">DCA Adaptativo</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Zonas de compra configuradas automaticamente
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC">Bitcoin</SelectItem>
              <SelectItem value="ETH">Ethereum</SelectItem>
              <SelectItem value="SOL">Solana</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Capital
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">
                  ${formatPrice(data.capitalTotal)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Disponível</p>
                <p className="text-lg font-bold text-blue-400">
                  ${formatPrice(data.capitalDisponivel || data.capitalTotal)}
                </p>
              </div>
              {data.capitalAlocado > 0 && (
                <p className="text-xs text-muted-foreground">
                  ${formatPrice(data.capitalAlocado)} alocado
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zonas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {data.zonasAtivas}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aguardando Preço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {data.zonasAguardando || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zonas Puladas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">
              {data.zonasPuladas}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Preço Atual {selectedAsset}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${formatPrice(data.precoAtual)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zonas DCA */}
      <Card>
        <CardHeader>
          <CardTitle>Zonas de Compra</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Clique em uma zona para ver detalhes de estratégia de entrada
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {zonasComSaldo.map((zona) => {
            const hasPreOrders = data.preOrders.some(
              (po) => po.zoneOrder === zona.order && po.active
            );

            const isExpanded = expandedZoneId === zona.id;

            return (
              <div
                key={zona.order}
                className={`rounded-lg border-2 transition-all ${
                  zona.status === "ATUAL"
                    ? "border-blue-500 bg-blue-500/10"
                    : zona.status === "ATIVA"
                    ? "border-green-500/30 bg-green-500/5"
                    : zona.status === "AGUARDANDO"
                    ? "border-purple-500/30 bg-purple-500/5"
                    : "border-gray-700 bg-gray-800/30"
                }`}
              >
                {/* Header clicável */}
                <div
                  onClick={() => handleZoneClick(zona.id)}
                  className="p-4 cursor-pointer hover:bg-accent/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{zona.label}</h3>
                        <Badge className={getStatusColor(zona.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(zona.status)}
                            {zona.status}
                          </span>
                        </Badge>
                        {hasPreOrders && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                            Pré-ordens Ativas
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        ${formatPrice(zona.priceMin)} - ${formatPrice(zona.priceMax)}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Alocação Base
                          </p>
                          <p className="text-sm font-medium">
                            {zona.percentualBase}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Alocação Ajustada
                          </p>
                          <p className="text-sm font-bold text-green-400">
                            {zona.percentualAjustado}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Valor Disponível
                          </p>
                          <p className="text-sm font-bold">
                            ${formatPrice(zona.valorDisponivel)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Distância
                          </p>
                          <p
                            className={`text-sm font-medium ${
                              zona.distanciaPercentual < 0
                                ? "text-green-400"
                                : zona.distanciaPercentual < 10
                                ? "text-yellow-400"
                                : "text-purple-400"
                            }`}
                          >
                            {zona.distanciaPercentual > 0 ? "+" : ""}
                            {zona.distanciaPercentual.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {zona.status === "AGUARDANDO" && (
                        <p className="text-xs text-purple-400 mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Aguardando o preço chegar nesta faixa
                        </p>
                      )}

                      {zona.status === "PULADA" && (
                        <p className="text-xs text-gray-400 mt-2">
                          💡 Alocação redistribuída nas zonas ativas
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conteúdo expandido: Pontos de Entrada */}
                {isExpanded && (
                  <ZoneEntryPoints
                    portfolioId={portfolioId}
                    zoneId={zona.id}
                    zoneValue={zona.valorEmDolar}
                    onUpdate={() => refetch()}
                  />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Explicação */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Como funciona:</strong> As
                zonas de preço são fixas, mas a alocação se adapta automaticamente.
              </p>
              <p>
                <strong className="text-purple-400">Zonas Aguardando:</strong> O
                preço ainda não chegou nessa faixa. Quando chegar, a zona se torna ativa.
              </p>
              <p>
                Quando o preço ultrapassa uma zona (zona &quot;pulada&quot;), o capital é
                redistribuído proporcionalmente nas zonas restantes.
              </p>
              <p>
                <strong className="text-yellow-400">Pré-ordens:</strong> Configure
                ordens limitadas no livro de ofertas da exchange para capturar preços rapidamente.
                O valor é descontado do saldo disponível da zona.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
