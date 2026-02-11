"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AssetSelector } from "./asset-selector";
import { DcaZonesDisplay } from "./dca-zones-display";
import { DcaZoneModal } from "./dca-zone-modal";
import {
  Plus,
  Wallet,
  Target,
  SkipForward,
  TrendingUp,
} from "lucide-react";
import { formatUsd, formatPct } from "@/lib/utils";
import type { DcaZoneComputed } from "@/lib/dca/engine";

type DcaStrategyResponse = {
  asset: string;
  currentPrice: number;
  capitalTotal: number;
  zones: DcaZoneComputed[];
  resumo: {
    totalZonas: number;
    ativas: number;
    puladas: number;
    executadas: number;
  };
};

type DcaStrategyPanelProps = {
  portfolioId: string;
  dcaAsset: string;
  onAssetChange: (asset: string) => void;
  availableAssets: string[];
};

export function DcaStrategyPanel({
  portfolioId,
  dcaAsset,
  onAssetChange,
  availableAssets,
}: DcaStrategyPanelProps) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editZone, setEditZone] = useState<DcaZoneComputed | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DcaZoneComputed | null>(null);

  const { data, isLoading } = useQuery<DcaStrategyResponse>({
    queryKey: ["dca-strategy", portfolioId, dcaAsset],
    queryFn: async () => {
      const res = await fetch(
        `/api/portfolios/${portfolioId}/dca-strategy?asset=${dcaAsset}`
      );
      if (!res.ok) throw new Error("Erro ao carregar estratégia DCA");
      return res.json();
    },
    enabled: !!portfolioId && !!dcaAsset,
    refetchInterval: 60000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dca-zones/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dca-strategy"] });
      setDeleteConfirm(null);
    },
  });

  const toggleExecutedMutation = useMutation({
    mutationFn: async ({ id, executed }: { id: string; executed: boolean }) => {
      const res = await fetch(`/api/dca-zones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executed }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dca-strategy"] });
    },
  });

  const totalAlocado = data?.zones
    .filter((z) => z.status === "ATIVA")
    .reduce((acc, z) => acc + z.percentualAjustado, 0) ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold tracking-tight">DCA Adaptativo</h2>
          {availableAssets.length > 0 && (
            <AssetSelector
              assets={availableAssets}
              value={dcaAsset}
              onChange={onAssetChange}
            />
          )}
        </div>
        <Button
          onClick={() => {
            setEditZone(null);
            setModalOpen(true);
          }}
          size="sm"
          className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nova Zona
        </Button>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="glass border-border/30">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold truncate">
                  {formatUsd(data.capitalTotal)}
                </p>
                <p className="text-[10px] text-muted-foreground">Capital Stables</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-border/30">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Target className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold">{data.resumo.ativas}</p>
                <p className="text-[10px] text-muted-foreground">Zonas Ativas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-border/30">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                <SkipForward className="h-4 w-4 text-yellow-500" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold">{data.resumo.puladas}</p>
                <p className="text-[10px] text-muted-foreground">Puladas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-border/30">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold">{formatPct(totalAlocado)}</p>
                <p className="text-[10px] text-muted-foreground">% Alocado</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Preço atual */}
      {data && data.currentPrice > 0 && (
        <p className="text-xs text-muted-foreground">
          Preço atual de {data.asset}:{" "}
          <span className="text-foreground font-mono">
            {formatUsd(data.currentPrice)}
          </span>
        </p>
      )}

      {/* Zones Display */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <DcaZonesDisplay
          zones={data?.zones ?? []}
          onEdit={(zone) => {
            setEditZone(zone);
            setModalOpen(true);
          }}
          onDelete={setDeleteConfirm}
        />
      )}

      {/* Modal Create/Edit */}
      <DcaZoneModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditZone(null);
        }}
        editZone={editZone}
        portfolioId={portfolioId}
        assetSymbol={dcaAsset}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
      >
        <DialogContent className="glass-strong max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar esta zona DCA?
            </DialogDescription>
          </DialogHeader>
          {deleteConfirm && (
            <div className="text-sm space-y-1 bg-secondary/30 p-3 rounded-lg">
              <p>
                <span className="text-muted-foreground">Zona:</span>{" "}
                <span className="font-medium">Zone {deleteConfirm.order}</span>
                {deleteConfirm.label && (
                  <span className="text-muted-foreground"> ({deleteConfirm.label})</span>
                )}
              </p>
              <p>
                <span className="text-muted-foreground">Faixa:</span>{" "}
                {formatUsd(deleteConfirm.priceMin)} — {formatUsd(deleteConfirm.priceMax)}
              </p>
              <p>
                <span className="text-muted-foreground">% Base:</span>{" "}
                {deleteConfirm.percentualBase}%
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirm) deleteMutation.mutate(deleteConfirm.id);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deletando..." : "Deletar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
