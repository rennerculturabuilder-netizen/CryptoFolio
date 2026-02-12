import Decimal from 'decimal.js';
import { prisma } from '@/lib/prisma';

export type Position = {
  assetId: string;
  qty: Decimal;
  costUsdTotal: Decimal;
  avgCostUsd: Decimal;
};

// Wrapper com DB
export async function calcPositions(portfolioId: string): Promise<Position[]> {
  const transactions = await prisma.transaction.findMany({
    where: { portfolioId },
    orderBy: { timestamp: 'asc' },
    include: { baseAsset: true, quoteAsset: true, feeAsset: true },
  });

  return processTransactions(transactions);
}

// Função pura — testável sem DB
export function processTransactions(transactions: any[]): Position[] {
  const positions = new Map<string, Position>();

  // Garantir que BUYs/DEPOSITs vêm antes de SELLs/WITHDRAWs no mesmo timestamp
  const typePriority: Record<string, number> = {
    DEPOSIT: 0, BUY: 1, SWAP: 2, SELL: 3, WITHDRAW: 4, FEE: 5,
  };
  const sorted = [...transactions].sort((a, b) => {
    const timeDiff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    if (timeDiff !== 0) return timeDiff;
    return (typePriority[a.type] ?? 99) - (typePriority[b.type] ?? 99);
  });

  for (const tx of sorted) {
    switch (tx.type) {
      case 'BUY':
        handleBuy(positions, tx);
        break;
      case 'SELL':
        handleSell(positions, tx);
        break;
      case 'SWAP':
        handleSwap(positions, tx);
        break;
      case 'DEPOSIT':
        handleDeposit(positions, tx);
        break;
      case 'WITHDRAW':
        handleWithdraw(positions, tx);
        break;
      case 'FEE':
        handleFee(positions, tx);
        break;
    }
  }

  return Array.from(positions.values());
}

