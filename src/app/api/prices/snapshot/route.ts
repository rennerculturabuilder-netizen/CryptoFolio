import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const snapshotSchema = z.object({
  symbol: z.string().min(1),
  price: z.string().regex(/^\d+\.?\d*$/, "Preço inválido"),
  source: z.string().optional(),
});

// POST /api/prices/snapshot
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin only" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const validation = snapshotSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    const asset = await prisma.asset.findUnique({
      where: { symbol: data.symbol.toUpperCase() },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    const snapshot = await prisma.priceSnapshot.create({
      data: {
        assetId: asset.id,
        price: data.price,
        source: data.source || "manual",
      },
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar snapshot:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
