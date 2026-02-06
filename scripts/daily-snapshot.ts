/**
 * Daily Portfolio Snapshot
 *
 * Cria um snapshot de valor para cada portfolio ativo.
 * Executar via: npx tsx scripts/daily-snapshot.ts
 * Agendar via cron: 0 0 * * * cd /path/to/project && npx tsx scripts/daily-snapshot.ts
 */

import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

const prisma = new PrismaClient();

type Position = {
  assetId: string;
  qty: Decimal;
  costUsdTotal: Decimal;
  avgCostUsd: Decimal;
};

// Reimplementação local do processTransactions pra evitar import de paths com @
function processTransactions(transactions: any[]): Position[] {
  const positions = new Map<string, Position>();

  function getOrCreate(assetId: string): Position {
    if (!positions.has(assetId)) {
      positions.set(assetId, {
        assetId,
        qty: new Decimal(0),
        costUsdTotal: new Decimal(0),
        avgCostUsd: new Decimal(0),
      });
    }
    return positions.get(assetId)!;
  }

  for (const tx of transactions) {
    switch (tx.type) {
      case "BUY": {
        const pos = getOrCreate(tx.baseAssetId);
        const buyQty = new Decimal(tx.baseQty);
        const costUsd = new Decimal(tx.quoteQty);
        pos.qty = pos.qty.plus(buyQty);
        pos.costUsdTotal = pos.costUsdTotal.plus(costUsd);
        pos.avgCostUsd = pos.qty.isZero() ? new Decimal(0) : pos.costUsdTotal.div(pos.qty);
        break;
      }
      case "SELL": {
        const pos = getOrCreate(tx.baseAssetId);
        const sellQty = new Decimal(tx.baseQty);
        const avgCost = pos.qty.isZero() ? new Decimal(0) : pos.costUsdTotal.div(pos.qty);
        pos.qty = pos.qty.minus(sellQty);
        pos.costUsdTotal = pos.costUsdTotal.minus(avgCost.times(sellQty));
        pos.avgCostUsd = pos.qty.isZero() ? new Decimal(0) : pos.costUsdTotal.div(pos.qty);
        break;
      }
      case "SWAP": {
        const basePos = getOrCreate(tx.baseAssetId);
        const quotePos = getOrCreate(tx.quoteAssetId);
        const swapSellQty = new Decimal(tx.baseQty);
        const swapBuyQty = new Decimal(tx.quoteQty);
        const swapValueUsd = tx.valueUsd ? new Decimal(tx.valueUsd) : swapBuyQty;

        const avgC = basePos.qty.isZero() ? new Decimal(0) : basePos.costUsdTotal.div(basePos.qty);
        basePos.qty = basePos.qty.minus(swapSellQty);
        basePos.costUsdTotal = basePos.costUsdTotal.minus(avgC.times(swapSellQty));
        basePos.avgCostUsd = basePos.qty.isZero() ? new Decimal(0) : basePos.costUsdTotal.div(basePos.qty);

        quotePos.qty = quotePos.qty.plus(swapBuyQty);
        quotePos.costUsdTotal = quotePos.costUsdTotal.plus(swapValueUsd);
        quotePos.avgCostUsd = quotePos.qty.isZero() ? new Decimal(0) : quotePos.costUsdTotal.div(quotePos.qty);
        break;
      }
      case "DEPOSIT": {
        const pos = getOrCreate(tx.baseAssetId);
        pos.qty = pos.qty.plus(new Decimal(tx.baseQty));
        if (tx.costBasisUsd) pos.costUsdTotal = pos.costUsdTotal.plus(new Decimal(tx.costBasisUsd));
        pos.avgCostUsd = pos.qty.isZero() ? new Decimal(0) : pos.costUsdTotal.div(pos.qty);
        break;
      }
      case "WITHDRAW": {
        const pos = getOrCreate(tx.baseAssetId);
        const wQty = new Decimal(tx.baseQty);
        const avgW = pos.qty.isZero() ? new Decimal(0) : pos.costUsdTotal.div(pos.qty);
        pos.qty = pos.qty.minus(wQty);
        pos.costUsdTotal = pos.costUsdTotal.minus(avgW.times(wQty));
        pos.avgCostUsd = pos.qty.isZero() ? new Decimal(0) : pos.costUsdTotal.div(pos.qty);
        break;
      }
      case "FEE": {
        const pos = getOrCreate(tx.feeAssetId);
        const feeQty = new Decimal(tx.feeQty);
        pos.qty = pos.qty.minus(feeQty);
        const proportion = feeQty.div(pos.qty.plus(feeQty));
        pos.costUsdTotal = pos.costUsdTotal.times(new Decimal(1).minus(proportion));
        pos.avgCostUsd = pos.qty.isZero() ? new Decimal(0) : pos.costUsdTotal.div(pos.qty);
        break;
      }
    }
  }

  return Array.from(positions.values());
}

