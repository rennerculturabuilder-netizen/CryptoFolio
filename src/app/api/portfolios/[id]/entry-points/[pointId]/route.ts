import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateEntryPointSchema = z.object({
  preOrderPlaced: z.boolean().optional(),
  purchaseConfirmed: z.boolean().optional(),
});

/**
 * PATCH /api/portfolios/[id]/entry-points/[pointId]
 * Atualiza checkboxes de um ponto de entrada
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; pointId: string } }
) {
  try {
    const { id: portfolioId, pointId } = params;
    const body = await req.json();
    const updates = updateEntryPointSchema.parse(body);

    // Buscar ponto de entrada
    const entryPoint = await prisma.dcaEntryPoint.findUnique({
      where: { id: pointId },
      include: { dcaZone: true },
    });

    if (!entryPoint) {
      return NextResponse.json(
        { error: "Ponto de entrada não encontrado" },
        { status: 404 }
      );
    }

    if (entryPoint.dcaZone.portfolioId !== portfolioId) {
      return NextResponse.json(
        { error: "Ponto de entrada não pertence a este portfólio" },
        { status: 403 }
      );
    }

    // Se tá confirmando compra, atualizar timestamp
    const confirmedAt = updates.purchaseConfirmed === true && !entryPoint.purchaseConfirmed
      ? new Date()
      : entryPoint.confirmedAt;

    // Atualizar ponto de entrada
    const updated = await prisma.dcaEntryPoint.update({
      where: { id: pointId },
      data: {
        ...updates,
        confirmedAt,
      },
    });

    return NextResponse.json({ success: true, entryPoint: updated });
  } catch (error) {
    console.error("Error updating entry point:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validação falhou", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erro ao atualizar ponto de entrada" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/portfolios/[id]/entry-points/[pointId]
 * Remove um ponto de entrada individual
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; pointId: string } }
) {
  try {
    const { id: portfolioId, pointId } = params;

    // Buscar ponto de entrada
    const entryPoint = await prisma.dcaEntryPoint.findUnique({
      where: { id: pointId },
      include: { dcaZone: true },
    });

    if (!entryPoint) {
      return NextResponse.json(
        { error: "Ponto de entrada não encontrado" },
        { status: 404 }
      );
    }

    if (entryPoint.dcaZone.portfolioId !== portfolioId) {
      return NextResponse.json(
        { error: "Ponto de entrada não pertence a este portfólio" },
        { status: 403 }
      );
    }

    // Deletar ponto de entrada
    await prisma.dcaEntryPoint.delete({
      where: { id: pointId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting entry point:", error);
    return NextResponse.json(
      { error: "Erro ao deletar ponto de entrada" },
      { status: 500 }
    );
  }
}
