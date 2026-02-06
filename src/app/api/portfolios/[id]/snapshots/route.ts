import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePortfolioAccess } from "@/lib/guards";
import { createPortfolioSnapshot } from "@/lib/portfolio/snapshot";

type Params = { params: { id: string } };

// GET /api/portfolios/:id/snapshots?from=ISO&to=ISO&limit=30
export async function GET(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await requirePortfolioAccess(session.user.id, params.id, session.user.role);

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limit = parseInt(url.searchParams.get("limit") || "30");

  const where: any = { portfolioId: params.id };
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from);
    if (to) where.timestamp.lte = new Date(to);
  }

  const snapshots = await prisma.portfolioSnapshot.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: Math.min(limit, 365),
  });

  return Response.json(snapshots);
}

// POST /api/portfolios/:id/snapshots
export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await requirePortfolioAccess(session.user.id, params.id, session.user.role);

  try {
    const snapshot = await createPortfolioSnapshot(params.id);
    return Response.json(snapshot, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar snapshot:", error);
    return NextResponse.json(
      { error: "Erro ao criar snapshot" },
      { status: 500 }
    );
  }
}
