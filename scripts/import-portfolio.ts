import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Assets que precisam ser criados (além de BTC, ETH, SOL, USDT, USDC que já existem)
const newAssets = [
  { symbol: "DOG", name: "DOG•GO•TO•THE•MOON" },
  { symbol: "LDO", name: "Lido DAO" },
  { symbol: "LINK", name: "Chainlink" },
  { symbol: "NEAR", name: "NEAR Protocol" },
  { symbol: "ETHFI", name: "Ether.fi" },
  { symbol: "PENDLE", name: "Pendle" },
  { symbol: "AAVE", name: "Aave" },
  { symbol: "DRIFT", name: "Drift" },
  { symbol: "TANGO", name: "Tango" },
  { symbol: "PEAR", name: "Pear Protocol" },
  { symbol: "GS", name: "GS" },
  { symbol: "ENA", name: "Ethena" },
  { symbol: "HYPE", name: "Hyperliquid" },
  { symbol: "INST", name: "Instadapp" },
  { symbol: "APW", name: "APWine" },
  { symbol: "TRUMP", name: "Official Trump" },
  { symbol: "SYRUP", name: "Maple Syrup" },
  { symbol: "SUI", name: "Sui" },
];

// Transações raw — [ticker, data(dd/mm/yyyy), tipo, valor_usd, preco, tokens]
// Tipo: A=Aporte(BUY), V=Venda(SELL), R=Realocação(BUY)
const rawTxs: [string, string, string, number, number, number][] = [
  ["BTC",    "25/11/2024", "A", 2300,      95000,        0.0242105],
  ["ETH",    "25/11/2024", "A", 3250,      3600,         0.9027778],
  ["DOG",    "25/11/2024", "A", 1072,      0.00468,      228948.2901492],
  ["LDO",    "26/11/2024", "A", 133,       1.61,         102],
  ["LINK",   "26/11/2024", "A", 133,       17.42,        9.54],
  ["NEAR",   "26/11/2024", "A", 133,       6.60,         25.17],
  ["ETHFI",  "26/11/2024", "A", 133,       2.19,         75],
  ["PENDLE", "27/11/2024", "A", 133,       5.56,         24.17],
  ["AAVE",   "27/11/2024", "A", 133,       201,          0.66833],
  ["SOL",    "27/11/2024", "A", 500,       240,          2.0833333],
  ["DRIFT",  "27/11/2024", "A", 133,       1.29,         103.1007752],
  ["BTC",    "27/11/2024", "V", 595,       96000,        0.0061979],
  ["TANGO",  "27/11/2024", "R", 75,        0.05550,      1351.3513514],
  ["PEAR",   "28/11/2024", "R", 75,        0.06347,      1181.6606271],
  ["GS",     "28/11/2024", "R", 75,        0.04865,      1541.6238438],
  ["ETH",    "28/11/2024", "V", 500,       3582,         0.1395868],
  ["SOL",    "28/11/2024", "R", 500,       237,          2.1097046],
  ["ETH",    "02/12/2024", "V", 500,       3603,         0.1387732],
  ["SOL",    "02/12/2024", "R", 500,       221,          2.2624434],
  ["BTC",    "03/12/2024", "V", 133,       95000,        0.0014],
  ["ENA",    "03/12/2024", "R", 133,       0.792,        167.9292929],
  ["ETH",    "03/12/2024", "V", 500,       3577,         0.1397819],
  ["SOL",    "03/12/2024", "R", 500,       227,          2.2026432],
  ["GS",     "03/12/2024", "R", 100,       0.1087,       919.9632015],
  ["HYPE",   "03/12/2024", "R", 270,       9.39,         28.7539936],
  ["BTC",    "03/12/2024", "V", 250,       95630,        0.0026142],
  ["INST",   "03/12/2024", "R", 250,       6.85,         36.4963504],
  ["DRIFT",  "09/12/2024", "R", 134.31,    1.319,        101.8271418],
  ["DOG",    "09/12/2024", "V", 938,       0.00819,      114515.9321206],
  ["TANGO",  "09/12/2024", "R", 100,       0.08709,      1148.2374555],
  ["PEAR",   "09/12/2024", "R", 100,       0.08273,      1208.7513598],
  ["HYPE",   "09/12/2024", "R", 197,       13.52,        14.5710059],
  ["ENA",    "09/12/2024", "R", 538,       1.006,        534.7912525],
  ["BTC",    "09/12/2024", "V", 1000,      97235,        0.0102844],
  ["NEAR",   "09/12/2024", "R", 500,       6.42,         77.8816199],
  ["PENDLE", "09/12/2024", "R", 500,       5.69,         87.8734622],
  ["BTC",    "13/12/2024", "V", 207,       101400,       0.002043],
  ["ENA",    "13/12/2024", "R", 207,       1.00,         207],
  ["ETH",    "17/01/2025", "V", 178,       3481,         0.0511347],
  ["APW",    "17/01/2025", "R", 174,       0.1422,       1223.628692],
  ["DOG",    "20/01/2025", "V", 149,       0.00401,      37120.079721],
  ["TRUMP",  "20/01/2025", "R", 74.81,     38.966,       1.9198789],
  ["TRUMP",  "20/01/2025", "R", 74.71,     42.942,       1.7397886],
  ["TRUMP",  "20/01/2025", "V", 131,       36.087,       3.6301161],
  ["DOG",    "20/01/2025", "V", 117.57,    0.00413,      25484],
  ["DOG",    "24/01/2025", "V", 211.19,    0.00408,      51736.8936796],
  ["DRIFT",  "24/01/2025", "V", 194.90,    0.952,        204.7268908],
  ["USDT",   "24/01/2025", "R", 654.65,    1.00,         654.65],
  ["HYPE",   "24/01/2025", "V", 491,       22.763,       21.5700918],
  ["USDC",   "24/01/2025", "R", 488,       1.00,         488],
  ["ETHFI",  "25/01/2025", "V", 129,       1.716,        75.1748252],
  ["BTC",    "25/01/2025", "R", 129,       104945,       0.0012137],
  ["ENA",    "25/01/2025", "V", 436,       0.86,         508],
  ["BTC",    "25/01/2025", "R", 436,       104950,       0.0041656],
  ["SOL",    "25/01/2025", "V", 500,       250,          2.0],
  ["BTC",    "25/01/2025", "R", 500,       104900,       0.004783],
  ["USDT",   "29/01/2025", "V", 654,       1.00,         654],
  ["USDC",   "29/01/2025", "R", 654,       1.00,         654],
  ["USDC",   "25/02/2025", "V", 599,       1.00,         599],
  ["HYPE",   "25/02/2025", "R", 97.69,     19.53,        5.0],
  ["BTC",    "25/02/2025", "R", 502.15,    86877,        0.00578],
  ["USDC",   "26/02/2025", "V", 200,       1.00,         200],
  ["BTC",    "26/02/2025", "R", 200,       84995,        0.00236],
  ["USDC",   "07/04/2025", "V", 190,       1.00,         190],
  ["BTC",    "07/04/2025", "R", 190,       75000,        0.00251],
  ["HYPE",   "23/05/2025", "V", 350,       35,           10],
  ["USDC",   "23/05/2025", "R", 350,       1.00,         350],
  ["NEAR",   "10/06/2025", "V", 265.11,    2.589,        102.3986095],
  ["USDT",   "10/06/2025", "R", 265.11,    1.00,         265.11],
  ["LINK",   "10/06/2025", "V", 145.10,    15.21,        9.5397765],
  ["USDT",   "10/06/2025", "R", 145.10,    1.00,         145.10],
  ["LDO",    "10/06/2025", "V", 96.02,     0.936,        102.5897436],
  ["USDT",   "10/06/2025", "R", 96.02,     1.00,         96.02],
  ["INST",   "17/06/2025", "V", 137,       3.64,         37.66],
  ["USDC",   "17/06/2025", "R", 137,       1.00,         137],
  ["PEAR",   "17/06/2025", "V", 55,        0.02243,      2452.0731164],
  ["USDC",   "17/06/2025", "R", 55,        1.00,         55],
  ["TANGO",  "17/06/2025", "V", 42.92,     0.0175,       2452.5714286],
  ["USDC",   "17/06/2025", "R", 42.92,     1.00,         42.92],
  ["APW",    "17/06/2025", "V", 25.33,     0.02067,      1225.4475085],
  ["USDC",   "17/06/2025", "R", 24.92,     1.00,         24.92],
  ["HYPE",   "12/07/2025", "V", 83.04,     45.62,        1.82],
  ["USDC",   "12/07/2025", "R", 83.04,     1.00,         83.04],
  ["BTC",    "12/07/2025", "V", 374.50,    117395,       0.0031901],
  ["USDC",   "12/07/2025", "R", 374.50,    1.00,         374.50],
  ["SOL",    "12/07/2025", "V", 353.46,    159.36,       2.218],
  ["USDT",   "12/07/2025", "R", 353.46,    1.00,         353.46],
  ["ETH",    "12/07/2025", "V", 347.68,    2926.65,      0.1188],
  ["USDT",   "12/07/2025", "R", 347.68,    1.00,         347.68],
  ["ENA",    "25/07/2025", "V", 82.12,     0.6175,       133],
  ["ENA",    "24/07/2025", "V", 42.00,     0.62,         67.65],
  ["USDT",   "24/07/2025", "R", 124.12,    1.00,         124.12],
  ["BTC",    "31/07/2025", "V", 237.05,    117937,       0.00201],
  ["USDT",   "31/07/2025", "R", 237.05,    1.00,         237.05],
  ["AAVE",   "31/07/2025", "V", 56.91,     268.45,       0.212],
  ["USDT",   "31/07/2025", "R", 56.91,     1.00,         56.91],
  ["ETH",    "31/07/2025", "V", 316.63,    3782.95,      0.0837],
  ["USDT",   "31/07/2025", "R", 316.63,    1.00,         316.63],
  ["ENA",    "03/05/2025", "V", 114.40,    0.572,        200],
  ["USDC",   "03/05/2025", "R", 114.40,    1.00,         114.40],
  ["PENDLE", "07/08/2025", "V", 280,       5.00,         56],
  ["BTC",    "07/08/2025", "R", 665,       117320,       0.0056682578],
  ["BTC",    "11/08/2025", "V", 511.88,    119880,       0.00427],
  ["USDC",   "11/08/2025", "R", 511.88,    1.00,         511.88],
  ["ETH",    "11/08/2025", "V", 85.76,     4266.88,      0.0201],
  ["USDC",   "11/08/2025", "R", 85.76,     1.00,         85.76],
  ["USDT",   "23/08/2025", "V", 530.75,    1.00,         530.75],
  ["AAVE",   "23/08/2025", "R", 226.76,    354.87,       0.6389946],
  ["SYRUP",  "23/08/2025", "R", 303.99,    0.45515,      667.8897067],
  ["USDC",   "25/09/2025", "V", 593.99,    1.00,         593.99],
  ["BTC",    "25/09/2025", "R", 287.20,    109201,       0.00263],
  ["ETH",    "25/09/2025", "R", 154.93,    3854,         0.0401998],
  ["SOL",    "25/09/2025", "R", 151.86,    196.20,       0.7740061],
  ["USDC",   "09/10/2025", "V", 80,        1.00,         80],
  ["GS",     "09/10/2025", "R", 80,        0.02485,      3198],
  ["USDC",   "08/10/2025", "V", 159.56,    1.00,         159.56],
  ["HYPE",   "08/10/2025", "R", 159.56,    46.51,        3.4306601],
  ["HYPE",   "08/10/2025", "V", 79.70,     46.61,        1.7099335],
  ["USDC",   "08/10/2025", "R", 79.70,     1.00,         79.70],
  ["USDT",   "08/10/2025", "V", 319.59,    1.00,         319.59],
  ["PENDLE", "08/10/2025", "R", 79.75,     4.83,         16.5113872],
  ["AAVE",   "08/10/2025", "R", 79.89,     284.33,       0.2809763],
  ["SYRUP",  "08/10/2025", "R", 79.96,     0.4101,       194.9768349],
  ["SUI",    "08/10/2025", "R", 79.99,     3.539,        22.6024301],
  ["USDT",   "10/10/2025", "V", 1092.39,   1.00,         1092.39],
  ["USDC",   "10/10/2025", "R", 1092.39,   1.00,         1092.39],
  ["USDC",   "15/10/2025", "V", 81.30,     1.00,         81.30],
  ["HYPE",   "15/10/2025", "R", 81.30,     40.65,        2.0],
  ["USDC",   "15/10/2025", "V", 81.95,     1.00,         81.95],
  ["SYRUP",  "15/10/2025", "R", 81.95,     0.4488,       182.5980392],
  ["USDC",   "15/10/2025", "V", 81.83,     1.00,         81.83],
  ["AAVE",   "15/10/2025", "R", 81.83,     254.14,       0.3219879],
  ["USDC",   "15/10/2025", "V", 81.83,     1.00,         81.83],
  ["PENDLE", "15/10/2025", "R", 81.83,     3.497,        23.4000572],
  ["USDC",   "15/10/2025", "V", 82.83,     1.00,         82.83],
  ["SUI",    "15/10/2025", "R", 82.83,     2.8078,       29.4999644],
  ["AAVE",   "07/11/2025", "R", 104.84,    192,          0.5460417],
  ["USDC",   "07/11/2025", "V", 104.84,    1.00,         104.84],
  ["HYPE",   "07/11/2025", "R", 278.01,    39.26,        7.0812532],
  ["USDC",   "07/11/2025", "V", 278.01,    1.00,         278.01],
  ["ETH",    "07/11/2025", "R", 566.66,    3230.80,      0.1753931],
  ["USDC",   "07/11/2025", "V", 566.66,    1.00,         566.66],
  ["USDC",   "01/11/2025", "A", 80,        1.00,         80],
  ["USDC",   "05/02/2026", "V", 933.54,    1.00,         933.54],
  ["BTC",    "05/02/2026", "R", 933.54,    64029,        0.01458],
];

