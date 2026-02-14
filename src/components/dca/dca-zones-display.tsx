"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { formatPrice, formatUsd } from "@/lib/utils";
import type { DcaZoneComputed } from "@/lib/dca/engine";

const ORDER_COLORS: Record<number, string> = {
  1: "text-emerald-400",
  2: "text-yellow-400",
  3: "text-orange-400",
};

const ORDER_BG: Record<number, string> = {
  1: "bg-emerald-400/10 border-emerald-400/20",
  2: "bg-yellow-400/10 border-yellow-400/20",
  3: "bg-orange-400/10 border-orange-400/20",
};

function getOrderColor(order: number) {
  return ORDER_COLORS[order] || "text-red-400";
}

function getOrderBg(order: number) {
  return ORDER_BG[order] || "bg-red-400/10 border-red-400/20";
}

const STATUS_STYLES: Record<string, string> = {
  ATIVA: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  PULADA: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20 line-through",
  EXECUTADA: "bg-muted/50 text-muted-foreground border-border/20",
};

type DcaZonesDisplayProps = {
  zones: DcaZoneComputed[];
  onEdit: (zone: DcaZoneComputed) => void;
  onDelete: (zone: DcaZoneComputed) => void;
};

export function DcaZonesDisplay({ zones, onEdit, onDelete }: DcaZonesDisplayProps) {
  if (zones.length === 0) {
    return (
      <Card className="glass border-border/30">
        <CardContent className="p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium text-foreground">Nenhuma zona DCA</p>
          <p className="text-sm mt-1">Crie sua primeira zona de compra adaptativa.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/30">
      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Zona</TableHead>
                <TableHead className="text-muted-foreground font-medium">Faixa de Preço</TableHead>
                <TableHead className="text-center text-muted-foreground font-medium">Status</TableHead>
                <TableHead className="text-right text-muted-foreground font-medium">% Base</TableHead>
                <TableHead className="text-right text-muted-foreground font-medium">Valor USD</TableHead>
                <TableHead className="text-right text-muted-foreground font-medium">Distância</TableHead>
                <TableHead className="text-right text-muted-foreground font-medium w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow
                  key={zone.id}
                  className={`border-border/15 hover:bg-accent/30 transition-colors ${
                    zone.status === "EXECUTADA" ? "opacity-50" : ""
                  }`}
                >
                  {/* Zona */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`${getOrderBg(zone.order)} ${getOrderColor(zone.order)} border text-xs`}
                      >
                        Zone {zone.order}
                      </Badge>
                      {zone.label && (
                        <span className="text-xs text-muted-foreground">{zone.label}</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Faixa de Preço */}
                  <TableCell className="font-mono text-sm">
                    {formatPrice(zone.priceMin)} — {formatPrice(zone.priceMax)}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`${STATUS_STYLES[zone.status]} border text-xs`}
                    >
                      {zone.status}
                    </Badge>
                  </TableCell>

                  {/* % Base */}
                  <TableCell className="text-right font-mono text-sm">
                    {zone.percentualBase}%
                  </TableCell>


                  {/* Valor USD */}
                  <TableCell className="text-right font-mono text-sm">
                    {zone.valorUsd > 0 ? formatUsd(zone.valorUsd) : "—"}
                  </TableCell>

                  {/* Distância */}
                  <TableCell className="text-right font-mono text-sm">
                    <span
                      className={
                        zone.distanciaPct <= 0
                          ? "text-emerald-400"
                          : zone.distanciaPct <= 10
                            ? "text-yellow-400"
                            : "text-muted-foreground"
                      }
                    >
                      {zone.distanciaPct > 0 ? "+" : ""}
                      {zone.distanciaPct.toFixed(2)}%
                    </span>
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-accent"
                        onClick={() => onEdit(zone)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-red-500/10 text-red-400 hover:text-red-400"
                        onClick={() => onDelete(zone)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
