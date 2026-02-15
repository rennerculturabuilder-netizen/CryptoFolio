import { type IndicatorConfig } from "./types";

export const INDICATOR_CONFIGS: IndicatorConfig[] = [
  {
    id: "mvrv",
    name: "MVRV Ratio",
    description:
      "Market Value to Realized Value. Compara o valor de mercado com o preço médio de aquisição de todos os holders. Valores baixos indicam que o mercado está subvalorizado.",
    source: "bgeometrics",
    endpoint: "mvrv",
    valueKey: "mvrv",
    direction: "bottom",
    zones: [
      { status: "EXTREMO", threshold: 0.8, color: "text-green-400", bgColor: "bg-green-500/15", label: "≤ 0.8" },
      { status: "EXTREMO", threshold: 1.0, color: "text-green-400", bgColor: "bg-green-500/15", label: "≤ 1.0" },
      { status: "FORTE", threshold: 1.2, color: "text-orange-400", bgColor: "bg-orange-500/15", label: "≤ 1.2" },
      { status: "OBSERVAÇÃO", threshold: 1.4, color: "text-amber-400", bgColor: "bg-amber-500/15", label: "≤ 1.4" },
      { status: "NORMAL", threshold: Infinity, color: "text-zinc-400", bgColor: "bg-zinc-500/15", label: "> 1.4" },
    ],
  },
  {
    id: "sth_mvrv",
    name: "STH MVRV",
    description:
      "Short-Term Holder MVRV. Foca nos holders recentes (< 155 dias). Quando cai abaixo de 1, significa que compradores recentes estão no prejuízo — sinal clássico de fundo.",
    source: "bgeometrics",
    endpoint: "sth-mvrv",
    valueKey: "sthMvrv",
    direction: "bottom",
    zones: [
      { status: "EXTREMO", threshold: 0.60, color: "text-green-400", bgColor: "bg-green-500/15", label: "≤ 0.60" },
      { status: "EXTREMO", threshold: 0.66, color: "text-green-400", bgColor: "bg-green-500/15", label: "≤ 0.66" },
      { status: "FORTE", threshold: 0.70, color: "text-orange-400", bgColor: "bg-orange-500/15", label: "≤ 0.70" },
      { status: "OBSERVAÇÃO", threshold: 0.80, color: "text-amber-400", bgColor: "bg-amber-500/15", label: "≤ 0.80" },
      { status: "NORMAL", threshold: Infinity, color: "text-zinc-400", bgColor: "bg-zinc-500/15", label: "> 0.80" },
    ],
  },
  {
    id: "mayer",
    name: "Mayer Multiple",
    description:
      "Razão entre preço atual e a média móvel de 200 dias (SMA200). Valores abaixo de 0.8 historicamente representam excelentes pontos de compra.",
    source: "calculated",
    direction: "bottom",
    zones: [
      { status: "EXTREMO", threshold: 0.63, color: "text-green-400", bgColor: "bg-green-500/15", label: "≤ 0.63" },
      { status: "FORTE", threshold: 0.80, color: "text-orange-400", bgColor: "bg-orange-500/15", label: "≤ 0.80" },
      { status: "OBSERVAÇÃO", threshold: 1.00, color: "text-amber-400", bgColor: "bg-amber-500/15", label: "≤ 1.00" },
      { status: "NORMAL", threshold: Infinity, color: "text-zinc-400", bgColor: "bg-zinc-500/15", label: "> 1.00" },
    ],
  },
  {
    id: "lth_mvrv",
    name: "LTH MVRV",
    description:
      "Long-Term Holder MVRV. Mede se os holders de longo prazo (> 155 dias) estão em lucro ou prejuízo. Quando cai abaixo de 1, até os hodlers estão perdendo.",
    source: "bgeometrics",
    endpoint: "lth-mvrv",
    valueKey: "lthMvrv",
    direction: "bottom",
    zones: [
      { status: "EXTREMO", threshold: 0.77, color: "text-green-400", bgColor: "bg-green-500/15", label: "≤ 0.77" },
      { status: "EXTREMO", threshold: 1.0, color: "text-green-400", bgColor: "bg-green-500/15", label: "≤ 1.0" },
      { status: "OBSERVAÇÃO", threshold: 1.5, color: "text-amber-400", bgColor: "bg-amber-500/15", label: "≤ 1.5" },
      { status: "NORMAL", threshold: Infinity, color: "text-zinc-400", bgColor: "bg-zinc-500/15", label: "> 1.5" },
    ],
  },
  {
    id: "lth_sopr",
    name: "LTH SOPR",
    description:
      "Long-Term Holder Spent Output Profit Ratio. Mede se os LTH estão vendendo com lucro ou prejuízo. Abaixo de 1 indica capitulação dos holders mais experientes.",
    source: "bgeometrics",
    endpoint: "lth-sopr",
    valueKey: "lthSopr",
    direction: "bottom",
    zones: [
      { status: "EXTREMO", threshold: 0.50, color: "text-green-400", bgColor: "bg-green-500/15", label: "≤ 0.50" },
      { status: "FORTE", threshold: 0.90, color: "text-orange-400", bgColor: "bg-orange-500/15", label: "≤ 0.90" },
      { status: "OBSERVAÇÃO", threshold: 1.00, color: "text-amber-400", bgColor: "bg-amber-500/15", label: "≤ 1.00" },
      { status: "NORMAL", threshold: Infinity, color: "text-zinc-400", bgColor: "bg-zinc-500/15", label: "> 1.00" },
    ],
  },
  {
    id: "aviv",
    name: "AVIV Ratio",
    description:
      "Active Value to Investor Value. Compara a capitalização ativa com a capitalização dos investidores (True Market Mean). Quando abaixo de 1, investidores ativos estão no prejuízo.",
    source: "bgeometrics",
    endpoint: "aviv",
    valueKey: "aviv",
    direction: "bottom",
    zones: [
      { status: "EXTREMO", threshold: 0.556, color: "text-green-400", bgColor: "bg-green-500/15", label: "≤ 0.556" },
      { status: "FORTE", threshold: 0.75, color: "text-orange-400", bgColor: "bg-orange-500/15", label: "≤ 0.75" },
      { status: "OBSERVAÇÃO", threshold: 1.00, color: "text-amber-400", bgColor: "bg-amber-500/15", label: "≤ 1.00" },
      { status: "NORMAL", threshold: Infinity, color: "text-zinc-400", bgColor: "bg-zinc-500/15", label: "> 1.00" },
    ],
  },
  {
    id: "price_realized",
    name: "Preço vs Realizado",
    description:
      "Razão entre o preço atual do BTC e o preço realizado (custo médio on-chain). Quando o preço cai abaixo do realizado, historicamente marca fundos de ciclo.",
    source: "bgeometrics",
    endpoint: "realized-price",
    valueKey: "realizedPrice",
    dateKey: "theDay",
    direction: "bottom",
    zones: [
      { status: "EXTREMO", threshold: 1.0, color: "text-green-400", bgColor: "bg-green-500/15", label: "Abaixo do Realizado" },
      { status: "NORMAL", threshold: Infinity, color: "text-zinc-400", bgColor: "bg-zinc-500/15", label: "Acima do Realizado" },
    ],
  },
];

