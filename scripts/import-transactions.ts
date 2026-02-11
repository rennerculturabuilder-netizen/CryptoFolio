import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_Nide8cgw5pYt@ep-misty-math-afv2tou5.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

// ============================
// 1) Buscar dados existentes
// ============================
async function getExistingData() {
  const users = await sql`SELECT id, email, name, role FROM "User"`;
  console.log('Users:', users);

  const portfolios = await sql`SELECT id, name, "ownerId" FROM "Portfolio"`;
  console.log('Portfolios:', portfolios);

  const assets = await sql`SELECT id, symbol, name FROM "Asset"`;
  console.log('Assets:', assets);

  const txCount = await sql`SELECT COUNT(*) as count FROM "Transaction"`;
  console.log('Transaction count:', txCount);

  return { users, portfolios, assets };
}

// ============================
// 2) Assets necessários
// ============================
const REQUIRED_ASSETS: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  USDT: 'Tether',
  USDC: 'USD Coin',
  DOG: 'DOG (Bitcoin Dogs)',
  LDO: 'Lido DAO',
  LINK: 'Chainlink',
  NEAR: 'NEAR Protocol',
  ETHFI: 'Ether.fi',
  PENDLE: 'Pendle',
  AAVE: 'Aave',
  DRIFT: 'Drift Protocol',
  TANGO: 'Tango',
  PEAR: 'Pear Protocol',
  GS: 'GS',
  ENA: 'Ethena',
  HYPE: 'Hyperliquid',
  INST: 'Instadapp',
  TRUMP: 'TRUMP',
  APW: 'APWine',
  SYRUP: 'Maple Syrup',
  SUI: 'Sui',
};

// ============================
// 3) Dados da planilha
// ============================
interface RawTx {
  ticker: string;
  date: string; // dd/mm/yyyy
  type: 'Aporte' | 'Venda' | 'Realocação';
  valueUsd: number;
  price: number;
  qty: number; // positive for buys, negative for sells
  notes?: string;
}

// Helper: parse BR number format ($2.300,00 → 2300.00)
function parseBrNumber(s: string): number {
  return parseFloat(
    s.replace('$', '').replace(/\./g, '').replace(',', '.').trim()
  );
}

// Helper: parse date dd/mm/yyyy → ISO
function parseDate(d: string): string {
  const parts = d.split('/');
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2];
  return `${year}-${month}-${day}T12:00:00.000Z`;
}

