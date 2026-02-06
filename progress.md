# Crypto Portfolio — Progresso

## Última atualização
06/02/2026 10:00

## ✅ Concluído
- Projeto Next.js 14 criado com TypeScript e App Router
- Prisma 5 configurado com schema completo (User, Portfolio, Asset, Transaction, PriceSnapshot, BuyBand)
- NextAuth 4 configurado com Credentials Provider (email/senha + bcrypt)
- Endpoint POST /api/auth/register criado com validação Zod
- Rotas NextAuth padrão configuradas (/api/auth/*)
- Docker Compose configurado para PostgreSQL 16
- Seed executado com sucesso:
  - Admin: admin@local.dev / Admin123!
  - Assets: BTC, ETH, SOL, USDT, USDC
- Registro de usuários funcionando
- Login via NextAuth funcionando
- Schema atualizado: Portfolio agora tem `ownerId` (era `userId`) e `baseFiat` (default "USD")
- CRUD completo de Portfolio (GET list, POST, GET by id, PATCH, DELETE)
- CRUD de Transactions (GET list, POST, GET by id, DELETE) aninhado em portfolios
- Guard de acesso a portfolio (`requirePortfolioAccess`) — owner ou admin
- Validação Zod para Portfolio e Transaction
- Verificação de saldo insuficiente em SELL
- Bloqueio de DELETE de portfolio com transações
- Cálculo WAC (custo médio ponderado) por asset — GET /api/portfolios/:id/wac
- Fix: Zod v4 usa `.issues` em vez de `.errors` (corrigido em todos os endpoints)
- Campo `valueUsd` adicionado em Transaction (suporte a swap crypto-crypto)
- handleSwap atualizado: usa `valueUsd` quando fornecido, fallback pra `quoteQty` (stables)
- Validação Zod do swap atualizada com `valueUsd` opcional + refine
- Vitest configurado com testes unitários (6) e integração com DB (1) — 7/7 passando
- Arquivo `calcPositions.ts` movido para `src/lib/portfolio/calc.ts` com função pura `processTransactions` extraída
- Balance check e safety check de fee no handleSwap
- JSDoc documentando uso do `valueUsd` em swaps
- PATCH /api/transactions/:id — editar transação com merge + validação Zod + balance check
- Fix: POST /api/portfolios/:id/transactions agora salva `valueUsd` para SWAP
- Fix: `getAssetBalance` corrigido — SWAP base agora subtrai (antes somava incorretamente)
- GET /api/prices/latest?symbols=BTC,ETH — preços recentes com fallback pra último conhecido
- POST /api/prices/snapshot — criar snapshot de preço (admin only, com campo `source`)
- Migration `add_buy_bands_fields` aplicada (campo `source` em PriceSnapshot)
- CRUD Buy Bands completo (por portfolio):
  - GET /api/portfolios/:id/buy-bands (lista por portfolio, ordenado por asset + order)
  - POST /api/portfolios/:id/buy-bands (criar band com assetId, targetPrice, quantity, order)
  - PATCH /api/buy-bands/:id (atualizar targetPrice, quantity, executed, order)
  - DELETE /api/buy-bands/:id
- BuyBand agora tem `portfolioId` (FK → Portfolio) e `order` (Int, ordenação)
- Migration `add_buyband_portfolio_order` aplicada
- Validação Zod para Buy Bands (create + update schemas com order)
- Admin endpoints: GET /api/admin/users, PATCH /api/admin/users/:id
- Middleware NextAuth protegendo /dashboard/* e /admin/*
- GET /api/assets — lista todos os assets (pra selects do frontend)
- Sistema de snapshots diários:
  - Model PortfolioSnapshot (valueUsd, costBasisUsd, unrealizedPnl, unrealizedPct, positionsSnapshot JSON)
  - POST /api/portfolios/:id/snapshots — cria snapshot com posições atuais + preços mais recentes
  - GET /api/portfolios/:id/snapshots?from=ISO&to=ISO&limit=30 — lista snapshots
  - `src/lib/portfolio/snapshot.ts` — service createPortfolioSnapshot
  - `scripts/daily-snapshot.ts` — script standalone para gerar snapshots de todos os portfolios
  - `scripts/cron-snapshots.ts` — wrapper node-cron (00:00 UTC diário)
  - npm scripts: `npm run snapshot` e `npm run cron:snapshot`
- **Frontend MVP completo com shadcn/ui + TanStack Query:**
  - shadcn/ui configurado manualmente (CSS variables, tailwind-animate, Radix primitives)
  - Componentes UI: Button, Card, Input, Label, Badge, Table, Tabs, Dialog, Select, Skeleton, Alert
  - TanStack Query (React Query) como state manager global com QueryClientProvider
  - /login: NextAuth signIn com Suspense boundary, card layout, validação client-side
  - /register: POST /api/auth/register com validação de senha client-side (8+ chars, maiúscula, número)
  - /dashboard: Header com valor total USD + P&L global + count portfolios, lista portfolios como cards com valor/P&L, dialog criar portfolio, TradingView widget embed (BTC/USDT com MAs 21/50/200)
  - /dashboard/portfolio/:id: 4 tabs com Radix Tabs:
    - Tab Posições: tabela Asset/Qty/Avg Cost/Current Price/Value/P&L USD/P&L %, cards resumo
    - Tab Transações: tabela paginada, dialog form discriminated por type (BUY/SELL/SWAP/DEPOSIT/WITHDRAW/FEE), editar/deletar com confirmação
    - Tab Buy Bands: tabela com progress bar, toggle executed, criar via dialog
    - Tab Médias Móveis (novo): selector de asset, tabela com períodos 21/35/50/200/305/610/1200, distância USD e %, cores verde/vermelho, badge posição
  - /dashboard/portfolio/:id/history: gráfico LineChart (recharts), cards resumo, snapshot table
  - /admin/users: tabela com shadcn/ui, editar role via Select
  - Layout responsivo: sidebar colapsável mobile, navbar com backdrop blur
  - Loading states com Skeleton em todas as páginas
  - Error handling em todas as mutations
- **Backend Indicators Service (novo):**
  - `src/lib/services/indicators.ts` — calculateSMA, getLatestPrice, getIndicators
  - GET /api/indicators/:symbol?periods=21,50,200 — calcula SMA de cada período via PriceSnapshot histórico
  - Response: {symbol, current, mas: [{period, value, distance, distancePct}]}

## 🚧 Em progresso
- Nenhum

## ⚠️ Problemas encontrados
- `prisma migrate dev` não roda em terminal não-interativo (Claude Code) — usar direto no terminal ou `db push`

## 📋 Próximos passos
1. Integração com API de preços externa (CoinGecko/Binance)
2. Export/import de transações (CSV)
3. Alertas de preço / notificações
4. Dark mode toggle (CSS variables já configuradas)
5. Testes E2E (Playwright ou Cypress)

## 🛠️ Comandos úteis
```bash
# Subir banco
docker compose up -d

# Migrations
npm run db:push

# Seed
npm run db:seed

# Dev server
npm run dev

# Prisma Studio
npm run db:studio

# Testes
npm test          # vitest run
npm run test:watch # vitest watch

# Snapshots
npm run snapshot       # gerar snapshot de todos os portfolios (uma vez)
npm run cron:snapshot  # cron node que roda snapshot todo dia 00:00 UTC
```
