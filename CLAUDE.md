# CLAUDE.md — Arquitetura & regras do super-manhuwa

Guia operacional para qualquer mudança neste repo. Derivado dos guias **Full-Stack
(oRPC contract-first)**, **Backend (oRPC + DDD)** e **Frontend (React 2026)**, adaptado à
realidade do projeto. **Onde o projeto diverge do guia, está marcado como ⚠️ DIVERGÊNCIA.**

---

## 1. Monorepo (Bun workspaces)

```
apps/backend     # serviço de catálogo/leitura — Bun + oRPC + DDD (stateless)
apps/web         # Next.js 16 (App Router) — SSR + route handlers + Postgres próprio
packages/contracts   # FONTE DA VERDADE: oc (@orpc/contract) + Zod. ZERO lógica.
packages/core        # modelos de domínio compartilhados
packages/extension   # runtime de extensões (QuickJS) + conectores
```

Direção de dependência: `contracts ← backend` (implementa), `contracts ← web` (consome via
client oRPC). **`contracts` não depende de ninguém** além de `zod` + `@orpc/contract`. Nunca
importe `backend`/`web` dentro de `contracts`.

**Regra de versões (inviolável):** todos os `@orpc/*` na mesma versão (hoje `^1.14.3`) +
`zod` unificado. Divergência gera erros de tipo sutis.

---

## 2. Backend (`apps/backend`) — Clean/DDD por módulo ✅ seguido

```
modules/<bounded-context>/   # catalog, media, metadata, system
  domain/          🟢 PURO: entidades, ports (interfaces). Sem framework.
  application/     🟢 casos de uso (makeX/factory). Orquestra domínio.
  infrastructure/  🔵 adapters: Drizzle/HTTP/conectores + mappers
  presentation/routes/  🟣 ÚNICO lugar com @orpc/* — .handler()
core/ shared/ config/ context/ http/   container.ts (DI)   router.ts
```

Fluxo de dependência **sempre para dentro**: `presentation → application → domain ← infrastructure`.

**Regras travadas por lint (oxlint, ver §5):**
- `domain/` **não** importa application, infrastructure, presentation, `@orpc/*`, `drizzle-orm`, `@neondatabase/*`, http/router/container.
- `application/` **não** importa presentation, `@orpc/*`, `drizzle-orm`, `@neondatabase/*`, http/router.
- Arquivos do backend em **kebab-case** (`get-manga-core.ts`).
- DI por **factory** (`makeX(deps) => (input) => ...`) composta em `container.ts`. Sem decorators.
- Erros: lance `ORPCError` **só na presentation**; erro de domínio é tipo próprio traduzido na borda.
- `.output()` do contrato é o DTO de saída — enxuto, sem campos sensíveis.

> ⚠️ **DIVERGÊNCIA aceita:** a `application` importa `MangaMapper`/`ConnectorRegistry` de
> `infrastructure/` (pragmático, não 100% puro). Por isso o lint **não** bane application→infrastructure.
> Ao criar código novo, prefira injetar via port; mappers em application são tolerados.

---

## 3. Web (`apps/web`) — Next.js App Router ⚠️ DIVERGÊNCIA de stack

O guia Frontend assume **Vite SPA + React Router + TanStack Query + RHF + Zustand +
feature-sliced**. **Este projeto NÃO usa isso** — é **Next.js 16 App Router** (RSC + Server
Actions/route handlers). Regras reais aqui:

- **Dados de leitura/catálogo:** via **client oRPC** para o backend (`lib/orpc.server.ts`,
  `api.manga.*`) — contract-first ponta a ponta. ✅
- **Features de plataforma** (auth, comentários, doações, studio, admin, afiliados, pixels,
  aprendizado): **oRPC próprio do web** via o **adaptador Next** (`@orpc/server/fetch`). Router em
  `lib/rpc/` (`base.ts` builders + `routers/<domínio>.ts`), montado em `app/api/rpc/[...rest]`,
  consumido no browser pelo client tipado `lib/rpc/client.ts` (`rpc.<domínio>.<proc>()`). Schemas
  vêm de `@packages/contracts`; tipos derivam das procedures (não duplique). Persistência em
  **Drizzle/Neon** no Postgres do web, com **contexto por request** (sessão Better Auth + `db`)
  e guardas de auth/role nos builders (`pub`/`authed`/`staff`/`admin`).
  ⚠️ **DIVERGÊNCIA aceita:** esse router é **separado** do `contracts`/DDD do backend (que segue
  stateless de catálogo) — o web dona seu próprio estado. É oRPC, mas implementation-first (`os`),
  não o `implement(contracts)` do backend.
- **Exceções que continuam route handlers nativos** (`app/api/**/route.ts`): Better Auth
  (`auth/[...all]`), cron, webhooks do Mercado Pago, links de e-mail (newsletter confirm/unsubscribe),
  o proxy de catálogo (`list`, `[...path]`), export CSV do learn, e **uploads multipart** (capa de
  obra, páginas de capítulo, imagem do pixel) — URLs fixas batidas por terceiros ou corpos binários.
- **Estado:** URL (`searchParams`) para filtros/paginação; dados de servidor via **RSC/fetch**
  (sem TanStack Query); sessão via Better Auth (`useSession`). Sem Zustand/Redux.
