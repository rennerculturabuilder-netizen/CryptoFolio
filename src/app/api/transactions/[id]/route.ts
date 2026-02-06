import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validations/transaction";
import { Decimal } from "@prisma/client/runtime/library";

type Params = { params: { id: string } };

const assetSelect = { id: true, symbol: true, name: true };

// PATCH /api/transactions/:id
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: { portfolio: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 }
      );
    }

    // Verificar ownership ou admin
    if (
      transaction.portfolio.ownerId !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Não permitir mudar tipo
    if (body.type && body.type !== transaction.type) {
      return NextResponse.json(
        { error: "Não é permitido alterar o tipo. Delete e crie uma nova." },
        { status: 400 }
      );
    }

    // Não permitir mudar portfolioId
    if (body.portfolioId && body.portfolioId !== transaction.portfolioId) {
      return NextResponse.json(
        { error: "Não é permitido mover transação para outro portfolio" },
        { status: 400 }
      );
    }

    // Converter dados existentes (Decimal → string, null → omitido)
    const existing: Record<string, unknown> = {
      type: transaction.type,
      portfolioId: transaction.portfolioId,
      timestamp: transaction.timestamp,
    };

    if (transaction.venue) existing.venue = transaction.venue;
    if (transaction.notes) existing.notes = transaction.notes;
    if (transaction.baseAssetId) existing.baseAssetId = transaction.baseAssetId;
    if (transaction.baseQty) existing.baseQty = transaction.baseQty.toString();
    if (transaction.quoteAssetId)
      existing.quoteAssetId = transaction.quoteAssetId;
    if (transaction.quoteQty)
      existing.quoteQty = transaction.quoteQty.toString();
    if (transaction.price) existing.price = transaction.price.toString();
    if (transaction.feeAssetId) existing.feeAssetId = transaction.feeAssetId;
    if (transaction.feeQty) existing.feeQty = transaction.feeQty.toString();
    if (transaction.costBasisUsd)
      existing.costBasisUsd = transaction.costBasisUsd.toString();
    if (transaction.valueUsd)
      existing.valueUsd = transaction.valueUsd.toString();

    // Merge: body sobrescreve, tipo e portfolio fixos
    const merged = {
      ...existing,
      ...body,
      type: transaction.type,
      portfolioId: transaction.portfolioId,
    };

    // Validar com zod
    const validation = transactionSchema.safeParse(merged);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Validar assets referenciados
    const assetIds = new Set<string>();
    if ("baseAssetId" in data && data.baseAssetId)
      assetIds.add(data.baseAssetId);
    if ("quoteAssetId" in data && data.quoteAssetId)
      assetIds.add(data.quoteAssetId);
    if (data.feeAssetId) assetIds.add(data.feeAssetId);

    if (assetIds.size > 0) {
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
    }

    // Balance check para SELL/WITHDRAW/SWAP se baseQty aumentou
    if (
      (data.type === "SELL" ||
        data.type === "WITHDRAW" ||
        data.type === "SWAP") &&
      "baseAssetId" in data
    ) {
      const newQty = new Decimal(data.baseQty);
      const oldQty = transaction.baseQty
        ? new Decimal(transaction.baseQty.toString())
        : new Decimal(0);

      if (newQty.greaterThan(oldQty)) {
        const currentBalance = await getAssetBalance(
          transaction.portfolioId,
          data.baseAssetId
        );
        // currentBalance já reflete a tx antiga; desfazer pra ter o saldo real
        const availableBalance = currentBalance.plus(oldQty);
        if (newQty.greaterThan(availableBalance)) {
          const asset = await prisma.asset.findUnique({
            where: { id: data.baseAssetId },
          });
          return NextResponse.json(
            {
              error: `Saldo insuficiente. Disponível: ${availableBalance.toString()} ${asset?.symbol ?? data.baseAssetId}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Montar dados para update
    const txData: Record<string, unknown> = {
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
    } else {
      txData.price = null;
    }

    if (data.feeAssetId && "feeQty" in data && data.feeQty) {
      txData.feeAssetId = data.feeAssetId;
      txData.feeQty = new Decimal(data.feeQty);
    } else {
      txData.feeAssetId = null;
      txData.feeQty = null;
    }

    if ("costBasisUsd" in data && data.costBasisUsd) {
      txData.costBasisUsd = new Decimal(data.costBasisUsd);
    } else {
      txData.costBasisUsd = null;
    }

    if ("valueUsd" in data && data.valueUsd) {
      txData.valueUsd = new Decimal(data.valueUsd);
    } else {
      txData.valueUsd = null;
    }

    const updated = await prisma.transaction.update({
      where: { id: params.id },
      data: txData as any,
      include: {
        baseAsset: { select: assetSelect },
        quoteAsset: { select: assetSelect },
        feeAsset: { select: assetSelect },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar transação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Calcula saldo de um asset no portfolio
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
    // BUY/DEPOSIT: base entra
    if (
      (tx.type === "BUY" || tx.type === "DEPOSIT") &&
      tx.baseAssetId === assetId &&
      tx.baseQty
    ) {
      balance = balance.plus(tx.baseQty);
    }

    // SELL/WITHDRAW: base sai
    if (
      (tx.type === "SELL" || tx.type === "WITHDRAW") &&
      tx.baseAssetId === assetId &&
      tx.baseQty
    ) {
      balance = balance.minus(tx.baseQty);
    }

    // SWAP: base sai, quote entra
    if (tx.type === "SWAP") {
      if (tx.baseAssetId === assetId && tx.baseQty) {
        balance = balance.minus(tx.baseQty);
      }
      if (tx.quoteAssetId === assetId && tx.quoteQty) {
        balance = balance.plus(tx.quoteQty);
      }
    }

    // BUY: quote sai (gasta fiat/stable)
    if (tx.type === "BUY" && tx.quoteAssetId === assetId && tx.quoteQty) {
      balance = balance.minus(tx.quoteQty);
    }

    // SELL: quote entra (recebe fiat/stable)
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
