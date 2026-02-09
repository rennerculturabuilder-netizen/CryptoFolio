import { prisma } from "@/lib/prisma";
import { requireAuth, requirePortfolioAccess } from "@/lib/guards";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";
import { transactionSchema } from "@/lib/validations/transaction";
import { getAssetBalance } from "@/lib/portfolio/balance";
import { Decimal } from "@prisma/client/runtime/library";

type Params = { params: { id: string } };

const assetSelect = { id: true, symbol: true, name: true };

// GET /api/portfolios/:id/transactions
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireAuth();

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

    return apiSuccess(transactions);
  } catch (error) {
    return handleApiError(error, "GET /api/portfolios/:id/transactions");
  }
}

// POST /api/portfolios/:id/transactions
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireAuth();

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
      return apiError(validation.error.issues[0].message);
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
      return apiError(`Asset(s) não encontrado(s): ${missing.join(", ")}`, 404);
    }

    // Verificar saldo para SELL e WITHDRAW
    if (data.type === "SELL" || data.type === "WITHDRAW") {
      const balance = await getAssetBalance(params.id, data.baseAssetId);
      const qty = new Decimal(data.baseQty);
      if (balance.lessThan(qty)) {
        const asset = assets.find((a) => a.id === data.baseAssetId);
        return apiError(
          `Saldo insuficiente. Disponível: ${balance.toString()} ${asset?.symbol ?? data.baseAssetId}`
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

    if ("valueUsd" in data && data.valueUsd) {
      txData.valueUsd = new Decimal(data.valueUsd);
    }

    const transaction = await prisma.transaction.create({
      data: txData as any,
      include: {
        baseAsset: { select: assetSelect },
        quoteAsset: { select: assetSelect },
        feeAsset: { select: assetSelect },
      },
    });

    return apiSuccess(transaction, 201);
  } catch (error) {
    return handleApiError(error, "POST /api/portfolios/:id/transactions");
  }
}
