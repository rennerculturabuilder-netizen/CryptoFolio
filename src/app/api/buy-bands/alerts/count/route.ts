import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/buy-bands/alerts/count — Retorna contagem de não lidos
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unread = await prisma.buyBandAlert.count({
    where: {
      read: false,
      buyBand: {
        portfolio: { ownerId: session.user.id },
      },
    },
  });

  return Response.json({ unread });
}
