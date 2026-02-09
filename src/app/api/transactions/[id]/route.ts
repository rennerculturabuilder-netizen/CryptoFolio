import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/guards";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";
import { getAssetBalance } from "@/lib/portfolio/balance";
import { transactionSchema } from "@/lib/validations/transaction";
import { Decimal } from "@prisma/client/runtime/library";

type Params = { params: { id: string } };

const assetSelect = { id: true, symbol: true, name: true };

// PATCH /api/transactions/:id
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireAuth();

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: { portfolio: true },
    });

    if (!transaction) {
      return apiError("Transação não encontrada", 404);
    }

    // Verificar ownership ou admin
    if (
      transaction.portfolio.ownerId !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return apiError("Acesso negado", 403);
    }

    const body = await request.json();

    // Não permitir mudar tipo
    if (body.type && body.type !== transaction.type) {
      return apiError("Não é permitido alterar o tipo. Delete e crie uma nova.");
    }

    // Não permitir mudar portfolioId
    if (body.portfolioId && body.portfolioId !== transaction.portfolioId) {
      return apiError("Não é permitido mover transação para outro portfolio");
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
      return apiError(validation.error.issues[0].message);
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
        return apiError(`Asset(s) não encontrado(s): ${missing.join(", ")}`, 404);
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
          return apiError(
            `Saldo insuficiente. Disponível: ${availableBalance.toString()} ${asset?.symbol ?? data.baseAssetId}`
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

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error, "PATCH /api/transactions/:id");
  }
}
