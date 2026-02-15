# Crypto Portfolio — Progresso

## Última atualização
14/02/2026 --:--

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
- **Backend Indicators Service:**
  - `src/lib/services/indicators.ts` — calculateSMA, getLatestPrice, getIndicators
  - GET /api/indicators/:symbol?periods=21,50,200 — calcula SMA de cada período via PriceSnapshot histórico
  - Response: {symbol, current, mas: [{period, value, distance, distancePct}]}
- **Frontend v2 — Redesign completo dark theme (CryptoControl style):**
  - **Design System:**
    - Dark theme padrão (sem toggle, dark-first)
    - CSS variables: surface-0/1/2/3, chart colors (8 cores), glow effects
    - Utilitários: glass, glass-strong, glow-green/red/blue, text-gain/loss, scrollbar-thin
    - Tailwind estendido: chart colors, surface colors, pulse-glow/slide-up animations
  - **Auth Pages (login/register):**
    - Layout split: painel branding (esquerda) + form (direita)
    - Dark theme com gradientes e radial gradients decorativos
    - Show/hide password toggle
    - Validação visual de senha (register) com PasswordRule component
    - Responsivo: mobile mostra só form com logo compacto
  - **Layout Principal (auth-layout.tsx):**
    - Navbar: backdrop-blur, logo gradient, portfolio selector centralizado, user dropdown (Radix DropdownMenu)
    - Sidebar: glass effect, nav items com ícones (Dashboard, Transações, Buy Bands, Admin)
    - Portfolio selector no navbar: Select com todos portfolios + opção "Novo Portfolio"
    - User dropdown: nome/email, link admin (se admin), botão sair
    - Botão "+ Nova Transação" no navbar (link pra portfolio detail)
    - Dialog criar portfolio integrado no selector
    - Sidebar footer com portfolio ativo
    - Mobile: sidebar colapsável com overlay backdrop-blur
  - **Multi-Portfolio Selector:**
    - PortfolioProvider (React Context) em src/lib/hooks/use-portfolio.tsx
    - Persiste seleção no localStorage
    - Auto-seleciona primeiro portfolio
    - Select dropdown no navbar com troca entre portfolios
  - **Dashboard (/dashboard):**
    - 3 Hero Cards (Saldo Total, Custo Investido, Lucro/Perda) com glass effect e glow
    - Sparkline (recharts LineChart) nos cards de Saldo e P&L
    - Tabela de Ativos completa: Asset (ícone+nome), Qty, Custo Médio, Preço Atual, 24h change, Valor, P&L, Alocação %
    - Distribution Bar Chart: barra horizontal empilhada colorida com legenda
    - RSI Gauge: SVG semicircular com needle animado, zonas coloridas (OV/Neutro/OC), label dinâmico
    - Grid responsivo: tabela 2/3 + sidebar (distribuição + RSI) 1/3
    - Empty state para "sem portfolio"
  - **CoinGecko Integration:**
    - `src/lib/services/coingecko.ts`:
      - Mapeamento de 30+ símbolos pra IDs CoinGecko
      - `fetchPrices()` — preços + sparkline 7d + change 24h + market cap via /coins/markets
      - `fetchSimplePrices()` — apenas preços via /simple/price (leve)
      - `fetchRsi()` — calcula RSI 14 a partir de /market_chart daily
      - `calculateRsi()` — função pura de cálculo RSI
    - GET /api/prices/coingecko?symbols=BTC,ETH&rsi=BTC — proxy server-side com cache Next.js (60s preços, 300s RSI)
    - Dashboard faz refetch a cada 60s automaticamente
  - **Novos UI Components (shadcn/ui):**
    - DropdownMenu (Radix)
    - Progress (Radix)
    - Separator (Radix)
    - Tooltip (Radix) + TooltipProvider no root
  - **Providers atualizados:**
    - SessionProvider + QueryClientProvider + TooltipProvider + PortfolioProvider

