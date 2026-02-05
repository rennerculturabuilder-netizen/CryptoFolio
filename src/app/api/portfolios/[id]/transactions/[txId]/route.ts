import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePortfolioAccess } from "@/lib/guards";

type Params = { params: { id: string; txId: string } };

const assetSelect = { id: true, symbol: true, name: true };

// GET /api/portfolios/:id/transactions/:txId
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    await requirePortfolioAccess(
      session.user.id,
      params.id,
      session.user.role
    );

    const transaction = await prisma.transaction.findFirst({
      where: { id: params.txId, portfolioId: params.id },
      include: {
        baseAsset: { select: assetSelect },
        quoteAsset: { select: assetSelect },
        feeAsset: { select: assetSelect },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Portfolio not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Erro ao buscar transação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolios/:id/transactions/:txId
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    await requirePortfolioAccess(
      session.user.id,
      params.id,
      session.user.role
    );

    const transaction = await prisma.transaction.findFirst({
      where: { id: params.txId, portfolioId: params.id },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 }
      );
    }

    await prisma.transaction.delete({ where: { id: params.txId } });

    return NextResponse.json({ message: "Transação removida" });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Portfolio not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Erro ao deletar transação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
