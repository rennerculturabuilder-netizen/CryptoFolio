import { NextResponse } from "next/server";
import { fetchPrices, fetchRsi } from "@/lib/services/coingecko";

// GET /api/prices/coingecko?symbols=BTC,ETH,SOL&rsi=BTC
export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbolsParam = url.searchParams.get("symbols");
  const rsiSymbol = url.searchParams.get("rsi");

  if (!symbolsParam) {
    return NextResponse.json(
      { error: "Missing symbols parameter" },
      { status: 400 }
    );
  }

  const symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase());

  try {
    const [prices, rsi] = await Promise.all([
      fetchPrices(symbols),
      rsiSymbol ? fetchRsi(rsiSymbol) : Promise.resolve(null),
    ]);

    return NextResponse.json({ prices, rsi });
  } catch (error) {
    console.error("CoinGecko API error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar preços da CoinGecko" },
      { status: 502 }
    );
  }
}
