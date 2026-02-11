"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { formatPrice, formatUsd } from "@/lib/utils";
import { toast } from "sonner";

type PreOrder = {
  id: string;
  zoneOrder: number;
  zoneLabel: string;
  targetPrice: number;
  value: number;
  active: boolean;
};

type PreOrdersPanelProps = {
  portfolioId: string;
  asset: string;
  zones: {
    order: number;
    label: string;
    priceMin: number;
    priceMax: number;
    valorEmDolar: number;
  }[];
  preOrders: PreOrder[];
  onUpdate: () => void;
};

export function PreOrdersPanel({
  portfolioId,
  asset,
  zones,
  preOrders,
  onUpdate,
}: PreOrdersPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [value, setValue] = useState("");

  const activePreOrders = preOrders.filter((po) => po.active);
  const totalPreOrderValue = activePreOrders.reduce((acc, po) => acc + po.value, 0);

  async function handleCreatePreOrder() {
    if (!selectedZone || !targetPrice || !value) {
      toast.error("Preencha todos os campos");
      return;
    }

    const priceNum = parseFloat(targetPrice);
    const valueNum = parseFloat(value);

    // Validar se o preço está dentro da zona
    const zone = zones.find((z) => z.order === parseInt(selectedZone));
    if (!zone) {
      toast.error("Zona não encontrada");
      return;
    }

    if (priceNum < zone.priceMin || priceNum > zone.priceMax) {
      toast.error(
        `Preço deve estar entre ${formatPrice(zone.priceMin)} e ${formatPrice(zone.priceMax)}`
      );
      return;
    }

    // Validar se há saldo disponível na zona
    const zonePreOrders = activePreOrders.filter(
      (po) => po.zoneOrder === zone.order
    );
    const zonePreOrderValue = zonePreOrders.reduce((acc, po) => acc + po.value, 0);
    const availableValue = zone.valorEmDolar - zonePreOrderValue;

    if (valueNum > availableValue) {
      toast.error(
        `Saldo insuficiente na zona. Disponível: ${formatUsd(availableValue)}`
      );
      return;
    }

    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/pre-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetSymbol: asset,
          zoneOrder: zone.order,
          targetPrice: priceNum,
          value: valueNum,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao criar pré-ordem");
      }

      toast.success("Pré-ordem criada!");
      setModalOpen(false);
      setSelectedZone("");
      setTargetPrice("");
      setValue("");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function handleDeletePreOrder(id: string) {
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/pre-orders/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Erro ao deletar pré-ordem");
      }

      toast.success("Pré-ordem removida!");
      onUpdate();
    } catch (error) {
      toast.error("Erro ao remover pré-ordem");
    }
  }

  return (
    <>
      <Card className="bg-yellow-500/5 border-yellow-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                Pré-ordens Limitadas
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Ordens já configuradas no livro de ofertas da exchange
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nova Pré-ordem
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {activePreOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                Nenhuma pré-ordem configurada
              </p>
              <p className="text-xs mt-1">
                Configure ordens limitadas para capturar preços rapidamente
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activePreOrders.map((preOrder) => (
                <div
                  key={preOrder.id}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/20"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className="bg-yellow-400/10 text-yellow-400 border-yellow-400/20 text-xs"
                      >
                        Zone {preOrder.zoneOrder}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {preOrder.zoneLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Preço:</span>{" "}
                        <span className="font-mono font-medium">
                          {formatPrice(preOrder.targetPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor:</span>{" "}
                        <span className="font-bold text-yellow-400">
                          {formatUsd(preOrder.value)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-red-500/10 text-red-400 hover:text-red-400"
                    onClick={() => handleDeletePreOrder(preOrder.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-3 border-t border-border/20">
                <span className="text-sm text-muted-foreground">
                  Total em Pré-ordens:
                </span>
                <span className="text-lg font-bold text-yellow-400">
                  {formatUsd(totalPreOrderValue)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Nova Pré-ordem */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>Nova Pré-ordem</DialogTitle>
            <DialogDescription>
              Configure uma ordem limitada no livro de ofertas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selecionar Zona */}
            <div className="space-y-2">
              <Label>Zona de Preço</Label>
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Selecione a zona" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => {
                    const zonePreOrders = activePreOrders.filter(
                      (po) => po.zoneOrder === zone.order
                    );
                    const zonePreOrderValue = zonePreOrders.reduce(
                      (acc, po) => acc + po.value,
                      0
                    );
                    const available = zone.valorEmDolar - zonePreOrderValue;

                    return (
                      <SelectItem key={zone.order} value={String(zone.order)}>
                        <div className="flex items-center justify-between gap-4">
                          <span>
                            Zone {zone.order} - {zone.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Disponível: {formatUsd(available)}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Preço Alvo */}
            <div className="space-y-2">
              <Label>Preço Alvo (USD)</Label>
              <Input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="85000"
                className="bg-secondary/50 border-border/50"
                step="0.01"
              />
              {selectedZone && (
                <p className="text-xs text-muted-foreground">
                  Faixa da zona:{" "}
                  {formatPrice(
                    zones.find((z) => z.order === parseInt(selectedZone))
                      ?.priceMin || 0
                  )}{" "}
                  -{" "}
                  {formatPrice(
                    zones.find((z) => z.order === parseInt(selectedZone))
                      ?.priceMax || 0
                  )}
                </p>
              )}
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label>Valor (USD)</Label>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="1000"
                className="bg-secondary/50 border-border/50"
                step="0.01"
              />
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/20 p-3 rounded-lg text-xs text-muted-foreground">
              <p className="font-medium mb-1 text-yellow-400">
                💡 Como funciona:
              </p>
              <ul className="space-y-1 ml-4">
                <li>
                  • O valor será descontado do saldo disponível da zona
                </li>
                <li>
                  • A ordem ficará no livro aguardando o preço
                </li>
                <li>
                  • Se executada, você deve marcar manualmente como concluída
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreatePreOrder}
              className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30"
            >
              Criar Pré-ordem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
