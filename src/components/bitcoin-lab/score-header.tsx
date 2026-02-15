"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { countActiveSignals, STATUS_COLORS, INDICATOR_CONFIGS } from "@/lib/bitcoin-lab/config";
import { type IndicatorValue, type SignalStatus } from "@/lib/bitcoin-lab/types";
import { cn, formatUsd, formatPct } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HelpCircle, MousePointerClick, TrendingDown, TrendingUp, X } from "lucide-react";

interface ScoreHeaderProps {
  btcPrice: number;
  btcChange24h: number;
  indicators: IndicatorValue[];
  isLoading?: boolean;
}

function getOverallStatus(indicators: IndicatorValue[]): SignalStatus {
  const counts = countActiveSignals(indicators);
  if (counts.extremo >= 2) return "EXTREMO";
  if (counts.extremo >= 1 || counts.forte >= 3) return "FORTE";
  if (counts.forte >= 1 || counts.observacao >= 3) return "OBSERVAÇÃO";
  return "NORMAL";
}

function getScoreDescription(
  counts: ReturnType<typeof countActiveSignals>,
  status: SignalStatus,
  total: number
): string {
  if (counts.total === 0) {
    return "Nenhum indicador sinalizando fundo. Mercado em território normal.";
  }

  const parts: string[] = [];
  if (counts.extremo > 0)
    parts.push(
      `${counts.extremo} de ${total} indicador${counts.extremo > 1 ? "es" : ""} em nível EXTREMO`
    );
  if (counts.forte > 0) parts.push(`${counts.forte} em nível FORTE`);
  if (counts.observacao > 0) parts.push(`${counts.observacao} em OBSERVAÇÃO`);

  const detail = parts.join(", ");

  switch (status) {
    case "EXTREMO":
      return `${detail}. Múltiplos sinais de fundo extremo — historicamente zona de acumulação forte.`;
    case "FORTE":
      return `${detail}. Estresse significativo no mercado — se aproximando de território de fundo.`;
    case "OBSERVAÇÃO":
      return `${detail}. Sinais iniciais aparecendo — mercado esfriando, vale acompanhar.`;
    default:
      return `${detail}.`;
  }
}

