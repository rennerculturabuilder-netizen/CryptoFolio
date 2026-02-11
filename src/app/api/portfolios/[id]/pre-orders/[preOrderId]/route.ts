import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; preOrderId: string } }
) {
  try {
    const portfolioId = params.id;
    const preOrderId = params.preOrderId;

    // Verificar se a pré-ordem existe e pertence ao portfolio
    const preOrder = await prisma.preOrder.findFirst({
      where: {
        id: preOrderId,
        portfolioId,
      },
    });

    if (!preOrder) {
      return NextResponse.json({ error: "Pré-ordem não encontrada" }, { status: 404 });
    }

    // Deletar pré-ordem
    await prisma.preOrder.delete({
      where: { id: preOrderId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pre-order:", error);
    return NextResponse.json(
      { error: "Failed to delete pre-order" },
      { status: 500 }
    );
  }
}
