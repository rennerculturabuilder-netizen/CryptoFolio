import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { calcPositions } from "./calc";

type PositionSnapshot = {
  assetId: string;
  symbol: string;
  qty: string;
  avgCost: string;
  currentPrice: string;
  valueUsd: string;
  costTotal: string;
  pnl: string;
  pnlPct: string;
};

export async function createPortfolioSnapshot(portfolioId: string) {
  // 1. Calcular posições WAC
  const positions = await calcPositions(portfolioId);

  // 2. Filtrar posições com saldo > 0
  const active = positions.filter((p) => p.qty.greaterThan(0));

  if (active.length === 0) {
    // Snapshot zerado
    return prisma.portfolioSnapshot.create({
      data: {
        portfolioId,
        valueUsd: 0,
        costBasisUsd: 0,
        unrealizedPnl: 0,
        unrealizedPct: 0,
        positionsSnapshot: [],
      },
    });
  }

  // 3. Buscar asset info
  const assetIds = active.map((p) => p.assetId);
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, symbol: true },
  });
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  // 4. Buscar preços mais recentes
  const priceMap = new Map<string, Decimal>();
  for (const asset of assets) {
    const snapshot = await prisma.priceSnapshot.findFirst({
      where: { assetId: asset.id },
      orderBy: { createdAt: "desc" },
    });
    priceMap.set(asset.id, snapshot ? new Decimal(snapshot.price.toString()) : new Decimal(0));
  }

  // 5. Calcular valores
  let totalValue = new Decimal(0);
  let totalCost = new Decimal(0);
  const posSnapshots: PositionSnapshot[] = [];

  for (const pos of active) {
    const asset = assetMap.get(pos.assetId);
    const price = priceMap.get(pos.assetId) || new Decimal(0);
    const value = pos.qty.times(price);
    const pnl = value.minus(pos.costUsdTotal);
    const pnlPct = pos.costUsdTotal.isZero()
      ? new Decimal(0)
      : pnl.div(pos.costUsdTotal).times(100);

    totalValue = totalValue.plus(value);
    totalCost = totalCost.plus(pos.costUsdTotal);

    posSnapshots.push({
      assetId: pos.assetId,
      symbol: asset?.symbol || "???",
      qty: pos.qty.toFixed(8),
      avgCost: pos.avgCostUsd.toFixed(8),
      currentPrice: price.toFixed(8),
      valueUsd: value.toFixed(2),
      costTotal: pos.costUsdTotal.toFixed(2),
      pnl: pnl.toFixed(2),
      pnlPct: pnlPct.toFixed(2),
    });
  }

  const unrealizedPnl = totalValue.minus(totalCost);
  const unrealizedPct = totalCost.isZero()
    ? new Decimal(0)
    : unrealizedPnl.div(totalCost).times(100);

  // 6. Criar snapshot
  return prisma.portfolioSnapshot.create({
    data: {
      portfolioId,
      valueUsd: totalValue,
      costBasisUsd: totalCost,
      unrealizedPnl,
      unrealizedPct,
      positionsSnapshot: posSnapshots,
    },
  });
}
