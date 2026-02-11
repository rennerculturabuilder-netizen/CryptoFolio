"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type DcaZoneEdit = {
  id: string;
  priceMin: number;
  priceMax: number;
  percentualBase: number;
  order: number;
  label: string | null;
};

type DcaZoneModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editZone?: DcaZoneEdit | null;
  portfolioId: string;
  assetSymbol: string;
};

export function DcaZoneModal({
  open,
  onOpenChange,
  editZone,
  portfolioId,
  assetSymbol,
}: DcaZoneModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editZone;

  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [percentualBase, setPercentualBase] = useState("");
  const [order, setOrder] = useState("1");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (editZone) {
      setPriceMin(String(editZone.priceMin));
      setPriceMax(String(editZone.priceMax));
      setPercentualBase(String(editZone.percentualBase));
      setOrder(String(editZone.order));
      setLabel(editZone.label || "");
    } else {
      setPriceMin("");
      setPriceMax("");
      setPercentualBase("");
      setOrder("1");
      setLabel("");
    }
    setError("");
  }, [editZone, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        const res = await fetch(`/api/dca-zones/${editZone!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceMin,
            priceMax,
            percentualBase,
            order: parseInt(order),
            label: label || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erro ao atualizar");
        }
        return res.json();
      } else {
        const res = await fetch(
          `/api/portfolios/${portfolioId}/dca-zones`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assetSymbol,
              priceMin,
              priceMax,
              percentualBase,
              order: parseInt(order),
              label: label || undefined,
            }),
          }
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erro ao criar");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dca-strategy"] });
      queryClient.invalidateQueries({ queryKey: ["dca-zones"] });
      onOpenChange(false);
      toast.success(isEdit ? "Zona DCA atualizada!" : "Zona DCA criada!");
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Zona DCA" : "Nova Zona DCA"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere os parâmetros da zona."
              : `Configure uma zona de compra adaptativa para ${assetSymbol}.`}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            mutation.mutate();
          }}
          className="space-y-4"
        >
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Preço Min */}
            <div className="space-y-2">
              <Label>Preço Mínimo (USD)</Label>
              <Input
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="80000"
                className="bg-secondary/50 border-border/50"
                required
              />
            </div>

            {/* Preço Max */}
            <div className="space-y-2">
              <Label>Preço Máximo (USD)</Label>
              <Input
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="85000"
                className="bg-secondary/50 border-border/50"
                required
              />
            </div>

            {/* % Base */}
            <div className="space-y-2">
              <Label>% Base do Capital</Label>
              <Input
                value={percentualBase}
                onChange={(e) => setPercentualBase(e.target.value)}
                placeholder="25"
                className="bg-secondary/50 border-border/50"
                required
              />
            </div>

            {/* Order */}
            <div className="space-y-2">
              <Label>Order (prioridade)</Label>
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                min="1"
                className="bg-secondary/50 border-border/50"
              />
            </div>

            {/* Label */}
            <div className="space-y-2 col-span-2">
              <Label>Label (opcional)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ex: Correção, Bear, Emergência"
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {mutation.isPending
              ? isEdit
                ? "Salvando..."
                : "Criando..."
              : isEdit
                ? "Salvar Alterações"
                : "Criar Zona DCA"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
