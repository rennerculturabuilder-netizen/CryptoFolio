import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed...");

  // Criar admin
  const hashedPassword = await bcrypt.hash("Admin123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@local.dev" },
    update: {},
    create: {
      email: "admin@local.dev",
      password: hashedPassword,
      name: "Admin",
      role: "admin",
    },
  });

  console.log("Admin criado:", admin.email);

  // Criar assets
  const assets = [
    { symbol: "BTC", name: "Bitcoin" },
    { symbol: "ETH", name: "Ethereum" },
    { symbol: "SOL", name: "Solana" },
    { symbol: "USDT", name: "Tether" },
    { symbol: "USDC", name: "USD Coin" },
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: {},
      create: asset,
    });
    console.log("Asset criado:", asset.symbol);
  }

  console.log("Seed concluído!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
