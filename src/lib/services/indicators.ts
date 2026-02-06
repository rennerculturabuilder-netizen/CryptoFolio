import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export async function calculateSMA(
  assetId: string,
  period: number
): Promise<number | null> {
  const snapshots = await prisma.priceSnapshot.findMany({
    where: { assetId },
    orderBy: { createdAt: "desc" },
    take: period,
    select: { price: true },
  });

  if (snapshots.length < period) return null;

  const sum = snapshots.reduce(
    (acc, s) => acc.add(new Decimal(s.price.toString())),
    new Decimal(0)
  );

  return sum.div(period).toNumber();
}

export async function getLatestPrice(assetId: string): Promise<number | null> {
  const snapshot = await prisma.priceSnapshot.findFirst({
    where: { assetId },
    orderBy: { createdAt: "desc" },
    select: { price: true },
  });

  return snapshot ? new Decimal(snapshot.price.toString()).toNumber() : null;
}

export type MAResult = {
  period: number;
  value: number | null;
  distance: number | null;
  distancePct: number | null;
};

export async function getIndicators(
  symbol: string,
  periods: number[]
): Promise<{
  symbol: string;
  current: number | null;
  mas: MAResult[];
}> {
  const asset = await prisma.asset.findUnique({
    where: { symbol: symbol.toUpperCase() },
  });

  if (!asset) {
    return { symbol: symbol.toUpperCase(), current: null, mas: [] };
  }

  const current = await getLatestPrice(asset.id);

  const mas: MAResult[] = await Promise.all(
    periods.map(async (period) => {
      const value = await calculateSMA(asset.id, period);
      let distance: number | null = null;
      let distancePct: number | null = null;

      if (value !== null && current !== null) {
        distance = current - value;
        distancePct = ((current - value) / value) * 100;
      }

      return { period, value, distance, distancePct };
    })
  );

  return { symbol: symbol.toUpperCase(), current, mas };
}
