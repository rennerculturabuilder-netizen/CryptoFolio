# CryptoFolio

Dashboard de gerenciamento de portfolio de criptomoedas. Acompanhe posições, transações, P&L, buy bands com alertas Telegram e indicadores de mercado em tempo real.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + TailwindCSS + Recharts + React Query
- **Backend:** Next.js API Routes + Prisma 5 + PostgreSQL 16
- **Auth:** NextAuth 4 (Credentials Provider + bcrypt)
- **Preços:** CoinGecko API (30+ criptos mapeadas)
- **Alertas:** Telegram Bot API
- **Infra:** Docker Compose + GitHub Actions CI

## Features

- **Multi-portfolio** com seletor no navbar e persistência no localStorage
- **Dashboard** com cards de saldo/custo/P&L, sparklines, tabela de ativos, distribuição e RSI gauge
- **Transações** completas: BUY, SELL, SWAP, DEPOSIT, WITHDRAW, FEE com validação de saldo
- **Buy Bands** com zonas de preço, chart de referência e alertas automáticos via Telegram
- **Export/Import CSV** de transações
- **Indicadores:** RSI 14, SMA 21/50/200
- **Snapshots diários** de portfolio (cron job)
- **Admin panel** com gestão de usuários e roles
- **Dark theme** com design system completo (glass, glow, surfaces)
- **Responsivo** com sidebar colapsável e dialogs full-screen no mobile

## Pré-requisitos

- Node.js 20+
- Docker (para PostgreSQL)
- npm

## Setup

```bash
# 1. Clonar e instalar
git clone <repo-url>
cd crypto-portfolio
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# 3. Subir banco de dados
docker compose up -d

# 4. Rodar migrations e seed
npx prisma db push
npm run db:seed

# 5. Iniciar dev server
npm run dev
```

Acesse `http://localhost:3000`

**Usuário padrão:** `admin@local.dev` / `Admin123!`

## Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|---|---|---|
| `DATABASE_URL` | Connection string PostgreSQL | Sim |
| `NEXTAUTH_URL` | URL base da aplicação | Sim |
| `NEXTAUTH_SECRET` | Secret para JWT do NextAuth | Sim |
| `TELEGRAM_BOT_TOKEN` | Token do bot Telegram (alertas) | Não |
| `TELEGRAM_CHAT_ID` | Chat ID para notificações | Não |

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm test` | Rodar testes (vitest) |
| `npm run test:watch` | Testes em modo watch |
| `npm run db:push` | Sincronizar schema Prisma |
| `npm run db:seed` | Popular banco com dados iniciais |
| `npm run db:studio` | Abrir Prisma Studio |
| `npm run snapshot` | Gerar snapshot de todos os portfolios |
| `npm run cron:snapshot` | Cron para snapshots diários (00:00 UTC) |
| `npm run check:bands` | Verificar buy bands vs preços atuais |
| `npm run cron:bands` | Cron de buy bands (a cada 5 min) |

## API Reference

### Auth
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Registrar novo usuário |
| POST | `/api/auth/[...nextauth]` | Login (NextAuth) |

### Portfolios
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/portfolios` | Listar portfolios |
| POST | `/api/portfolios` | Criar portfolio |
| GET | `/api/portfolios/:id` | Detalhes do portfolio |
| PATCH | `/api/portfolios/:id` | Atualizar portfolio |
| DELETE | `/api/portfolios/:id` | Deletar portfolio (sem transações) |

### Transações
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/portfolios/:id/transactions` | Listar transações |
| POST | `/api/portfolios/:id/transactions` | Criar transação |
| GET | `/api/portfolios/:id/transactions/:txId` | Detalhes da transação |
| DELETE | `/api/portfolios/:id/transactions/:txId` | Deletar transação |
| PATCH | `/api/transactions/:id` | Editar transação |
| GET | `/api/portfolios/:id/transactions/export` | Exportar CSV |
| POST | `/api/portfolios/:id/transactions/import` | Importar CSV |

### Posições & Indicadores
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/portfolios/:id/wac` | WAC (custo médio) por ativo |
| GET | `/api/portfolios/:id/snapshots` | Snapshots do portfolio |
| POST | `/api/portfolios/:id/snapshots` | Criar snapshot |
| GET | `/api/indicators/:symbol` | SMA por período |
| GET | `/api/prices/coingecko` | Preços CoinGecko (proxy) |
| GET | `/api/prices/latest` | Preços recentes (DB) |
| POST | `/api/prices/snapshot` | Salvar snapshot de preço (admin) |