function parseDate(dateStr: string): Date {
  const [d, m, y] = dateStr.split("/").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

async function main() {
  console.log("=== Importação de Portfolio ===\n");

  // 1. Criar assets faltantes
  console.log("1. Criando assets...");
  for (const asset of newAssets) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: {},
      create: asset,
    });
  }
  console.log(`   ${newAssets.length} assets verificados/criados\n`);

  // 2. Buscar map de assets
  const allAssets = await prisma.asset.findMany();
  const assetMap = new Map(allAssets.map(a => [a.symbol, a.id]));
  console.log(`   Assets no banco: ${allAssets.map(a => a.symbol).join(", ")}\n`);

  // 3. Buscar admin user
  const admin = await prisma.user.findUnique({ where: { email: "admin@local.dev" } });
  if (!admin) throw new Error("Admin user não encontrado!");

  // 4. Criar portfolio
  const portfolio = await prisma.portfolio.upsert({
    where: { id: "portfolio-principal" },
    update: {},
    create: {
      id: "portfolio-principal",
      name: "Carteira Principal",
      ownerId: admin.id,
      baseFiat: "USD",
    },
  });
  console.log(`2. Portfolio: "${portfolio.name}" (${portfolio.id})\n`);

  // 5. Limpar transações existentes do portfolio (caso re-run)
  const deleted = await prisma.transaction.deleteMany({
    where: { portfolioId: portfolio.id },
  });
  if (deleted.count > 0) {
    console.log(`   Limpou ${deleted.count} transações existentes\n`);
  }

  // 6. Inserir transações
  console.log("3. Inserindo transações...");

  // Buscar USDT/USDC IDs pra usar como quote em BUY/SELL
  const usdtId = assetMap.get("USDT")!;
  const usdcId = assetMap.get("USDC")!;

  let count = 0;
  for (const [symbol, dateStr, tipo, valorUsd, preco, tokens] of rawTxs) {
    const assetId = assetMap.get(symbol);
    if (!assetId) {
      console.error(`   ERRO: Asset ${symbol} não encontrado!`);
      continue;
    }

    const timestamp = parseDate(dateStr);
    const absTokens = Math.abs(tokens);

    if (tipo === "A") {
      // Aporte = BUY com USD
      await prisma.transaction.create({
        data: {
          type: "BUY",
          portfolioId: portfolio.id,
          timestamp,
          baseAssetId: assetId,
          baseQty: absTokens,
          quoteAssetId: usdtId,
          quoteQty: valorUsd,
          price: preco,
          notes: "Aporte inicial",
        },
      });
    } else if (tipo === "V") {
      // Venda = SELL
      await prisma.transaction.create({
        data: {
          type: "SELL",
          portfolioId: portfolio.id,
          timestamp,
          baseAssetId: assetId,
          baseQty: absTokens,
          quoteAssetId: usdtId,
          quoteQty: valorUsd,
          price: preco,
          notes: "Venda",
        },
      });
    } else if (tipo === "R") {
      // Realocação = BUY (compra com proceeds)
      await prisma.transaction.create({
        data: {
          type: "BUY",
          portfolioId: portfolio.id,
          timestamp,
          baseAssetId: assetId,
          baseQty: absTokens,
          quoteAssetId: usdtId,
          quoteQty: valorUsd,
          price: preco,
          notes: "Realocação",
        },
      });
    }
    count++;
  }

  console.log(`   ${count} transações inseridas!\n`);

  // 7. Verificar
  const txCount = await prisma.transaction.count({ where: { portfolioId: portfolio.id } });
  console.log(`=== Resultado ===`);
  console.log(`Portfolio: ${portfolio.name}`);
  console.log(`Transações: ${txCount}`);
  console.log(`Assets: ${allAssets.length}`);
  console.log(`\nDone!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
