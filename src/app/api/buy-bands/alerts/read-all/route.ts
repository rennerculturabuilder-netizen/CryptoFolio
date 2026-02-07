import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/buy-bands/alerts/read-all — Marca todos como lidos
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Buscar IDs das buy bands do usuário
  const buyBandIds = await prisma.buyBand.findMany({
    where: { portfolio: { ownerId: session.user.id } },
    select: { id: true },
  });

  const ids = buyBandIds.map((b) => b.id);

  const result = await prisma.buyBandAlert.updateMany({
    where: {
      buyBandId: { in: ids },
      read: false,
    },
    data: { read: true },
  });

  return Response.json({ updated: result.count });
}
