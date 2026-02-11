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
import { RefreshCw, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface DCAZone {
  order: number;
  priceMin: number;
  priceMax: number;
  percentualBase: number;
  percentualAjustado: number;
  valorEmDolar: number;
  label: string;
  status: 'ATIVA' | 'PULADA' | 'ATUAL';
  distanciaPercentual: number;
}

interface DCAStrategy {
  portfolioId: string;
  asset: string;
  precoAtual: number;
  capitalTotal: number;
  zonasAtivas: number;
  zonasPuladas: number;
  zonas: DCAZone[];
}

export function DcaStrategyPanel({ portfolioId }: { portfolioId: string }) {
  const [selectedAsset, setSelectedAsset] = useState<string>("BTC");

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
      case "PULADA":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return null;
    }
  };

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        </CardHeader>
        <CardContent className="space-y-4">
          {data.zonas.map((zona) => (
            <div
              key={zona.order}
              className={`p-4 rounded-lg border-2 transition-all ${
                zona.status === "ATUAL"
                  ? "border-blue-500 bg-blue-500/10"
                  : zona.status === "ATIVA"
                  ? "border-green-500/30 bg-green-500/5"
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
                        Valor em USD
                      </p>
                      <p className="text-sm font-bold">
                        ${formatPrice(zona.valorEmDolar)}
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
                            : "text-blue-400"
                        }`}
                      >
                        {zona.distanciaPercentual > 0 ? "+" : ""}
                        {zona.distanciaPercentual.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {zona.status === "PULADA" && (
                    <p className="text-xs text-gray-400 mt-2">
                      💡 Alocação redistribuída nas zonas ativas
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
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
                Quando o preço ultrapassa uma zona (zona &quot;pulada&quot;), o capital é
                redistribuído proporcionalmente nas zonas restantes.
              </p>
              <p>
                <strong className="text-foreground">Exemplo:</strong> Se você tem
                $10,000 e a Zona 1 foi pulada (15%), os $1,500 são redistribuídos
                automaticamente nas outras zonas ativas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
