# CLAUDE.md — Arquitetura & regras do super-manhuwa

Site de **novels em português**: o catálogo vem 100% do [Central Novel](https://centralnovel.com)
e o leitor narra os capítulos com uma voz por personagem. Em volta dele fica a plataforma
(contas, biblioteca, comentários, doações, afiliados, pixels, studio/orgs, admin, aprendizado,
newsletter), com estado próprio no Postgres.

---

## 1. Monorepo (Bun workspaces)

```
apps/web             # Next.js 16 (App Router) — SSR + route handlers + Postgres próprio
packages/contracts   # schemas Zod da plataforma (validação + tipos). ZERO lógica.
packages/emails      # templates React Email
```

Não existe backend separado: o catálogo é lido direto do Central Novel pelo servidor do Next.

**Regra de versões:** todos os `@orpc/*` na mesma versão (catalog do `package.json` raiz) +
`zod` unificado.

---

## 2. Catálogo — Central Novel (`apps/web/lib/catalog/`)

| Arquivo | Papel |
|---|---|
| `index.ts` | API pública (server-only): `browseNovels`, `searchNovels`, `suggestNovels`, `getGenres`, `getNovel`, `getChapters`, `getChapter` |
| `http.ts` | `fetch` com User-Agent, cache do Next (`revalidate`), fallback opcional por `FLARESOLVERR_URL`, leitura parcial de HTML (`fetchHead`) |
| `parse.ts` | parsers puros (cheerio) do HTML do tema Themesia — cobertos em `tests/catalog-parse.test.ts` |
| `labels.ts` | helpers leves seguros para o browser (não importe `parse.ts` em client component: ele traz o cheerio) |
| `types.ts` | tipos do domínio (`NovelSummary`, `Novel`, `ChapterSummary`, `Chapter`) |

Fontes usadas:
- **wp-json** (`/wp/v2/categories`, `/wp/v2/posts`): capítulos e texto. A categoria de capítulos
  tem o **mesmo slug** da série (ex.: `shadow-slave-20260913`).
- **HTML** `/series/?order=&genre[]=&status=&page=` e `/?s=`: listagens com capa, filtros e busca.
- **admin-ajax** `ts_ac_do_search`: sugestões do autocomplete.
- Página da série: lida só até a lista de capítulos (a página inteira passa de 2 MB).

**Identidade:** obra = slug da série, capítulo = slug do post. Rotas: `/novel/<slug>`,
`/read/<slug-do-capítulo>`, `/g/<gênero>`. Ids do catálogo antigo (tokens AES, ids AniList) são
descartados por `isNovelSlug` em `lib/library.ts`; `/manga/*` redireciona para a home.

---

## 3. Leitor e narração (`apps/web/lib/player/`, `components/reader/`)

- `script.ts`: separa fala e narração pelos travessões e atribui quem fala (tag de fala,
  pista de ação, alternância de turnos, interlocutor mais próximo). Nome citado **dentro** da fala
  nunca troca o falante.
- `voices.ts`: voz + tom + estilo (criança, adolescente, adulto, idoso, imponente) determinísticos
  por personagem; overrides salvos por obra. Texto quebrado em frases (≤200 chars) por causa do
  corte do Chrome em falas longas.
- `speech-player.ts`: fila, posição e contador de geração (erros de falas canceladas são
  ignorados; interrupção externa repete o trecho; pausa externa sincroniza o botão). O som vem de
  um `Speaker` (`speakers.ts`):
  - `NeuralAudioSpeaker` (padrão): vozes neurais do Microsoft Edge via `/api/tts` (MP3 num
    `<audio>`; pausa no lugar, velocidade por `playbackRate`, pré-carrega 3 trechos). A rota fala
    com o serviço "Read Aloud" do Edge por WebSocket (`lib/tts/edge.ts`, protocolo em
    `edge-protocol.ts`, não oficial: se quebrar, atualize `CHROMIUM_VERSION` a partir do projeto
    `rany2/edge-tts`). Respostas são determinísticas e ficam 1 ano no cache da CDN.
  - `WebSpeechSpeaker`: vozes do navegador (`speechSynthesis`), usado se o usuário escolher ou se
    as vozes neurais falharem.
- `use-media-session.ts`: teclas de mídia / fone / controles do SO.
- O leitor é **client-only** (`ChapterReaderLoader`, `ssr: false`): vozes, preferências e posição
  vivem no navegador. Progresso por parágrafo no histórico local (`ProgressEntry.paragraph`).

---

## 4. Web (`apps/web`) — Next.js App Router

- **UI:** MUI com o tema do scale em `apps/web/theme/` (Minimal). Páginas de catálogo, leitor e
  biblioteca são MUI; o restante da plataforma ainda usa `app/globals.css`, cujos tokens (`:root`)
  seguem a paleta do tema. Página nova: faça em MUI.
- **Features de plataforma** (auth, comentários, doações, studio, admin, afiliados, pixels,
  aprendizado): **oRPC próprio do web** via adaptador Next (`@orpc/server/fetch`). Router em
  `lib/rpc/` (`base.ts` builders + `routers/<domínio>.ts`), montado em `app/api/rpc/[...rest]`,
  consumido no browser por `lib/rpc/client.ts` (`rpc.<domínio>.<proc>()`). Schemas vêm de
  `@packages/contracts`. Persistência em **Drizzle/Neon** com contexto por request (sessão Better
  Auth + `db`) e guardas nos builders (`pub`/`authed`/`staff`/`admin`).
- **Route handlers nativos** (`app/api/**/route.ts`): Better Auth, cron, webhooks do Mercado Pago,
  links de e-mail, listagem/sugestões do catálogo (`list`, `novels/suggest`), export CSV do learn e
  uploads multipart.
- **Estado:** URL (`searchParams`) para filtros; dados de servidor via RSC; biblioteca local em
  `lib/library.ts` (localStorage, espelhada no banco quando logado); sessão via `useSession`.
- **Componentes** em PascalCase; libs/utilitários em kebab-case.
- **Degradação graciosa:** DB checa `dbEnabled`; R2 `r2Enabled`; e-mail `emailEnabled`.

---

## 5. Padrão de dados (web)

- Schema Drizzle único: `apps/web/lib/db/schema.ts`; migrações em `apps/web/drizzle/`
  (`bun run db:generate` / `db:push`). Cliente lazy em `lib/db/index.ts`.
- ⚠️ `DATABASE_URL` aponta para o banco de **produção**. Não rode `db:push`/migrações sem pedido
  explícito.
- As tabelas `cached_*`, `push_follows` e `work_state` sobraram do catálogo antigo e não são mais
  usadas pelo código; removê-las exige migração (drop) aprovada.

---

## 6. Tooling e testes

- **Lint:** `oxlint` · **Format:** `oxfmt` (2 espaços, 100 cols, aspas duplas, `;`).
- **`bun run ci`** = `format:check && lint && type-check` (deve ficar verde).
- **Testes:** `bun test` em `apps/web` (preload `tests/setup.ts` stuba `server-only`). Extraia
  lógica pura e cubra (parsers do catálogo, parser de falas, vozes, player com `speechSynthesis`
  falso, schemas, pagamentos). `mock.module` vale para o processo todo: ao mockar `@/lib/catalog`,
  exporte todas as funções usadas pelos outros testes.

```
bun run dev          # web
bun run ci           # format:check + lint + type-check
bun run test         # testes do web
cd apps/web && bun run db:generate | db:push
```
