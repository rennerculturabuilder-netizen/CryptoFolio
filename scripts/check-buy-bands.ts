/**
 * Check Buy Bands — Verifica preços e cria alertas
 *
 * Busca todas buy bands pendentes, compara com preço atual
 * e cria alertas + envia notificação Telegram quando atingidas.
 *
 * Executar: npx tsx scripts/check-buy-bands.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

const prisma = new PrismaClient();

// ── Mapeamento CoinGecko (standalone, sem import Next.js) ──

const SYMBOL_TO_COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  NEAR: "near",
  ARB: "arbitrum",
  OP: "optimism",
  APT: "aptos",
  SUI: "sui",
  SEI: "sei-network",
  TIA: "celestia",
  INJ: "injective-protocol",
  FET: "fetch-ai",
  RENDER: "render-token",
  PEPE: "pepe",
  WIF: "dogwifcoin",
  BONK: "bonk",
  SHIB: "shiba-inu",
};

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

async function fetchSimplePrices(
  symbols: string[]
): Promise<Record<string, number>> {
  const ids = symbols
    .map((s) => ({ symbol: s.toUpperCase(), id: SYMBOL_TO_COINGECKO[s.toUpperCase()] }))
    .filter((x) => x.id);

  if (ids.length === 0) return {};

  const idString = ids.map((x) => x.id).join(",");
  const url = `${COINGECKO_BASE}/simple/price?ids=${idString}&vs_currencies=usd`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`CoinGecko error: ${res.status}`);
    return {};
  }

  const data = await res.json();
  const result: Record<string, number> = {};
  const idToSymbol = new Map(ids.map((x) => [x.id!, x.symbol]));

  for (const [id, prices] of Object.entries(data)) {
    const symbol = idToSymbol.get(id);
    if (symbol) {
      result[symbol] = (prices as { usd: number }).usd;
    }
  }

  return result;
}

// ── Telegram (standalone) ──

async function sendTelegramMessage(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[Telegram] Token ou ChatID não configurado");
    return false;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      console.error("[Telegram] Erro:", data.description);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Telegram] Falha:", err);
    return false;
  }
}

// ── Formatação ──

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPrice(value: number): string {
  if (value >= 1000) return formatUsd(value);
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(8)}`;
}

// ── Main ──

async function main() {
  console.log(`[${new Date().toISOString()}] Verificando buy bands...\n`);

  // Buscar todas buy bands pendentes com asset info
  const bands = await prisma.buyBand.findMany({
    where: { executed: false },
    include: {
      asset: true,
      portfolio: { select: { id: true, name: true } },
    },
  });

  if (bands.length === 0) {
    console.log("Nenhuma buy band pendente.");
    return;
  }

  console.log(`${bands.length} buy bands pendentes encontradas.`);

  // Agrupar símbolos únicos
  const symbols = Array.from(new Set(bands.map((b) => b.asset.symbol)));
  console.log(`Buscando preços: ${symbols.join(", ")}`);

  const prices = await fetchSimplePrices(symbols);

  if (Object.keys(prices).length === 0) {
    console.error("Não foi possível buscar preços.");
    return;
  }

  console.log("Preços obtidos:", prices);

  let alertsCreated = 0;
  let notified = 0;

  for (const band of bands) {
    const symbol = band.asset.symbol;
    const currentPrice = prices[symbol];
    if (!currentPrice) continue;

    const targetPrice = new Decimal(band.targetPrice.toString()).toNumber();

    if (currentPrice <= targetPrice) {
      // Anti-duplicata: verificar se já existe alerta nas últimas 4h
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const recentAlert = await prisma.buyBandAlert.findFirst({
        where: {
          buyBandId: band.id,
          createdAt: { gte: fourHoursAgo },
        },
      });

      if (recentAlert) {
        console.log(`  ⏭ ${symbol} Band #${band.order} — alerta recente, pulando`);
        continue;
      }

      // Calcular distância
      const distance = ((currentPrice - targetPrice) / targetPrice) * 100;

      // Criar alerta no banco
      const message = `${symbol} Zone ${band.order} atingida! Preço: ${formatPrice(currentPrice)} / Alvo: ${formatPrice(targetPrice)}`;

      await prisma.buyBandAlert.create({
        data: {
          buyBandId: band.id,
          symbol,
          targetPrice: band.targetPrice,
          currentPrice,
          message,
          notified: false,
        },
      });

      alertsCreated++;
      console.log(`  🎯 ${symbol} Band #${band.order} — ALERTA CRIADO`);

      // Enviar Telegram
      const qty = new Decimal(band.quantity.toString()).toNumber();
      const telegramMsg = [
        `🎯 <b>BUY BAND ATINGIDA!</b>`,
        ``,
        `💰 <b>${symbol}</b> — Zone ${band.order}`,
        `📉 Preço atual: ${formatPrice(currentPrice)}`,
        `🎯 Preço alvo: ${formatPrice(targetPrice)}`,
        `📊 Distância: ${distance.toFixed(2)}%`,
        `📦 Quantidade: ${qty} ${symbol}`,
        `📁 Portfolio: ${band.portfolio.name}`,
      ].join("\n");

      const sent = await sendTelegramMessage(telegramMsg);
      if (sent) {
        // Marcar como notificado
        await prisma.buyBandAlert.updateMany({
          where: { buyBandId: band.id, notified: false },
          data: { notified: true },
        });
        notified++;
        console.log(`  📨 Telegram enviado`);
      }
    } else {
      const distance = ((currentPrice - targetPrice) / targetPrice) * 100;
      console.log(
        `  ○ ${symbol} Band #${band.order} — ${formatPrice(currentPrice)} (${distance > 0 ? "+" : ""}${distance.toFixed(2)}% do alvo)`
      );
    }
  }

  console.log(
    `\nConcluído: ${alertsCreated} alertas criados, ${notified} notificações enviadas.`
  );
}

main()
  .catch((e) => {
    console.error("Erro fatal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
