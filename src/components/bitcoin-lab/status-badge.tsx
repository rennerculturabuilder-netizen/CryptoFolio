"use client";

import { type SignalStatus } from "@/lib/bitcoin-lab/types";
import { STATUS_COLORS } from "@/lib/bitcoin-lab/config";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: SignalStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide uppercase",
        colors.bg,
        colors.text,
        colors.border,
        "border",
        size === "sm"
          ? "px-2 py-0.5 text-[10px]"
          : "px-3 py-1 text-xs"
      )}
    >
      <span
        className={cn(
          "rounded-full",
          colors.dot,
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
          status !== "NORMAL" && "animate-pulse-glow"
        )}
      />
      {status}
    </span>
  );
}
