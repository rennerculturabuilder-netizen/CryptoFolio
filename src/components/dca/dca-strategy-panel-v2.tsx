"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, TrendingDown, TrendingUp, AlertCircle, Clock, ChevronDown, ChevronUp, Plus, Trash2, Target, Calendar, DollarSign } from "lucide-react";
import { formatPrice, formatUsd } from "@/lib/utils";
import { toast } from "sonner";

interface DCAZone {
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
  zonasAtivas: number;
  zonasPuladas: number;
  zonasAguardando: number;
  zonas: DCAZone[];
  preOrders: PreOrder[];
}

export function DcaStrategyPanelV2({ portfolioId }: { portfolioId: string }) {
  const [selectedAsset, setSelectedAsset] = useState<string>("BTC");
  const [expandedZone, setExpandedZone] = useState<number | null>(null);
  const [newPreOrders, setNewPreOrders] = useState<Record<number, { price: string; value: string }>>({});
  
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery<DCAStrategy>({
    queryKey: ["dca-strategy", portfolioId, selectedAsset],
    queryFn: async () => {
      const res = await fetch(
        `/api/portfolios/${portfolioId}/dca-strategy?asset=${selectedAsset}`
      );
      if (!res.ok) throw new Error("Failed to fetch DCA strategy");
      const rawData = await res.json();

      // Ajustar status das zonas
      const zonas = rawData.zonas.map((zona: DCAZone) => {
        if (zona.status === 'PULADA' && zona.distanciaPercentual > 0) {
          return { ...zona, status: 'AGUARDANDO' as const };
        }
        return zona;
      });

      const zonasAguardando = zonas.filter((z: DCAZone) => z.status === 'AGUARDANDO').length;

      return {
        ...rawData,
        zonas,
        zonasAguardando,
        preOrders: rawData.preOrders || [],
      };
    },
  });

  const createPreOrderMutation = useMutation({
    mutationFn: async ({ zoneOrder, targetPrice, value }: { zoneOrder: number; targetPrice: number; value: number }) => {
      const res = await fetch(`/api/portfolios/${portfolioId}/pre-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetSymbol: selectedAsset,
          zoneOrder,
          targetPrice,
          value,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao criar pré-ordem");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dca-strategy"] });
      toast.success("Pré-ordem criada!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deletePreOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/portfolios/${portfolioId}/pre-orders/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao deletar pré-ordem");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dca-strategy"] });
      toast.success("Pré-ordem removida!");
    },
    onError: () => toast.error("Erro ao remover pré-ordem"),
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

  function handleAddPreOrder(zoneOrder: number) {
    const preOrderData = newPreOrders[zoneOrder];
    if (!preOrderData || !preOrderData.price || !preOrderData.value) {
      toast.error("Preencha preço e valor");
      return;
    }

    const priceNum = parseFloat(preOrderData.price);
    const valueNum = parseFloat(preOrderData.value);

    if (isNaN(priceNum) || isNaN(valueNum)) {
      toast.error("Valores inválidos");
      return;
    }

    createPreOrderMutation.mutate({
      zoneOrder,
      targetPrice: priceNum,
      value: valueNum,
    });

    // Limpar form
    setNewPreOrders(prev => ({ ...prev, [zoneOrder]: { price: "", value: "" } }));
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

  // Calcular saldos disponíveis por zona
  const zonasComSaldo = data.zonas.map((zona) => {
    const zonePreOrders = data.preOrders.filter(
      (po) => po.zoneOrder === zona.order && po.active
    );
    const preOrderValue = zonePreOrders.reduce((acc, po) => acc + po.value, 0);
    return {
      ...zona,
      valorDisponivel: zona.valorEmDolar - preOrderValue,
      preOrders: zonePreOrders,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Capital Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${formatPrice(data.capitalTotal)}
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
            Clique em uma zona para expandir e gerenciar pré-ordens
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {zonasComSaldo.map((zona) => {
            const isExpanded = expandedZone === zona.order;
            const totalValue = zona.valorEmDolar;
            const recommendedStrategy = totalValue > 5000 
              ? { frequency: "semanal", entries: 8, valuePerEntry: totalValue / 8 }
              : totalValue > 2000
              ? { frequency: "semanal", entries: 4, valuePerEntry: totalValue / 4 }
              : { frequency: "mensal", entries: 2, valuePerEntry: totalValue / 2 };

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
                {/* Header da Zona (sempre visível) */}
                <div
                  onClick={() => setExpandedZone(isExpanded ? null : zona.order)}
                  className="p-4 cursor-pointer hover:bg-accent/20 transition-colors"
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
                        {zona.preOrders.length > 0 && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                            {zona.preOrders.length} pré-ordem{zona.preOrders.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        ${formatPrice(zona.priceMin)} - ${formatPrice(zona.priceMax)}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Alocação Base</p>
                          <p className="text-sm font-medium">{zona.percentualBase}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Alocação Ajustada</p>
                          <p className="text-sm font-bold text-green-400">{zona.percentualAjustado}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Valor Disponível</p>
                          <p className="text-sm font-bold">${formatPrice(zona.valorDisponivel)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Distância</p>
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
                    </div>
                    <Button variant="ghost" size="icon">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>

                {/* Conteúdo Expandido */}
                {isExpanded && (
                  <div className="border-t border-border/20 p-4 space-y-4 bg-secondary/30">
                    {/* Estratégias Recomendadas */}
                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4" />
                        Estratégias de Entrada
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* DCA Escalonado */}
                        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-400">🎯 DCA Escalonado</span>
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Recomendado</Badge>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>• {recommendedStrategy.entries}x entradas {recommendedStrategy.frequency === "semanal" ? "semanais" : "mensais"}</p>
                            <p>• {formatUsd(recommendedStrategy.valuePerEntry)} por entrada</p>
                          </div>
                        </div>

                        {/* Entrada Única */}
                        <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-orange-400">⚡ Entrada Única</span>
                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">Maior Risco</Badge>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>• 1x entrada total</p>
                            <p>• {formatUsd(zona.valorDisponivel)} de uma vez</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pré-ordens da Zona */}
                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                        <Target className="h-4 w-4 text-yellow-400" />
                        Pré-ordens Configuradas
                      </h4>

                      {/* Lista de Pré-ordens */}
                      {zona.preOrders.length > 0 ? (
                        <div className="space-y-2 mb-3">
                          {zona.preOrders.map((po) => (
                            <div
                              key={po.id}
                              className="flex items-center justify-between p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg"
                            >
                              <div className="flex-1 text-sm">
                                <span className="text-muted-foreground">Preço:</span>{" "}
                                <span className="font-mono font-medium">{formatPrice(po.targetPrice)}</span>
                                <span className="text-muted-foreground mx-2">•</span>
                                <span className="text-muted-foreground">Valor:</span>{" "}
                                <span className="font-bold text-yellow-400">{formatUsd(po.value)}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-red-500/10 text-red-400"
                                onClick={() => deletePreOrderMutation.mutate(po.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mb-3">Nenhuma pré-ordem configurada</p>
                      )}

                      {/* Formulário Nova Pré-ordem */}
                      <div className="p-3 bg-secondary/50 border border-border/20 rounded-lg">
                        <p className="text-xs font-medium mb-2">Nova Pré-ordem</p>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <Label className="text-xs">Preço (USD)</Label>
                            <Input
                              type="number"
                              placeholder={formatPrice((zona.priceMin + zona.priceMax) / 2)}
                              className="h-8 text-xs"
                              value={newPreOrders[zona.order]?.price || ""}
                              onChange={(e) =>
                                setNewPreOrders(prev => ({
                                  ...prev,
                                  [zona.order]: { ...prev[zona.order], price: e.target.value }
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Valor (USD)</Label>
                            <Input
                              type="number"
                              placeholder="1000"
                              className="h-8 text-xs"
                              value={newPreOrders[zona.order]?.value || ""}
                              onChange={(e) =>
                                setNewPreOrders(prev => ({
                                  ...prev,
                                  [zona.order]: { ...prev[zona.order], value: e.target.value }
                                }))
                              }
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full h-8 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30"
                          onClick={() => handleAddPreOrder(zona.order)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar Pré-ordem
                        </Button>
                      </div>
                    </div>
                  </div>
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
                <strong className="text-foreground">Como funciona:</strong> As zonas se adaptam automaticamente conforme o preço muda.
              </p>
              <p>
                <strong className="text-purple-400">Zonas Aguardando:</strong> O preço ainda não chegou nessa faixa.
              </p>
              <p>
                <strong className="text-yellow-400">Pré-ordens:</strong> Configure ordens limitadas dentro de cada zona. O valor é descontado do saldo disponível.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
