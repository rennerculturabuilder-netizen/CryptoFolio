/**
 * Cron wrapper para snapshots diários
 * Roda todo dia às 00:00 UTC
 *
 * Executar: npx tsx scripts/cron-snapshots.ts
 * Manter rodando como processo (pm2, systemd, etc.)
 */

import cron from "node-cron";
import { execSync } from "child_process";
import path from "path";

const scriptPath = path.join(__dirname, "daily-snapshot.ts");

console.log("Cron de snapshots iniciado. Agendado para 00:00 UTC diariamente.");
console.log("Pressione Ctrl+C para parar.\n");

// Rodar imediatamente na primeira vez
console.log("Executando snapshot inicial...\n");
try {
  execSync(`npx tsx "${scriptPath}"`, { stdio: "inherit" });
} catch {
  console.error("Erro no snapshot inicial.");
}

// Agendar para 00:00 UTC todo dia
cron.schedule(
  "0 0 * * *",
  () => {
    console.log(`\n[${new Date().toISOString()}] Cron trigger: executando snapshots...\n`);
    try {
      execSync(`npx tsx "${scriptPath}"`, { stdio: "inherit" });
    } catch {
      console.error("Erro na execução do cron.");
    }
  },
  { timezone: "UTC" }
);
