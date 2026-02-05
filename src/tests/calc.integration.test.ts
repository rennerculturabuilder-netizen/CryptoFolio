import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { calcPositions } from '../lib/portfolio/calc';

const prisma = new PrismaClient();

let testUser: any;
let btcAsset: any;
let ethAsset: any;
let usdtAsset: any;

beforeAll(async () => {
  // Criar assets de teste (upsert pra não duplicar)
  btcAsset = await prisma.asset.upsert({
    where: { symbol: 'BTC' },
    update: {},
    create: { symbol: 'BTC', name: 'Bitcoin' },
  });

  ethAsset = await prisma.asset.upsert({
    where: { symbol: 'ETH' },
    update: {},
    create: { symbol: 'ETH', name: 'Ethereum' },
  });

  usdtAsset = await prisma.asset.upsert({
    where: { symbol: 'USDT' },
    update: {},
    create: { symbol: 'USDT', name: 'Tether' },
  });

  // Criar user de teste
  testUser = await prisma.user.upsert({
    where: { email: 'test-calc@test.com' },
    update: {},
    create: {
      email: 'test-calc@test.com',
      password: 'hashed-test-password',
      name: 'Test User',
    },
  });
});

afterAll(async () => {
  // Limpar portfolios de teste (cascade deleta transactions)
  await prisma.portfolio.deleteMany({
    where: { ownerId: testUser.id },
  });
  await prisma.user.delete({ where: { id: testUser.id } });
  await prisma.$disconnect();
});

describe('WAC Calculation - Integração', () => {
  it('swap BTC→ETH com valueUsd correto', async () => {
    const portfolio = await prisma.portfolio.create({
      data: {
        name: 'Test Swap Portfolio',
        ownerId: testUser.id,
        baseFiat: 'USD',
      },
    });

    // Buy 1 BTC @ $30k
    await prisma.transaction.create({
      data: {
        portfolioId: portfolio.id,
        type: 'BUY',
        timestamp: new Date('2024-01-01'),
        baseAssetId: btcAsset.id,
        baseQty: '1',
        quoteAssetId: usdtAsset.id,
        quoteQty: '30000',
        price: '30000',
      },
    });

    // Swap 0.5 BTC → 8 ETH
    // Preço BTC = $60k, então 0.5 BTC = $30k
    // Preço ETH = $3.75k, então 8 ETH = $30k
    await prisma.transaction.create({
      data: {
        portfolioId: portfolio.id,
        type: 'SWAP',
        timestamp: new Date('2024-02-01'),
        baseAssetId: btcAsset.id,
        baseQty: '0.5',
        quoteAssetId: ethAsset.id,
        quoteQty: '8',
        valueUsd: '30000',
      },
    });

    const positions = await calcPositions(portfolio.id);

    const btcPos = positions.find((p) => p.assetId === btcAsset.id);
    const ethPos = positions.find((p) => p.assetId === ethAsset.id);

    expect(btcPos).toBeDefined();
    expect(ethPos).toBeDefined();

    // BTC: qty=0.5, costTotal=$15k (metade do custo original)
    expect(btcPos!.qty.toString()).toBe('0.5');
    expect(btcPos!.costUsdTotal.toString()).toBe('15000');
    expect(btcPos!.avgCostUsd.toString()).toBe('30000');

    // ETH: qty=8, costTotal=$30k, avgCost=$3750
    expect(ethPos!.qty.toString()).toBe('8');
    expect(ethPos!.costUsdTotal.toString()).toBe('30000');
    expect(ethPos!.avgCostUsd.toString()).toBe('3750');
  });
});
