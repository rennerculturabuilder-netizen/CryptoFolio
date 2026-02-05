import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePortfolioAccess } from "@/lib/guards";
import { updatePortfolioSchema } from "@/lib/validations/portfolio";

type Params = { params: { id: string } };

// GET /api/portfolios/:id
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const portfolio = await requirePortfolioAccess(
      session.user.id,
      params.id,
      session.user.role
    );

    return NextResponse.json({
      id: portfolio.id,
      name: portfolio.name,
      baseFiat: portfolio.baseFiat,
      ownerId: portfolio.ownerId,
      createdAt: portfolio.createdAt,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Portfolio not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Erro ao buscar portfolio:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// PATCH /api/portfolios/:id
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    await requirePortfolioAccess(
      session.user.id,
      params.id,
      session.user.role
    );

    const body = await request.json();
    const validation = updatePortfolioSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;
    if (!data.name && !data.baseFiat) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 }
      );
    }

    const updated = await prisma.portfolio.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        name: true,
        baseFiat: true,
        ownerId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Portfolio not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Erro ao atualizar portfolio:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolios/:id
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    await requirePortfolioAccess(
      session.user.id,
      params.id,
      session.user.role
    );

    // Bloquear se tiver transações
    const txCount = await prisma.transaction.count({
      where: { portfolioId: params.id },
    });

    if (txCount > 0) {
      return NextResponse.json(
        { error: "Portfolio has transactions" },
        { status: 400 }
      );
    }

    await prisma.portfolio.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Portfolio removido" });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Portfolio not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Erro ao deletar portfolio:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