export const STATUS_COLORS = {
  EXTREMO: {
    text: "text-green-400",
    bg: "bg-green-500/15",
    border: "border-green-500/30",
    dot: "bg-green-500",
    glow: "shadow-green-500/20",
  },
  FORTE: {
    text: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-500/30",
    dot: "bg-orange-500",
    glow: "shadow-orange-500/20",
  },
  OBSERVAÇÃO: {
    text: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    glow: "shadow-amber-500/20",
  },
  NORMAL: {
    text: "text-zinc-400",
    bg: "bg-zinc-500/15",
    border: "border-zinc-500/30",
    dot: "bg-zinc-500",
    glow: "",
  },
} as const;

export function getIndicatorStatus(
  config: IndicatorConfig,
  value: number | null
): import("./types").SignalStatus {
  if (value === null) return "NORMAL";

  for (const zone of config.zones) {
    if (zone.status === "NORMAL") continue;
    if (value <= zone.threshold) return zone.status;
  }
  return "NORMAL";
}

export function countActiveSignals(
  indicators: import("./types").IndicatorValue[]
): { extremo: number; forte: number; observacao: number; total: number } {
  let extremo = 0;
  let forte = 0;
  let observacao = 0;

  for (const ind of indicators) {
    if (ind.status === "EXTREMO") extremo++;
    else if (ind.status === "FORTE") forte++;
    else if (ind.status === "OBSERVAÇÃO") observacao++;
  }

  return { extremo, forte, observacao, total: extremo + forte + observacao };
}