- **Sistema de Transações Completo:**
  - **Modal Nova Transação (`src/components/transactions/transaction-modal.tsx`):**
    - Dialog global trigado pelo botão "+ Nova Transação" no navbar
    - Tabs por tipo: BUY, SELL, SWAP, DEPOSIT, WITHDRAW, FEE — cada tab com ícone e cor
    - Forms dinâmicos por tipo (campos específicos: base/quote asset, qty, price, fee, valueUsd, costBasis)
    - Auto-cálculo de preço unitário (BUY/SELL: price = quoteQty / baseQty)
    - Validação inline (canSubmit) — desabilita botão se campos obrigatórios estão vazios
    - Suporte a edição (preenche form com dados da tx existente)
    - Invalidação de queries após sucesso (transactions, wac, portfolio-summaries)
    - Taxa opcional com select "Sem taxa" / asset
    - Design system dark: bg-secondary/50, border-border/40, glass-strong dialog
  - **Página /dashboard/transactions:**
    - Tabela paginada (15 por página) com todas as transações do portfolio selecionado
    - Colunas: Data, Tipo (badge colorido com ícone), Base, Qty, Quote, Valor, Preço, Fee, Exchange, Ações
    - Filtros: busca textual (ativo, exchange, notas), filtro por tipo, filtro por asset, range de datas
    - Barra de filtros colapsável com badge de contagem de filtros ativos
    - Paginação com botões numéricos (até 5 visíveis) + prev/next
    - Edit inline: abre TransactionModal em modo edição
    - Delete com dialog de confirmação mostrando detalhes da transação
    - Empty states: "sem portfolio selecionado", "sem transações", "sem resultados" (filtros)
    - Integração com backend: GET /api/portfolios/:id/transactions, PATCH /api/transactions/:id, DELETE /api/portfolios/:id/transactions/:txId
  - **Layout atualizado:**
    - Sidebar: adicionado link "Transações" (/dashboard/transactions) com ícone ArrowLeftRight
    - Navbar: botão "+ Nova Transação" agora abre o modal (antes era link)
    - TransactionModal renderizado como filho do AuthLayout (disponível em todas as páginas)

- **Export/Import de Transações (CSV):**
  - Dependência `papaparse` instalada
  - `src/lib/csv/transactions-csv.ts` — utilitário com `transactionsToCSV()` e `parseCSV()` (validação completa por tipo)
  - GET `/api/portfolios/:id/transactions/export` — download CSV com nome dinâmico (portfolio + data)
  - POST `/api/portfolios/:id/transactions/import` — upload CSV via FormData, resolve symbols→IDs, cria em batch (Prisma $transaction)
  - `src/components/transactions/csv-import-dialog.tsx` — Dialog com upload, preview (válidas + erros), confirmação e resultado
  - Botões "Exportar" e "Importar" na página de transações (header)
  - Formato CSV: Data, Tipo, Base Asset, Base Qty, Quote Asset, Quote Qty, Preco, Fee Asset, Fee Qty, Cost Basis USD, Value USD, Exchange, Notas

