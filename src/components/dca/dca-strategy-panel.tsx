"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, TrendingDown, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ZoneDetailsModal } from "./zone-details-modal";

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
  zonasAtivas: number;
  zonasPuladas: number;
  zonasAguardando: number;
  zonas: DCAZone[];
  preOrders: PreOrder[];
}

export function DcaStrategyPanel({ portfolioId }: { portfolioId: string }) {
  const [selectedAsset, setSelectedAsset] = useState<string>("BTC");
  const [selectedZone, setSelectedZone] = useState<DCAZone | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery<DCAStrategy>({
    queryKey: ["dca-strategy", portfolioId, selectedAsset],
    queryFn: async () => {
      const res = await fetch(
        `/api/portfolios/${portfolioId}/dca-strategy?asset=${selectedAsset}`
      );
      if (!res.ok) throw new Error("Failed to fetch DCA strategy");
      const rawData = await res.json();

      // Ajustar status das zonas (corrigir PULADA → AGUARDANDO quando apropriado)
      const zonas = rawData.zonas.map((zona: DCAZone) => {
        // Se a zona tá "PULADA" mas o preço ainda não passou por ela, é AGUARDANDO
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

  function handleZoneClick(zona: DCAZone) {
    setSelectedZone(zona);
    setDetailsModalOpen(true);
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
            Clique em uma zona para ver detalhes de estratégia de entrada
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {zonasComSaldo.map((zona) => {
            const hasPreOrders = data.preOrders.some(
              (po) => po.zoneOrder === zona.order && po.active
            );

            return (
              <div
                key={zona.order}
                onClick={() => handleZoneClick(zona)}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-primary/50 ${
                  zona.status === "ATUAL"
                    ? "border-blue-500 bg-blue-500/10"
                    : zona.status === "ATIVA"
                    ? "border-green-500/30 bg-green-500/5"
                    : zona.status === "AGUARDANDO"
                    ? "border-purple-500/30 bg-purple-500/5"
                    : "border-gray-700 bg-gray-800/30"
                }`}
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

      {/* Modal de Detalhes da Zona */}
      <ZoneDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        portfolioId={portfolioId}
        zoneId={selectedZone?.id || ""}
        zone={selectedZone}
      />
    </div>
  );
}
