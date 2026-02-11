import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { updateDcaZoneSchema } from "@/lib/validations/dcaZone";
import { apiSuccess, apiError, apiNotFound, handleApiError } from "@/lib/api-response";

type Params = { params: { id: string } };

async function getZoneWithAuth(zoneId: string, userId: string, role: string) {
  const zone = await prisma.dcaZone.findUnique({
    where: { id: zoneId },
    include: { portfolio: true },
  });

  if (!zone) return null;

  if (zone.portfolio.ownerId !== userId && role !== "admin") {
    throw new Error("Forbidden");
  }

  return zone;
}

// PATCH /api/dca-zones/:id
export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const zone = await getZoneWithAuth(params.id, session.user.id, session.user.role);

    if (!zone) return apiNotFound("Zona DCA");

    const body = await req.json();
    const validated = updateDcaZoneSchema.parse(body);

    // Validar priceMin < priceMax se ambos fornecidos ou um deles
    const newMin = validated.priceMin
      ? parseFloat(validated.priceMin)
      : parseFloat(zone.priceMin.toString());
    const newMax = validated.priceMax
      ? parseFloat(validated.priceMax)
      : parseFloat(zone.priceMax.toString());

    if (newMin >= newMax) {
      return apiError("priceMin deve ser menor que priceMax", 400);
    }

    // Validar soma de percentuais se percentualBase mudou
    if (validated.percentualBase) {
      const siblingZones = await prisma.dcaZone.findMany({
        where: {
          portfolioId: zone.portfolioId,
          assetSymbol: zone.assetSymbol,
          id: { not: zone.id },
        },
      });

      const siblingsTotal = siblingZones.reduce(
        (acc, z) => acc + parseFloat(z.percentualBase.toString()),
        0
      );
      const newTotal = siblingsTotal + parseFloat(validated.percentualBase);

      if (newTotal > 100) {
        return apiError(
          `Soma de percentuais excede 100% (outras: ${siblingsTotal.toFixed(1)}%, novo: ${parseFloat(validated.percentualBase).toFixed(1)}%)`,
          400
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (validated.priceMin !== undefined) data.priceMin = validated.priceMin;
    if (validated.priceMax !== undefined) data.priceMax = validated.priceMax;
    if (validated.percentualBase !== undefined) data.percentualBase = validated.percentualBase;
    if (validated.order !== undefined) data.order = validated.order;
    if (validated.label !== undefined) data.label = validated.label;
    if (validated.executed !== undefined) data.executed = validated.executed;

    const updated = await prisma.dcaZone.update({
      where: { id: params.id },
      data,
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error, "PATCH dca-zone");
  }
}

// DELETE /api/dca-zones/:id
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const zone = await getZoneWithAuth(params.id, session.user.id, session.user.role);

    if (!zone) return apiNotFound("Zona DCA");

    await prisma.dcaZone.delete({ where: { id: params.id } });

    return apiSuccess({ success: true });
  } catch (error) {
    return handleApiError(error, "DELETE dca-zone");
  }
}