async function createSnapshot(portfolioId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { portfolioId },
    orderBy: { timestamp: "asc" },
  });

  const positions = processTransactions(transactions);
  const active = positions.filter((p) => p.qty.greaterThan(0));

  if (active.length === 0) {
    return prisma.portfolioSnapshot.create({
      data: {
        portfolioId,
        valueUsd: 0,
        costBasisUsd: 0,
        unrealizedPnl: 0,
        unrealizedPct: 0,
        positionsSnapshot: [],
      },
    });
  }

  // Buscar assets e preços
  const assetIds = active.map((p) => p.assetId);
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, symbol: true },
  });
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  const priceMap = new Map<string, Decimal>();
  for (const asset of assets) {
    const snap = await prisma.priceSnapshot.findFirst({
      where: { assetId: asset.id },
      orderBy: { createdAt: "desc" },
    });
    priceMap.set(asset.id, snap ? new Decimal(snap.price.toString()) : new Decimal(0));
  }

  let totalValue = new Decimal(0);
  let totalCost = new Decimal(0);
  const posSnapshots: any[] = [];

  for (const pos of active) {
    const asset = assetMap.get(pos.assetId);
    const price = priceMap.get(pos.assetId) || new Decimal(0);
    const value = pos.qty.times(price);
    const pnl = value.minus(pos.costUsdTotal);
    const pnlPct = pos.costUsdTotal.isZero() ? new Decimal(0) : pnl.div(pos.costUsdTotal).times(100);

    totalValue = totalValue.plus(value);
    totalCost = totalCost.plus(pos.costUsdTotal);

    posSnapshots.push({
      assetId: pos.assetId,
      symbol: asset?.symbol || "???",
      qty: pos.qty.toFixed(8),
      avgCost: pos.avgCostUsd.toFixed(8),
      currentPrice: price.toFixed(8),
      valueUsd: value.toFixed(2),
      costTotal: pos.costUsdTotal.toFixed(2),
      pnl: pnl.toFixed(2),
      pnlPct: pnlPct.toFixed(2),
    });
  }

  const unrealizedPnl = totalValue.minus(totalCost);
  const unrealizedPct = totalCost.isZero() ? new Decimal(0) : unrealizedPnl.div(totalCost).times(100);

  return prisma.portfolioSnapshot.create({
    data: {
      portfolioId,
      valueUsd: totalValue,
      costBasisUsd: totalCost,
      unrealizedPnl,
      unrealizedPct,
      positionsSnapshot: posSnapshots,
    },
  });
}

async function main() {
  console.log(`[${new Date().toISOString()}] Iniciando snapshots diários...`);

  const portfolios = await prisma.portfolio.findMany({
    select: { id: true, name: true },
  });

  console.log(`Encontrados ${portfolios.length} portfolios.`);

  let success = 0;
  let errors = 0;

  for (const portfolio of portfolios) {
    try {
      const snapshot = await createSnapshot(portfolio.id);
      console.log(
        `  ✓ ${portfolio.name}: $${parseFloat(snapshot.valueUsd.toString()).toFixed(2)} ` +
        `(PnL: $${parseFloat(snapshot.unrealizedPnl.toString()).toFixed(2)})`
      );
      success++;
    } catch (err) {
      console.error(`  ✗ ${portfolio.name}: ${err}`);
      errors++;
    }
  }

  console.log(`\nConcluído: ${success} OK, ${errors} erros.`);
}

main()
  .catch((e) => {
    console.error("Erro fatal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