const RAW_DATA: RawTx[] = [
  // 25/11/2024 - Aportes iniciais
  { ticker: 'BTC', date: '25/11/2024', type: 'Aporte', valueUsd: 2300, price: 95000, qty: 0.0242105 },
  { ticker: 'ETH', date: '25/11/2024', type: 'Aporte', valueUsd: 3250, price: 3600, qty: 0.9027778 },
  { ticker: 'DOG', date: '25/11/2024', type: 'Aporte', valueUsd: 1072, price: 0.00468, qty: 228948.2901492 },
  { ticker: 'LDO', date: '26/11/2024', type: 'Aporte', valueUsd: 133, price: 1.61, qty: 102 },
  { ticker: 'LINK', date: '26/11/2024', type: 'Aporte', valueUsd: 133, price: 17.42, qty: 9.54 },
  { ticker: 'NEAR', date: '26/11/2024', type: 'Aporte', valueUsd: 133, price: 6.6, qty: 25.17 },
  { ticker: 'ETHFI', date: '26/11/2024', type: 'Aporte', valueUsd: 133, price: 2.19, qty: 75 },
  { ticker: 'PENDLE', date: '27/11/2024', type: 'Aporte', valueUsd: 133, price: 5.56, qty: 24.17 },
  { ticker: 'AAVE', date: '27/11/2024', type: 'Aporte', valueUsd: 133, price: 201, qty: 0.66833 },
  { ticker: 'SOL', date: '27/11/2024', type: 'Aporte', valueUsd: 500, price: 240, qty: 2.0833333 },
  { ticker: 'DRIFT', date: '27/11/2024', type: 'Aporte', valueUsd: 133, price: 1.29, qty: 103.1007752 },

  // 27/11/2024 - Vendas e realocações
  { ticker: 'BTC', date: '27/11/2024', type: 'Venda', valueUsd: 595, price: 96000, qty: -0.0061979 },
  { ticker: 'TANGO', date: '27/11/2024', type: 'Realocação', valueUsd: 75, price: 0.0555, qty: 1351.3513514 },
  { ticker: 'PEAR', date: '28/11/2024', type: 'Realocação', valueUsd: 75, price: 0.06347, qty: 1181.6606271 },
  { ticker: 'GS', date: '28/11/2024', type: 'Realocação', valueUsd: 75, price: 0.04865, qty: 1541.6238438 },
  { ticker: 'ETH', date: '28/11/2024', type: 'Venda', valueUsd: 500, price: 3582, qty: -0.1395868 },
  { ticker: 'SOL', date: '28/11/2024', type: 'Realocação', valueUsd: 500, price: 237, qty: 2.1097046 },

  // 02/12/2024
  { ticker: 'ETH', date: '02/12/2024', type: 'Venda', valueUsd: 500, price: 3603, qty: -0.1387732 },
  { ticker: 'SOL', date: '02/12/2024', type: 'Realocação', valueUsd: 500, price: 221, qty: 2.2624434 },

  // 03/12/2024
  { ticker: 'BTC', date: '03/12/2024', type: 'Venda', valueUsd: 133, price: 95000, qty: -0.0014 },
  { ticker: 'ENA', date: '03/12/2024', type: 'Realocação', valueUsd: 133, price: 0.792, qty: 167.9292929 },
  { ticker: 'ETH', date: '03/12/2024', type: 'Venda', valueUsd: 500, price: 3577, qty: -0.1397819 },
  { ticker: 'SOL', date: '03/12/2024', type: 'Realocação', valueUsd: 500, price: 227, qty: 2.2026432 },
  { ticker: 'GS', date: '03/12/2024', type: 'Realocação', valueUsd: 100, price: 0.1087, qty: 919.9632015 },
  { ticker: 'HYPE', date: '03/12/2024', type: 'Realocação', valueUsd: 270, price: 9.39, qty: 28.7539936 },
  { ticker: 'BTC', date: '03/12/2024', type: 'Venda', valueUsd: 250, price: 95630, qty: -0.0026142 },
  { ticker: 'INST', date: '03/12/2024', type: 'Realocação', valueUsd: 250, price: 6.85, qty: 36.4963504 },

  // 09/12/2024
  { ticker: 'DRIFT', date: '09/12/2024', type: 'Realocação', valueUsd: 134.31, price: 1.319, qty: 101.8271418 },
  { ticker: 'DOG', date: '09/12/2024', type: 'Venda', valueUsd: 938, price: 0.00819, qty: -114515.9321206 },
  { ticker: 'TANGO', date: '09/12/2024', type: 'Realocação', valueUsd: 100, price: 0.08709, qty: 1148.2374555 },
  { ticker: 'PEAR', date: '09/12/2024', type: 'Realocação', valueUsd: 100, price: 0.08273, qty: 1208.7513598 },
  { ticker: 'HYPE', date: '09/12/2024', type: 'Realocação', valueUsd: 197, price: 13.52, qty: 14.571006 },
  { ticker: 'ENA', date: '09/12/2024', type: 'Realocação', valueUsd: 538, price: 1.006, qty: 534.7912525 },
  { ticker: 'BTC', date: '09/12/2024', type: 'Venda', valueUsd: 1000, price: 97235, qty: -0.0102844 },
  { ticker: 'NEAR', date: '09/12/2024', type: 'Realocação', valueUsd: 500, price: 6.42, qty: 77.8816199 },
  { ticker: 'PENDLE', date: '09/12/2024', type: 'Realocação', valueUsd: 500, price: 5.69, qty: 87.8734622 },

  // 13/12/2024
  { ticker: 'BTC', date: '13/12/2024', type: 'Venda', valueUsd: 207, price: 101400, qty: -0.002043 },
  { ticker: 'ENA', date: '13/12/2024', type: 'Realocação', valueUsd: 207, price: 1.0, qty: 207 },

  // 17/01/2025
  { ticker: 'ETH', date: '17/01/2025', type: 'Venda', valueUsd: 178, price: 3481, qty: -0.0511347 },
  { ticker: 'APW', date: '17/01/2025', type: 'Realocação', valueUsd: 174, price: 0.1422, qty: 1223.628692 },

  // 20/01/2025
  { ticker: 'DOG', date: '20/01/2025', type: 'Venda', valueUsd: 149, price: 0.00401, qty: -37120.079721 },
  { ticker: 'TRUMP', date: '20/01/2025', type: 'Realocação', valueUsd: 74.81, price: 38.966, qty: 1.9198789 },
  { ticker: 'TRUMP', date: '20/01/2025', type: 'Realocação', valueUsd: 74.71, price: 42.942, qty: 1.7397886 },
  { ticker: 'TRUMP', date: '20/01/2025', type: 'Venda', valueUsd: 131, price: 36.087, qty: -3.6301161 },
  { ticker: 'DOG', date: '20/01/2025', type: 'Venda', valueUsd: 117.57, price: 0.00413, qty: -25484 },

  // 24/01/2025
  { ticker: 'DOG', date: '24/01/2025', type: 'Venda', valueUsd: 211.19, price: 0.00408, qty: -51736.8936796 },
  { ticker: 'DRIFT', date: '24/01/2025', type: 'Venda', valueUsd: 194.9, price: 0.952, qty: -204.7268908 },
  { ticker: 'USDT', date: '24/01/2025', type: 'Realocação', valueUsd: 654.65, price: 1.0, qty: 654.65 },
  { ticker: 'HYPE', date: '24/01/2025', type: 'Venda', valueUsd: 491, price: 22.763, qty: -21.5700918 },
  { ticker: 'USDC', date: '24/01/2025', type: 'Realocação', valueUsd: 488, price: 1.0, qty: 488 },

  // 25/01/2025
  { ticker: 'ETHFI', date: '25/01/2025', type: 'Venda', valueUsd: 129, price: 1.716, qty: -75.1748252 },
  { ticker: 'BTC', date: '25/01/2025', type: 'Realocação', valueUsd: 129, price: 104945, qty: 0.0012137 },
  { ticker: 'ENA', date: '25/01/2025', type: 'Venda', valueUsd: 436, price: 0.86, qty: -508 },
  { ticker: 'BTC', date: '25/01/2025', type: 'Realocação', valueUsd: 436, price: 104950, qty: 0.0041656 },
  { ticker: 'SOL', date: '25/01/2025', type: 'Venda', valueUsd: 500, price: 250, qty: -2 },
  { ticker: 'BTC', date: '25/01/2025', type: 'Realocação', valueUsd: 500, price: 104900, qty: 0.004783 },

  // 29/01/2025
  { ticker: 'USDT', date: '29/01/2025', type: 'Venda', valueUsd: 654, price: 1.0, qty: -654 },
  { ticker: 'USDC', date: '29/01/2025', type: 'Realocação', valueUsd: 654, price: 1.0, qty: 654 },

  // 25/02/2025
  { ticker: 'USDC', date: '25/02/2025', type: 'Venda', valueUsd: 599, price: 1.0, qty: -599 },
  { ticker: 'HYPE', date: '25/02/2025', type: 'Realocação', valueUsd: 97.69, price: 19.53, qty: 5 },
  { ticker: 'BTC', date: '25/02/2025', type: 'Realocação', valueUsd: 502.15, price: 86877, qty: 0.00578 },

  // 26/02/2025
  { ticker: 'USDC', date: '26/02/2025', type: 'Venda', valueUsd: 200, price: 1.0, qty: -200 },
  { ticker: 'BTC', date: '26/02/2025', type: 'Realocação', valueUsd: 200, price: 84995, qty: 0.00236 },

  // 07/04/2025
  { ticker: 'USDC', date: '07/04/2025', type: 'Venda', valueUsd: 190, price: 1.0, qty: -190 },
  { ticker: 'BTC', date: '07/04/2025', type: 'Realocação', valueUsd: 190, price: 75000, qty: 0.00251 },

  // 03/05/2025
  { ticker: 'ENA', date: '03/05/2025', type: 'Venda', valueUsd: 114.4, price: 0.572, qty: -200 },
  { ticker: 'USDC', date: '03/05/2025', type: 'Realocação', valueUsd: 114.4, price: 1.0, qty: 114.4 },

  // 23/05/2025
  { ticker: 'HYPE', date: '23/05/2025', type: 'Venda', valueUsd: 350, price: 35, qty: -10 },
  { ticker: 'USDC', date: '23/05/2025', type: 'Realocação', valueUsd: 350, price: 1.0, qty: 350 },

  // 10/06/2025
  { ticker: 'NEAR', date: '10/06/2025', type: 'Venda', valueUsd: 265.11, price: 2.589, qty: -102.3986095 },
  { ticker: 'USDT', date: '10/06/2025', type: 'Realocação', valueUsd: 265.11, price: 1.0, qty: 265.11 },
  { ticker: 'LINK', date: '10/06/2025', type: 'Venda', valueUsd: 145.1, price: 15.21, qty: -9.5397765 },
  { ticker: 'USDT', date: '10/06/2025', type: 'Realocação', valueUsd: 145.1, price: 1.0, qty: 145.1 },
  { ticker: 'LDO', date: '10/06/2025', type: 'Venda', valueUsd: 96.02, price: 0.936, qty: -102.5897436 },
  { ticker: 'USDT', date: '10/06/2025', type: 'Realocação', valueUsd: 96.02, price: 1.0, qty: 96.02 },

  // 17/06/2025
  { ticker: 'INST', date: '17/06/2025', type: 'Venda', valueUsd: 137, price: 3.64, qty: -37.66 },
  { ticker: 'USDC', date: '17/06/2025', type: 'Realocação', valueUsd: 137, price: 1.0, qty: 137 },
  { ticker: 'PEAR', date: '17/06/2025', type: 'Venda', valueUsd: 55, price: 0.02243, qty: -2452.0731164 },
  { ticker: 'USDC', date: '17/06/2025', type: 'Realocação', valueUsd: 55, price: 1.0, qty: 55 },
  { ticker: 'TANGO', date: '17/06/2025', type: 'Venda', valueUsd: 42.92, price: 0.0175, qty: -2452.5714286 },
  { ticker: 'USDC', date: '17/06/2025', type: 'Realocação', valueUsd: 42.92, price: 1.0, qty: 42.92 },
  { ticker: 'APW', date: '17/06/2025', type: 'Venda', valueUsd: 25.33, price: 0.02067, qty: -1225.4475085 },
  { ticker: 'USDC', date: '17/06/2025', type: 'Realocação', valueUsd: 24.92, price: 1.0, qty: 24.92 },

  // 12/07/2025
  { ticker: 'HYPE', date: '12/07/2025', type: 'Venda', valueUsd: 83.04, price: 45.62, qty: -1.82 },
  { ticker: 'USDC', date: '12/07/2025', type: 'Realocação', valueUsd: 83.04, price: 1.0, qty: 83.04 },
  { ticker: 'BTC', date: '12/07/2025', type: 'Venda', valueUsd: 374.5, price: 117395, qty: -0.0031901 },
  { ticker: 'USDC', date: '12/07/2025', type: 'Realocação', valueUsd: 374.5, price: 1.0, qty: 374.5 },
  { ticker: 'SOL', date: '12/07/2025', type: 'Venda', valueUsd: 353.46, price: 159.36, qty: -2.218 },
  { ticker: 'USDT', date: '12/07/2025', type: 'Realocação', valueUsd: 353.46, price: 1.0, qty: 353.46 },
  { ticker: 'ETH', date: '12/07/2025', type: 'Venda', valueUsd: 347.68, price: 2926.65, qty: -0.1188 },
  { ticker: 'USDT', date: '12/07/2025', type: 'Realocação', valueUsd: 347.68, price: 1.0, qty: 347.68 },

  // 24-25/07/2025
  { ticker: 'ENA', date: '24/07/2025', type: 'Venda', valueUsd: 42, price: 0.62, qty: -67.65 },
  { ticker: 'ENA', date: '25/07/2025', type: 'Venda', valueUsd: 82.12, price: 0.6175, qty: -133 },
  { ticker: 'USDT', date: '24/07/2025', type: 'Realocação', valueUsd: 124.12, price: 1.0, qty: 124.12 },

  // 31/07/2025
  { ticker: 'BTC', date: '31/07/2025', type: 'Venda', valueUsd: 237.05, price: 117937, qty: -0.00201 },
  { ticker: 'USDT', date: '31/07/2025', type: 'Realocação', valueUsd: 237.05, price: 1.0, qty: 237.05 },
  { ticker: 'AAVE', date: '31/07/2025', type: 'Venda', valueUsd: 56.91, price: 268.45, qty: -0.212 },
  { ticker: 'USDT', date: '31/07/2025', type: 'Realocação', valueUsd: 56.91, price: 1.0, qty: 56.91 },
  { ticker: 'ETH', date: '31/07/2025', type: 'Venda', valueUsd: 316.63, price: 3782.95, qty: -0.0837 },
  { ticker: 'USDT', date: '31/07/2025', type: 'Realocação', valueUsd: 316.63, price: 1.0, qty: 316.63 },

  // 07-08/08/2025
  { ticker: 'PENDLE', date: '07/08/2025', type: 'Venda', valueUsd: 280, price: 5.0, qty: -56, notes: 'pendle/btc swap' },
  { ticker: 'BTC', date: '07/08/2025', type: 'Realocação', valueUsd: 665, price: 117320, qty: 0.0056682578, notes: 'pendle/btc swap' },

  // 11/08/2025
  { ticker: 'BTC', date: '11/08/2025', type: 'Venda', valueUsd: 511.88, price: 119880, qty: -0.00427 },
  { ticker: 'USDC', date: '11/08/2025', type: 'Realocação', valueUsd: 511.88, price: 1.0, qty: 511.88 },
  { ticker: 'ETH', date: '11/08/2025', type: 'Venda', valueUsd: 85.76, price: 4266.88, qty: -0.0201 },
  { ticker: 'USDC', date: '11/08/2025', type: 'Realocação', valueUsd: 85.76, price: 1.0, qty: 85.76 },

  // 23/08/2025
  { ticker: 'USDT', date: '23/08/2025', type: 'Venda', valueUsd: 530.75, price: 1.0, qty: -530.75 },
  { ticker: 'AAVE', date: '23/08/2025', type: 'Realocação', valueUsd: 226.76, price: 354.87, qty: 0.6389946 },
  { ticker: 'SYRUP', date: '23/08/2025', type: 'Realocação', valueUsd: 303.99, price: 0.45515, qty: 667.8897067 },

  // 25/09/2025
  { ticker: 'USDC', date: '25/09/2025', type: 'Venda', valueUsd: 593.99, price: 1.0, qty: -593.99 },
  { ticker: 'BTC', date: '25/09/2025', type: 'Realocação', valueUsd: 287.2, price: 109201, qty: 0.00263 },
  { ticker: 'ETH', date: '25/09/2025', type: 'Realocação', valueUsd: 154.93, price: 3854, qty: 0.0401998 },
  { ticker: 'SOL', date: '25/09/2025', type: 'Realocação', valueUsd: 151.86, price: 196.2, qty: 0.7740061 },

  // 08-09/10/2025
  { ticker: 'USDC', date: '08/10/2025', type: 'Venda', valueUsd: 159.56, price: 1.0, qty: -159.56 },
  { ticker: 'HYPE', date: '08/10/2025', type: 'Realocação', valueUsd: 159.56, price: 46.51, qty: 3.4306601 },
  { ticker: 'HYPE', date: '08/10/2025', type: 'Venda', valueUsd: 79.7, price: 46.61, qty: -1.7099335 },
  { ticker: 'USDC', date: '08/10/2025', type: 'Realocação', valueUsd: 79.7, price: 1.0, qty: 79.7 },
  { ticker: 'USDT', date: '08/10/2025', type: 'Venda', valueUsd: 319.59, price: 1.0, qty: -319.59 },
  { ticker: 'PENDLE', date: '08/10/2025', type: 'Realocação', valueUsd: 79.75, price: 4.83, qty: 16.5113872 },
  { ticker: 'AAVE', date: '08/10/2025', type: 'Realocação', valueUsd: 79.89, price: 284.33, qty: 0.2809763 },
  { ticker: 'SYRUP', date: '08/10/2025', type: 'Realocação', valueUsd: 79.96, price: 0.4101, qty: 194.9768349 },
  { ticker: 'SUI', date: '08/10/2025', type: 'Realocação', valueUsd: 79.99, price: 3.539, qty: 22.6024301 },
  { ticker: 'USDC', date: '09/10/2025', type: 'Venda', valueUsd: 80, price: 1.0, qty: -80 },
  { ticker: 'GS', date: '09/10/2025', type: 'Realocação', valueUsd: 80, price: 0.02485, qty: 3198 },

  // USDT→USDC sem data — REMOVIDO (usuário não quis incluir)

  // 15/10/2025
  { ticker: 'USDC', date: '15/10/2025', type: 'Venda', valueUsd: 81.3, price: 1.0, qty: -81.3 },
  { ticker: 'HYPE', date: '15/10/2025', type: 'Realocação', valueUsd: 81.3, price: 40.65, qty: 2.0 },
  { ticker: 'USDC', date: '15/10/2025', type: 'Venda', valueUsd: 81.95, price: 1.0, qty: -81.95 },
  { ticker: 'SYRUP', date: '15/10/2025', type: 'Realocação', valueUsd: 81.95, price: 0.4488, qty: 182.5980392 },
  { ticker: 'USDC', date: '15/10/2025', type: 'Venda', valueUsd: 81.83, price: 1.0, qty: -81.83 },
  { ticker: 'AAVE', date: '15/10/2025', type: 'Realocação', valueUsd: 81.83, price: 254.14, qty: 0.3219879 },
  { ticker: 'USDC', date: '15/10/2025', type: 'Venda', valueUsd: 81.83, price: 1.0, qty: -81.83 },
  { ticker: 'PENDLE', date: '15/10/2025', type: 'Realocação', valueUsd: 81.83, price: 3.497, qty: 23.4000572 },
  { ticker: 'USDC', date: '15/10/2025', type: 'Venda', valueUsd: 82.83, price: 1.0, qty: -82.83 },
  { ticker: 'SUI', date: '15/10/2025', type: 'Realocação', valueUsd: 82.83, price: 2.8078, qty: 29.4999644 },

  // 07/11/2025
  { ticker: 'USDC', date: '07/11/2025', type: 'Venda', valueUsd: 104.84, price: 1.0, qty: -104.84 },
  { ticker: 'AAVE', date: '07/11/2025', type: 'Realocação', valueUsd: 104.84, price: 192, qty: 0.5460417 },
  { ticker: 'USDC', date: '07/11/2025', type: 'Venda', valueUsd: 278.01, price: 1.0, qty: -278.01 },
  { ticker: 'HYPE', date: '07/11/2025', type: 'Realocação', valueUsd: 278.01, price: 39.26, qty: 7.0812532 },
  { ticker: 'USDC', date: '07/11/2025', type: 'Venda', valueUsd: 566.66, price: 1.0, qty: -566.66 },
  { ticker: 'ETH', date: '07/11/2025', type: 'Realocação', valueUsd: 566.66, price: 3230.8, qty: 0.1753931 },

  // Airdrop USDC sem data — REMOVIDO (usuário não quis incluir)

  // 05/02/2026
  { ticker: 'USDC', date: '05/02/2026', type: 'Venda', valueUsd: 933.54, price: 1.0, qty: -933.54 },
  { ticker: 'BTC', date: '05/02/2026', type: 'Realocação', valueUsd: 933.54, price: 64029, qty: 0.01458 },
];

