import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePortfolioAccess } from '@/lib/guards';
import { handleApiError } from '@/lib/api-response';

// Zonas fixas por ativo (em USD)
const FIXED_ZONES: Record<string, Array<{
  order: number;
  priceMin: number;
  priceMax: number;
  percentualBase: number;
  label: string;
}>> = {
  BTC: [
    { order: 1, priceMin: 65000, priceMax: 70000, percentualBase: 15, label: 'Zona 1' },
    { order: 2, priceMin: 55000, priceMax: 65000, percentualBase: 25, label: 'Zona 2' },
    { order: 3, priceMin: 50000, priceMax: 55000, percentualBase: 30, label: 'Zona 3' },
    { order: 4, priceMin: 40000, priceMax: 50000, percentualBase: 25, label: 'Zona 4' },
    { order: 5, priceMin: 30000, priceMax: 40000, percentualBase: 5, label: 'Emergência' },
  ],
  ETH: [
    { order: 1, priceMin: 2800, priceMax: 3500, percentualBase: 15, label: 'Zona 1' },
    { order: 2, priceMin: 2200, priceMax: 2800, percentualBase: 25, label: 'Zona 2' },
    { order: 3, priceMin: 1800, priceMax: 2200, percentualBase: 30, label: 'Zona 3' },
    { order: 4, priceMin: 1400, priceMax: 1800, percentualBase: 25, label: 'Zona 4' },
    { order: 5, priceMin: 1000, priceMax: 1400, percentualBase: 5, label: 'Emergência' },
  ],
  SOL: [
    { order: 1, priceMin: 150, priceMax: 200, percentualBase: 15, label: 'Zona 1' },
    { order: 2, priceMin: 100, priceMax: 150, percentualBase: 25, label: 'Zona 2' },
    { order: 3, priceMin: 75, priceMax: 100, percentualBase: 30, label: 'Zona 3' },
    { order: 4, priceMin: 50, priceMax: 75, percentualBase: 25, label: 'Zona 4' },
    { order: 5, priceMin: 30, priceMax: 50, percentualBase: 5, label: 'Emergência' },
  ],
};

// Cache de preços em memória (evita rate limit CoinGecko)
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 60_000; // 60 segundos

