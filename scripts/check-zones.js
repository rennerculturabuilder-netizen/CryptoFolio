const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const zones = await p.dcaZone.findMany({
    where: { portfolioId: 'portfolio-principal', assetSymbol: 'BTC' },
    include: { entryPoints: true },
    orderBy: { order: 'asc' },
  });
  for (const z of zones) {
    console.log(`Zone ${z.order} (${z.label}): $${z.priceMin} - $${z.priceMax} | EPs: ${z.entryPoints.length}`);
    for (const ep of z.entryPoints) {
      console.log(`  EP: price=$${ep.targetPrice} value=$${ep.value}`);
    }
  }
  await p.$disconnect();
}
main();
