import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";

// GET /api/portfolios/all/transactions
export async function GET(_request: Request) {
  try {
    const session = await requireAuth();

    // Buscar todos os portfolios do usuário
    const portfolios = await prisma.portfolio.findMany({
      where: { ownerId: session.user.id },
      select: { id: true },
    });

    if (portfolios.length === 0) {
      return apiSuccess([]);
    }

    const portfolioIds = portfolios.map((p) => p.id);

    // Buscar todas as transações de todos os portfolios
    const transactions = await prisma.transaction.findMany({
      where: {
        portfolioId: { in: portfolioIds },
      },
      include: {
        baseAsset: { select: { id: true, symbol: true, name: true } },
        quoteAsset: { select: { id: true, symbol: true, name: true } },
        feeAsset: { select: { id: true, symbol: true, name: true } },
      },
      orderBy: { timestamp: "desc" },
    });

    return apiSuccess(transactions);
  } catch (error) {
    return handleApiError(error, "GET /api/portfolios/all/transactions");
  }
}
