import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { calcPositions } from "@/lib/portfolio/calc";

// GET /api/portfolios/all/wac
export async function GET(_request: Request) {
  try {
    const session = await requireAuth();

    // Buscar todos os portfolios do usuário
    const portfolios = await prisma.portfolio.findMany({
      where: { ownerId: session.user.id },
      select: { id: true },
    });

    if (portfolios.length === 0) {
      return apiSuccess([]);
    }

    // Calcular posições de cada portfolio
    const allPositionsPromises = portfolios.map((p) => calcPositions(p.id));
    const allPositionsArrays = await Promise.all(allPositionsPromises);

    // Agregar posições por assetId
    const aggregated = new Map<
      string,
      { assetId: string; qty: number; costUsdTotal: number }
    >();

    for (const positions of allPositionsArrays) {
      for (const p of positions) {
        const existing = aggregated.get(p.assetId);
        if (existing) {
          existing.qty += parseFloat(p.qty.toString());
          existing.costUsdTotal += parseFloat(p.costUsdTotal.toString());
        } else {
          aggregated.set(p.assetId, {
            assetId: p.assetId,
            qty: parseFloat(p.qty.toString()),
            costUsdTotal: parseFloat(p.costUsdTotal.toString()),
          });
        }
      }
    }

    // Enriquecer com symbol/name dos assets
    const assetIds = Array.from(aggregated.keys());
    const assets = await prisma.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, symbol: true, name: true },
    });
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    const result = Array.from(aggregated.values()).map((p) => {
      const asset = assetMap.get(p.assetId);
      const avgCostUsd = p.qty > 0 ? p.costUsdTotal / p.qty : 0;
      return {
        assetId: p.assetId,
        symbol: asset?.symbol ?? "???",
        name: asset?.name ?? "Desconhecido",
        balance: p.qty.toFixed(8),
        totalCost: p.costUsdTotal.toFixed(2),
        wac: avgCostUsd.toFixed(8),
      };
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "GET /api/portfolios/all/wac");
  }
}