// ============================
// 4) Main import function
// ============================
async function main() {
  console.log('=== Importação de Transações ===\n');

  // Step 1: Get existing data
  const { users, portfolios, assets } = await getExistingData();

  // Step 2: Find admin user
  const admin = users.find((u: any) => u.role === 'admin');
  if (!admin) {
    console.error('Admin user not found!');
    process.exit(1);
  }
  console.log(`\nAdmin: ${admin.email} (${admin.id})`);

  // Step 3: Find or create portfolio "renner"
  let portfolio = portfolios.find((p: any) => p.name.toLowerCase() === 'renner' && p.ownerId === admin.id);
  if (!portfolio) {
    console.log('Portfolio "renner" não encontrado. Criando...');
    const result = await sql`
      INSERT INTO "Portfolio" (id, name, "baseFiat", "ownerId", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, 'renner', 'USD', ${admin.id}, NOW(), NOW())
      RETURNING id, name
    `;
    portfolio = result[0];
    console.log('Portfolio criado:', portfolio);
  } else {
    console.log(`Portfolio encontrado: ${portfolio.name} (${portfolio.id})`);
  }

  // Step 4: Ensure all assets exist
  const existingSymbols = new Set(assets.map((a: any) => a.symbol));
  const assetMap: Record<string, string> = {};
  for (const a of assets) {
    assetMap[(a as any).symbol] = (a as any).id;
  }

  for (const [symbol, name] of Object.entries(REQUIRED_ASSETS)) {
    if (!existingSymbols.has(symbol)) {
      console.log(`Criando asset: ${symbol} (${name})`);
      const result = await sql`
        INSERT INTO "Asset" (id, symbol, name, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${symbol}, ${name}, NOW(), NOW())
        RETURNING id, symbol
      `;
      assetMap[symbol] = (result[0] as any).id;
    }
  }
  console.log('\nAsset map:', assetMap);

  // Step 5: Find USDT asset for quote (fiat representation)
  const usdtId = assetMap['USDT'];
  const usdcId = assetMap['USDC'];
  if (!usdtId || !usdcId) {
    console.error('USDT or USDC asset not found!');
    process.exit(1);
  }

  // Step 6: Insert transactions
  console.log(`\nInserindo ${RAW_DATA.length} transações...`);
  let inserted = 0;
  let errors = 0;

  for (const tx of RAW_DATA) {
    const assetId = assetMap[tx.ticker];
    if (!assetId) {
      console.error(`Asset não encontrado: ${tx.ticker}`);
      errors++;
      continue;
    }

    const timestamp = parseDate(tx.date);
    const absQty = Math.abs(tx.qty);

    let type: string;
    let baseAssetId: string;
    let baseQty: number;
    let quoteAssetId: string | null = null;
    let quoteQty: number | null = null;
    let price: number | null = tx.price;

    if (tx.type === 'Aporte') {
      // BUY: compra com USD (quote = USDT como referência)
      type = 'BUY';
      baseAssetId = assetId;
      baseQty = absQty;
      quoteAssetId = usdtId;
      quoteQty = tx.valueUsd;
    } else if (tx.type === 'Venda') {
      // SELL: venda por USD
      type = 'SELL';
      baseAssetId = assetId;
      baseQty = absQty;
      quoteAssetId = usdtId;
      quoteQty = tx.valueUsd;
    } else {
      // Realocação → BUY (compra com recursos de venda anterior)
      type = 'BUY';
      baseAssetId = assetId;
      baseQty = absQty;
      quoteAssetId = usdtId;
      quoteQty = tx.valueUsd;
    }

    try {
      await sql`
        INSERT INTO "Transaction" (
          id, type, "portfolioId", timestamp,
          "baseAssetId", "baseQty",
          "quoteAssetId", "quoteQty",
          price, notes, "createdAt"
        ) VALUES (
          gen_random_uuid()::text,
          ${type},
          ${portfolio.id},
          ${timestamp}::timestamp,
          ${baseAssetId},
          ${baseQty},
          ${quoteAssetId},
          ${quoteQty},
          ${price},
          ${tx.notes || null},
          NOW()
        )
      `;
      inserted++;
    } catch (err: any) {
      console.error(`Erro ao inserir ${tx.ticker} ${tx.date} ${tx.type}:`, err.message);
      errors++;
    }
  }

  console.log(`\n=== Resultado ===`);
  console.log(`Inseridas: ${inserted}`);
  console.log(`Erros: ${errors}`);
  console.log(`Total na planilha: ${RAW_DATA.length}`);

  // Verify
  const finalCount = await sql`SELECT COUNT(*) as count FROM "Transaction" WHERE "portfolioId" = ${portfolio.id}`;
  console.log(`Total de transações no portfolio: ${finalCount[0].count}`);
}

main().catch(console.error);
