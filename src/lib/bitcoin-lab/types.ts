export type SignalStatus = "EXTREMO" | "FORTE" | "OBSERVAÇÃO" | "NORMAL";

export type SignalDirection = "bottom" | "top";

export interface IndicatorZone {
  status: SignalStatus;
  threshold: number;
  color: string;
  bgColor: string;
  label: string;
}

export interface IndicatorConfig {
  id: string;
  name: string;
  description: string;
  source: "bgeometrics" | "coingecko" | "calculated";
  endpoint?: string;
  valueKey?: string;
  dateKey?: string;
  direction: SignalDirection;
  zones: IndicatorZone[];
}

export interface IndicatorValue {
  id: string;
  value: number | null;
  status: SignalStatus;
  priceLevels: PriceLevel[];
}

export interface PriceLevel {
  zone: SignalStatus;
  price: number | null;
}

export interface BitcoinLabData {
  btcPrice: number;
  btcChange24h: number;
  indicators: IndicatorValue[];
  priceHistory: PricePoint[];
  realizedPrice: number | null;
  updatedAt: string;
}

export interface PricePoint {
  date: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface BGeometricsDataPoint {
  d: string; // date YYYY-MM-DD
  v: number; // value
}
