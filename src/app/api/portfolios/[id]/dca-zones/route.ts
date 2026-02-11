import { requireAuth, requirePortfolioAccess } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { dcaZoneSchema } from "@/lib/validations/dcaZone";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

type Params = { params: { id: string } };

// GET /api/portfolios/:id/dca-zones?assetSymbol=BTC
export async function GET(req: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    await requirePortfolioAccess(session.user.id, params.id, session.user.role);

    const { searchParams } = new URL(req.url);
    const assetSymbol = searchParams.get("assetSymbol");

    const where: Record<string, unknown> = { portfolioId: params.id };
    if (assetSymbol) where.assetSymbol = assetSymbol.toUpperCase();

    const zones = await prisma.dcaZone.findMany({
      where,
      orderBy: { order: "asc" },
    });

    return apiSuccess(zones);
  } catch (error) {
    return handleApiError(error, "GET dca-zones");
  }
}

// POST /api/portfolios/:id/dca-zones
export async function POST(req: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    await requirePortfolioAccess(session.user.id, params.id, session.user.role);

    const body = await req.json();
    body.portfolioId = params.id;
    body.assetSymbol = body.assetSymbol?.toUpperCase();

    const validated = dcaZoneSchema.parse(body);

    // Validar priceMin < priceMax
    if (parseFloat(validated.priceMin) >= parseFloat(validated.priceMax)) {
      return apiError("priceMin deve ser menor que priceMax", 400);
    }

    // Verificar se soma de percentualBase não ultrapassa 100%
    const existingZones = await prisma.dcaZone.findMany({
      where: {
        portfolioId: params.id,
        assetSymbol: validated.assetSymbol,
      },
    });

    const existingTotal = existingZones.reduce(
      (acc, z) => acc + parseFloat(z.percentualBase.toString()),
      0
    );
    const newTotal = existingTotal + parseFloat(validated.percentualBase);

    if (newTotal > 100) {
      return apiError(
        `Soma de percentuais excede 100% (atual: ${existingTotal.toFixed(1)}%, novo: ${parseFloat(validated.percentualBase).toFixed(1)}%)`,
        400
      );
    }

    // Verificar duplicata de order
    const existing = await prisma.dcaZone.findUnique({
      where: {
        portfolioId_assetSymbol_order: {
          portfolioId: params.id,
          assetSymbol: validated.assetSymbol,
          order: validated.order,
        },
      },
    });

    if (existing) {
      return apiError("Já existe uma zona DCA com este order para este ativo", 409);
    }

    const zone = await prisma.dcaZone.create({
      data: {
        priceMin: validated.priceMin,
        priceMax: validated.priceMax,
        percentualBase: validated.percentualBase,
        order: validated.order,
        label: validated.label || null,
        assetSymbol: validated.assetSymbol,
        portfolioId: params.id,
      },
    });

    return apiSuccess(zone, 201);
  } catch (error) {
    return handleApiError(error, "POST dca-zones");
  }
}