export function ScoreHeader({
  btcPrice,
  btcChange24h,
  indicators,
  isLoading,
}: ScoreHeaderProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  if (isLoading) {
    return (
      <Card className="glass border-border/30">
        <CardContent className="py-8 px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-2 w-64 rounded-full" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const counts = countActiveSignals(indicators);
  const overallStatus = getOverallStatus(indicators);
  const isPositive = btcChange24h >= 0;

  return (
    <div className="space-y-2">
      {/* Help button — fora do card */}
      <div className="flex justify-center -mt-2">
        <button
          onClick={() => setHelpOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-green-500/20 border-2 border-green-500/40 text-green-400 hover:bg-green-500/30 hover:border-green-500/60 hover:shadow-[0_0_20px_rgba(34,197,94,0.25)] active:scale-95 transition-all duration-200 text-sm font-bold tracking-wide uppercase cursor-pointer shadow-[0_0_10px_rgba(34,197,94,0.12)]"
        >
          <HelpCircle className="h-4 w-4" />
          Como funciona?
          <MousePointerClick className="h-4 w-4 animate-pulse" />
        </button>
      </div>

      <Card className="glass border-border/30">
        <CardContent className="py-8 px-6">
          <div className="flex justify-center">
          <div className="flex flex-col items-center text-center gap-3">
            {/* BTC Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl md:text-5xl font-bold tabular-nums">
                <span className="text-amber-500">&#8383;</span> {formatUsd(btcPrice)}
              </span>
              <span
                className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  isPositive ? "text-gain" : "text-loss"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {formatPct(btcChange24h)}
              </span>
            </div>

            <div className="w-16 h-px bg-border/40 mt-1" />

            {/* Question */}
            <p className="text-sm uppercase tracking-widest text-muted-foreground font-medium">
              O Bitcoin está fazendo fundo?
            </p>

            {/* Score count */}
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={cn(
                  "text-5xl font-extrabold tabular-nums",
                  counts.total > 0
                    ? STATUS_COLORS[overallStatus].text
                    : "text-zinc-500"
                )}
              >
                {counts.total}
              </span>
              <span className="text-2xl text-muted-foreground font-light">
                / {indicators.length}
              </span>
            </div>

            {/* Overall badge */}
            <StatusBadge status={overallStatus} />

            {/* Signal bar */}
            <div className="flex items-center gap-1.5 mt-1">
              {indicators.map((ind) => {
                const c = STATUS_COLORS[ind.status];
                return (
                  <div
                    key={ind.id}
                    className={cn(
                      "h-2 w-8 rounded-sm transition-colors",
                      ind.status !== "NORMAL" ? c.dot : "bg-zinc-700"
                    )}
                  />
                );
              })}
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mt-1">
              {getScoreDescription(counts, overallStatus, indicators.length)}
            </p>
          </div>
        </div>

      </CardContent>

      </Card>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="glass-strong max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Como funciona o Bitcoin Lab</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
            <section>
              <h3 className="text-foreground font-semibold mb-1.5">O que é esta página?</h3>
              <p>
                O Bitcoin Lab analisa 7 indicadores on-chain para identificar se o Bitcoin está em zona de fundo.
                Os dados vêm de fontes públicas (BGeometrics e CoinGecko) e são atualizados a cada 5 minutos.
              </p>
            </section>

            <section>
              <h3 className="text-foreground font-semibold mb-1.5">Pontuação (Score)</h3>
              <p>
                O número grande (ex: <strong>5/7</strong>) mostra quantos dos 7 indicadores estão sinalizando
                algum nível de fundo. Quanto mais indicadores ativos, mais forte o sinal.
              </p>
            </section>

            <section>
              <h3 className="text-foreground font-semibold mb-2">Níveis de sinal</h3>
              <div className="space-y-2.5">
                <div className="flex gap-3 items-start">
                  <span className="h-3 w-3 rounded-full bg-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-400 font-bold text-xs">EXTREMO</p>
                    <p className="text-xs">
                      O indicador atingiu níveis que historicamente marcam fundos de ciclo.
                      Zona de acumulação máxima — raro e poderoso.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="h-3 w-3 rounded-full bg-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-orange-400 font-bold text-xs">FORTE</p>
                    <p className="text-xs">
                      O mercado está em estresse significativo. Valores nessa faixa já representam
                      bons pontos de entrada historicamente.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="h-3 w-3 rounded-full bg-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-400 font-bold text-xs">OBSERVAÇÃO</p>
                    <p className="text-xs">
                      Sinais iniciais aparecendo. O mercado está esfriando, mas ainda não
                      chegou em território de fundo confirmado. Vale monitorar.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="h-3 w-3 rounded-full bg-zinc-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-zinc-400 font-bold text-xs">NORMAL</p>
                    <p className="text-xs">
                      O indicador não está sinalizando fundo. O mercado opera em condições normais
                      para essa métrica.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-foreground font-semibold mb-1.5">Status geral</h3>
              <p>O badge geral do dashboard é calculado assim:</p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
                <li><span className="text-green-400 font-semibold">EXTREMO</span> — 2+ indicadores em nível extremo</li>
                <li><span className="text-orange-400 font-semibold">FORTE</span> — 1 extremo ou 3+ fortes</li>
                <li><span className="text-amber-400 font-semibold">OBSERVAÇÃO</span> — 1 forte ou 3+ em observação</li>
                <li><span className="text-zinc-400 font-semibold">NORMAL</span> — caso contrário</li>
              </ul>
            </section>

            <section>
              <h3 className="text-foreground font-semibold mb-1.5">Os 7 indicadores</h3>
              <div className="space-y-2">
                {INDICATOR_CONFIGS.map((config) => (
                  <div key={config.id} className="border-l-2 border-border/30 pl-3">
                    <p className="text-foreground font-medium text-xs">{config.name}</p>
                    <p className="text-[11px]">{config.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-foreground font-semibold mb-1.5">Price Levels (Preços-alvo)</h3>
              <p className="text-xs">
                Cada indicador mostra a que preço o BTC precisaria chegar para ativar cada zona.
                Esses valores são calculados em tempo real: <code className="text-foreground bg-zinc-800 px-1 rounded">preço_alvo = threshold x preço_btc / valor_indicador</code>.
                As linhas tracejadas no gráfico representam esses níveis.
              </p>
            </section>

            <section className="border-t border-border/20 pt-3">
              <p className="text-[11px] text-muted-foreground/60">
                Esta ferramenta é apenas informativa e não constitui recomendação de investimento.
                Dados on-chain podem ter atrasos e imprecisões. Faça sua própria pesquisa.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
