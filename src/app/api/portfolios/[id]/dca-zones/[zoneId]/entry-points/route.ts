import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createEntryPointsSchema = z.object({
  numberOfEntries: z.number().min(1).max(10),
  zoneValueUsd: z.number().optional(),
  currentPrice: z.number().optional(),
});

/**
 * POST /api/portfolios/[id]/dca-zones/[zoneId]/entry-points
 * Gera pontos de entrada automáticos para uma zona DCA
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; zoneId: string } }
) {
  try {
    const { id: portfolioId, zoneId } = params;
    const body = await req.json();
    const { numberOfEntries, zoneValueUsd, currentPrice } = createEntryPointsSchema.parse(body);

    // Buscar zona DCA
    const zone = await prisma.dcaZone.findUnique({
      where: { id: zoneId },
      include: { entryPoints: true },
    });

    if (!zone) {
      return NextResponse.json(
        { error: "Zona DCA não encontrada" },
        { status: 404 }
      );
    }

    if (zone.portfolioId !== portfolioId) {
      return NextResponse.json(
        { error: "Zona não pertence a este portfólio" },
        { status: 403 }
      );
    }

    // Deletar pontos de entrada existentes
    await prisma.dcaEntryPoint.deleteMany({
      where: { dcaZoneId: zoneId },
    });

    // Calcular distribuição de preços (nunca acima do preço atual)
    const priceMin = parseFloat(zone.priceMin.toString());
    const rawPriceMax = parseFloat(zone.priceMax.toString());
    const priceMax = currentPrice ? Math.min(rawPriceMax, currentPrice) : rawPriceMax;
    const priceRange = priceMax - priceMin;
    const priceStep = numberOfEntries > 1 ? priceRange / (numberOfEntries - 1) : 0;

    // Calcular valor por entrada (em USD)
    // Se zoneValueUsd foi fornecido, usar ele; senão, usar o percentual da zona (fallback)
    const zoneValueInUsd = zoneValueUsd || parseFloat(zone.percentualBase.toString());
    const valuePerEntry = zoneValueInUsd / numberOfEntries;

    // Gerar pontos de entrada (do menor preço pro maior)
    const entryPoints = [];
    for (let i = 0; i < numberOfEntries; i++) {
      const targetPrice = priceMin + priceStep * i;
      entryPoints.push({
        dcaZoneId: zoneId,
        targetPrice,
        value: valuePerEntry,
        zoneOrder: i + 1,
      });
    }

    // Criar todos de uma vez
    const created = await prisma.dcaEntryPoint.createMany({
      data: entryPoints,
    });

    // Buscar pontos criados
    const createdPoints = await prisma.dcaEntryPoint.findMany({
      where: { dcaZoneId: zoneId },
      orderBy: { zoneOrder: "asc" },
    });

    return NextResponse.json({
      success: true,
      count: created.count,
      entryPoints: createdPoints,
    });
  } catch (error) {
    console.error("Error creating entry points:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validação falhou", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erro ao criar pontos de entrada" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/portfolios/[id]/dca-zones/[zoneId]/entry-points
 * Lista pontos de entrada de uma zona
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; zoneId: string } }
) {
  try {
    const { id: portfolioId, zoneId } = params;

    // Verificar se zona pertence ao portfólio
    const zone = await prisma.dcaZone.findUnique({
      where: { id: zoneId },
    });

    if (!zone) {
      return NextResponse.json(
        { error: "Zona DCA não encontrada" },
        { status: 404 }
      );
    }

    if (zone.portfolioId !== portfolioId) {
      return NextResponse.json(
        { error: "Zona não pertence a este portfólio" },
        { status: 403 }
      );
    }

    // Buscar pontos de entrada
    const entryPoints = await prisma.dcaEntryPoint.findMany({
      where: { dcaZoneId: zoneId },
      orderBy: { zoneOrder: "asc" },
    });

    return NextResponse.json({ entryPoints });
  } catch (error) {
    console.error("Error fetching entry points:", error);
    return NextResponse.json(
      { error: "Erro ao buscar pontos de entrada" },
      { status: 500 }
    );
  }
}
