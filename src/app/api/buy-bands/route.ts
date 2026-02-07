import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/buy-bands — Lista TODAS as buy bands do usuário logado
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const portfolioId = searchParams.get("portfolioId");

  const where: Record<string, unknown> = {
    portfolio: { ownerId: session.user.id },
  };

  if (portfolioId) {
    where.portfolioId = portfolioId;
  }

  const buyBands = await prisma.buyBand.findMany({
    where,
    include: {
      asset: true,
      portfolio: { select: { id: true, name: true } },
    },
    orderBy: [{ assetId: "asc" }, { order: "asc" }],
  });

  return Response.json(buyBands);
}
