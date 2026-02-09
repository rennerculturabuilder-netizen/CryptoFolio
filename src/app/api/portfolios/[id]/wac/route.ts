import { prisma } from "@/lib/prisma";
import { requireAuth, requirePortfolioAccess } from "@/lib/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { calcPositions } from "@/lib/portfolio/calc";

type Params = { params: { id: string } };

// GET /api/portfolios/:id/wac
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireAuth();

    await requirePortfolioAccess(
      session.user.id,
      params.id,
      session.user.role
    );

    const positions = await calcPositions(params.id);

    // Enriquecer com symbol/name dos assets
    const assetIds = positions.map((p) => p.assetId);
    const assets = await prisma.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, symbol: true, name: true },
    });
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    const result = positions.map((p) => {
      const asset = assetMap.get(p.assetId);
      return {
        assetId: p.assetId,
        symbol: asset?.symbol ?? "???",
        name: asset?.name ?? "Desconhecido",
        balance: p.qty.toFixed(8),
        totalCost: p.costUsdTotal.toFixed(2),
        wac: p.avgCostUsd.toFixed(8),
      };
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "GET /api/portfolios/:id/wac");
  }
}
