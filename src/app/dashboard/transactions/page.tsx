"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePortfolio } from "@/lib/hooks/use-portfolio";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { TransactionModal } from "@/components/transactions/transaction-modal";
import { CSVImportDialog } from "@/components/transactions/csv-import-dialog";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat2,
  Download,
  Upload,
  Receipt,
  Filter,
  X,
  ArrowLeftRight,
  FileDown,
  FileUp,
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

const TX_BADGE: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  BUY: { icon: ArrowDownLeft, bg: "bg-emerald-400/10 border-emerald-400/20", text: "text-emerald-400" },
  SELL: { icon: ArrowUpRight, bg: "bg-red-400/10 border-red-400/20", text: "text-red-400" },
  SWAP: { icon: Repeat2, bg: "bg-purple-400/10 border-purple-400/20", text: "text-purple-400" },
  DEPOSIT: { icon: Download, bg: "bg-blue-400/10 border-blue-400/20", text: "text-blue-400" },
  WITHDRAW: { icon: Upload, bg: "bg-orange-400/10 border-orange-400/20", text: "text-orange-400" },
  FEE: { icon: Receipt, bg: "bg-muted border-border/30", text: "text-muted-foreground" },
};

const PAGE_SIZE = 15;

async function fetchTransactions(portfolioId: string | null): Promise<Transaction[]> {
  if (!portfolioId) return [];
  const endpoint = portfolioId === "ALL"
    ? "/api/portfolios/all/transactions"
    : `/api/portfolios/${portfolioId}/transactions`;
  const res = await fetch(endpoint);
  if (!res.ok) return [];
  return res.json();
}

