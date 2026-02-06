import { prisma } from "@/lib/prisma";

// GET /api/prices/latest?symbols=BTC,ETH,SOL
export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbolsParam = url.searchParams.get("symbols");

  if (!symbolsParam) {
    return Response.json(
      { error: "Missing symbols parameter" },
      { status: 400 }
    );
  }

  const symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase());

  const prices: Record<
    string,
    { price: string; isStub: boolean; timestamp?: string }
  > = {};

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  for (const symbol of symbols) {
    const asset = await prisma.asset.findUnique({ where: { symbol } });

    if (!asset) {
      prices[symbol] = { price: "0", isStub: true };
      continue;
    }

    // Buscar snapshot recente (< 1h)
    const snapshot = await prisma.priceSnapshot.findFirst({
      where: {
        assetId: asset.id,
        createdAt: { gte: oneHourAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    if (snapshot) {
      prices[symbol] = {
        price: snapshot.price.toString(),
        isStub: false,
        timestamp: snapshot.createdAt.toISOString(),
      };
    } else {
      // Fallback: último snapshot conhecido (qualquer idade)
      const lastKnown = await prisma.priceSnapshot.findFirst({
        where: { assetId: asset.id },
        orderBy: { createdAt: "desc" },
      });

      if (lastKnown) {
        prices[symbol] = {
          price: lastKnown.price.toString(),
          isStub: true,
          timestamp: lastKnown.createdAt.toISOString(),
        };
      } else {
        prices[symbol] = { price: "0", isStub: true };
      }
    }
  }

  return Response.json(prices);
}
