import { calcPositions } from "@/lib/portfolio/calc";
import { prisma } from "@/lib/prisma";

const STABLECOIN_SYMBOLS = ["USD", "USDT", "USDC"];

export async function getStablecoinCapital(
  portfolioId: string
): Promise<number> {
  const positions = await calcPositions(portfolioId);

  // Buscar assets para mapear assetId -> symbol
  const assetIds = positions.map((p) => p.assetId);
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, symbol: true },
  });

  const assetSymbolMap = new Map(assets.map((a) => [a.id, a.symbol]));

  let total = 0;
  for (const pos of positions) {
    const symbol = assetSymbolMap.get(pos.assetId);
    if (symbol && STABLECOIN_SYMBOLS.includes(symbol.toUpperCase())) {
      total += pos.qty.toNumber();
    }
  }

  return Math.round(total * 100) / 100;
}
