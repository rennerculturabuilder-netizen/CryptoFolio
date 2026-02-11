"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AssetSelectorProps = {
  assets: string[];
  value: string;
  onChange: (value: string) => void;
};

export function AssetSelector({ assets, value, onChange }: AssetSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px] bg-secondary/50 border-border/40 h-9">
        <SelectValue placeholder="Ativo..." />
      </SelectTrigger>
      <SelectContent>
        {assets.map((symbol) => (
          <SelectItem key={symbol} value={symbol}>
            {symbol}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
