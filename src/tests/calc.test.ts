import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { processTransactions, Position } from '../lib/portfolio/calc';

function findPos(positions: Position[], assetId: string): Position {
  const pos = positions.find((p) => p.assetId === assetId);
  if (!pos) throw new Error(`Position not found for ${assetId}`);
  return pos;
}

describe('WAC Calculation', () => {
  it('buy + buy com preços diferentes', () => {
    const txs = [
      {
        type: 'BUY',
        baseAssetId: 'btc',
        baseQty: '1',
        quoteAssetId: 'usd',
        quoteQty: '30000',
      },
      {
        type: 'BUY',
        baseAssetId: 'btc',
        baseQty: '2',
        quoteAssetId: 'usd',
        quoteQty: '120000', // 2 BTC @ $60k
      },
    ];

    const positions = processTransactions(txs);
    const btc = findPos(positions, 'btc');

    expect(btc.qty.toNumber()).toBe(3);
    expect(btc.costUsdTotal.toNumber()).toBe(150000);
    expect(btc.avgCostUsd.toNumber()).toBe(50000);
  });

  it('buy + sell parcial', () => {
    const txs = [
      {
        type: 'BUY',
        baseAssetId: 'btc',
        baseQty: '2',
        quoteAssetId: 'usd',
        quoteQty: '80000', // 2 BTC @ $40k
      },
      {
        type: 'SELL',
        baseAssetId: 'btc',
        baseQty: '1',
        quoteAssetId: 'usd',
        quoteQty: '50000', // vende 1 @ $50k
      },
    ];

    const positions = processTransactions(txs);
    const btc = findPos(positions, 'btc');

    expect(btc.qty.toNumber()).toBe(1);
    expect(btc.costUsdTotal.toNumber()).toBe(40000);
    expect(btc.avgCostUsd.toNumber()).toBe(40000);
  });

  it('deposit sem costBasis distorce avg', () => {
    const txs = [
      {
        type: 'BUY',
        baseAssetId: 'btc',
        baseQty: '1',
        quoteAssetId: 'usd',
        quoteQty: '30000',
      },
      {
        type: 'DEPOSIT',
        baseAssetId: 'btc',
        baseQty: '1',
        // sem costBasisUsd
      },
    ];

    const positions = processTransactions(txs);
    const btc = findPos(positions, 'btc');

    expect(btc.qty.toNumber()).toBe(2);
    expect(btc.costUsdTotal.toNumber()).toBe(30000);
    expect(btc.avgCostUsd.toNumber()).toBe(15000); // distorção documentada
  });

  it('deposit com costBasis mantém avg correto', () => {
    const txs = [
      {
        type: 'BUY',
        baseAssetId: 'btc',
        baseQty: '1',
        quoteAssetId: 'usd',
        quoteQty: '30000',
      },
      {
        type: 'DEPOSIT',
        baseAssetId: 'btc',
        baseQty: '1',
        costBasisUsd: '30000',
      },
    ];

    const positions = processTransactions(txs);
    const btc = findPos(positions, 'btc');

    expect(btc.qty.toNumber()).toBe(2);
    expect(btc.costUsdTotal.toNumber()).toBe(60000);
    expect(btc.avgCostUsd.toNumber()).toBe(30000);
  });

  it('swap BTC->ETH (crypto-crypto com valueUsd)', () => {
    // Compra 1 BTC @ $30k
    // Swap 0.5 BTC -> 8 ETH, valueUsd = $30k (preço real do swap)
    const txs = [
      {
        type: 'BUY',
        baseAssetId: 'btc',
        baseQty: '1',
        quoteAssetId: 'usd',
        quoteQty: '30000',
      },
      {
        type: 'SWAP',
        baseAssetId: 'btc',
        baseQty: '0.5',
        quoteAssetId: 'eth',
        quoteQty: '8',
        valueUsd: '30000',
      },
    ];

    const positions = processTransactions(txs);
    const btc = findPos(positions, 'btc');
    const eth = findPos(positions, 'eth');

    // BTC: sobrou 0.5, custo proporcional = $15k
    expect(btc.qty.toNumber()).toBe(0.5);
    expect(btc.costUsdTotal.toNumber()).toBe(15000);
    expect(btc.avgCostUsd.toNumber()).toBe(30000);

    // ETH: qty=8, costTotal=$30k, avgCost=$3750
    expect(eth.qty.toNumber()).toBe(8);
    expect(eth.costUsdTotal.toNumber()).toBe(30000);
    expect(eth.avgCostUsd.toNumber()).toBe(3750);
  });

  it('swap pra stable (sem valueUsd, assume quoteQty = USD)', () => {
    // Compra 1 BTC @ $30k
    // Swap 0.5 BTC -> 30000 USDT (sem valueUsd — quoteQty já é USD)
    const txs = [
      {
        type: 'BUY',
        baseAssetId: 'btc',
        baseQty: '1',
        quoteAssetId: 'usd',
        quoteQty: '30000',
      },
      {
        type: 'SWAP',
        baseAssetId: 'btc',
        baseQty: '0.5',
        quoteAssetId: 'usdt',
        quoteQty: '30000',
        // sem valueUsd — quoteQty assume-se USD
      },
    ];

    const positions = processTransactions(txs);
    const btc = findPos(positions, 'btc');
    const usdt = findPos(positions, 'usdt');

    expect(btc.qty.toNumber()).toBe(0.5);
    expect(btc.costUsdTotal.toNumber()).toBe(15000);

    expect(usdt.qty.toNumber()).toBe(30000);
    expect(usdt.costUsdTotal.toNumber()).toBe(30000);
    expect(usdt.avgCostUsd.toNumber()).toBe(1);
  });
});
