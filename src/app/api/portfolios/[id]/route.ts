import { prisma } from "@/lib/prisma";
import { requireAuth, requirePortfolioAccess } from "@/lib/guards";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";
import { updatePortfolioSchema } from "@/lib/validations/portfolio";

type Params = { params: { id: string } };

// GET /api/portfolios/:id
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireAuth();

    const portfolio = await requirePortfolioAccess(
      session.user.id,
      params.id,
      session.user.role
    );

    return apiSuccess({
      id: portfolio.id,
      name: portfolio.name,
      baseFiat: portfolio.baseFiat,
      ownerId: portfolio.ownerId,
      createdAt: portfolio.createdAt,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/portfolios/:id");
  }
}

// PATCH /api/portfolios/:id
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireAuth();

    await requirePortfolioAccess(
      session.user.id,
      params.id,
      session.user.role
    );

    const body = await request.json();
    const validation = updatePortfolioSchema.safeParse(body);
    if (!validation.success) {
      return apiError(validation.error.issues[0].message);
    }

    const data = validation.data;
    if (!data.name && !data.baseFiat) {
      return apiError("Nenhum campo para atualizar");
    }

    const updated = await prisma.portfolio.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        name: true,
        baseFiat: true,
        ownerId: true,
        createdAt: true,
      },
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error, "PATCH /api/portfolios/:id");
  }
}

// DELETE /api/portfolios/:id
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireAuth();

    await requirePortfolioAccess(
      session.user.id,
      params.id,
      session.user.role
    );

    // Bloquear se tiver transações
    const txCount = await prisma.transaction.count({
      where: { portfolioId: params.id },
    });

    if (txCount > 0) {
      return apiError("Portfolio has transactions");
    }

    await prisma.portfolio.delete({ where: { id: params.id } });

    return apiSuccess({ message: "Portfolio removido" });
  } catch (error) {
    return handleApiError(error, "DELETE /api/portfolios/:id");
  }
}