### Buy Bands & Alertas
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/portfolios/:id/buy-bands` | Buy bands do portfolio |
| POST | `/api/portfolios/:id/buy-bands` | Criar buy band |
| PATCH | `/api/buy-bands/:id` | Atualizar buy band |
| DELETE | `/api/buy-bands/:id` | Deletar buy band |
| GET | `/api/buy-bands` | Todas buy bands do usuário |
| GET | `/api/buy-bands/alerts` | Listar alertas |
| GET | `/api/buy-bands/alerts/count` | Contagem de não lidos |
| PATCH | `/api/buy-bands/alerts/:id` | Marcar alerta como lido |
| DELETE | `/api/buy-bands/alerts/:id` | Deletar alerta |
| POST | `/api/buy-bands/alerts/read-all` | Marcar todos como lidos |

### Admin
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/admin/users` | Listar usuários |
| PATCH | `/api/admin/users/:id` | Atualizar role |

### Assets
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/assets` | Listar todos os assets |

## Arquitetura

```
src/
├── app/                    # App Router (pages + API routes)
│   ├── api/                # 22+ API endpoints
│   ├── dashboard/          # Páginas protegidas
│   ├── admin/              # Painel admin
│   ├── login/              # Auth pages
│   └── register/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── dashboard/          # Hero cards, asset table, RSI gauge, distribution
│   ├── transactions/       # Modal, CSV import dialog
│   ├── buy-bands/          # Modal, price band chart
│   ├── portfolio/          # Tabs (positions, transactions, MA, buy bands)
│   ├── auth-layout.tsx     # Layout principal (navbar + sidebar)
│   ├── error-boundary.tsx  # Error boundary
│   └── providers.tsx       # SessionProvider + QueryClient + Tooltip + Portfolio
├── lib/
│   ├── portfolio/          # calc.ts, snapshot.ts, balance.ts
│   ├── services/           # coingecko.ts, indicators.ts, telegram.ts
│   ├── validations/        # Schemas Zod
│   ├── hooks/              # usePortfolio
│   ├── csv/                # transactions-csv.ts
│   ├── api-response.ts     # Helpers padronizados de resposta
│   ├── auth.ts             # NextAuth config
│   ├── guards.ts           # requireAuth, requireAdmin, requirePortfolioAccess
│   ├── prisma.ts           # Prisma client singleton
│   └── utils.ts            # cn() utility
├── tests/                  # Vitest (unit + integration)
└── types/                  # next-auth.d.ts
scripts/
├── daily-snapshot.ts       # Gerar snapshots
├── cron-snapshots.ts       # Cron wrapper para snapshots
├── check-buy-bands.ts      # Verificar preços vs buy bands
└── cron-buy-bands.ts       # Cron wrapper para buy bands
prisma/
├── schema.prisma           # 8 models
└── seed.ts                 # Seed data
```

## Deploy

### Docker (recomendado)

```bash
# Produção com Docker Compose
docker compose -f docker-compose.prod.yml up -d --build

# Rodar migrations
docker compose -f docker-compose.prod.yml exec app npx prisma db push
```

### Vercel + Railway/Supabase

1. Deploy o app no Vercel
2. Use Railway ou Supabase para PostgreSQL
3. Configure as variáveis de ambiente no dashboard do Vercel
4. Adicione `npx prisma generate` ao build command

## Criptos Suportadas

BTC, ETH, SOL, USDT, USDC, BNB, XRP, ADA, DOGE, DOT, AVAX, MATIC, LINK, UNI, ATOM, LTC, NEAR, ARB, OP, APT, SUI, SEI, TIA, INJ, FET, RENDER, PEPE, WIF, BONK, SHIB

## Licença

MIT
