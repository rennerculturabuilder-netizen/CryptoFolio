import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePortfolioAccess } from "@/lib/guards";
import { transactionsToCSV } from "@/lib/csv/transactions-csv";

type Params = { params: { id: string } };

// GET /api/portfolios/:id/transactions/export
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const portfolio = await requirePortfolioAccess(
      session.user.id,
      params.id,
      session.user.role
    );

    const transactions = await prisma.transaction.findMany({
      where: { portfolioId: params.id },
      include: {
        baseAsset: { select: { id: true, symbol: true, name: true } },
        quoteAsset: { select: { id: true, symbol: true, name: true } },
        feeAsset: { select: { id: true, symbol: true, name: true } },
      },
      orderBy: { timestamp: "asc" },
    });

    const csv = transactionsToCSV(
      transactions.map((tx) => ({
        ...tx,
        timestamp: tx.timestamp.toISOString(),
        baseQty: tx.baseQty?.toString() ?? null,
        quoteQty: tx.quoteQty?.toString() ?? null,
        price: tx.price?.toString() ?? null,
        feeQty: tx.feeQty?.toString() ?? null,
        costBasisUsd: tx.costBasisUsd?.toString() ?? null,
        valueUsd: tx.valueUsd?.toString() ?? null,
      }))
    );

    const safeName = portfolio.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transacoes_${safeName}_${date}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Portfolio not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Erro ao exportar transações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
