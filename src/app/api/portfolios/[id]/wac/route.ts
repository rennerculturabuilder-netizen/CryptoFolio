import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePortfolioAccess } from "@/lib/guards";
import { calcPositions } from "@/lib/portfolio/calc";

type Params = { params: { id: string } };

// GET /api/portfolios/:id/wac
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

    const positions = await calcPositions(params.id);

    // Enriquecer com symbol/name dos assets
    const assetIds = positions.map((p) => p.assetId);
    const assets = await prisma.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, symbol: true, name: true },
    });
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    const result = positions.map((p) => {
      const asset = assetMap.get(p.assetId);
      return {
        assetId: p.assetId,
        symbol: asset?.symbol ?? "???",
        name: asset?.name ?? "Desconhecido",
        balance: p.qty.toFixed(8),
        totalCost: p.costUsdTotal.toFixed(2),
        wac: p.avgCostUsd.toFixed(8),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Portfolio not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Erro ao calcular WAC:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
