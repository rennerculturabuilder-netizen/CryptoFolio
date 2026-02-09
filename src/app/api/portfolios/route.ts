import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/guards";
import { createPortfolioSchema } from "@/lib/validations/portfolio";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

const portfolioSelect = {
  id: true,
  name: true,
  baseFiat: true,
  ownerId: true,
  createdAt: true,
};

// GET /api/portfolios
export async function GET() {
  try {
    const session = await requireAuth();

    const where =
      session.user.role === "admin" ? {} : { ownerId: session.user.id };

    const portfolios = await prisma.portfolio.findMany({
      where,
      select: portfolioSelect,
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(portfolios);
  } catch (error) {
    return handleApiError(error, "GET /api/portfolios");
  }
}

// POST /api/portfolios
export async function POST(request: Request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const validation = createPortfolioSchema.safeParse(body);
    if (!validation.success) {
      return apiError(validation.error.issues[0].message);
    }

    const { name, baseFiat } = validation.data;

    const portfolio = await prisma.portfolio.create({
      data: { name, baseFiat, ownerId: session.user.id },
      select: portfolioSelect,
    });

    return apiSuccess(portfolio, 201);
  } catch (error) {
    return handleApiError(error, "POST /api/portfolios");
  }
}
