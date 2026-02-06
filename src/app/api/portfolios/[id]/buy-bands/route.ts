import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePortfolioAccess } from "@/lib/guards";
import { buyBandSchema } from "@/lib/validations/buyBand";

type Params = { params: { id: string } };

// GET /api/portfolios/:id/buy-bands
export async function GET(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await requirePortfolioAccess(session.user.id, params.id, session.user.role);

  const buyBands = await prisma.buyBand.findMany({
    where: { portfolioId: params.id },
    include: { asset: true },
    orderBy: [{ assetId: "asc" }, { order: "asc" }],
  });

  return Response.json(buyBands);
}

// POST /api/portfolios/:id/buy-bands
export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await requirePortfolioAccess(session.user.id, params.id, session.user.role);

  const body = await req.json();

  // Forçar portfolioId correto
  body.portfolioId = params.id;

  const validated = buyBandSchema.parse(body);

  // Verificar se já existe banda com mesmo order
  const existing = await prisma.buyBand.findUnique({
    where: {
      portfolioId_assetId_order: {
        portfolioId: validated.portfolioId,
        assetId: validated.assetId,
        order: validated.order,
      },
    },
  });

  if (existing) {
    return Response.json(
      { error: "Buy band already exists for this order" },
      { status: 409 }
    );
  }

  const buyBand = await prisma.buyBand.create({
    data: validated,
    include: { asset: true },
  });

  return Response.json(buyBand, { status: 201 });
}
