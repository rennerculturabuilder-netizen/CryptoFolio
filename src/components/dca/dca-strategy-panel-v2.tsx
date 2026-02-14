"use client";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, TrendingDown, TrendingUp, AlertCircle, Clock, Target, Plus, Trash2, HelpCircle, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
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
  valorPreOrdens: number;
  valorComprado: number;
  label: string;
  status: 'ATUAL' | 'AGUARDANDO' | 'PERDIDA' | 'EXECUTADA';
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
  zonasPerdidas: number;
  zonasAguardando: number;
  zonas: DCAZone[];
  preOrders: PreOrder[];
}

// Componente inline para pontos de entrada de uma zona
function ZoneEntryPoints({
  portfolioId,
  zoneId,
  zoneValue,
  currentPrice,
  assetSymbol,
  onUpdate,
}: {
  portfolioId: string;
  zoneId: string;
  zoneValue: number;
  currentPrice: number;
  assetSymbol: string;
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
            currentPrice,
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
            const targetPrice = parseFloat(point.targetPrice?.toString() || '0');
            const value = parseFloat(point.value?.toString() || '0');
            const btcQty = targetPrice > 0 && value > 0 ? value / targetPrice : 0;
            const percentOfTotal = zoneValue > 0 && value > 0 ? (value / zoneValue) * 100 : 0;
            
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
                    <p className="text-xs text-muted-foreground mb-1">Preço Alvo {assetSymbol}</p>
                    <p className="text-sm font-mono font-bold">
                      {targetPrice > 0 ? `$${targetPrice.toFixed(2)}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Valor USD</p>
                    <p className="text-sm font-mono font-bold text-green-400">
                      {value > 0 ? `$${value.toFixed(2)}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Quantidade {assetSymbol}</p>
                    <p className="text-sm font-mono font-bold">
                      {btcQty > 0 ? `${btcQty.toFixed(8)} ${assetSymbol}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">% da Zona</p>
                    <p className="text-sm font-mono font-bold text-blue-400">
                      {percentOfTotal > 0 ? `${percentOfTotal.toFixed(1)}%` : 'N/A'}
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

const GUIDE_STORAGE_KEY = "dca-guide-seen";

export function DcaStrategyPanelV2({ portfolioId }: { portfolioId: string}) {
  const [selectedAsset, setSelectedAsset] = useState<string>("BTC");
  const [expandedZoneId, setExpandedZoneId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Auto-show na primeira visita
  useEffect(() => {
    const seen = localStorage.getItem(GUIDE_STORAGE_KEY);
    if (!seen) {
      setShowGuide(true);
      localStorage.setItem(GUIDE_STORAGE_KEY, "true");
    }
  }, []);

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
      case "ATUAL":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "AGUARDANDO":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "PERDIDA":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "EXECUTADA":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ATUAL":
        return <AlertCircle className="h-4 w-4" />;
      case "AGUARDANDO":
        return <Clock className="h-4 w-4" />;
      case "PERDIDA":
        return <TrendingUp className="h-4 w-4" />;
      case "EXECUTADA":
        return <TrendingDown className="h-4 w-4" />;
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

  // Calcular saldos disponíveis por zona (descontando pré-ordens e compras dos entry points)
  const zonasComSaldo = data.zonas.map((zona) => {
    const comprometido = (zona.valorPreOrdens || 0) + (zona.valorComprado || 0);
    return {
      ...zona,
      valorDisponivel: zona.valorEmDolar - comprometido,
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGuide(true)}
            className="gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            Como funciona
          </Button>
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
              Zonas Perdidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {data.zonasPerdidas}
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
            const hasPreOrders = (zona.valorPreOrdens || 0) > 0;

            const isExpanded = expandedZoneId === zona.id;

            return (
              <div
                key={zona.order}
                className={`rounded-lg border-2 transition-all ${
                  isExpanded
                    ? "border-blue-500 bg-blue-500/10"
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
                      <p className="text-base font-semibold text-foreground/80 mb-4 tabular-nums">
                        ${formatPrice(zona.priceMin)} — ${formatPrice(zona.priceMax)}
                      </p>

                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Alocação Base
                          </p>
                          <p className="text-2xl font-bold tabular-nums">
                            {zona.percentualBase}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Valor a Investir
                          </p>
                          <p className="text-2xl font-bold text-blue-400 tabular-nums">
                            ${formatPrice(zona.valorDisponivel)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Distância
                          </p>
                          <p
                            className={`text-2xl font-bold tabular-nums ${
                              zona.distanciaPercentual != null && zona.distanciaPercentual < 0
                                ? "text-green-400"
                                : zona.distanciaPercentual != null && zona.distanciaPercentual < 10
                                ? "text-yellow-400"
                                : "text-purple-400"
                            }`}
                          >
                            {zona.distanciaPercentual != null ? (
                              <>
                                {zona.distanciaPercentual > 0 ? "+" : ""}
                                {zona.distanciaPercentual.toFixed(1)}%
                              </>
                            ) : (
                              "N/A"
                            )}
                          </p>
                        </div>
                      </div>

                      {zona.status === "AGUARDANDO" && (
                        <p className="text-xs text-purple-400 mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Aguardando o preço chegar nesta faixa
                        </p>
                      )}

                      {zona.status === "PERDIDA" && (
                        <p className="text-xs text-red-400 mt-2">
                          Zona perdida — alocação redistribuída nas zonas restantes
                        </p>
                      )}

                      {zona.status === "EXECUTADA" && (
                        <p className="text-xs text-green-400 mt-2">
                          Zona executada com sucesso
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
                    currentPrice={data.precoAtual}
                    assetSymbol={selectedAsset}
                    onUpdate={() => refetch()}
                  />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Modal "Como funciona" */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-400" />
              Como funciona o DCA Adaptativo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 text-sm">
            {/* O que é */}
            <div>
              <h3 className="font-semibold text-foreground mb-2">O que é DCA Adaptativo?</h3>
              <p className="text-muted-foreground">
                O DCA (Dollar Cost Average) Adaptativo divide seu capital em <strong className="text-foreground">zonas de preço</strong> pré-definidas.
                Conforme o preço do ativo cai, você compra em faixas diferentes, garantindo um preço médio otimizado.
                A alocação se adapta automaticamente conforme o mercado se move.
              </p>
            </div>

            {/* Zonas de Compra */}
            <div>
              <h3 className="font-semibold text-foreground mb-2">Zonas de Compra</h3>
              <p className="text-muted-foreground mb-3">
                Cada ativo tem 5 zonas de preço com percentuais de alocação do seu capital em stablecoins:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">ATUAL</Badge>
                  <span className="text-muted-foreground">O preço do ativo está dentro desta faixa agora.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">AGUARDANDO</Badge>
                  <span className="text-muted-foreground">O preço ainda não chegou nesta faixa. Quando chegar, a zona se torna ativa.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">PERDIDA</Badge>
                  <span className="text-muted-foreground">O preço passou por esta zona sem que você tenha comprado. O capital é redistribuído.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">EXECUTADA</Badge>
                  <span className="text-muted-foreground">Você comprou nesta zona com sucesso.</span>
                </div>
              </div>
            </div>

            {/* Redistribuição */}
            <div>
              <h3 className="font-semibold text-foreground mb-2">Redistribuição Inteligente</h3>
              <p className="text-muted-foreground">
                Se uma zona for <strong className="text-red-400">perdida</strong> (o preço caiu sem você comprar),
                o percentual dessa zona é redistribuído proporcionalmente entre as zonas restantes
                (atual + aguardando). Assim, seu capital nunca fica parado — ele vai pra onde ainda tem oportunidade.
              </p>
            </div>

            {/* Pontos de Entrada */}
            <div>
              <h3 className="font-semibold text-foreground mb-2">Pontos de Entrada</h3>
              <p className="text-muted-foreground mb-2">
                Dentro de cada zona, você pode gerar <strong className="text-foreground">pontos de entrada</strong> —
                subdivisões do valor da zona em preços-alvo específicos. Exemplo: Zona 1 com $150 pode virar 5 pontos de $30 cada,
                em preços diferentes dentro da faixa.
              </p>
              <p className="text-muted-foreground">
                Cada ponto mostra: preço alvo, valor em USD, quantidade estimada do ativo e percentual da zona.
              </p>
            </div>

            {/* Pré-ordens */}
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
              <h3 className="font-semibold text-yellow-400 mb-2">Pré-ordens na Corretora</h3>
              <p className="text-muted-foreground mb-2">
                Este sistema <strong className="text-foreground">não executa ordens automaticamente</strong> na sua corretora.
                Ele serve como planejamento e controle.
              </p>
              <p className="text-muted-foreground mb-2">
                O fluxo correto é:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Gere os pontos de entrada na zona desejada</li>
                <li>Vá até sua corretora (Binance, Bybit, etc.) e <strong className="text-foreground">coloque ordens limitadas</strong> nos preços indicados</li>
                <li>Marque o checkbox <strong className="text-yellow-400">&quot;Pré-ordem realizada&quot;</strong> para reservar o valor no seu saldo</li>
                <li>Quando o preço do ativo atingir seu alvo, o sistema marca automaticamente como <strong className="text-green-400">&quot;Compra confirmada&quot;</strong></li>
              </ol>
            </div>

            {/* Capital */}
            <div>
              <h3 className="font-semibold text-foreground mb-2">Capital e Saldo</h3>
              <p className="text-muted-foreground">
                O <strong className="text-foreground">Capital Total</strong> é a soma das suas stablecoins (USDT, USDC).
                O <strong className="text-blue-400">Capital Disponível</strong> desconta os valores já comprometidos
                em pré-ordens e compras confirmadas. O <strong className="text-foreground">Valor a Investir</strong> de cada zona
                é calculado com base no percentual de alocação sobre o capital total.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
