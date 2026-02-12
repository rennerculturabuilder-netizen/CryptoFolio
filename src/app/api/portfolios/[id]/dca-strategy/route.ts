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
    { order: 1, priceMin: 65000, priceMax: 80000, percentualBase: 15, label: 'Zona 1' },
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

async function getCryptoPrice(symbol: string): Promise<number> {
  // Buscar último preço do snapshot
  const latestPrice = await prisma.priceSnapshot.findFirst({
    where: {
      asset: { symbol },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (latestPrice) {
    return parseFloat(latestPrice.price.toString());
  }

  // Fallback: buscar da API CoinGecko
  const coinIds: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
  };

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds[symbol]}&vs_currencies=usd`
    );
    const data = await res.json();
    return data[coinIds[symbol]]?.usd || 0;
  } catch {
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

        if (existing) return existing;

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

    // Identificar zonas ativas (preço já caiu abaixo)
    const zonasAtivas = zonasFixas.filter((z) => precoAtual < z.priceMin);
    
    // Zonas aguardando (preço ainda está acima)
    const zonasAguardando = zonasFixas.filter((z) => precoAtual > z.priceMax);

    // Calcular redistribuição (apenas das zonas aguardando pro capital das ativas)
    const percentualAtivo = zonasAtivas.reduce((sum, z) => sum + z.percentualBase, 0);
    const percentualAguardando = zonasAguardando.reduce((sum, z) => sum + z.percentualBase, 0);

    const zonasCalculadas = zonasFixas.map((zona) => {
      const isAtiva = zonasAtivas.some((z) => z.order === zona.order);
      const isAguardando = zonasAguardando.some((z) => z.order === zona.order);

      let percentualAjustado = zona.percentualBase;
      let status: 'ATIVA' | 'PULADA' | 'ATUAL' | 'AGUARDANDO' = 'ATIVA';

      if (isAguardando) {
        // Preço ainda está acima desta zona (aguardando cair)
        percentualAjustado = 0;
        status = 'AGUARDANDO';
      } else if (isAtiva && percentualAguardando > 0) {
        // Redistribuir capital das zonas aguardando proporcionalmente nas ativas
        const proporcao = zona.percentualBase / percentualAtivo;
        percentualAjustado = zona.percentualBase + proporcao * percentualAguardando;
      }

      // Zona atual (preço dentro do range)
      if (precoAtual >= zona.priceMin && precoAtual < zona.priceMax) {
        status = 'ATUAL';
      }

      const valorEmDolar = (totalUsd * percentualAjustado) / 100;
      const distanciaPercentual = ((zona.priceMin - precoAtual) / precoAtual) * 100;

      return {
        id: zonaIdMap.get(zona.order) || '',
        ...zona,
        percentualAjustado: Math.round(percentualAjustado * 100) / 100,
        valorEmDolar: Math.round(valorEmDolar * 100) / 100,
        status,
        distanciaPercentual: Math.round(distanciaPercentual * 10) / 10,
      };
    });

    // Buscar todos os entry points do portfolio + asset
    const zoneIds = zonasDb.map((z) => z.id);
    const entryPoints = await prisma.dcaEntryPoint.findMany({
      where: {
        dcaZoneId: { in: zoneIds },
      },
    });

    // Calcular capital já alocado (pré-ordens + compras confirmadas)
    const capitalAlocado = entryPoints.reduce((sum, ep) => {
      if (ep.preOrderPlaced || ep.purchaseConfirmed) {
        return sum + parseFloat(ep.value.toString());
      }
      return sum;
    }, 0);

    const capitalDisponivel = totalUsd - capitalAlocado;

    // Buscar pré-ordens ativas do portfolio + asset (legacy - pode remover depois)
    const preOrders = await prisma.preOrder.findMany({
      where: {
        portfolioId,
        assetSymbol: asset,
        active: true,
      },
      orderBy: {
        zoneOrder: 'asc',
      },
    });

    const preOrdersFormatted = preOrders.map((po) => ({
      id: po.id,
      zoneOrder: po.zoneOrder,
      zoneLabel: zonasFixas.find((z) => z.order === po.zoneOrder)?.label || `Zona ${po.zoneOrder}`,
      targetPrice: parseFloat(po.targetPrice.toString()),
      value: parseFloat(po.value.toString()),
      active: po.active,
    }));

    const zonasAguardandoCount = zonasCalculadas.filter((z) => z.status === 'AGUARDANDO').length;
    const zonasAtivasCount = zonasCalculadas.filter((z) => z.status === 'ATIVA').length;

    return NextResponse.json({
      portfolioId,
      asset,
      precoAtual,
      capitalTotal: totalUsd,
      capitalDisponivel: Math.max(0, capitalDisponivel),
      capitalAlocado,
      zonasAtivas: zonasAtivasCount,
      zonasPuladas: 0, // Não usamos mais este status
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
