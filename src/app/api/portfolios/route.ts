import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPortfolioSchema } from "@/lib/validations/portfolio";

// GET /api/portfolios — lista portfolios do user (ou todos se admin)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const where =
      session.user.role === "admin" ? {} : { ownerId: session.user.id };

    const portfolios = await prisma.portfolio.findMany({
      where,
      select: {
        id: true,
        name: true,
        baseFiat: true,
        ownerId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(portfolios);
  } catch (error) {
    console.error("Erro ao listar portfolios:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// POST /api/portfolios — cria portfolio
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createPortfolioSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, baseFiat } = validation.data;

    const portfolio = await prisma.portfolio.create({
      data: {
        name,
        baseFiat,
        ownerId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        baseFiat: true,
        ownerId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(portfolio, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar portfolio:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
