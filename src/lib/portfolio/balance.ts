import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Calcula saldo de um asset em um portfolio
 * Consolidado a partir de todas as transações
 */
export async function getAssetBalance(
  portfolioId: string,
  assetId: string
): Promise<Decimal> {
  const txs = await prisma.transaction.findMany({
    where: { portfolioId },
    select: {
      type: true,
      baseAssetId: true,
      baseQty: true,
      quoteAssetId: true,
      quoteQty: true,
      feeAssetId: true,
      feeQty: true,
    },
    orderBy: { timestamp: "asc" },
  });

  let balance = new Decimal(0);

  for (const tx of txs) {
    if (
      (tx.type === "BUY" || tx.type === "DEPOSIT") &&
      tx.baseAssetId === assetId &&
      tx.baseQty
    ) {
      balance = balance.plus(tx.baseQty);
    }

    if (
      (tx.type === "SELL" || tx.type === "WITHDRAW") &&
      tx.baseAssetId === assetId &&
      tx.baseQty
    ) {
      balance = balance.minus(tx.baseQty);
    }

    if (tx.type === "SWAP") {
      if (tx.baseAssetId === assetId && tx.baseQty) {
        balance = balance.minus(tx.baseQty);
      }
      if (tx.quoteAssetId === assetId && tx.quoteQty) {
        balance = balance.plus(tx.quoteQty);
      }
    }

    if (tx.type === "BUY" && tx.quoteAssetId === assetId && tx.quoteQty) {
      balance = balance.minus(tx.quoteQty);
    }

    if (tx.type === "SELL" && tx.quoteAssetId === assetId && tx.quoteQty) {
      balance = balance.plus(tx.quoteQty);
    }

    if (tx.feeAssetId === assetId && tx.feeQty) {
      balance = balance.minus(tx.feeQty);
    }
  }

  return balance;
}
