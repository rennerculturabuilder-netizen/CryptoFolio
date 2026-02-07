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
import { Plus, Trash2, Loader2, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { formatUsd, formatQty } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

type Asset = { id: string; symbol: string; name: string };
type BuyBand = {
  id: string;
  targetPrice: string;
  quantity: string;
  executed: boolean;
  order: number;
  asset: Asset;
};

export function BuyBandsTab({
  portfolioId,
  buyBands,
  assets,
  onRefresh,
}: {
  portfolioId: string;
  buyBands: BuyBand[];
  assets: Asset[];
  onRefresh: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, executed }: { id: string; executed: boolean }) => {
      const res = await fetch(`/api/buy-bands/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executed }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
    },
    onSuccess: (_, vars) => {
      onRefresh();
      toast.success(vars.executed ? "Marcada como executada" : "Marcada como pendente");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/buy-bands/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar");
    },
    onSuccess: () => {
      onRefresh();
      toast.success("Buy band deletada");
    },
    onError: () => toast.error("Erro ao deletar"),
  });

  const executedCount = buyBands.filter((b) => b.executed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{buyBands.length} buy bands</span>
          {buyBands.length > 0 && (
            <Badge variant={executedCount === buyBands.length ? "success" : "warning"}>
              {executedCount}/{buyBands.length} executadas
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/buy-bands">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Ver todas
            </Button>
          </Link>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nova Band
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Buy Band</DialogTitle>
              <DialogDescription>Configure um alvo de compra para um ativo.</DialogDescription>
            </DialogHeader>
            <BuyBandForm
              portfolioId={portfolioId}
              assets={assets}
              onDone={() => { setDialogOpen(false); onRefresh(); }}
            />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Progress bar */}
      {buyBands.length > 0 && (
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${(executedCount / buyBands.length) * 100}%` }}
          />
        </div>
      )}

      {buyBands.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">Nenhuma buy band configurada.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Preço Alvo</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-center">Order</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buyBands.map((band) => (
              <TableRow key={band.id} className={band.executed ? "opacity-60" : ""}>
                <TableCell className="font-medium">{band.asset.symbol}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatUsd(parseFloat(band.targetPrice))}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatQty(parseFloat(band.quantity))}
                </TableCell>
                <TableCell className="text-center">{band.order}</TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMutation.mutate({ id: band.id, executed: !band.executed })}
                    className={band.executed ? "text-green-600" : "text-yellow-600"}
                  >
                    {band.executed ? (
                      <><CheckCircle className="h-4 w-4 mr-1" /> Executada</>
                    ) : (
                      <><Clock className="h-4 w-4 mr-1" /> Pendente</>
                    )}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => {
                      if (confirm("Deletar buy band?")) deleteMutation.mutate(band.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function BuyBandForm({
  portfolioId,
  assets,
  onDone,
}: {
  portfolioId: string;
  assets: Asset[];
  onDone: () => void;
}) {
  const [assetId, setAssetId] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [order, setOrder] = useState("0");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

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
      setError(data.error || "Erro ao criar");
      setSaving(false);
      return;
    }

    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Asset</Label>
          <Select value={assetId} onValueChange={setAssetId}>
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
          <Label>Preço Alvo</Label>
          <Input value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder="50000" required />
        </div>
        <div className="space-y-2">
          <Label>Quantidade</Label>
          <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0.1" required />
        </div>
        <div className="space-y-2">
          <Label>Order</Label>
          <Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} min="0" />
        </div>
      </div>
      <Button type="submit" disabled={saving} className="w-full">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {saving ? "Criando..." : "Criar Buy Band"}
      </Button>
    </form>
  );
}
