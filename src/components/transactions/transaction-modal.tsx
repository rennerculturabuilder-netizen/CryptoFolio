"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePortfolio } from "@/lib/hooks/use-portfolio";
import {
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat2,
  Download,
  Upload,
  Receipt,
} from "lucide-react";

type Asset = { id: string; symbol: string; name: string };

type Transaction = {
  id: string;
  type: string;
  timestamp: string;
  venue?: string;
  notes?: string;
  baseAsset?: Asset | null;
  baseAssetId?: string;
  baseQty?: string;
  quoteAsset?: Asset | null;
  quoteAssetId?: string;
  quoteQty?: string;
  price?: string;
  feeAsset?: Asset | null;
  feeAssetId?: string;
  feeQty?: string;
  costBasisUsd?: string;
  valueUsd?: string;
};

const TX_TYPES = ["BUY", "SELL", "SWAP", "DEPOSIT", "WITHDRAW", "FEE"] as const;
type TxType = (typeof TX_TYPES)[number];

const TX_META: Record<TxType, { label: string; icon: React.ElementType; color: string }> = {
  BUY: { label: "Compra", icon: ArrowDownLeft, color: "text-emerald-400" },
  SELL: { label: "Venda", icon: ArrowUpRight, color: "text-red-400" },
  SWAP: { label: "Swap", icon: Repeat2, color: "text-purple-400" },
  DEPOSIT: { label: "Depósito", icon: Download, color: "text-blue-400" },
  WITHDRAW: { label: "Saque", icon: Upload, color: "text-orange-400" },
  FEE: { label: "Taxa", icon: Receipt, color: "text-muted-foreground" },
};

async function fetchAssets(): Promise<Asset[]> {
  const res = await fetch("/api/assets");
  if (!res.ok) return [];
  return res.json();
}

type TransactionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTx?: Transaction | null;
};

