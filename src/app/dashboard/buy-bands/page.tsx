"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePortfolio } from "@/lib/hooks/use-portfolio";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { BuyBandModal } from "@/components/buy-bands/buy-band-modal";
import { PriceBandChart } from "@/components/buy-bands/price-band-chart";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Target,
  CheckCircle,
  Clock,
  Filter,
  X,
} from "lucide-react";
import { formatPrice, formatQty } from "@/lib/utils";
import { toast } from "sonner";
import { DcaStrategyPanel } from "@/components/dca/dca-strategy-panel";

type Asset = { id: string; symbol: string; name: string };
type Portfolio = { id: string; name: string };
type BuyBand = {
  id: string;
  targetPrice: string;
  quantity: string;
  executed: boolean;
  order: number;
  assetId: string;
  portfolioId: string;
  asset: Asset;
  portfolio: Portfolio;
};

const PAGE_SIZE = 15;

const ORDER_COLORS: Record<number, string> = {
  1: "text-emerald-400",
  2: "text-yellow-400",
  3: "text-orange-400",
};

function getOrderColor(order: number): string {
  return ORDER_COLORS[order] || "text-red-400";
}

const ORDER_BG: Record<number, string> = {
  1: "bg-emerald-400/10 border-emerald-400/20",
  2: "bg-yellow-400/10 border-yellow-400/20",
  3: "bg-orange-400/10 border-orange-400/20",
};

function getOrderBg(order: number): string {
  return ORDER_BG[order] || "bg-red-400/10 border-red-400/20";
}