- **Buy Bands com Alertas Automáticos:**
  - **Serviço Telegram (`src/lib/services/telegram.ts`):**
    - `sendTelegramMessage()` — HTTP POST para Telegram Bot API com parse_mode HTML
    - Env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
  - **APIs de Alertas:**
    - GET `/api/buy-bands` — lista todas buy bands do usuário (com join portfolio.ownerId)
    - GET `/api/buy-bands/alerts` — lista alertas (filtro por read, limit)
    - PATCH `/api/buy-bands/alerts/:id` — marcar alerta como lido
    - DELETE `/api/buy-bands/alerts/:id` — deletar alerta
    - GET `/api/buy-bands/alerts/count` — contagem de não lidos (endpoint leve para polling)
    - POST `/api/buy-bands/alerts/read-all` — marcar todos como lidos (bulk)
  - **Cron Checker de Preços:**
    - `scripts/check-buy-bands.ts` — busca buy bands pendentes, compara preço CoinGecko, cria alertas + notifica Telegram
    - Anti-duplicata: verifica se existe alerta nas últimas 4h para mesma band
    - Formato Telegram com emoji: símbolo, zone, preço atual/alvo, distância, quantidade, portfolio
    - `scripts/cron-buy-bands.ts` — wrapper node-cron a cada 5 minutos
    - npm scripts: `npm run check:bands` e `npm run cron:bands`
  - **Página /dashboard/buy-bands:**
    - Header com 3 stat cards (Total, Executadas, Pendentes)
    - Filtros: Portfolio, Asset, Status (pendente/executada)
    - Tabela paginada (15/página): Portfolio, Asset, Preço Alvo, Qty, Order (badge colorido por zona), Preço Atual, Distância %, Status, Ações
    - Preço atual via CoinGecko com refetch 60s
    - Cores por order: 1=emerald, 2=yellow, 3=orange, 4+=red
    - Ações: editar (modal), deletar (confirm dialog), toggle executada
    - Modal criar/editar buy band (`src/components/buy-bands/buy-band-modal.tsx`)
  - **Chart de Zonas de Preço (`src/components/buy-bands/price-band-chart.tsx`):**
    - Recharts ComposedChart com Area (sparkline 7d) + ReferenceLine por buy band
    - Agrupado por asset, legenda com distância percentual
    - Cores: zone 1=emerald, 2=yellow, 3=orange, 4+=red
    - Linha roxa pontilhada para preço atual
  - **Badge de Alertas no Navbar:**
    - Ícone Bell com badge vermelho (unread count)
    - Polling GET /api/buy-bands/alerts/count a cada 60s
    - Dropdown com últimos 5 alertas não lidos
    - Botão "Marcar todas como lidas"
    - Link "Ver todas" → /dashboard/buy-bands
  - **Ajustes:**
    - Sidebar: Buy Bands agora é link fixo (/dashboard/buy-bands), sem depender de selectedId
    - buy-bands-tab.tsx: adicionado botão "Ver todas" linkando para página dedicada

- **MVP Polish — Admin, Responsividade e UX:**
  - **Admin Panel Melhorado (`/admin/users`):**
    - 3 stat cards (Total Usuários, Admins, Portfolios) com ícones e glass effect
    - Tabela com avatar, email, role selector (inline), contagem de portfolios
    - Toast feedback ao alterar role
    - Skeleton loading states
    - Empty state
    - Responsivo: coluna "Criado em" hidden no mobile
  - **Sistema de Toast (sonner):**
    - Componente `<Toaster />` integrado no Providers (dark theme, bottom-right)
    - Toast em TODAS as mutations: criar portfolio, criar/editar/deletar transação, importar CSV, criar/editar/deletar buy band, toggle executada, alterar role admin
    - Error handling global no QueryClient (onError default)
  - **Responsividade Mobile:**
    - Dialog full-screen no mobile, centered modal no desktop (sm:), overflow-y-auto com max-h
    - Hero cards: 1 coluna no mobile, 3 no desktop
    - Buy Bands stats: 1 coluna no mobile, 3 no desktop
    - Buy Bands filtros: 1 coluna no mobile, 3 no desktop
    - Header de buy-bands: botão full-width no mobile
    - Portfolio detail tabs: 2x2 grid no mobile, 4 cols no desktop
    - Admin table: "Criado em" hidden no mobile (sm:table-cell)
    - CSS utility: `.mobile-card-table` para card view em tabelas mobile
  - **Animações e Polish:**
    - `animate-slide-up` em todas as páginas (dashboard, transactions, buy-bands, admin, portfolio detail)
    - `animate-fade-in` CSS utility
    - Transições suaves em hover de table rows