function getOrCreatePosition(positions: Map<string, Position>, assetId: string): Position {
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

function applyFee(positions: Map<string, Position>, tx: any) {
  if (tx.feeAssetId && tx.feeQty) {
    const feePos = getOrCreatePosition(positions, tx.feeAssetId);
    feePos.qty = feePos.qty.minus(new Decimal(tx.feeQty));
    const proportion = new Decimal(tx.feeQty).div(feePos.qty.plus(new Decimal(tx.feeQty)));
    feePos.costUsdTotal = feePos.costUsdTotal.times(new Decimal(1).minus(proportion));
    feePos.avgCostUsd = feePos.qty.isZero() ? new Decimal(0) : feePos.costUsdTotal.div(feePos.qty);
  }
}

function handleBuy(positions: Map<string, Position>, tx: any) {
  const pos = getOrCreatePosition(positions, tx.baseAssetId);
  const buyQty = new Decimal(tx.baseQty);
  const costUsd = new Decimal(tx.quoteQty);

  pos.qty = pos.qty.plus(buyQty);
  pos.costUsdTotal = pos.costUsdTotal.plus(costUsd);
  pos.avgCostUsd = pos.qty.isZero() ? new Decimal(0) : pos.costUsdTotal.div(pos.qty);

  applyFee(positions, tx);
}

function handleSell(positions: Map<string, Position>, tx: any) {
  const pos = getOrCreatePosition(positions, tx.baseAssetId);
  const sellQty = new Decimal(tx.baseQty);

  // Se saldo insuficiente, ajustar para vender tudo que tem (dados reais podem ter discrepâncias)
  const effectiveQty = sellQty.greaterThan(pos.qty) ? pos.qty : sellQty;

  const avgCost = pos.qty.isZero() ? new Decimal(0) : pos.costUsdTotal.div(pos.qty);
  const costReduction = avgCost.times(effectiveQty);

  pos.qty = pos.qty.minus(effectiveQty);
  pos.costUsdTotal = pos.costUsdTotal.minus(costReduction);
  pos.avgCostUsd = pos.qty.isZero() ? new Decimal(0) : pos.costUsdTotal.div(pos.qty);

  applyFee(positions, tx);
}

/**
 * SWAP Transaction:
 *
 * Para swaps pra stablecoin (USDT/USDC):
 *   - valueUsd é opcional
 *   - Se não informado, assume quoteQty = USD
 *
 * Para swaps crypto-crypto (BTC→ETH):
 *   - valueUsd é OBRIGATÓRIO
 *   - Representa o valor USD do swap
 *   - Exemplo: swap 0.5 BTC → 8 ETH quando BTC=$60k e ETH=$3.75k
 *     { baseQty: "0.5", quoteQty: "8", valueUsd: "30000" }
 *
 * Isso garante que o custo médio seja calculado corretamente.
 */
function handleSwap(positions: Map<string, Position>, tx: any) {
  const basePos = getOrCreatePosition(positions, tx.baseAssetId);
  const quotePos = getOrCreatePosition(positions, tx.quoteAssetId);

  const sellQty = new Decimal(tx.baseQty);
  const buyQty = new Decimal(tx.quoteQty);

  // MUDANÇA PRINCIPAL: usar valueUsd se existir
  const swapValueUsd = tx.valueUsd
    ? new Decimal(tx.valueUsd)
    : buyQty; // fallback: assume quoteQty = USD (pra swaps em stable)

  // Sell base (ajustar se saldo insuficiente)
  const effectiveSellQty = sellQty.greaterThan(basePos.qty) ? basePos.qty : sellQty;

  const avgCost = basePos.qty.isZero() ? new Decimal(0) : basePos.costUsdTotal.div(basePos.qty);
  const costReduction = avgCost.times(effectiveSellQty);

  basePos.qty = basePos.qty.minus(effectiveSellQty);
  basePos.costUsdTotal = basePos.costUsdTotal.minus(costReduction);
  basePos.avgCostUsd = basePos.qty.isZero() ? new Decimal(0) : basePos.costUsdTotal.div(basePos.qty);

  // Buy quote (usando swapValueUsd)
  quotePos.qty = quotePos.qty.plus(buyQty);
  quotePos.costUsdTotal = quotePos.costUsdTotal.plus(swapValueUsd);
  quotePos.avgCostUsd = quotePos.qty.isZero() ? new Decimal(0) : quotePos.costUsdTotal.div(quotePos.qty);

  // Fee
  if (tx.feeAssetId && tx.feeQty) {
    const feePos = getOrCreatePosition(positions, tx.feeAssetId);
    const feeQty = new Decimal(tx.feeQty);

    if (feeQty.greaterThan(feePos.qty)) {
      // Se não tem saldo suficiente, apenas registrar (pode ser fee deduzida da própria transação)
      feePos.qty = new Decimal(0);
      feePos.costUsdTotal = new Decimal(0);
    } else {
      feePos.qty = feePos.qty.minus(feeQty);
      const proportion = feeQty.div(feePos.qty.plus(feeQty));
      feePos.costUsdTotal = feePos.costUsdTotal.times(new Decimal(1).minus(proportion));
    }

    feePos.avgCostUsd = feePos.qty.isZero() ? new Decimal(0) : feePos.costUsdTotal.div(feePos.qty);
  }
}

function handleDeposit(positions: Map<string, Position>, tx: any) {
  const pos = getOrCreatePosition(positions, tx.baseAssetId);
  const depositQty = new Decimal(tx.baseQty);

  pos.qty = pos.qty.plus(depositQty);

  if (tx.costBasisUsd) {
    pos.costUsdTotal = pos.costUsdTotal.plus(new Decimal(tx.costBasisUsd));
  }

  pos.avgCostUsd = pos.qty.isZero() ? new Decimal(0) : pos.costUsdTotal.div(pos.qty);

  applyFee(positions, tx);
}

function handleWithdraw(positions: Map<string, Position>, tx: any) {
  const pos = getOrCreatePosition(positions, tx.baseAssetId);
  const withdrawQty = new Decimal(tx.baseQty);

  const effectiveQty = withdrawQty.greaterThan(pos.qty) ? pos.qty : withdrawQty;

  const avgCost = pos.qty.isZero() ? new Decimal(0) : pos.costUsdTotal.div(pos.qty);
  const costReduction = avgCost.times(effectiveQty);

  pos.qty = pos.qty.minus(effectiveQty);
  pos.costUsdTotal = pos.costUsdTotal.minus(costReduction);
  pos.avgCostUsd = pos.qty.isZero() ? new Decimal(0) : pos.costUsdTotal.div(pos.qty);

  applyFee(positions, tx);
}

function handleFee(positions: Map<string, Position>, tx: any) {
  const pos = getOrCreatePosition(positions, tx.feeAssetId);
  const feeQty = new Decimal(tx.feeQty);

  pos.qty = pos.qty.minus(feeQty);
  const proportion = feeQty.div(pos.qty.plus(feeQty));
  pos.costUsdTotal = pos.costUsdTotal.times(new Decimal(1).minus(proportion));
  pos.avgCostUsd = pos.qty.isZero() ? new Decimal(0) : pos.costUsdTotal.div(pos.qty);
}
