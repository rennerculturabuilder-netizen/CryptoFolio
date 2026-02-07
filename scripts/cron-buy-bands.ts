/**
 * Cron wrapper para check de buy bands
 * Roda a cada 5 minutos
 *
 * Executar: npx tsx scripts/cron-buy-bands.ts
 * Manter rodando como processo (pm2, systemd, etc.)
 */

import cron from "node-cron";
import { execSync } from "child_process";
import path from "path";

const scriptPath = path.join(__dirname, "check-buy-bands.ts");

console.log("Cron de buy bands iniciado. Verificando a cada 5 minutos.");
console.log("Pressione Ctrl+C para parar.\n");

// Rodar imediatamente na primeira vez
console.log("Executando verificação inicial...\n");
try {
  execSync(`npx tsx "${scriptPath}"`, { stdio: "inherit" });
} catch {
  console.error("Erro na verificação inicial.");
}

// Agendar para cada 5 minutos
cron.schedule(
  "*/5 * * * *",
  () => {
    console.log(
      `\n[${new Date().toISOString()}] Cron trigger: verificando buy bands...\n`
    );
    try {
      execSync(`npx tsx "${scriptPath}"`, { stdio: "inherit" });
    } catch {
      console.error("Erro na execução do cron.");
    }
  },
  { timezone: "UTC" }
);
