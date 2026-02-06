import { prisma } from "@/lib/prisma";

// GET /api/assets
export async function GET() {
  const assets = await prisma.asset.findMany({
    orderBy: { symbol: "asc" },
  });
  return Response.json(assets);
}