export default function BuyBandsPage() {
  const { portfolios, selectedId } = usePortfolio();
  const queryClient = useQueryClient();

  // State
  const [modalOpen, setModalOpen] = useState(false);
  const [editBand, setEditBand] = useState<BuyBand | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<BuyBand | null>(null);
  const [portfolioFilter, setPortfolioFilter] = useState<string>("__all__");
  const [assetFilter, setAssetFilter] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // DCA Adaptativo state
  const [dcaAsset, setDcaAsset] = useState("BTC");

  // Buscar assets que têm zonas DCA configuradas
  const { data: dcaZones = [] } = useQuery<{ assetSymbol: string }[]>({
    queryKey: ["dca-zones", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const res = await fetch(`/api/portfolios/${selectedId}/dca-zones`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedId,
  });

  const dcaAssets = useMemo(
    () => Array.from(new Set(dcaZones.map((z) => z.assetSymbol))).sort(),
    [dcaZones]
  );

  // Se o asset selecionado não existe na lista, usar o primeiro disponível
  useEffect(() => {
    if (dcaAssets.length > 0 && !dcaAssets.includes(dcaAsset)) {
      setDcaAsset(dcaAssets[0]);
    }
  }, [dcaAssets, dcaAsset]);

  // Buscar buy bands
  const { data: buyBands = [], isLoading } = useQuery<BuyBand[]>({
    queryKey: ["buy-bands"],
    queryFn: async () => {
      const res = await fetch("/api/buy-bands");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Buscar preços atuais
  const symbols = useMemo(
    () => Array.from(new Set(buyBands.map((b) => b.asset.symbol))),
    [buyBands]
  );

  const { data: prices = {} } = useQuery<Record<string, number>>({
    queryKey: ["buy-band-prices", symbols.join(",")],
    queryFn: async () => {
      if (symbols.length === 0) return {};
      const res = await fetch(
        `/api/prices/coingecko?symbols=${symbols.join(",")}`
      );
      if (!res.ok) return {};
      const data = await res.json();
      const result: Record<string, number> = {};
      for (const item of data.prices || []) {
        result[item.symbol] = item.price;
      }
      return result;
    },
    enabled: symbols.length > 0,
    refetchInterval: 60000, // refetch a cada 60s
  });

  // Mutations
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
      queryClient.invalidateQueries({ queryKey: ["buy-bands"] });
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
      queryClient.invalidateQueries({ queryKey: ["buy-bands"] });
      setDeleteConfirm(null);
      toast.success("DCA deletada");
    },
    onError: () => toast.error("Erro ao deletar DCA"),
  });

  // Filtros
  const filtered = useMemo(() => {
    let result = buyBands;

    if (portfolioFilter !== "__all__") {
      result = result.filter((b) => b.portfolioId === portfolioFilter);
    }

    if (assetFilter !== "__all__") {
      result = result.filter((b) => b.asset.symbol === assetFilter);
    }

    if (statusFilter !== "__all__") {
      const isExecuted = statusFilter === "executed";
      result = result.filter((b) => b.executed === isExecuted);
    }

    return result;
  }, [buyBands, portfolioFilter, assetFilter, statusFilter]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset page ao mudar filtros
  useEffect(() => setPage(1), [portfolioFilter, assetFilter, statusFilter]);

  const activeFilters =
    (portfolioFilter !== "__all__" ? 1 : 0) +
    (assetFilter !== "__all__" ? 1 : 0) +
    (statusFilter !== "__all__" ? 1 : 0);

  const uniqueSymbols = useMemo(
    () => Array.from(new Set(buyBands.map((b) => b.asset.symbol))).sort(),
    [buyBands]
  );

  function clearFilters() {
    setPortfolioFilter("__all__");
    setAssetFilter("__all__");
    setStatusFilter("__all__");
    setPage(1);
  }

  // Stats
  const totalBands = buyBands.length;
  const executedBands = buyBands.filter((b) => b.executed).length;
  const pendingBands = totalBands - executedBands;

  // Dados para o chart (apenas pendentes, filtrado por asset se aplicável)
  const chartBands = useMemo(() => {
    let bands = buyBands.filter((b) => !b.executed);
    if (assetFilter !== "__all__") {
      bands = bands.filter((b) => b.asset.symbol === assetFilter);
    }
    return bands;
  }, [buyBands, assetFilter]);

  // Se "Todas as Carteiras" está selecionado, mostrar mensagem
  if (selectedId === "ALL") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground animate-slide-up">
        <Target className="h-16 w-16 mb-4 opacity-30" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          DCA requer carteira individual
        </h2>
        <p className="text-sm text-center max-w-md">
          Selecione uma carteira individualmente para planejar suas entradas de Dollar Cost Average.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DCA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zonas de compra configuradas
          </p>
        </div>
        <Button
          onClick={() => {
            setEditBand(null);
            setModalOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nova DCA
        </Button>
      </div>

      {/* DCA Adaptativo */}
      {selectedId && (
        <DcaStrategyPanel
          portfolioId={selectedId}
        />
      )}

      {/* Separador */}
      <div className="border-t border-border/20 pt-2">
        <h2 className="text-lg font-semibold tracking-tight text-muted-foreground">
          Bandas Manuais
        </h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass border-border/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalBands}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{executedBands}</p>
              <p className="text-xs text-muted-foreground">Executadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingBands}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartBands.length > 0 && (
        <PriceBandChart bands={chartBands} prices={prices} />
      )}

      {/* Filters */}
      <Card className="glass border-border/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtros
              {activeFilters > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {activeFilters}
                </Badge>
              )}
            </Button>

            {activeFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground shrink-0"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}

            <div className="flex-1" />

            <span className="text-sm text-muted-foreground">
              {filtered.length} de {totalBands} DCAs
            </span>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/20">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Portfolio
                </label>
                <Select
                  value={portfolioFilter}
                  onValueChange={setPortfolioFilter}
                >
                  <SelectTrigger className="bg-secondary/50 border-border/40 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {portfolios.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Asset</label>
                <Select value={assetFilter} onValueChange={setAssetFilter}>
                  <SelectTrigger className="bg-secondary/50 border-border/40 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {uniqueSymbols.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-secondary/50 border-border/40 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="executed">Executadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass border-border/30">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium text-foreground">
                {totalBands === 0
                  ? "Nenhuma DCA"
                  : "Nenhum resultado"}
              </p>
              <p className="text-sm mt-1">
                {totalBands === 0
                  ? "Crie sua primeira DCA."
                  : "Tente alterar os filtros."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/20 hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-medium">
                        Portfolio
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Asset
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground font-medium">
                        Preço Alvo
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground font-medium">
                        Qty
                      </TableHead>
                      <TableHead className="text-center text-muted-foreground font-medium">
                        Order
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground font-medium">
                        Preço Atual
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground font-medium">
                        Distância
                      </TableHead>
                      <TableHead className="text-center text-muted-foreground font-medium">
                        Status
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground font-medium w-[100px]">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((band) => {
                      const target = parseFloat(band.targetPrice);
                      const current = prices[band.asset.symbol];
                      const distance = current
                        ? ((current - target) / target) * 100
                        : null;

                      return (
                        <TableRow
                          key={band.id}
                          className={`border-border/15 hover:bg-accent/30 transition-colors ${
                            band.executed ? "opacity-50" : ""
                          }`}
                        >
                          {/* Portfolio */}
                          <TableCell className="text-sm">
                            {band.portfolio.name}
                          </TableCell>

                          {/* Asset */}
                          <TableCell className="font-medium">
                            {band.asset.symbol}
                          </TableCell>

                          {/* Preço Alvo */}
                          <TableCell className="text-right font-mono text-sm">
                            {formatPrice(target)}
                          </TableCell>

                          {/* Qty */}
                          <TableCell className="text-right font-mono text-sm">
                            {formatQty(parseFloat(band.quantity))}
                          </TableCell>

                          {/* Order */}
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`${getOrderBg(band.order)} ${getOrderColor(band.order)} border text-xs`}
                            >
                              Zone {band.order}
                            </Badge>
                          </TableCell>

                          {/* Preço Atual */}
                          <TableCell className="text-right font-mono text-sm">
                            {current ? formatPrice(current) : "—"}
                          </TableCell>

                          {/* Distância */}
                          <TableCell className="text-right font-mono text-sm">
                            {distance !== null ? (
                              <span
                                className={
                                  distance <= 0
                                    ? "text-emerald-400"
                                    : distance <= 5
                                      ? "text-yellow-400"
                                      : "text-muted-foreground"
                                }
                              >
                                {distance > 0 ? "+" : ""}
                                {distance.toFixed(2)}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toggleMutation.mutate({
                                  id: band.id,
                                  executed: !band.executed,
                                })
                              }
                              className={
                                band.executed
                                  ? "text-emerald-400 hover:text-emerald-300"
                                  : "text-yellow-400 hover:text-yellow-300"
                              }
                            >
                              {band.executed ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Executada
                                </>
                              ) : (
                                <>
                                  <Clock className="h-4 w-4 mr-1" />
                                  Pendente
                                </>
                              )}
                            </Button>
                          </TableCell>

                          {/* Ações */}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-accent"
                                onClick={() => {
                                  setEditBand(band);
                                  setModalOpen(true);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-red-500/10 text-red-400 hover:text-red-400"
                                onClick={() => setDeleteConfirm(band)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border/20">
                  <span className="text-sm text-muted-foreground">
                    {(currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(currentPage * PAGE_SIZE, filtered.length)} de{" "}
                    {filtered.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(totalPages, 5) },
                        (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={
                                pageNum === currentPage ? "default" : "ghost"
                              }
                              size="icon"
                              className="h-8 w-8 text-xs"
                              onClick={() => setPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Buy Band Modal */}
      <BuyBandModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditBand(null);
        }}
        editBand={editBand}
        portfolios={portfolios}
        defaultPortfolioId={selectedId || undefined}
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
              Tem certeza que deseja deletar esta DCA?
            </DialogDescription>
          </DialogHeader>
          {deleteConfirm && (
            <div className="text-sm space-y-1 bg-secondary/30 p-3 rounded-lg">
              <p>
                <span className="text-muted-foreground">Asset:</span>{" "}
                <span className="font-medium">
                  {deleteConfirm.asset.symbol}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Preço Alvo:</span>{" "}
                {formatPrice(parseFloat(deleteConfirm.targetPrice))}
              </p>
              <p>
                <span className="text-muted-foreground">Zone:</span>{" "}
                {deleteConfirm.order}
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
