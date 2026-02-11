import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const portfolioId = params.id;
    const body = await req.json();
    const { assetSymbol, zoneOrder, targetPrice, value } = body;

    if (!assetSymbol || !zoneOrder || !targetPrice || !value) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verificar se a zona existe
    const zone = await prisma.dcaZone.findFirst({
      where: {
        portfolioId,
        assetSymbol,
        order: parseInt(zoneOrder),
      },
    });

    if (!zone) {
      return NextResponse.json({ error: "Zona não encontrada" }, { status: 404 });
    }

    // Validar se o preço está dentro da zona
    const priceNum = parseFloat(targetPrice);
    const valueNum = parseFloat(value);

    if (priceNum < parseFloat(zone.priceMin.toString()) || priceNum > parseFloat(zone.priceMax.toString())) {
      return NextResponse.json(
        {
          error: `Preço deve estar entre ${zone.priceMin} e ${zone.priceMax}`,
        },
        { status: 400 }
      );
    }

    // Criar pré-ordem
    const preOrder = await prisma.preOrder.create({
      data: {
        portfolioId,
        assetSymbol,
        zoneOrder: parseInt(zoneOrder),
        targetPrice: priceNum,
        value: valueNum,
        dcaZoneId: zone.id,
        active: true,
      },
    });

    return NextResponse.json(preOrder);
  } catch (error) {
    console.error("Error creating pre-order:", error);
    return NextResponse.json(
      { error: "Failed to create pre-order" },
      { status: 500 }
    );
  }
}