- **Validação:** schemas Zod centralizados em **`@packages/contracts`** (movidos de `lib/schemas/*`),
  reusados pelas procedures oRPC — uma fonte da verdade para schema + tipo.
- **Componentes** em PascalCase (`Header.tsx`); libs/utilitários em kebab-case (`comment-tree.ts`).
- **Auth:** Better Auth (`lib/auth/*`); RBAC via `role` (`hasRole` em `lib/roles.ts`).
- **Degradação graciosa:** features de DB checam `dbEnabled`; R2 checa `r2Enabled`; e-mail `emailEnabled`.

**Princípios do guia que VALEM aqui:** derive tipos do contrato (não duplique); um schema Zod
para validar nas duas pontas; estado no "tipo certo"; a11y (label/role/aria); error boundaries
por rota; não vazar segredo no `.output()`/resposta.

---

## 4. Padrão de dados (web)

- Schema Drizzle único: `apps/web/lib/db/schema.ts`; migrações em `apps/web/drizzle/`
  (`bun run db:generate` / `db:push`). Cliente lazy em `lib/db/index.ts` (`getDb`, `dbEnabled`).
- Acesso a dados hoje é **inline nas procedures oRPC** (`lib/rpc/routers/*`), usando `context.db`.
  ⚠️ Existe um padrão de repositório (`lib/repositories/{legal-requests,subscribers}.ts`) — ao
  crescer, prefira extrair o acesso novo para `lib/repositories/` por consistência (não obrigatório
  no MVP).

---

## 5. Tooling — oxc (substituiu Biome + ESLint)

- **Lint:** `oxlint` (config `.oxlintrc.json`). **Format:** `oxfmt` (config `.oxfmtrc.json`,
  estilo: 2 espaços, 100 cols, aspas duplas, `;`, trailing all, lf).
- Scripts: `bun run lint` · `bun run lint:fix` · `bun run format` · `bun run format:check`.
- **`bun run ci`** = `format:check && lint && type-check` (deve ficar verde).
- Guardrails de arquitetura DDD + kebab-case do backend são **travados via `.oxlintrc.json`
  overrides** (§2). Provados: importar `infrastructure` no `domain` ou nomear arquivo fora de
  kebab-case faz o lint falhar.

---

## 6. Testes — `bun:test`

- Runtime: **Bun** (`bun test`). Preload `apps/web/tests/setup.ts` stuba `server-only`.
- Padrão do repo: **extrair lógica pura** em módulos (`lib/*`) e cobrir (ex.: `comment-tree`,
  `perms.computeAccess`, schemas, `payments/status`). Integração de route handlers via
  `mock.module` (auth/db/r2/mp) + `tests/helpers/fake-db.ts`. Render de componente puro via
  `react-dom/server`.
- Backend: `tests/unit` (offline) e `tests/e2e` (rede — só CI). Use cases testáveis com repo falso.
- Não persiga 100% de cobertura — cubra regra, fronteiras e fluxos de dinheiro.

---

## 7. Convenções de nomenclatura

| Artefato | Convenção | Exemplo |
|---|---|---|
| Componente React (web) | PascalCase | `AuthForm.tsx` |
| Util/lib (web e backend) | kebab-case | `comment-tree.ts`, `get-manga-core.ts` |
| Use case (backend) | `makeX` factory | `makeGetMangaCore(deps)` |
| Port de repositório | `XxxRepository` (type) | `ConnectorRegistry` |
| Schema Zod | `xxxSchema` + tipo inferido | `commentCreateSchema` |
| Tipo TS | PascalCase, sem `I`/`T` | `WorkAccess` |
| Tabela Drizzle | camelCase plural | `userWorks` |
| Erro de domínio | `XxxError` | (traduzido p/ `ORPCError` na presentation) |

---

## 8. Evolução do contrato

Aditivo (campo opcional/rota nova) é seguro. Breaking (renomear/remover/obrigatório) acende o
build dos dois lados — resolva no mesmo PR. `.output()` estreitar = breaking; alargar = seguro.

---

## 9. Comandos

```
bun run dev          # backend + web juntos
bun run ci           # format:check + lint + type-check
bun run test         # backend + web
cd apps/web && bun run db:generate | db:push
```

---

## 10. Resumo da conformidade (auditoria)

| Área | Status |
|---|---|
| `contracts` fonte da verdade, sem deps extras, @orpc unificado | ✅ |
| Backend DDD: domain puro, fluxo para dentro, DI por factory, kebab-case | ✅ (travado no lint) |
| Backend: `application` importa mappers de `infrastructure` | ⚠️ divergência aceita |
| Web é Next.js App Router (não o Vite SPA do guia) | ⚠️ por design |
| Schemas Zod centralizados em `@packages/contracts` (web importa de lá) | ✅ |
| Features de plataforma em **oRPC próprio do web** (`lib/rpc/`, adaptador Next), router separado do backend | ✅ contract-ish, ⚠️ separado por design |
| Exceções nativas: auth/cron/webhooks/email-links/proxy-catálogo/uploads | ⚠️ por design |
| Tooling oxc (oxlint+oxfmt) verde; Biome/ESLint removidos | ✅ |