export function TransactionModal({
  open,
  onOpenChange,
  editTx,
}: TransactionModalProps) {
  const { selectedId } = usePortfolio();
  const queryClient = useQueryClient();
  const isEdit = !!editTx;

  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: fetchAssets,
    staleTime: 5 * 60_000,
  });

  const [type, setType] = useState<TxType>("BUY");
  const [baseAssetId, setBaseAssetId] = useState("");
  const [baseQty, setBaseQty] = useState("");
  const [quoteAssetId, setQuoteAssetId] = useState("");
  const [quoteQty, setQuoteQty] = useState("");
  const [price, setPrice] = useState("");
  const [feeAssetId, setFeeAssetId] = useState("");
  const [feeQty, setFeeQty] = useState("");
  const [costBasisUsd, setCostBasisUsd] = useState("");
  const [valueUsd, setValueUsd] = useState("");
  const [timestamp, setTimestamp] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // Preencher form quando editando
  useEffect(() => {
    if (editTx) {
      setType(editTx.type as TxType);
      setBaseAssetId(editTx.baseAsset?.id || editTx.baseAssetId || "");
      setBaseQty(editTx.baseQty || "");
      setQuoteAssetId(editTx.quoteAsset?.id || editTx.quoteAssetId || "");
      setQuoteQty(editTx.quoteQty || "");
      setPrice(editTx.price || "");
      setFeeAssetId(editTx.feeAsset?.id || editTx.feeAssetId || "");
      setFeeQty(editTx.feeQty || "");
      setCostBasisUsd(editTx.costBasisUsd || "");
      setValueUsd(editTx.valueUsd || "");
      setTimestamp(new Date(editTx.timestamp).toISOString().slice(0, 16));
      setVenue(editTx.venue || "");
      setNotes(editTx.notes || "");
    } else {
      resetForm();
    }
  }, [editTx, open]);

  function resetForm() {
    setBaseAssetId("");
    setBaseQty("");
    setQuoteAssetId("");
    setQuoteQty("");
    setPrice("");
    setFeeAssetId("");
    setFeeQty("");
    setCostBasisUsd("");
    setValueUsd("");
    setTimestamp(new Date().toISOString().slice(0, 16));
    setVenue("");
    setNotes("");
    setError("");
  }

  // Auto-calcular preço
  useEffect(() => {
    if ((type === "BUY" || type === "SELL") && baseQty && quoteQty) {
      const bq = parseFloat(baseQty);
      const qq = parseFloat(quoteQty);
      if (bq > 0 && qq > 0) {
        setPrice((qq / bq).toFixed(8).replace(/\.?0+$/, ""));
      }
    }
  }, [baseQty, quoteQty, type]);

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        type,
        timestamp: new Date(timestamp).toISOString(),
        venue: venue || undefined,
        notes: notes || undefined,
      };

      const needsBase = ["BUY", "SELL", "SWAP", "DEPOSIT", "WITHDRAW"].includes(type);
      const needsQuote = ["BUY", "SELL", "SWAP"].includes(type);
      const needsCostBasis = ["DEPOSIT", "WITHDRAW"].includes(type);
      const needsValueUsd = type === "SWAP";
      const isFeeOnly = type === "FEE";

      if (needsBase) {
        body.baseAssetId = baseAssetId;
        body.baseQty = baseQty;
      }
      if (needsQuote) {
        body.quoteAssetId = quoteAssetId;
        body.quoteQty = quoteQty;
        if (price) body.price = price;
      }
      if (needsCostBasis && costBasisUsd) body.costBasisUsd = costBasisUsd;
      if (needsValueUsd && valueUsd) body.valueUsd = valueUsd;
      if (isFeeOnly) {
        body.feeAssetId = feeAssetId;
        body.feeQty = feeQty;
      } else if (feeAssetId && feeAssetId !== "__none__" && feeQty) {
        body.feeAssetId = feeAssetId;
        body.feeQty = feeQty;
      }

      const url = isEdit
        ? `/api/transactions/${editTx!.id}`
        : `/api/portfolios/${selectedId}/transactions`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar transação");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wac"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["coingecko-prices"] });
      onOpenChange(false);
      resetForm();
      toast.success(editTx ? "Transação atualizada!" : "Transação criada!");
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error(err.message);
    },
  });

  const needsBase = ["BUY", "SELL", "SWAP", "DEPOSIT", "WITHDRAW"].includes(type);
  const needsQuote = ["BUY", "SELL", "SWAP"].includes(type);
  const needsCostBasis = ["DEPOSIT", "WITHDRAW"].includes(type);
  const needsValueUsd = type === "SWAP";
  const isFeeOnly = type === "FEE";

  // Validação inline
  const canSubmit = (() => {
    if (!selectedId) return false;
    if (isFeeOnly) return !!feeAssetId && !!feeQty && parseFloat(feeQty) > 0;
    if (needsBase && (!baseAssetId || !baseQty || parseFloat(baseQty) <= 0)) return false;
    if (needsQuote && (!quoteAssetId || !quoteQty || parseFloat(quoteQty) <= 0)) return false;
    return true;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Transação" : "Nova Transação"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere os campos desejados"
              : "Selecione o tipo e preencha os dados"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="border-red-500/30 bg-red-500/10">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Type Tabs */}
        {!isEdit && (
          <Tabs
            value={type}
            onValueChange={(v) => {
              setType(v as TxType);
              setError("");
            }}
          >
            <TabsList className="grid grid-cols-6 w-full bg-secondary/50">
              {TX_TYPES.map((t) => {
                const meta = TX_META[t];
                const Icon = meta.icon;
                return (
                  <TabsTrigger
                    key={t}
                    value={t}
                    className="text-xs gap-1 data-[state=active]:bg-background data-[state=active]:shadow-md"
                  >
                    <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                    <span className="hidden sm:inline">{meta.label}</span>
                    <span className="sm:hidden">{t}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        )}

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          {/* Timestamp + Venue */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Data / Hora</Label>
              <Input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="bg-secondary/50 border-border/40 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Exchange (opc.)
              </Label>
              <Input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Binance, Coinbase..."
                className="bg-secondary/50 border-border/40 text-sm"
              />
            </div>
          </div>

          {/* Base Asset */}
          {needsBase && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {type === "BUY"
                    ? "Ativo comprado"
                    : type === "SELL"
                    ? "Ativo vendido"
                    : type === "SWAP"
                    ? "Ativo enviado"
                    : type === "DEPOSIT"
                    ? "Ativo depositado"
                    : "Ativo sacado"}
                </Label>
                <Select value={baseAssetId} onValueChange={setBaseAssetId}>
                  <SelectTrigger className="bg-secondary/50 border-border/40">
                    <SelectValue placeholder="Selecionar ativo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="font-medium">{a.symbol}</span>
                        <span className="text-muted-foreground ml-1 text-xs">
                          {a.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Quantidade</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={baseQty}
                  onChange={(e) => setBaseQty(e.target.value)}
                  placeholder="0.00"
                  className="bg-secondary/50 border-border/40 font-mono"
                  required
                />
              </div>
            </div>
          )}

          {/* Quote Asset */}
          {needsQuote && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {type === "SWAP" ? "Ativo recebido" : "Pago com"}
                </Label>
                <Select value={quoteAssetId} onValueChange={setQuoteAssetId}>
                  <SelectTrigger className="bg-secondary/50 border-border/40">
                    <SelectValue placeholder="Selecionar ativo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="font-medium">{a.symbol}</span>
                        <span className="text-muted-foreground ml-1 text-xs">
                          {a.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {type === "SWAP" ? "Qty recebida" : "Valor total pago"}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={quoteQty}
                  onChange={(e) => setQuoteQty(e.target.value)}
                  placeholder="0.00"
                  className="bg-secondary/50 border-border/40 font-mono"
                  required
                />
              </div>
            </div>
          )}

          {/* Price (auto-calculated for BUY/SELL) */}
          {needsQuote && type !== "SWAP" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Preço unitário
                  <span className="text-muted-foreground/50 ml-1">(auto)</span>
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Calculado automaticamente"
                  className="bg-secondary/30 border-border/30 font-mono text-muted-foreground"
                />
              </div>
              {/* Total display */}
              {baseQty && quoteQty && (
                <div className="flex items-end pb-2">
                  <div className="text-sm text-muted-foreground">
                    {parseFloat(baseQty).toFixed(4)}{" "}
                    {assets.find((a) => a.id === baseAssetId)?.symbol || "?"} ={" "}
                    <span className="text-foreground font-medium">
                      ${parseFloat(quoteQty).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Swap valueUsd */}
          {needsValueUsd && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Valor USD do swap (crypto-crypto)
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                value={valueUsd}
                onChange={(e) => setValueUsd(e.target.value)}
                placeholder="Necessário para swaps crypto→crypto"
                className="bg-secondary/50 border-border/40 font-mono"
              />
            </div>
          )}

          {/* Cost Basis */}
          {needsCostBasis && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Cost Basis USD (opc.)
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                value={costBasisUsd}
                onChange={(e) => setCostBasisUsd(e.target.value)}
                placeholder="Custo de aquisição em USD"
                className="bg-secondary/50 border-border/40 font-mono"
              />
            </div>
          )}

          {/* Fee-only fields */}
          {isFeeOnly && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Ativo da taxa
                </Label>
                <Select value={feeAssetId} onValueChange={setFeeAssetId}>
                  <SelectTrigger className="bg-secondary/50 border-border/40">
                    <SelectValue placeholder="Selecionar ativo..." />
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
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Qty da taxa
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={feeQty}
                  onChange={(e) => setFeeQty(e.target.value)}
                  placeholder="0.00"
                  className="bg-secondary/50 border-border/40 font-mono"
                  required
                />
              </div>
            </div>
          )}

          {/* Optional fee for non-FEE types */}
          {!isFeeOnly && (
            <div className="space-y-3 pt-2 border-t border-border/20">
              <Label className="text-xs text-muted-foreground">
                Taxa (opcional)
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={feeAssetId || "__none__"}
                  onValueChange={(v) =>
                    setFeeAssetId(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger className="bg-secondary/50 border-border/40">
                    <SelectValue placeholder="Sem taxa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem taxa</SelectItem>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {feeAssetId && feeAssetId !== "__none__" && (
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={feeQty}
                    onChange={(e) => setFeeQty(e.target.value)}
                    placeholder="0.00"
                    className="bg-secondary/50 border-border/40 font-mono"
                  />
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Notas (opc.)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre esta transação..."
              className="bg-secondary/50 border-border/40 text-sm"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={mutation.isPending || !canSubmit}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {mutation.isPending
              ? "Salvando..."
              : isEdit
              ? "Salvar Alterações"
              : `Criar ${TX_META[type].label}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
