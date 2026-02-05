import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePortfolioAccess } from "@/lib/guards";
import { createTransactionSchema } from "@/lib/validations/transaction";
import { Decimal } from "@prisma/client/runtime/library";

type Params = { params: { id: string } };

// GET /api/portfolios/:id/transactions
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

    const transactions = await prisma.transaction.findMany({
      where: { portfolioId: params.id },
      include: { asset: { select: { id: true, symbol: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Portfolio not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Erro ao listar transações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// POST /api/portfolios/:id/transactions
export async function POST(request: Request, { params }: Params) {
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

    const body = await request.json();
    const validation = createTransactionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { type, quantity, price, assetId } = validation.data;

    // Verificar se asset existe
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json(
        { error: "Asset não encontrado" },
        { status: 404 }
      );
    }

    // Se for SELL, verificar saldo suficiente
    if (type === "SELL") {
      const txs = await prisma.transaction.findMany({
        where: { portfolioId: params.id, assetId },
      });

      let balance = new Decimal(0);
      for (const tx of txs) {
        if (tx.type === "BUY") {
          balance = balance.plus(tx.quantity);
        } else {
          balance = balance.minus(tx.quantity);
        }
      }

      if (balance.lessThan(quantity)) {
        return NextResponse.json(
          {
            error: `Saldo insuficiente. Disponível: ${balance.toString()} ${asset.symbol}`,
          },
          { status: 400 }
        );
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        quantity,
        price,
        portfolioId: params.id,
        assetId,
      },
      include: { asset: { select: { id: true, symbol: true, name: true } } },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Portfolio not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Erro ao criar transação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
