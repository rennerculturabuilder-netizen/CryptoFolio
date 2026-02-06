"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

type Asset = { id: string; symbol: string; name: string };
type Transaction = {
  id: string; type: string; timestamp: string; venue?: string; notes?: string;
  baseAsset?: Asset | null; baseQty?: string;
  quoteAsset?: Asset | null; quoteQty?: string;
  price?: string; feeAsset?: Asset | null; feeQty?: string;
  costBasisUsd?: string; valueUsd?: string;
};

const TX_TYPES = ["BUY", "SELL", "SWAP", "DEPOSIT", "WITHDRAW", "FEE"] as const;
const TX_COLORS: Record<string, string> = {
  BUY: "bg-green-100 text-green-800",
  SELL: "bg-red-100 text-red-800",
  SWAP: "bg-purple-100 text-purple-800",
  DEPOSIT: "bg-blue-100 text-blue-800",
  WITHDRAW: "bg-orange-100 text-orange-800",
  FEE: "bg-gray-100 text-gray-800",
};

export function TransactionsTab({
  portfolioId,
  transactions,
  assets,
  onRefresh,
}: {
  portfolioId: string;
  transactions: Transaction[];
  assets: Asset[];
  onRefresh: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (txId: string) => {
      const res = await fetch(`/api/portfolios/${portfolioId}/transactions/${txId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar");
    },
    onSuccess: () => onRefresh(),
  });

  function openEdit(tx: Transaction) {
    setEditTx(tx);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditTx(null);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{transactions.length} transações</span>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditTx(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editTx ? "Editar Transação" : "Nova Transação"}</DialogTitle>
              <DialogDescription>
                {editTx ? "Altere os campos desejados" : "Preencha os dados da transação"}
              </DialogDescription>
            </DialogHeader>
            <TransactionForm
              portfolioId={portfolioId}
              assets={assets}
              editTx={editTx || undefined}
              onDone={() => { setDialogOpen(false); setEditTx(null); onRefresh(); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {transactions.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">Nenhuma transação.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Base</TableHead>
              <TableHead>Quote</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(tx.timestamp).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={TX_COLORS[tx.type] || ""}>
                    {tx.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{tx.baseAsset?.symbol || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{tx.quoteAsset?.symbol || "—"}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {tx.baseQty ? parseFloat(tx.baseQty).toFixed(6) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {tx.price ? `$${parseFloat(tx.price).toFixed(2)}` : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {tx.feeAsset && tx.feeQty
                    ? `${parseFloat(tx.feeQty).toFixed(6)} ${tx.feeAsset.symbol}`
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tx)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm("Deletar transação?")) deleteMutation.mutate(tx.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function TransactionForm({
  portfolioId,
  assets,
  editTx,
  onDone,
}: {
  portfolioId: string;
  assets: Asset[];
  editTx?: Transaction;
  onDone: () => void;
}) {
  const [type, setType] = useState(editTx?.type || "BUY");
  const [baseAssetId, setBaseAssetId] = useState(editTx?.baseAsset?.id || "");
  const [baseQty, setBaseQty] = useState(editTx?.baseQty || "");
  const [quoteAssetId, setQuoteAssetId] = useState(editTx?.quoteAsset?.id || "");
  const [quoteQty, setQuoteQty] = useState(editTx?.quoteQty || "");
  const [price, setPrice] = useState(editTx?.price || "");
  const [feeAssetId, setFeeAssetId] = useState(editTx?.feeAsset?.id || "");
  const [feeQty, setFeeQty] = useState(editTx?.feeQty || "");
  const [costBasisUsd, setCostBasisUsd] = useState(editTx?.costBasisUsd || "");
  const [valueUsd, setValueUsd] = useState(editTx?.valueUsd || "");
  const [timestamp, setTimestamp] = useState(
    editTx ? new Date(editTx.timestamp).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [venue, setVenue] = useState(editTx?.venue || "");
  const [notes, setNotes] = useState(editTx?.notes || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const needsBase = ["BUY", "SELL", "SWAP", "DEPOSIT", "WITHDRAW"].includes(type);
  const needsQuote = ["BUY", "SELL", "SWAP"].includes(type);
  const needsCostBasis = ["DEPOSIT", "WITHDRAW"].includes(type);
  const needsValueUsd = type === "SWAP";
  const isFeeOnly = type === "FEE";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const body: Record<string, unknown> = {
      type,
      timestamp: new Date(timestamp).toISOString(),
      venue: venue || undefined,
      notes: notes || undefined,
    };

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
    } else if (feeAssetId && feeQty) {
      body.feeAssetId = feeAssetId;
      body.feeQty = feeQty;
    }

    try {
      const url = editTx
        ? `/api/transactions/${editTx.id}`
        : `/api/portfolios/${portfolioId}/transactions`;
      const method = editTx ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao salvar");
        setSaving(false);
        return;
      }
      onDone();
    } catch {
      setError("Erro de conexão");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        {!editTx && (
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TX_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Data/Hora</Label>
          <Input type="datetime-local" value={timestamp} onChange={(e) => setTimestamp(e.target.value)} required />
        </div>

        {needsBase && (
          <>
            <div className="space-y-2">
              <Label>Asset {type === "BUY" ? "(compra)" : type === "SELL" ? "(venda)" : ""}</Label>
              <Select value={baseAssetId} onValueChange={setBaseAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input value={baseQty} onChange={(e) => setBaseQty(e.target.value)} placeholder="0.00" required />
            </div>
          </>
        )}

        {needsQuote && (
          <>
            <div className="space-y-2">
              <Label>{type === "SWAP" ? "Asset recebido" : "Pago com"}</Label>
              <Select value={quoteAssetId} onValueChange={setQuoteAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{type === "SWAP" ? "Qty recebida" : "Valor pago"}</Label>
              <Input value={quoteQty} onChange={(e) => setQuoteQty(e.target.value)} placeholder="0.00" required />
            </div>
          </>
        )}

        {needsQuote && type !== "SWAP" && (
          <div className="space-y-2">
            <Label>Preço unitário (opc.)</Label>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          </div>
        )}

        {needsValueUsd && (
          <div className="space-y-2">
            <Label>Valor USD do swap</Label>
            <Input value={valueUsd} onChange={(e) => setValueUsd(e.target.value)} placeholder="Para crypto-crypto" />
          </div>
        )}

        {needsCostBasis && (
          <div className="space-y-2">
            <Label>Cost Basis USD (opc.)</Label>
            <Input value={costBasisUsd} onChange={(e) => setCostBasisUsd(e.target.value)} placeholder="0.00" />
          </div>
        )}

        {isFeeOnly ? (
          <>
            <div className="space-y-2">
              <Label>Fee Asset</Label>
              <Select value={feeAssetId} onValueChange={setFeeAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fee Qty</Label>
              <Input value={feeQty} onChange={(e) => setFeeQty(e.target.value)} placeholder="0.00" required />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Fee Asset (opc.)</Label>
              <Select value={feeAssetId} onValueChange={setFeeAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem fee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem fee</SelectItem>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {feeAssetId && feeAssetId !== "none" && (
              <div className="space-y-2">
                <Label>Fee Qty</Label>
                <Input value={feeQty} onChange={(e) => setFeeQty(e.target.value)} placeholder="0.00" />
              </div>
            )}
          </>
        )}

        <div className="space-y-2">
          <Label>Exchange (opc.)</Label>
          <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Binance, Coinbase..." />
        </div>

        <div className="space-y-2">
          <Label>Notas (opc.)</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <Button type="submit" disabled={saving} className="w-full">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {saving ? "Salvando..." : editTx ? "Salvar Alterações" : "Criar Transação"}
      </Button>
    </form>
  );
}
