"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, formatUsd } from "@/lib/utils";
import { TrendingDown, Calendar, DollarSign, Target, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

type DcaEntryPoint = {
  id: string;
  targetPrice: number;
  value: number;
  preOrderPlaced: boolean;
  purchaseConfirmed: boolean;
  zoneOrder: number;
};

type ZoneDetailsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  zoneId: string;
  zone: {
    order: number;
    priceMin: number;
    priceMax: number;
    percentualBase: number;
    percentualAjustado: number;
    valorEmDolar: number;
    label: string;
    status: string;
    distanciaPercentual: number;
  } | null;
};

export function ZoneDetailsModal({
  open,
  onOpenChange,
  portfolioId,
  zoneId,
  zone,
}: ZoneDetailsModalProps) {
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
    enabled: open && !!zoneId,
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
          body: JSON.stringify({ numberOfEntries: count, totalValue: zone?.valorEmDolar || 0 }),
        }
      );
      if (!res.ok) throw new Error("Failed to generate entry points");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entry-points", zoneId] });
      toast.success(`${numberOfEntries} pontos de entrada gerados!`);
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
      toast.success("Ponto de entrada removido");
    },
    onError: () => {
      toast.error("Erro ao remover ponto de entrada");
    },
  });

  if (!zone) return null;

  // Calcular estratégia de entradas
  const totalValue = zone.valorEmDolar;
  
  // Estratégia recomendada baseada no valor
  const recommendedStrategy = totalValue > 5000 
    ? { frequency: "semanal", entries: 8, valuePerEntry: totalValue / 8 }
    : totalValue > 2000
    ? { frequency: "semanal", entries: 4, valuePerEntry: totalValue / 4 }
    : { frequency: "mensal", entries: 2, valuePerEntry: totalValue / 2 };

  // Estratégia alternativa (tudo de uma vez)
  const allInStrategy = {
    frequency: "única",
    entries: 1,
    valuePerEntry: totalValue,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>
              {zone.label} - Zona {zone.order}
            </DialogTitle>
            <Badge
              variant="outline"
              className={
                zone.status === "ATIVA"
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : zone.status === "ATUAL"
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "bg-gray-500/20 text-gray-400 border-gray-500/30"
              }
            >
              {zone.status}
            </Badge>
          </div>
          <DialogDescription>
            Estratégias de entrada para esta zona de preço
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da Zona */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-xs">Faixa de Preço</span>
                </div>
                <p className="text-sm font-mono font-medium">
                  {formatPrice(zone.priceMin)} - {formatPrice(zone.priceMax)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-xs">Alocação</span>
                </div>
                <p className="text-sm font-medium">
                  {zone.percentualBase}% → {zone.percentualAjustado}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Capital Total</span>
                </div>
                <p className="text-sm font-bold text-green-400">
                  {formatUsd(zone.valorEmDolar)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-xs">Distância</span>
                </div>
                <p
                  className={`text-sm font-medium ${
                    zone.distanciaPercentual < 0
                      ? "text-green-400"
                      : "text-blue-400"
                  }`}
                >
                  {zone.distanciaPercentual > 0 ? "+" : ""}
                  {zone.distanciaPercentual.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pontos de Entrada DCA */}
          <div className="space-y-4">
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
              <Card className="bg-secondary/30">
                <CardContent className="p-4 space-y-2">
                  {entryPoints.map((point, idx) => {
                    return (
                      <div
                        key={point.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          point.purchaseConfirmed
                            ? "bg-green-500/10 border-green-500/30"
                            : point.preOrderPlaced
                            ? "bg-yellow-500/10 border-yellow-500/30"
                            : "bg-secondary/50 border-border"
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <span className="text-xs font-mono text-muted-foreground w-6">
                            {idx + 1}.
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-mono font-semibold">
                              ${formatPrice(point.targetPrice)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatUsd(point.value)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Checkbox Pré-ordem */}
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`preorder-${point.id}`}
                              checked={point.preOrderPlaced}
                              onCheckedChange={(checked: boolean) =>
                                updatePoint.mutate({
                                  pointId: point.id,
                                  updates: { preOrderPlaced: checked },
                                })
                              }
                              disabled={point.purchaseConfirmed}
                            />
                            <label
                              htmlFor={`preorder-${point.id}`}
                              className="text-xs cursor-pointer select-none"
                            >
                              Pré-ordem
                            </label>
                          </div>

                          {/* Checkbox Confirme Compra */}
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`confirm-${point.id}`}
                              checked={point.purchaseConfirmed}
                              onCheckedChange={(checked: boolean) =>
                                updatePoint.mutate({
                                  pointId: point.id,
                                  updates: { purchaseConfirmed: checked },
                                })
                              }
                            />
                            <label
                              htmlFor={`confirm-${point.id}`}
                              className="text-xs cursor-pointer select-none"
                            >
                              Confirme compra
                            </label>
                          </div>

                          {/* Delete button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deletePoint.mutate(point.id)}
                            disabled={deletePoint.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
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
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-secondary/20">
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  <p>Nenhum ponto de entrada configurado.</p>
                  <p className="text-xs mt-1">
                    Defina quantas entradas deseja e clique em &quot;Gerar Pontos&quot;
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Estratégias */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Estratégias Recomendadas
            </h3>

            {/* Estratégia DCA Recomendada */}
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-blue-400 mb-1">
                      🎯 DCA Escalonado (Recomendado)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Dividir o capital em múltiplas entradas para suavizar o preço médio
                    </p>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Menor Risco
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Frequência</p>
                    <p className="text-sm font-semibold capitalize">
                      {recommendedStrategy.frequency}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nº Entradas</p>
                    <p className="text-sm font-semibold">
                      {recommendedStrategy.entries}x
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Valor/Entrada</p>
                    <p className="text-sm font-bold text-blue-400">
                      {formatUsd(recommendedStrategy.valuePerEntry)}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg">
                  <p className="font-medium mb-1">📌 Como Executar:</p>
                  <ul className="space-y-1 ml-4">
                    <li>
                      • Se o preço permanecer entre {formatPrice(zone.priceMin)} e{" "}
                      {formatPrice(zone.priceMax)}
                    </li>
                    <li>
                      • Fazer {recommendedStrategy.entries} entradas{" "}
                      {recommendedStrategy.frequency === "semanal" ? "semanais" : "mensais"}
                    </li>
                    <li>
                      • Valor por entrada: {formatUsd(recommendedStrategy.valuePerEntry)}
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Estratégia All-In */}
            <Card className="bg-orange-500/5 border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-orange-400 mb-1">
                      ⚡ Entrada Única
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Investir todo o capital de uma vez (maior risco/retorno)
                    </p>
                  </div>
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                    Maior Risco
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Frequência</p>
                    <p className="text-sm font-semibold capitalize">Única</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nº Entradas</p>
                    <p className="text-sm font-semibold">1x</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Valor Total</p>
                    <p className="text-sm font-bold text-orange-400">
                      {formatUsd(allInStrategy.valuePerEntry)}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg">
                  <p className="font-medium mb-1">⚠️ Quando Usar:</p>
                  <ul className="space-y-1 ml-4">
                    <li>• Alta convicção no nível de preço</li>
                    <li>• Fundo detectado com análise técnica</li>
                    <li>• Momento de capitulação do mercado</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
