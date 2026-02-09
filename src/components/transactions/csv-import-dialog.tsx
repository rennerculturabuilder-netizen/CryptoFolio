"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePortfolio } from "@/lib/hooks/use-portfolio";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { parseCSV, type ImportValidationResult } from "@/lib/csv/transactions-csv";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ImportResponse = {
  created: number;
  total?: number;
  errors: { row: number; message: string }[];
  error?: string;
};

export function CSVImportDialog({ open, onOpenChange }: Props) {
  const { selectedId } = usePortfolio();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportValidationResult | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const importMutation = useMutation({
    mutationFn: async (csvFile: File) => {
      const formData = new FormData();
      formData.append("file", csvFile);
      const res = await fetch(
        `/api/portfolios/${selectedId}/transactions/import`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (!res.ok && !data.errors) {
        throw new Error(data.error || "Erro ao importar");
      }
      return data as ImportResponse;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.created > 0) {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["wac"] });
        queryClient.invalidateQueries({ queryKey: ["portfolio-summaries"] });
        toast.success(`${data.created} transações importadas!`);
      }
    },
    onError: (error: Error) => {
      setResult({ created: 0, errors: [{ row: 0, message: error.message }] });
      toast.error("Erro ao importar CSV");
    },
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;

      setFile(selected);
      setResult(null);

      const text = await selected.text();
      const validation = parseCSV(text);
      setPreview(validation);
    },
    []
  );

  function handleImport() {
    if (!file) return;
    importMutation.mutate(file);
  }

  function handleClose() {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
    onOpenChange(false);
  }

  const showPreview = preview && !result;
  const showResult = !!result;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-strong max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Transações (CSV)
          </DialogTitle>
          <DialogDescription>
            Selecione um arquivo CSV com as transações. O formato deve seguir o
            padrão de exportação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload area */}
          {!showResult && (
            <div
              className="border-2 border-dashed border-border/40 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar ou arraste um arquivo CSV
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {showPreview && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                {preview.valid.length > 0 && (
                  <Badge variant="outline" className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {preview.valid.length} válidas
                  </Badge>
                )}
                {preview.errors.length > 0 && (
                  <Badge variant="outline" className="bg-red-400/10 text-red-400 border-red-400/20">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {preview.errors.length} erros
                  </Badge>
                )}
              </div>

              {/* Errors list */}
              {preview.errors.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 max-h-32 overflow-y-auto scrollbar-thin">
                  {preview.errors.slice(0, 10).map((e, i) => (
                    <p key={i} className="text-xs text-red-400">
                      Linha {e.row}: {e.message}
                    </p>
                  ))}
                  {preview.errors.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ... e mais {preview.errors.length - 10} erros
                    </p>
                  )}
                </div>
              )}

              {/* Preview table */}
              {preview.valid.length > 0 && (
                <div className="bg-secondary/30 rounded-lg p-3 max-h-48 overflow-y-auto scrollbar-thin">
                  <p className="text-xs text-muted-foreground mb-2">
                    Preview (primeiras 5):
                  </p>
                  <div className="space-y-1.5">
                    {preview.valid.slice(0, 5).map((tx, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {tx.type}
                        </Badge>
                        <span className="font-medium">{tx.baseSymbol || tx.feeSymbol}</span>
                        <span className="text-muted-foreground">
                          {tx.baseQty || tx.feeQty}
                        </span>
                        {tx.quoteSymbol && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span>{tx.quoteSymbol}</span>
                            <span className="text-muted-foreground">
                              {tx.quoteQty}
                            </span>
                          </>
                        )}
                        <span className="text-muted-foreground ml-auto">
                          {tx.timestamp.toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    ))}
                    {preview.valid.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        ... e mais {preview.valid.length - 5} transações
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {showResult && (
            <div className="space-y-3">
              {result.created > 0 ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                  <p className="font-medium text-emerald-400">
                    {result.created} transações importadas!
                  </p>
                </div>
              ) : (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                  <p className="font-medium text-red-400">
                    Nenhuma transação importada
                  </p>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 max-h-32 overflow-y-auto scrollbar-thin">
                  {result.errors.slice(0, 10).map((e, i) => (
                    <p key={i} className="text-xs text-red-400">
                      {e.row > 0 ? `Linha ${e.row}: ` : ""}{e.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {showResult ? (
            <Button onClick={handleClose}>Fechar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  !preview ||
                  preview.valid.length === 0 ||
                  importMutation.isPending
                }
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    Importar {preview?.valid.length ?? 0} transações
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
