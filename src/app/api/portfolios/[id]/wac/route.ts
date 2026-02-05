import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePortfolioAccess } from "@/lib/guards";
import { Decimal } from "@prisma/client/runtime/library";

type Params = { params: { id: string } };

interface AssetPosition {
  assetId: string;
  symbol: string;
  name: string;
  totalBought: string;
  totalSold: string;
  balance: string;
  totalCost: string;
  wac: string;
}

// GET /api/portfolios/:id/wac — calcula custo médio ponderado por asset
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

    const transactions = await prisma.transaction.findMany({
      where: { portfolioId: params.id },
      include: { asset: { select: { id: true, symbol: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Agrupar por asset e calcular WAC
    const positions = new Map<
      string,
      {
        symbol: string;
        name: string;
        balance: Decimal;
        totalCost: Decimal;
      }
    >();

    for (const tx of transactions) {
      let pos = positions.get(tx.assetId);
      if (!pos) {
        pos = {
          symbol: tx.asset.symbol,
          name: tx.asset.name,
          balance: new Decimal(0),
          totalCost: new Decimal(0),
        };
        positions.set(tx.assetId, pos);
      }

      if (tx.type === "BUY") {
        // WAC: acumula custo total e quantidade
        pos.totalCost = pos.totalCost.plus(
          new Decimal(tx.quantity.toString()).times(
            new Decimal(tx.price.toString())
          )
        );
        pos.balance = pos.balance.plus(new Decimal(tx.quantity.toString()));
      } else {
        // SELL: reduz quantidade, custo proporcional ao WAC atual
        const sellQty = new Decimal(tx.quantity.toString());
        if (pos.balance.greaterThan(0)) {
          const currentWac = pos.totalCost.dividedBy(pos.balance);
          pos.totalCost = pos.totalCost.minus(currentWac.times(sellQty));
          pos.balance = pos.balance.minus(sellQty);
        }
      }
    }

    const result: AssetPosition[] = [];

    for (const [assetId, pos] of Array.from(positions.entries())) {
      const wac =
        pos.balance.greaterThan(0)
          ? pos.totalCost.dividedBy(pos.balance)
          : new Decimal(0);

      // Calcular totais brutos para referência
      const buyTxs = transactions.filter(
        (tx) => tx.assetId === assetId && tx.type === "BUY"
      );
      const sellTxs = transactions.filter(
        (tx) => tx.assetId === assetId && tx.type === "SELL"
      );

      const totalBought = buyTxs.reduce(
        (sum, tx) => sum.plus(new Decimal(tx.quantity.toString())),
        new Decimal(0)
      );
      const totalSold = sellTxs.reduce(
        (sum, tx) => sum.plus(new Decimal(tx.quantity.toString())),
        new Decimal(0)
      );

      result.push({
        assetId,
        symbol: pos.symbol,
        name: pos.name,
        totalBought: totalBought.toFixed(8),
        totalSold: totalSold.toFixed(8),
        balance: pos.balance.toFixed(8),
        totalCost: pos.totalCost.toFixed(2),
        wac: wac.toFixed(8),
      });
    }

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
