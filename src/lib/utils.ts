import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return formatUsd(value);
}

export function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatQty(value: number, decimals = 6): string {
  if (value === 0) return "0";
  if (Math.abs(value) < 0.000001) return value.toExponential(2);
  return value.toFixed(decimals).replace(/\.?0+$/, "");
}

export function formatPrice(value: number): string {
  if (value >= 1000) return formatUsd(value);
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(8)}`;
}

/** Cores para os chart segments */
export const CHART_COLORS = [
  "hsl(199, 89%, 48%)",  // blue
  "hsl(142, 71%, 45%)",  // green
  "hsl(262, 83%, 58%)",  // purple
  "hsl(45, 93%, 47%)",   // yellow
  "hsl(24, 95%, 53%)",   // orange
  "hsl(187, 92%, 44%)",  // cyan
  "hsl(330, 81%, 60%)",  // pink
  "hsl(0, 84%, 60%)",    // red
];
