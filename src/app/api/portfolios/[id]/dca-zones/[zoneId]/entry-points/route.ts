import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createEntryPointsSchema = z.object({
  numberOfEntries: z.number().min(1).max(10),
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
    const { numberOfEntries } = createEntryPointsSchema.parse(body);

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

    // Calcular distribuição
    const priceMin = parseFloat(zone.priceMin.toString());
    const priceMax = parseFloat(zone.priceMax.toString());
    const priceRange = priceMax - priceMin;
    const priceStep = priceRange / (numberOfEntries - 1);

    const totalValue = parseFloat(zone.percentualBase.toString()) * 0.01; // ex: 20% = 0.20
    const valuePerEntry = totalValue / numberOfEntries;

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
        { error: "Validação falhou", details: error.errors },
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
