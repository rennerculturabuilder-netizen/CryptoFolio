import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

// PATCH /api/buy-bands/:id
export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const buyBand = await prisma.buyBand.findUnique({
    where: { id: params.id },
    include: { portfolio: true },
  });

  if (!buyBand) {
    return Response.json({ error: "Buy band not found" }, { status: 404 });
  }

  if (
    buyBand.portfolio.ownerId !== session.user.id &&
    session.user.role !== "admin"
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // Não permitir mudar portfolioId ou assetId
  const { portfolioId: _pid, assetId: _aid, ...updates } = body;

  const updated = await prisma.buyBand.update({
    where: { id: params.id },
    data: updates,
    include: { asset: true },
  });

  return Response.json(updated);
}

// DELETE /api/buy-bands/:id
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const buyBand = await prisma.buyBand.findUnique({
    where: { id: params.id },
    include: { portfolio: true },
  });

  if (!buyBand) {
    return Response.json({ error: "Buy band not found" }, { status: 404 });
  }

  if (
    buyBand.portfolio.ownerId !== session.user.id &&
    session.user.role !== "admin"
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.buyBand.delete({ where: { id: params.id } });

  return Response.json({ success: true });
}
