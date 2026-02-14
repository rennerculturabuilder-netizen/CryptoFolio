const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Buscar zona 1
  const zone1 = await p.dcaZone.findFirst({
    where: { portfolioId: 'portfolio-principal', assetSymbol: 'BTC', order: 1 },
  });

  if (!zone1) {
    console.log('Zona 1 não encontrada');
    return;
  }

  console.log('Antes:', zone1.priceMin.toString(), '-', zone1.priceMax.toString());

  // Atualizar priceMax de 80000 pra 70000
  await p.dcaZone.update({
    where: { id: zone1.id },
    data: { priceMax: 70000 },
  });

  // Deletar entry points antigos
  await p.dcaEntryPoint.deleteMany({
    where: { dcaZoneId: zone1.id },
  });

  console.log('Zona 1 atualizada: $65,000 - $70,000');
  console.log('Entry points antigos removidos');

  await p.$disconnect();
}
main();