- **Padronização de API Routes com helpers centralizados:**
  - `src/lib/api-response.ts` — helpers `apiSuccess`, `apiError`, `handleApiError` (auto-map Unauthorized/Forbidden/NotFound)
  - `src/lib/guards.ts` — guards `requireAuth`, `requireAdmin`, `requirePortfolioAccess`
  - Routes migradas para os helpers:
    - `src/app/api/portfolios/[id]/route.ts` (GET, PATCH, DELETE)
    - `src/app/api/portfolios/[id]/transactions/route.ts` (GET, POST) — removida função local `getAssetBalance`, usa import de `@/lib/portfolio/balance`
    - `src/app/api/transactions/[id]/route.ts` (PATCH) — removida função local `getAssetBalance`, usa import de `@/lib/portfolio/balance`
    - `src/app/api/portfolios/[id]/wac/route.ts` (GET)
    - `src/app/api/admin/users/route.ts` (GET) — usa `requireAdmin()`
    - `src/app/api/admin/users/[id]/route.ts` (PATCH) — usa `requireAdmin()`
  - Removidos imports não utilizados (`NextResponse`, `getServerSession`, `authOptions`) de todas as routes migradas

- **Frontend Polish Final:**
  - `src/components/error-boundary.tsx` — Error boundary com fallback UI (ícone, mensagem, botão retry)
  - `src/components/ui/spinner.tsx` — Spinner + PageLoader components
  - ErrorBoundary adicionado em `dashboard/layout.tsx` e `admin/layout.tsx`
  - CSS Polish (`globals.css`):
    - `.stagger-children` — animação escalonada de children (50ms delay incremental)
    - `.skeleton-shimmer` — shimmer animado para loading states
    - `.tabular-nums` — números tabulares para tabelas
    - `.focus-ring` — focus visible ring padronizado
    - `.hover-lift` — efeito lift no hover de cards
  - Hero Cards: `stagger-children` + `hover-lift` em todos os 3 cards
  - Asset Table: `tabular-nums` + shimmer skeleton loading melhorado
  - Metadata melhorada: title template, keywords, description

- **Backend Optimization:**
  - `src/lib/portfolio/balance.ts` — utility `getAssetBalance` extraída e compartilhada
  - `next.config.mjs` — standalone output, `poweredByHeader: false`, security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection), imagens CoinGecko

- **DevOps / Deploy:**
  - `Dockerfile` — multi-stage build (deps → builder → runner) com user não-root, standalone output
  - `docker-compose.prod.yml` — PostgreSQL + App com healthcheck, env vars parametrizáveis
  - `.dockerignore` — exclui node_modules, .next, .git, .env
  - `.env.example` — template completo de variáveis de ambiente
  - `.github/workflows/ci.yml` — GitHub Actions CI (lint → test com PostgreSQL → build)

- **Documentação:**
  - `README.md` — completo com: stack, features, setup guide, env vars, scripts, API reference (22+ endpoints), arquitetura, deploy, criptos suportadas

