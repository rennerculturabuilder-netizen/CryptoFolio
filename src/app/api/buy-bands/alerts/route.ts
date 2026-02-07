import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/buy-bands/alerts — Lista alertas do usuário
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const readFilter = searchParams.get("read");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {
    buyBand: {
      portfolio: { ownerId: session.user.id },
    },
  };

  if (readFilter !== null && readFilter !== "") {
    where.read = readFilter === "true";
  }

  const alerts = await prisma.buyBandAlert.findMany({
    where,
    include: {
      buyBand: {
        include: {
          asset: true,
          portfolio: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });

  return Response.json(alerts);
}
