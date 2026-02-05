import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePortfolioAccess } from "@/lib/guards";
import { transactionSchema } from "@/lib/validations/transaction";
import { Decimal } from "@prisma/client/runtime/library";

type Params = { params: { id: string } };

const assetSelect = { id: true, symbol: true, name: true };

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
      include: {
        baseAsset: { select: assetSelect },
        quoteAsset: { select: assetSelect },
        feeAsset: { select: assetSelect },
      },
      orderBy: { timestamp: "desc" },
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
    const validation = transactionSchema.safeParse({
      ...body,
      portfolioId: params.id,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Validar assets referenciados
    const assetIds = new Set<string>();
    if ("baseAssetId" in data && data.baseAssetId) assetIds.add(data.baseAssetId);
    if ("quoteAssetId" in data && data.quoteAssetId) assetIds.add(data.quoteAssetId);
    if (data.feeAssetId) assetIds.add(data.feeAssetId);

    const assets = await prisma.asset.findMany({
      where: { id: { in: Array.from(assetIds) } },
    });

    if (assets.length !== assetIds.size) {
      const found = new Set(assets.map((a) => a.id));
      const missing = Array.from(assetIds).filter((id) => !found.has(id));
      return NextResponse.json(
        { error: `Asset(s) não encontrado(s): ${missing.join(", ")}` },
        { status: 404 }
      );
    }

    // Verificar saldo para SELL e WITHDRAW
    if (data.type === "SELL" || data.type === "WITHDRAW") {
      const balance = await getAssetBalance(params.id, data.baseAssetId);
      const qty = new Decimal(data.baseQty);
      if (balance.lessThan(qty)) {
        const asset = assets.find((a) => a.id === data.baseAssetId);
        return NextResponse.json(
          {
            error: `Saldo insuficiente. Disponível: ${balance.toString()} ${asset?.symbol ?? data.baseAssetId}`,
          },
          { status: 400 }
        );
      }
    }

    // Montar dados para create
    const txData: Record<string, unknown> = {
      type: data.type,
      portfolioId: params.id,
      timestamp: data.timestamp,
      venue: data.venue ?? null,
      notes: data.notes ?? null,
    };

    if ("baseAssetId" in data && data.baseAssetId) {
      txData.baseAssetId = data.baseAssetId;
      txData.baseQty = new Decimal(data.baseQty);
    }

    if ("quoteAssetId" in data && data.quoteAssetId) {
      txData.quoteAssetId = data.quoteAssetId;
      txData.quoteQty = new Decimal(data.quoteQty);
    }

    if ("price" in data && data.price) {
      txData.price = new Decimal(data.price);
    }

    if (data.feeAssetId && "feeQty" in data && data.feeQty) {
      txData.feeAssetId = data.feeAssetId;
      txData.feeQty = new Decimal(data.feeQty);
    }

    if ("costBasisUsd" in data && data.costBasisUsd) {
      txData.costBasisUsd = new Decimal(data.costBasisUsd);
    }

    const transaction = await prisma.transaction.create({
      data: txData as any,
      include: {
        baseAsset: { select: assetSelect },
        quoteAsset: { select: assetSelect },
        feeAsset: { select: assetSelect },
      },
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

// Calcula saldo de um asset em um portfolio
async function getAssetBalance(
  portfolioId: string,
  assetId: string
): Promise<Decimal> {
  const txs = await prisma.transaction.findMany({
    where: { portfolioId },
    orderBy: { timestamp: "asc" },
  });

  let balance = new Decimal(0);

  for (const tx of txs) {
    // Entradas no asset
    if (
      (tx.type === "BUY" || tx.type === "SWAP" || tx.type === "DEPOSIT") &&
      tx.baseAssetId === assetId &&
      tx.baseQty
    ) {
      balance = balance.plus(tx.baseQty);
    }

    // Saídas do asset
    if (
      (tx.type === "SELL" || tx.type === "WITHDRAW") &&
      tx.baseAssetId === assetId &&
      tx.baseQty
    ) {
      balance = balance.minus(tx.baseQty);
    }

    // SWAP: quote asset sai
    if (tx.type === "SWAP" && tx.quoteAssetId === assetId && tx.quoteQty) {
      balance = balance.minus(tx.quoteQty);
    }

    // BUY: quote asset sai
    if (tx.type === "BUY" && tx.quoteAssetId === assetId && tx.quoteQty) {
      balance = balance.minus(tx.quoteQty);
    }

    // SELL: quote asset entra
    if (tx.type === "SELL" && tx.quoteAssetId === assetId && tx.quoteQty) {
      balance = balance.plus(tx.quoteQty);
    }

    // Fee reduz saldo
    if (tx.feeAssetId === assetId && tx.feeQty) {
      balance = balance.minus(tx.feeQty);
    }
  }

  return balance;
}