async function getCryptoPrice(symbol: string): Promise<number> {
  // 1. Verificar cache em memória
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  // 2. Buscar último preço do snapshot no banco
  const latestPrice = await prisma.priceSnapshot.findFirst({
    where: {
      asset: { symbol },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (latestPrice) {
    const price = parseFloat(latestPrice.price.toString());
    priceCache.set(symbol, { price, timestamp: Date.now() });
    return price;
  }

  // 3. Fallback: buscar da API CoinGecko
  const coinIds: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
  };

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds[symbol]}&vs_currencies=usd`,
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    const price = data[coinIds[symbol]]?.usd || 0;
    if (price > 0) {
      priceCache.set(symbol, { price, timestamp: Date.now() });
    }
    return price;
  } catch {
    // Se falhou e tem cache antigo, usar ele
    if (cached) return cached.price;
    return 0;
  }
}

async function getPortfolioBalance(portfolioId: string) {
  // Importar calcPositions
  const { calcPositions } = await import('@/lib/portfolio/calc');
  
  // Calcular todas as posições
  const positions = await calcPositions(portfolioId);
  
  // Buscar assets das posições
  const assetIds = positions.map((p) => p.assetId);
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, symbol: true },
  });
  
  const assetMap = new Map(assets.map((a) => [a.id, a.symbol]));
  
  // Stablecoins que contam como capital disponível
  const stablecoins = ['USD', 'USDT', 'USDC', 'BUSD', 'DAI', 'USDD'];
  
  let totalUsd = 0;
  const balances: Record<string, number> = {};
  
  for (const pos of positions) {
    const symbol = assetMap.get(pos.assetId);
    if (symbol && stablecoins.includes(symbol)) {
      const qty = parseFloat(pos.qty.toString());
      balances[symbol] = qty;
      totalUsd += qty; // Stablecoins = 1:1 USD
    }
  }

  return { balances, totalUsd };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const portfolioId = params.id;
    const asset = req.nextUrl.searchParams.get('asset') || 'BTC';

    await requirePortfolioAccess(session.user.id, portfolioId, session.user.role);

    // Buscar dados
    const precoAtual = await getCryptoPrice(asset);
    const { totalUsd } = await getPortfolioBalance(portfolioId);

    if (!FIXED_ZONES[asset]) {
      return NextResponse.json(
        { error: `Asset ${asset} not supported` },
        { status: 400 }
      );
    }

    const zonasFixas = FIXED_ZONES[asset];

    // Buscar ou criar zonas DCA no banco
    const zonasDb = await Promise.all(
      zonasFixas.map(async (zona) => {
        const existing = await prisma.dcaZone.findFirst({
          where: {
            portfolioId,
            assetSymbol: asset,
            order: zona.order,
          },
        });

        if (existing) {
          // Sincronizar valores se FIXED_ZONES mudou
          const needsSync =
            parseFloat(existing.priceMin.toString()) !== zona.priceMin ||
            parseFloat(existing.priceMax.toString()) !== zona.priceMax ||
            parseFloat(existing.percentualBase.toString()) !== zona.percentualBase;

          if (needsSync) {
            return prisma.dcaZone.update({
              where: { id: existing.id },
              data: {
                priceMin: zona.priceMin,
                priceMax: zona.priceMax,
                percentualBase: zona.percentualBase,
                label: zona.label,
              },
            });
          }
          return existing;
        }

        // Criar zona no banco
        return prisma.dcaZone.create({
          data: {
            portfolioId,
            assetSymbol: asset,
            order: zona.order,
            priceMin: zona.priceMin,
            priceMax: zona.priceMax,
            percentualBase: zona.percentualBase,
            label: zona.label,
          },
        });
      })
    );

    const zonaIdMap = new Map(zonasDb.map((z) => [z.order, z.id]));

    // Buscar todos os entry points do portfolio + asset
    const zoneIds = zonasDb.map((z) => z.id);
    const entryPoints = await prisma.dcaEntryPoint.findMany({
      where: { dcaZoneId: { in: zoneIds } },
    });

    // Auto-executar: entry points com pré-ordem cujo preço alvo foi atingido
    const epsParaExecutar = entryPoints.filter(
      (ep) => ep.preOrderPlaced && !ep.purchaseConfirmed && parseFloat(ep.targetPrice.toString()) >= precoAtual
    );

    if (epsParaExecutar.length > 0) {
      await prisma.dcaEntryPoint.updateMany({
        where: { id: { in: epsParaExecutar.map((ep) => ep.id) } },
        data: { purchaseConfirmed: true, confirmedAt: new Date() },
      });
      // Atualizar em memória pra refletir na resposta
      for (const ep of epsParaExecutar) {
        ep.purchaseConfirmed = true;
        ep.confirmedAt = new Date();
      }
    }

    // Agrupar entry points por zona
    const entryPointsByZone = new Map<string, typeof entryPoints>();
    for (const ep of entryPoints) {
      const existing = entryPointsByZone.get(ep.dcaZoneId) || [];
      existing.push(ep);
      entryPointsByZone.set(ep.dcaZoneId, existing);
    }

    // === Classificar status de cada zona ===
    // EXECUTADA: tem compras confirmadas (purchaseConfirmed)
    // PERDIDA: preço caiu abaixo da zona e não tem compras confirmadas
    // ATUAL: preço está dentro da zona
    // AGUARDANDO: preço ainda está acima da zona
    const zonasComStatus = zonasFixas.map((zona) => {
      const zoneId = zonaIdMap.get(zona.order) || '';
      const zoneEps = entryPointsByZone.get(zoneId) || [];
      const hasConfirmedPurchases = zoneEps.some((ep) => ep.purchaseConfirmed);

      let status: 'EXECUTADA' | 'PERDIDA' | 'ATUAL' | 'AGUARDANDO';

      if (precoAtual < zona.priceMin) {
        // Preço caiu abaixo desta zona
        status = hasConfirmedPurchases ? 'EXECUTADA' : 'PERDIDA';
      } else if (precoAtual >= zona.priceMin && precoAtual <= zona.priceMax) {
        status = 'ATUAL';
      } else {
        status = 'AGUARDANDO';
      }

      return { ...zona, id: zoneId, status, zoneEps };
    });

    // === Redistribuição ===
    // % das zonas PERDIDAS vai proporcionalmente pras ATUAL + AGUARDANDO
    const zonasPerdidas = zonasComStatus.filter((z) => z.status === 'PERDIDA');
    const zonasRecebeRedist = zonasComStatus.filter((z) => z.status === 'ATUAL' || z.status === 'AGUARDANDO');
    const percentualPerdido = zonasPerdidas.reduce((sum, z) => sum + z.percentualBase, 0);
    const percentualRecebeRedist = zonasRecebeRedist.reduce((sum, z) => sum + z.percentualBase, 0);

    const zonasCalculadas = zonasComStatus.map((zona) => {
      let percentualAjustado = zona.percentualBase;

      if (zona.status === 'PERDIDA') {
        percentualAjustado = 0;
      } else if ((zona.status === 'ATUAL' || zona.status === 'AGUARDANDO') && percentualPerdido > 0 && percentualRecebeRedist > 0) {
        const proporcao = zona.percentualBase / percentualRecebeRedist;
        percentualAjustado = zona.percentualBase + proporcao * percentualPerdido;
      }

      const valorEmDolar = (totalUsd * percentualAjustado) / 100;
      const distanciaPercentual = ((zona.priceMin - precoAtual) / precoAtual) * 100;

      // Cap priceMax no preço atual (entry points nunca acima do preço atual)
      const priceMaxCapped = Math.min(zona.priceMax, precoAtual);

      // Calcular valor comprometido nesta zona (pré-ordens + compras)
      const zoneEps = entryPointsByZone.get(zona.id) || [];
      const valorPreOrdens = zoneEps
        .filter((ep) => ep.preOrderPlaced && !ep.purchaseConfirmed)
        .reduce((sum, ep) => sum + parseFloat(ep.value.toString()), 0);
      const valorComprado = zoneEps
        .filter((ep) => ep.purchaseConfirmed)
        .reduce((sum, ep) => sum + parseFloat(ep.value.toString()), 0);

      return {
        id: zona.id,
        order: zona.order,
        priceMin: zona.priceMin,
        priceMax: priceMaxCapped,
        percentualBase: zona.percentualBase,
        percentualAjustado: Math.round(percentualAjustado * 100) / 100,
        valorEmDolar: Math.round(valorEmDolar * 100) / 100,
        valorPreOrdens: Math.round(valorPreOrdens * 100) / 100,
        valorComprado: Math.round(valorComprado * 100) / 100,
        label: zona.label,
        status: zona.status,
        distanciaPercentual: Math.round(distanciaPercentual * 10) / 10,
      };
    });

    // Calcular capital já alocado (pré-ordens + compras confirmadas)
    const capitalAlocado = entryPoints.reduce((sum, ep) => {
      if (ep.preOrderPlaced || ep.purchaseConfirmed) {
        return sum + parseFloat(ep.value.toString());
      }
      return sum;
    }, 0);

    const capitalDisponivel = totalUsd - capitalAlocado;

    // Buscar pré-ordens ativas do portfolio + asset (legacy)
    const preOrders = await prisma.preOrder.findMany({
      where: { portfolioId, assetSymbol: asset, active: true },
      orderBy: { zoneOrder: 'asc' },
    });

    const preOrdersFormatted = preOrders.map((po) => ({
      id: po.id,
      zoneOrder: po.zoneOrder,
      zoneLabel: zonasFixas.find((z) => z.order === po.zoneOrder)?.label || `Zona ${po.zoneOrder}`,
      targetPrice: parseFloat(po.targetPrice.toString()),
      value: parseFloat(po.value.toString()),
      active: po.active,
    }));

    const zonasPerdidasCount = zonasCalculadas.filter((z) => z.status === 'PERDIDA').length;
    const zonasAguardandoCount = zonasCalculadas.filter((z) => z.status === 'AGUARDANDO').length;
    const zonasAtualCount = zonasCalculadas.filter((z) => z.status === 'ATUAL').length;

    return NextResponse.json({
      portfolioId,
      asset,
      precoAtual,
      capitalTotal: totalUsd,
      capitalDisponivel: Math.max(0, capitalDisponivel),
      capitalAlocado,
      zonasAtivas: zonasAtualCount,
      zonasPerdidas: zonasPerdidasCount,
      zonasAguardando: zonasAguardandoCount,
      zonas: zonasCalculadas,
      preOrders: preOrdersFormatted,
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/portfolios/:id/dca-strategy');
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    await requirePortfolioAccess(session.user.id, params.id, session.user.role);

    const { asset } = await req.json();

    return NextResponse.json({ message: 'Strategy recalculated', asset, portfolioId: params.id });
  } catch (error) {
    return handleApiError(error, 'POST /api/portfolios/:id/dca-strategy');
  }
}
