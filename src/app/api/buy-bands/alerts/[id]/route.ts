import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

// PATCH /api/buy-bands/alerts/:id — Marcar como lido
export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alert = await prisma.buyBandAlert.findUnique({
    where: { id: params.id },
    include: { buyBand: { include: { portfolio: true } } },
  });

  if (!alert) {
    return Response.json({ error: "Alert not found" }, { status: 404 });
  }

  if (
    alert.buyBand.portfolio.ownerId !== session.user.id &&
    session.user.role !== "admin"
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const updated = await prisma.buyBandAlert.update({
    where: { id: params.id },
    data: { read: body.read ?? true },
  });

  return Response.json(updated);
}

// DELETE /api/buy-bands/alerts/:id
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alert = await prisma.buyBandAlert.findUnique({
    where: { id: params.id },
    include: { buyBand: { include: { portfolio: true } } },
  });

  if (!alert) {
    return Response.json({ error: "Alert not found" }, { status: 404 });
  }

  if (
    alert.buyBand.portfolio.ownerId !== session.user.id &&
    session.user.role !== "admin"
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.buyBandAlert.delete({ where: { id: params.id } });

  return Response.json({ success: true });
}
