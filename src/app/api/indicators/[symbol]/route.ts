import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getIndicators } from "@/lib/services/indicators";

export async function GET(
  req: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { symbol } = params;
  const periodsParam = req.nextUrl.searchParams.get("periods") || "21,50,200";

  const periods = periodsParam
    .split(",")
    .map((p) => parseInt(p.trim(), 10))
    .filter((p) => !isNaN(p) && p > 0);

  if (periods.length === 0) {
    return NextResponse.json(
      { error: "Invalid periods parameter" },
      { status: 400 }
    );
  }

  const result = await getIndicators(symbol, periods);
  return NextResponse.json(result);
}