- **Deploy Vercel + Neon (Produção):**
  - Projeto Neon criado (`dawn-butterfly-39115922`, região `aws-us-west-2`)
  - Schema Prisma sincronizado no Neon via `prisma db push`
  - Variáveis de ambiente configuradas na Vercel via CLI (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`)
  - Build passando na Vercel (21 páginas estáticas + 28 API routes dinâmicas)
  - Fix: `vercel.json` com `{"framework": "nextjs"}` para resolver erro "No Output Directory"
  - Fix: `prisma generate` adicionado ao build script para evitar erro de Prisma Client no Vercel
  - Fix: `output: "standalone"` condicional (só via `STANDALONE=true`, não ativa na Vercel)
  - **App live em: https://crypto-folio-rho.vercel.app**

- **DCA Adaptativo — Fase 1 (MVP):**
  - **Modelo DcaZone** — zonas com faixa de preço (priceMin/priceMax), percentual base, order, label, executed, assetSymbol
  - **Migration** `add_dca_zones` criada (SQL manual) — tabela DcaZone com unique constraint (portfolioId, assetSymbol, order)
  - **Validação Zod** — `src/lib/validations/dcaZone.ts` (create + update schemas)
  - **Engine de redistribuição adaptativa** — `src/lib/dca/engine.ts`:
    - Classifica zonas: ATIVA (preço dentro da faixa), PULADA (preço acima do max), EXECUTADA
    - Redistribui % das puladas/executadas proporcionalmente nas ativas
    - Calcula valor USD e distância % do preço atual
  - **Capital de stablecoins** — `src/lib/dca/capital.ts`: soma saldo de USD/USDT/USDC via `calcPositions()`
  - **API Endpoints:**
    - GET/POST `/api/portfolios/:id/dca-zones` — CRUD com validação de soma ≤ 100%
    - PATCH/DELETE `/api/dca-zones/:id` — update/delete individual
    - GET `/api/portfolios/:id/dca-strategy?asset=BTC` — retorna zonas computadas com redistribuição + resumo
  - **Componentes Frontend:**
    - `src/components/dca/asset-selector.tsx` — dropdown de ativo
    - `src/components/dca/dca-zones-display.tsx` — tabela de zonas com badges coloridos, status, % ajustado
    - `src/components/dca/dca-zone-modal.tsx` — modal create/edit com campos priceMin, priceMax, %, order, label
    - `src/components/dca/dca-strategy-panel.tsx` — painel principal com summary cards + zonas + modal
  - **Integração na página `/dashboard/buy-bands`** — DCA Adaptativo no topo, separador, bandas manuais abaixo
  - `tsc --noEmit` compila limpo

- **DCA Entry Points (Pontos de Entrada por Zona):**
  - **Model DcaEntryPoint** — targetPrice, value, preOrderPlaced, purchaseConfirmed, confirmedAt, zoneOrder
  - **Migration** `add_dca_entry_points` criada (tabela DcaEntryPoint com FK → DcaZone, índices)
  - **API Endpoints:**
    - GET/POST `/api/portfolios/:id/dca-zones/:zoneId/entry-points` — listar e gerar pontos automáticos
    - PATCH/DELETE `/api/portfolios/:id/entry-points/:pointId` — atualizar checkboxes e deletar ponto
  - **Cálculo de valor corrigido:** POST agora recebe `totalValue` (valorEmDolar real da zona) do frontend
  - **Capital Disponível integrado na API `dca-strategy`:**
    - Retorna `capitalDisponivel`, `capitalEmPreOrdens`, `capitalExecutado`
    - Desconta entry points (preOrderPlaced + purchaseConfirmed) + pré-ordens manuais do capital total
  - **Frontend — Card Capital Disponível:**
    - Novo card no painel DCA mostrando capital disponível em verde
    - Sub-labels mostrando valor em pré-ordens (amarelo) e executado (azul)
    - Grid responsivo atualizado: 6 colunas (era 5)
  - **Frontend — Modal de Zona com Entry Points:**
    - Input "Dividir em quantas entradas" (1-10) + botão "Gerar Pontos"
    - Lista de entry points com checkboxes: Pré-ordem e Confirme compra
    - Progresso visual: "X/Y pré-ordens | X/Y compras"
    - Delete individual por ponto
    - Cores por status: verde (confirmado), amarelo (pré-ordem), cinza (pendente)
  - **Schema sincronizado no Neon** via `prisma db push`
  - Dependência `@radix-ui/react-checkbox` instalada
  - `tsc --noEmit` + `next build` passando limpo (37 API routes + 9 páginas)

- **Página de Gráficos (/dashboard/charts) — TradingView Advanced Chart Widget:**
  - Página `/dashboard/charts` com widget TradingView completo embutido
  - Menu lateral: novo item "Gráficos" com ícone CandlestickChart
  - **Funcionalidades do widget:**
    - Gráfico avançado com candlestick, volume, indicadores (RSI, MACD pré-carregados)
    - Ferramentas de desenho completas (linhas, Fibonacci, tendência, etc.)
    - Busca de qualquer ativo diretamente no widget (allow_symbol_change)
    - Watchlist integrada (favoritos do usuário ou padrão BTC/ETH/SOL)
    - Popup mode para tela cheia
    - Timezone São Paulo, locale pt-BR, dark theme
  - **Controles customizados:**
    - Buscador de moedas com dropdown (12 pares populares BINANCE)
    - Seletor de intervalo (1m, 5m, 15m, 30m, 1H, 4H, 1D, 1S, 1M)
    - Botões de acesso rápido aos 6 pares mais populares (desktop)
    - Sistema de favoritos com localStorage (estrela amarela toggle)
    - Dropdown de busca com seções: Favoritos + Populares + busca textual
  - Build passando limpo (37 API routes + 10 páginas)

- **Bitcoin Lab — Dashboard de Análise On-Chain:**
  - **Página `/dashboard/bitcoin-lab`** com 7 indicadores on-chain de fundo
  - **Indicadores:** MVRV Ratio, STH MVRV, Mayer Multiple, LTH MVRV, LTH SOPR, AVIV Ratio, Preço vs Realizado
  - **Fontes de dados:** BGeometrics (cache 1h) + CoinGecko (preço + SMA200)
  - **API Route** `/api/bitcoin-lab` — proxy paralelo (Promise.all) + cálculo de status + price levels
  - **Types + Config** em `src/lib/bitcoin-lab/` — tipos, thresholds, zonas, cores por status
  - **Service** `src/lib/services/bgeometrics.ts` — fetch com cache in-memory 1h, graceful degradation
  - **Componentes:**
    - `ScoreHeader` — preço BTC + change 24h + contagem de sinais ativos + badge geral
    - `IndicatorCard` — badge status + valor colorido + ZoneBar + price levels + tooltip descrição
    - `IndicatorGrid` — grid responsivo 2 colunas com skeleton loading
    - `StatusBadge` — EXTREMO (verde) / FORTE (laranja) / OBSERVAÇÃO (amber) / NORMAL (cinza)
    - `ZoneBar` — barra de zonas coloridas com seta indicadora animada
    - `BtcChart` — TradingView Lightweight Charts v5 com candlestick OHLC real (CoinGecko) + price lines tracejadas por indicador
  - **Tabs:** "Sinais de Fundo" (ativo) / "Sinais de Topo" (em breve, disabled)
  - **React Query** com staleTime 5min + refetch automático
  - **Nav:** item "Bitcoin Lab" adicionado na sidebar com ícone FlaskConical
  - Build passando limpo (38 API routes + 11 páginas)

## 🚧 Em progresso
- (nenhum)

## ⚠️ Problemas encontrados
- `prisma migrate dev` não roda em terminal não-interativo (Claude Code) — usar direto no terminal ou `db push`
- Vercel: `output: "standalone"` causa erro "No Output Directory named 'public'" — resolvido com flag condicional

## 📋 Próximos passos
1. ~~Export/import de transações (CSV)~~ ✅
2. ~~Alertas de preço / notificações~~ ✅
3. ~~Admin panel + responsividade + polish~~ ✅
4. ~~Production polish (UX, backend, DevOps, docs)~~ ✅
5. ~~DCA Adaptativo — Fase 1 (MVP)~~ ✅
6. ~~Aplicar migration DcaZone no banco (local ou Neon)~~ ✅
7. DCA Fase 2: RSI-based auto-adjustment, charting visual das zonas
8. Dark mode toggle (CSS variables já configuradas — atualmente dark-only)
9. Testes E2E (Playwright ou Cypress)
10. Gráfico de evolução patrimonial (LineChart com snapshots)
11. Migrar routes restantes para helpers padronizados (prices, buy-bands, indicators, snapshots, etc.)

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

# Buy Bands
npm run check:bands    # verificar preços e criar alertas (uma vez)
npm run cron:bands     # cron node que verifica a cada 5 minutos

# Docker (produção)
docker compose -f docker-compose.prod.yml up -d --build
```
