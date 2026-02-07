"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Asset = { id: string; symbol: string; name: string };
type Portfolio = { id: string; name: string };
type BuyBand = {
  id: string;
  targetPrice: string;
  quantity: string;
  order: number;
  executed: boolean;
  assetId: string;
  portfolioId: string;
  asset: Asset;
  portfolio: Portfolio;
};

export function BuyBandModal({
  open,
  onOpenChange,
  editBand,
  portfolios,
  defaultPortfolioId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editBand?: BuyBand | null;
  portfolios: Portfolio[];
  defaultPortfolioId?: string;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!editBand;

  const [portfolioId, setPortfolioId] = useState(defaultPortfolioId || "");
  const [assetId, setAssetId] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [order, setOrder] = useState("0");
  const [error, setError] = useState("");

  // Buscar assets do portfolio selecionado
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["portfolio-assets", portfolioId],
    queryFn: async () => {
      if (!portfolioId) return [];
      const res = await fetch(`/api/portfolios/${portfolioId}/transactions`);
      if (!res.ok) return [];
      const txs = await res.json();
      // Extrair assets únicos das transações
      const assetMap = new Map<string, Asset>();
      for (const tx of txs) {
        if (tx.baseAsset) assetMap.set(tx.baseAsset.id, tx.baseAsset);
        if (tx.quoteAsset) assetMap.set(tx.quoteAsset.id, tx.quoteAsset);
      }
      return Array.from(assetMap.values()).sort((a, b) =>
        a.symbol.localeCompare(b.symbol)
      );
    },
    enabled: !!portfolioId,
  });

  // Preencher campos no edit mode
  useEffect(() => {
    if (editBand) {
      setPortfolioId(editBand.portfolioId);
      setAssetId(editBand.assetId);
      setTargetPrice(editBand.targetPrice);
      setQuantity(editBand.quantity);
      setOrder(String(editBand.order));
    } else {
      setPortfolioId(defaultPortfolioId || "");
      setAssetId("");
      setTargetPrice("");
      setQuantity("");
      setOrder("0");
    }
    setError("");
  }, [editBand, open, defaultPortfolioId]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        const res = await fetch(`/api/buy-bands/${editBand!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetPrice,
            quantity,
            order: parseInt(order),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erro ao atualizar");
        }
        return res.json();
      } else {
        const res = await fetch(`/api/portfolios/${portfolioId}/buy-bands`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId,
            targetPrice,
            quantity,
            order: parseInt(order),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erro ao criar");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buy-bands"] });
      onOpenChange(false);
      toast.success(isEdit ? "Buy band atualizada!" : "Buy band criada!");
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
          <DialogTitle>{isEdit ? "Editar Buy Band" : "Criar Buy Band"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere os dados da buy band."
              : "Configure um alvo de compra para um ativo."}
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
            {/* Portfolio */}
            <div className="space-y-2">
              <Label>Portfolio</Label>
              <Select
                value={portfolioId}
                onValueChange={setPortfolioId}
                disabled={isEdit}
              >
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Asset */}
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select
                value={assetId}
                onValueChange={setAssetId}
                disabled={isEdit || !portfolioId}
              >
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preço Alvo */}
            <div className="space-y-2">
              <Label>Preço Alvo (USD)</Label>
              <Input
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="50000"
                className="bg-secondary/50 border-border/50"
                required
              />
            </div>

            {/* Quantidade */}
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.1"
                className="bg-secondary/50 border-border/50"
                required
              />
            </div>

            {/* Order */}
            <div className="space-y-2 col-span-2">
              <Label>Order (zona de compra)</Label>
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                min="0"
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
                : "Criar Buy Band"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
