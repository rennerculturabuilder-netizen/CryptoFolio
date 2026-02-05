# Crypto Portfolio — Progresso

## Última atualização
05/02/2026 22:10

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

## 🚧 Em progresso
- Nenhum

## ⚠️ Problemas encontrados
- Nenhum

## 📋 Próximos passos
1. Implementar páginas de login/registro (frontend)
2. Adicionar proteção de rotas com middleware NextAuth
3. Dashboard com posições e WAC visual

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
```