export default function TransactionsPage() {
  const { selectedId, selected } = usePortfolio();
  const queryClient = useQueryClient();

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Transaction | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("__all__");
  const [assetFilter, setAssetFilter] = useState<string>("__all__");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", selectedId],
    queryFn: () => fetchTransactions(selectedId!),
    enabled: !!selectedId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (txId: string) => {
      const res = await fetch(
        `/api/portfolios/${selectedId}/transactions/${txId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao deletar");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wac"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summaries"] });
      setDeleteConfirm(null);
      toast.success("Transação deletada");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Filtrar transações
  const filtered = useMemo(() => {
    let result = transactions;

    if (typeFilter !== "__all__") {
      result = result.filter((tx) => tx.type === typeFilter);
    }

    if (assetFilter !== "__all__") {
      result = result.filter(
        (tx) =>
          tx.baseAsset?.symbol === assetFilter ||
          tx.quoteAsset?.symbol === assetFilter ||
          tx.feeAsset?.symbol === assetFilter
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((tx) => new Date(tx.timestamp) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((tx) => new Date(tx.timestamp) <= to);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.baseAsset?.symbol.toLowerCase().includes(q) ||
          tx.quoteAsset?.symbol.toLowerCase().includes(q) ||
          tx.venue?.toLowerCase().includes(q) ||
          tx.notes?.toLowerCase().includes(q) ||
          tx.type.toLowerCase().includes(q)
      );
    }

    return result;
  }, [transactions, typeFilter, assetFilter, dateFrom, dateTo, searchQuery]);

  // Paginar
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedTxs = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset page on filter change
  const activeFilters =
    (typeFilter !== "__all__" ? 1 : 0) +
    (assetFilter !== "__all__" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  // Unique symbols para filtro de asset
  const uniqueSymbols = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.baseAsset?.symbol) set.add(tx.baseAsset.symbol);
      if (tx.quoteAsset?.symbol) set.add(tx.quoteAsset.symbol);
    });
    return Array.from(set).sort();
  }, [transactions]);

  function clearFilters() {
    setTypeFilter("__all__");
    setAssetFilter("__all__");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setPage(1);
  }

  function formatQty(val: string | undefined, decimals = 6): string {
    if (!val) return "—";
    const n = parseFloat(val);
    if (n === 0) return "0";
    return n.toFixed(decimals).replace(/\.?0+$/, "");
  }

  if (!selectedId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <ArrowLeftRight className="h-16 w-16 mb-4 opacity-30" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Selecione um portfolio
        </h2>
        <p className="text-sm">
          Use o seletor no topo para escolher um portfolio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedId === "ALL" 
              ? "Todas as Carteiras" 
              : selected?.name} — {transactions.length} transações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                `/api/portfolios/${selectedId}/transactions/export`,
                "_blank"
              )
            }
            disabled={transactions.length === 0}
          >
            <FileDown className="h-4 w-4 mr-1" />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
          >
            <FileUp className="h-4 w-4 mr-1" />
            Importar
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <Card className="glass border-border/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ativo, exchange, notas..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10 bg-secondary/50 border-border/40"
              />
            </div>

            {/* Toggle filters */}
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
          </div>

          {/* Filter bar */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/20">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Tipo</label>
                <Select
                  value={typeFilter}
                  onValueChange={(v) => {
                    setTypeFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="bg-secondary/50 border-border/40 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {TX_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Ativo</label>
                <Select
                  value={assetFilter}
                  onValueChange={(v) => {
                    setAssetFilter(v);
                    setPage(1);
                  }}
                >
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
                <label className="text-xs text-muted-foreground">De</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="bg-secondary/50 border-border/40 h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Até</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="bg-secondary/50 border-border/40 h-9"
                />
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
              <ArrowLeftRight className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium text-foreground">
                {transactions.length === 0
                  ? "Nenhuma transação"
                  : "Nenhum resultado"}
              </p>
              <p className="text-sm mt-1">
                {transactions.length === 0
                  ? "Adicione sua primeira transação."
                  : "Tente alterar os filtros."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/20 hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-medium w-[120px]">
                        Data
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium w-[100px]">
                        Tipo
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Base
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground font-medium">
                        Qty
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Quote
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground font-medium">
                        Valor
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground font-medium">
                        Preço
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Fee
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium w-[100px]">
                        Exchange
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground font-medium w-[80px]">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTxs.map((tx) => {
                      const badge = TX_BADGE[tx.type] || TX_BADGE.FEE;
                      const Icon = badge.icon;
                      return (
                        <TableRow
                          key={tx.id}
                          className="border-border/15 hover:bg-accent/30 transition-colors"
                        >
                          {/* Date */}
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            <div>
                              {new Date(tx.timestamp).toLocaleDateString(
                                "pt-BR",
                                { day: "2-digit", month: "2-digit", year: "2-digit" }
                              )}
                            </div>
                            <div className="text-[10px] opacity-60">
                              {new Date(tx.timestamp).toLocaleTimeString(
                                "pt-BR",
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </div>
                          </TableCell>

                          {/* Type badge */}
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${badge.bg} ${badge.text} border text-xs gap-1`}
                            >
                              <Icon className="h-3 w-3" />
                              {tx.type}
                            </Badge>
                          </TableCell>

                          {/* Base */}
                          <TableCell className="font-medium">
                            {tx.baseAsset?.symbol || "—"}
                          </TableCell>

                          {/* Base Qty */}
                          <TableCell className="text-right font-mono text-xs">
                            {formatQty(tx.baseQty)}
                          </TableCell>

                          {/* Quote */}
                          <TableCell className="text-muted-foreground">
                            {tx.quoteAsset?.symbol || "—"}
                          </TableCell>

                          {/* Quote Qty */}
                          <TableCell className="text-right font-mono text-xs">
                            {formatQty(tx.quoteQty, 2)}
                          </TableCell>

                          {/* Price */}
                          <TableCell className="text-right font-mono text-xs">
                            {tx.price
                              ? `$${parseFloat(tx.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : "—"}
                          </TableCell>

                          {/* Fee */}
                          <TableCell className="text-xs text-muted-foreground">
                            {tx.feeAsset && tx.feeQty
                              ? `${formatQty(tx.feeQty)} ${tx.feeAsset.symbol}`
                              : "—"}
                          </TableCell>

                          {/* Venue */}
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]">
                            {tx.venue || "—"}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-accent"
                                onClick={() => setEditTx(tx)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-red-500/10 text-red-400 hover:text-red-400"
                                onClick={() => setDeleteConfirm(tx)}
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
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                      })}
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

      {/* Transaction Modal (Create) */}
      <TransactionModal
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {/* Transaction Modal (Edit) */}
      <TransactionModal
        open={!!editTx}
        onOpenChange={(open) => {
          if (!open) setEditTx(null);
        }}
        editTx={editTx}
      />

      {/* CSV Import Dialog */}
      <CSVImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Delete Confirmation Dialog */}
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
              Tem certeza que deseja deletar esta transação?
            </DialogDescription>
          </DialogHeader>
          {deleteConfirm && (
            <div className="text-sm space-y-1 bg-secondary/30 p-3 rounded-lg">
              <p>
                <span className="text-muted-foreground">Tipo:</span>{" "}
                <Badge
                  variant="outline"
                  className={`${TX_BADGE[deleteConfirm.type]?.bg} ${TX_BADGE[deleteConfirm.type]?.text} text-xs`}
                >
                  {deleteConfirm.type}
                </Badge>
              </p>
              {deleteConfirm.baseAsset && (
                <p>
                  <span className="text-muted-foreground">Ativo:</span>{" "}
                  {deleteConfirm.baseAsset.symbol}
                  {deleteConfirm.baseQty &&
                    ` — ${parseFloat(deleteConfirm.baseQty).toFixed(6)}`}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Data:</span>{" "}
                {new Date(deleteConfirm.timestamp).toLocaleDateString("pt-BR")}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
            >
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
