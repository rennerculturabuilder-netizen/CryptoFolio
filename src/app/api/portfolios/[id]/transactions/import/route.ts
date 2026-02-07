import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePortfolioAccess } from "@/lib/guards";
import { parseCSV, type ParsedTransaction } from "@/lib/csv/transactions-csv";
import { Decimal } from "@prisma/client/runtime/library";

type Params = { params: { id: string } };

// POST /api/portfolios/:id/transactions/import
export async function POST(request: Request, { params }: Params) {
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo CSV não enviado" },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const { valid, errors } = parseCSV(csvText);

    if (valid.length === 0) {
      return NextResponse.json(
        {
          created: 0,
          errors: errors.length > 0 ? errors : [{ row: 0, message: "Nenhuma transação válida encontrada no CSV" }],
        },
        { status: 400 }
      );
    }

    // Coletar todos os símbolos referenciados
    const symbols = new Set<string>();
    valid.forEach((tx) => {
      if (tx.baseSymbol) symbols.add(tx.baseSymbol);
      if (tx.quoteSymbol) symbols.add(tx.quoteSymbol);
      if (tx.feeSymbol) symbols.add(tx.feeSymbol);
    });

    // Resolver símbolos para IDs
    const assets = await prisma.asset.findMany({
      where: { symbol: { in: Array.from(symbols) } },
    });
    const symbolMap = new Map(assets.map((a) => [a.symbol, a.id]));

    // Validar que todos os símbolos existem
    const importErrors = [...errors];
    const readyToCreate: Array<{
      parsed: ParsedTransaction;
      data: Record<string, unknown>;
    }> = [];

    for (const tx of valid) {
      const missingSymbols: string[] = [];

      if (tx.type === "FEE") {
        if (tx.feeSymbol && !symbolMap.has(tx.feeSymbol)) {
          missingSymbols.push(tx.feeSymbol);
        }
      } else {
        if (tx.baseSymbol && !symbolMap.has(tx.baseSymbol)) {
          missingSymbols.push(tx.baseSymbol);
        }
        if (tx.quoteSymbol && !symbolMap.has(tx.quoteSymbol)) {
          missingSymbols.push(tx.quoteSymbol);
        }
      }
      if (tx.feeSymbol && tx.type !== "FEE" && !symbolMap.has(tx.feeSymbol)) {
        if (!missingSymbols.includes(tx.feeSymbol)) {
          missingSymbols.push(tx.feeSymbol);
        }
      }

      if (missingSymbols.length > 0) {
        importErrors.push({
          row: tx.row,
          message: `Asset(s) não encontrado(s): ${missingSymbols.join(", ")}`,
        });
        continue;
      }

      // Montar dados para create
      const txData: Record<string, unknown> = {
        type: tx.type,
        portfolioId: params.id,
        timestamp: tx.timestamp,
        venue: tx.venue || null,
        notes: tx.notes || null,
      };

      if (tx.type === "FEE") {
        txData.feeAssetId = symbolMap.get(tx.feeSymbol)!;
        txData.feeQty = new Decimal(tx.feeQty);
      } else {
        txData.baseAssetId = symbolMap.get(tx.baseSymbol)!;
        txData.baseQty = new Decimal(tx.baseQty);

        if (["BUY", "SELL", "SWAP"].includes(tx.type) && tx.quoteSymbol) {
          txData.quoteAssetId = symbolMap.get(tx.quoteSymbol)!;
          txData.quoteQty = new Decimal(tx.quoteQty);
        }

        if (tx.price) {
          txData.price = new Decimal(tx.price);
        }

        if (tx.feeSymbol && tx.feeQty) {
          txData.feeAssetId = symbolMap.get(tx.feeSymbol)!;
          txData.feeQty = new Decimal(tx.feeQty);
        }

        if (tx.costBasisUsd) {
          txData.costBasisUsd = new Decimal(tx.costBasisUsd);
        }

        if (tx.valueUsd) {
          txData.valueUsd = new Decimal(tx.valueUsd);
        }
      }

      readyToCreate.push({ parsed: tx, data: txData });
    }

    if (readyToCreate.length === 0) {
      return NextResponse.json(
        { created: 0, errors: importErrors },
        { status: 400 }
      );
    }

    // Criar transações em batch dentro de uma transaction do Prisma
    const created = await prisma.$transaction(
      readyToCreate.map(({ data }) =>
        prisma.transaction.create({ data: data as any })
      )
    );

    return NextResponse.json({
      created: created.length,
      total: valid.length + errors.length,
      errors: importErrors,
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
    console.error("Erro ao importar transações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
