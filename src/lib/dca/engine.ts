export type DcaZoneStatus = "ATIVA" | "PULADA" | "EXECUTADA";

export type DcaZoneInput = {
  id: string;
  order: number;
  label: string | null;
  priceMin: number;
  priceMax: number;
  percentualBase: number;
  executed: boolean;
};

export type DcaZoneComputed = {
  id: string;
  order: number;
  label: string | null;
  priceMin: number;
  priceMax: number;
  percentualBase: number;
  percentualAjustado: number;
  valorUsd: number;
  status: DcaZoneStatus;
  distanciaPct: number;
};

export function computeAdaptiveZones(
  zones: DcaZoneInput[],
  currentPrice: number,
  capitalTotal: number
): DcaZoneComputed[] {
  // Classificar status de cada zona
  const classified = zones.map((zone) => {
    let status: DcaZoneStatus;
    if (zone.executed) {
      status = "EXECUTADA";
    } else if (currentPrice > zone.priceMax) {
      status = "PULADA";
    } else {
      status = "ATIVA";
    }

    const distanciaPct =
      zone.priceMin > 0
        ? ((currentPrice - zone.priceMin) / zone.priceMin) * 100
        : 0;

    return { ...zone, status, distanciaPct };
  });

  // Somar % das zonas puladas e executadas para redistribuir
  const percentualParaRedistribuir = classified
    .filter((z) => z.status === "PULADA" || z.status === "EXECUTADA")
    .reduce((acc, z) => acc + z.percentualBase, 0);

  // Somar % base das zonas ativas
  const totalBaseAtivas = classified
    .filter((z) => z.status === "ATIVA")
    .reduce((acc, z) => acc + z.percentualBase, 0);

  return classified.map((zone) => {
    let percentualAjustado: number;

    if (zone.status !== "ATIVA") {
      percentualAjustado = 0;
    } else if (totalBaseAtivas > 0) {
      // Redistribuir proporcionalmente
      const proporcao = zone.percentualBase / totalBaseAtivas;
      percentualAjustado =
        zone.percentualBase + percentualParaRedistribuir * proporcao;
    } else {
      percentualAjustado = 0;
    }

    const valorUsd = (percentualAjustado / 100) * capitalTotal;

    return {
      id: zone.id,
      order: zone.order,
      label: zone.label,
      priceMin: zone.priceMin,
      priceMax: zone.priceMax,
      percentualBase: zone.percentualBase,
      percentualAjustado: Math.round(percentualAjustado * 100) / 100,
      valorUsd: Math.round(valorUsd * 100) / 100,
      status: zone.status,
      distanciaPct: Math.round(zone.distanciaPct * 100) / 100,
    };
  });
}
