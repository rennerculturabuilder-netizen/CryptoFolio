import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    { order: 5, priceMin: 0, priceMax: 40000, percentualBase: 5, label: 'Emergência' },
  ],
  ETH: [
    { order: 1, priceMin: 2800, priceMax: 3500, percentualBase: 15, label: 'Zona 1' },
    { order: 2, priceMin: 2200, priceMax: 2800, percentualBase: 25, label: 'Zona 2' },
    { order: 3, priceMin: 1800, priceMax: 2200, percentualBase: 30, label: 'Zona 3' },
    { order: 4, priceMin: 1400, priceMax: 1800, percentualBase: 25, label: 'Zona 4' },
    { order: 5, priceMin: 0, priceMax: 1400, percentualBase: 5, label: 'Emergência' },
  ],
  SOL: [
    { order: 1, priceMin: 150, priceMax: 200, percentualBase: 15, label: 'Zona 1' },
    { order: 2, priceMin: 100, priceMax: 150, percentualBase: 25, label: 'Zona 2' },
    { order: 3, priceMin: 75, priceMax: 100, percentualBase: 30, label: 'Zona 3' },
    { order: 4, priceMin: 50, priceMax: 75, percentualBase: 25, label: 'Zona 4' },
    { order: 5, priceMin: 0, priceMax: 50, percentualBase: 5, label: 'Emergência' },
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
  // Calcular saldo em USD/USDT/USDC
  const stablecoins = ['USD', 'USDT', 'USDC'];
  
  const transactions = await prisma.transaction.findMany({
    where: { portfolioId },
    include: {
      baseAsset: true,
      quoteAsset: true,
    },
  });

  const balances: Record<string, number> = {};

  for (const tx of transactions) {
    // Simplificação: apenas DEPOSIT e WITHDRAW de stables
    if (tx.baseAsset && stablecoins.includes(tx.baseAsset.symbol)) {
      const symbol = tx.baseAsset.symbol;
      if (!balances[symbol]) balances[symbol] = 0;

      if (tx.type === 'DEPOSIT') {
        balances[symbol] += parseFloat(tx.baseQty?.toString() || '0');
      } else if (tx.type === 'WITHDRAW') {
        balances[symbol] -= parseFloat(tx.baseQty?.toString() || '0');
      }
    }
  }

  const totalUsd = Object.values(balances).reduce((sum, val) => sum + val, 0);

  return { balances, totalUsd };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portfolioId = params.id;
    const asset = req.nextUrl.searchParams.get('asset') || 'BTC';

    // Verificar ownership
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId, ownerId: session.user.id },
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

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

    // Identificar zonas ativas e puladas
    const zonasAtivas = zonasFixas.filter((z) => precoAtual < z.priceMin);
    const zonasPuladas = zonasFixas.filter((z) => precoAtual >= z.priceMax);

    // Calcular redistribuição
    const percentualAtivo = zonasAtivas.reduce((sum, z) => sum + z.percentualBase, 0);
    const percentualPulado = zonasPuladas.reduce((sum, z) => sum + z.percentualBase, 0);

    const zonasCalculadas = zonasFixas.map((zona) => {
      const isAtiva = zonasAtivas.some((z) => z.order === zona.order);
      const isPulada = zonasPuladas.some((z) => z.order === zona.order);

      let percentualAjustado = zona.percentualBase;
      let status: 'ATIVA' | 'PULADA' | 'ATUAL' = 'ATIVA';

      if (isPulada) {
        percentualAjustado = 0;
        status = 'PULADA';
      } else if (isAtiva && percentualPulado > 0) {
        // Redistribuir proporcionalmente
        const proporcao = zona.percentualBase / percentualAtivo;
        percentualAjustado = zona.percentualBase + proporcao * percentualPulado;
      }

      // Zona atual (preço dentro do range)
      if (precoAtual >= zona.priceMin && precoAtual < zona.priceMax) {
        status = 'ATUAL';
      }

      const valorEmDolar = (totalUsd * percentualAjustado) / 100;
      const distanciaPercentual = ((zona.priceMin - precoAtual) / precoAtual) * 100;

      return {
        ...zona,
        percentualAjustado: Math.round(percentualAjustado * 100) / 100,
        valorEmDolar: Math.round(valorEmDolar * 100) / 100,
        status,
        distanciaPercentual: Math.round(distanciaPercentual * 10) / 10,
      };
    });

    return NextResponse.json({
      portfolioId,
      asset,
      precoAtual,
      capitalTotal: totalUsd,
      zonasAtivas: zonasAtivas.length,
      zonasPuladas: zonasPuladas.length,
      zonas: zonasCalculadas,
    });
  } catch (error) {
    console.error('Error calculating DCA strategy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { asset } = await req.json();

    // Recalcular estratégia (mesmo código do GET)
    // Aqui você pode adicionar lógica para salvar as zonas calculadas no banco
    // Por agora, apenas retorna o cálculo

    return NextResponse.json({ message: 'Strategy recalculated', asset, portfolioId: params.id });
  } catch (error) {
    console.error('Error recalculating DCA strategy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
