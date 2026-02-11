import { requireAuth, requirePortfolioAccess } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { fetchSimplePrices } from "@/lib/services/coingecko";
import { getStablecoinCapital } from "@/lib/dca/capital";
import { computeAdaptiveZones, type DcaZoneInput } from "@/lib/dca/engine";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

type Params = { params: { id: string } };

// GET /api/portfolios/:id/dca-strategy?asset=BTC
export async function GET(req: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    await requirePortfolioAccess(session.user.id, params.id, session.user.role);

    const { searchParams } = new URL(req.url);
    const asset = searchParams.get("asset")?.toUpperCase();

    if (!asset) {
      return apiError("Parâmetro 'asset' é obrigatório", 400);
    }

    // Buscar zonas do DB
    const zones = await prisma.dcaZone.findMany({
      where: {
        portfolioId: params.id,
        assetSymbol: asset,
      },
      orderBy: { order: "asc" },
    });

    if (zones.length === 0) {
      return apiSuccess({
        asset,
        currentPrice: 0,
        capitalTotal: 0,
        zones: [],
        resumo: {
          totalZonas: 0,
          ativas: 0,
          puladas: 0,
          executadas: 0,
        },
      });
    }

    // Buscar preço atual e capital em paralelo
    const [priceMap, capitalTotal] = await Promise.all([
      fetchSimplePrices([asset]),
      getStablecoinCapital(params.id),
    ]);

    const currentPrice = priceMap[asset] || 0;

    // Preparar input para engine
    const zoneInputs: DcaZoneInput[] = zones.map((z) => ({
      id: z.id,
      order: z.order,
      label: z.label,
      priceMin: parseFloat(z.priceMin.toString()),
      priceMax: parseFloat(z.priceMax.toString()),
      percentualBase: parseFloat(z.percentualBase.toString()),
      executed: z.executed,
    }));

    const computed = computeAdaptiveZones(zoneInputs, currentPrice, capitalTotal);

    const resumo = {
      totalZonas: computed.length,
      ativas: computed.filter((z) => z.status === "ATIVA").length,
      puladas: computed.filter((z) => z.status === "PULADA").length,
      executadas: computed.filter((z) => z.status === "EXECUTADA").length,
    };

    return apiSuccess({
      asset,
      currentPrice,
      capitalTotal,
      zones: computed,
      resumo,
    });
  } catch (error) {
    return handleApiError(error, "GET dca-strategy");
  }
}
