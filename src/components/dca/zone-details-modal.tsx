"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice, formatUsd } from "@/lib/utils";
import { TrendingDown, Calendar, DollarSign, Target } from "lucide-react";

type ZoneDetailsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  zone,
}: ZoneDetailsModalProps) {
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
