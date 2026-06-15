# Plano de Plataforma | super-manhuwa

> Transformar o leitor anônimo atual numa **plataforma com contas de usuário, comunidade
> e conteúdo gerado por usuários**, mantendo o backend de catálogo/leitura intacto.

## Contexto

Hoje o app é um leitor anônimo: Next.js 16 (`apps/web`) + backend Bun de catálogo
(`apps/backend`) via oRPC, conectores ao vivo (`packages/extension`), Drizzle+Neon já
configurado (só newsletter/legal/push), imagens via proxy in-memory, comentários via
Disqus, AniList OAuth só para sync de favoritos. **Não há usuários, perfil, admin,
pagamentos nem persistência de obras.**

Este plano adiciona, sem quebrar o pipeline de leitura existente:

1. **Contas de usuário** (email/senha + verificação + reset + Google) com **Better Auth**.
2. **Vínculo de múltiplas contas AniList** ao usuário logado.
3. **Comentários nativos** (substituindo Disqus) em obras e capítulos.
4. **Doações via Pix** com **Mercado Pago** (webhook + registro no DB).
5. **Explore vira a home** (remove a home atual).
6. **Card/banner do Discord** (link em env).
7. **Painel admin** + **páginas de perfil** de usuário.
8. **Obras postadas por usuários**: equipes com cargos/permissões, agendamento de
   capítulos, fluxo de revisão antes de publicar, preview.
9. **Persistência cache-on-read**: ao abrir uma obra de conector pela 1ª vez, gravar
   metadados/capítulos no Postgres e copiar capas/páginas pro **R2**.

## Decisões travadas

| Tema                  | Decisão                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------- | ------------ |
| Auth                  | **Better Auth** (adapter Drizzle, email+senha, verificação, reset, Google, account-linking) |
| Pix                   | **Mercado Pago** (Pix dinâmico + webhook de confirmação)                                    |
| Persistência de obras | Metadados+capítulos no **Postgres**, imagens no **R2** (cache-on-read)                      |
| UI                    | CSS vanilla existente (`globals.css`, vars de tema, padrão `.card`)                         | sem nova lib |

---

## Arquitetura de auth (onde o Better Auth roda)

Better Auth roda no **Next app** (`apps/web`), que já tem o Drizzle/Neon. Monta-se um
handler em `app/api/auth/[...all]/route.ts`. O backend Bun **não** ganha auth de usuário
(continua protegido por `X-API-KEY`); quando o web precisar provar identidade ao backend
(ex.: publicar capítulo de obra de usuário), o web assina a chamada server-side.

- `apps/web/lib/auth/server.ts` | instância `betterAuth({...})` com `drizzleAdapter`,
  `emailAndPassword`, `emailVerification`, `socialProviders.google`, e plugin de
  account-linking para AniList (provider OAuth custom).
- `apps/web/lib/auth/client.ts` | `createAuthClient` para componentes React.
- E-mails de verificação/reset reusam **Resend** já presente (`apps/web/lib/email.ts`)
  e os templates React Email.

---

## Schema Drizzle (novas tabelas em `apps/web/lib/db/schema.ts`)

Mantém as tabelas atuais. Adiciona:

**Auth (geradas/conformes ao Better Auth):**

- `users` | id, name, email, emailVerified, image, role (`user|staff|admin`),
  createdAt, updatedAt.
- `accounts` | provider linkado (google, credential, **anilist**), providerAccountId,
  tokens. Suporta **N contas AniList por usuário**.
- `sessions` | token, userId, expiresAt, ip, userAgent.
- `verifications` | tokens de verificação de email e reset de senha.

**Comunidade:**

- `comments` | id, userId, targetType (`work|chapter`), targetId, parentId (thread),
  body, createdAt, editedAt, deletedAt. Índice por (targetType, targetId).
- `commentVotes` | (commentId, userId, value) único.

**Doações:**

- `donations` | id, userId?(nullable p/ anônimo), amountCents, currency, provider
  (`mercadopago`), providerPaymentId, status (`pending|approved|rejected`), pixQr,
  createdAt. Webhook atualiza status.

**Obras de usuário / equipes:**

- `userWorks` | id, ownerId, title, slug, synopsis, coverR2Key, status
  (`draft|pending|published`), createdAt. Obra original postada na plataforma.
- `teams` | id, name, ownerId. `teamMembers` | (teamId, userId, role:
  `owner|editor|translator|reviewer`). `userWorks.teamId?` liga obra à equipe.
- `userChapters` | id, workId, number, title, status (`draft|scheduled|in_review|
published`), scheduledAt?, reviewedBy?, publishedAt?, createdBy.
- `chapterPages` | (chapterId, index, r2Key) | páginas no R2.
- `chapterReviews` | (chapterId, reviewerId, decision: `approved|changes_requested`,
  note, createdAt).

**Cache-on-read de conectores:**

- `cachedWorks` | catalogId (PK), title, payloadJson (core+meta), coverR2Key,
  refreshedAt. TTL lógico (refrescar em background).
- `cachedChapters` | (catalogId, chapterKey) | metadados do capítulo mesclado.
- `cachedPages` | (chapterId, index, r2Key, sourceUrl).

Migrações: `bun run db:generate` + `db:push` (config já existe). `dbEnabled` continua
guardando degradação graciosa.

---

## R2: cliente e fluxo

- `apps/web/lib/r2.ts` | cliente S3 (`@aws-sdk/client-s3`) com `R2_*` env. Precisa
  provisionar `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` (faltam hoje).
- Helpers `putObject(key, bytes, contentType)` e `publicUrl(key)` (usa `R2_PUBLIC_URL`).
- **Cache-on-read**: quando `manga/[id]` carrega, um job server-side (idempotente)
  baixa capa+páginas via o proxy atual e faz upload no R2 se ainda não houver
  `r2Key`; grava metadados em `cachedWorks/cachedChapters/cachedPages`. Leitura passa a
  preferir `cachedPages.r2Key` (via `R2_PUBLIC_URL`) e cai no proxy se ausente.
- Imagens de obras de usuário vão **direto** pro R2 no upload.

---

## Features e arquivos

### A. Auth + usuários (fundação | habilita todo o resto)

- Schema acima + `lib/auth/server.ts` + `client.ts` + `app/api/auth/[...all]/route.ts`.
- Telas: `app/(auth)/login`, `/signup`, `/verify-email`, `/forgot-password`,
  `/reset-password`. Reusa padrão `.anilist-card`/`.anilist-login` do CSS atual.
- E-mails: verificação e reset via Resend + React Email.
- Google: `socialProviders.google` (env `GOOGLE_CLIENT_ID/SECRET`).
- AniList linking: converter o fluxo atual de `app/auth/anilist/*` para, quando logado,
  **vincular** a conta AniList ao `users` (linha em `accounts`), permitindo várias.
- Header (`components/`): estado logado/deslogado, avatar, menu (perfil, admin se role).

### B. Perfil de usuário

- `app/u/[handle]/page.tsx` | avatar, bio, obras publicadas, atividade, contas AniList.
- `app/settings/page.tsx` | editar perfil, gerenciar contas vinculadas, trocar senha.

### C. Comentários nativos (remove Disqus)

- oRPC routes novas no `packages/contracts` + `apps/backend`? **Não** | comentários
  vivem no Postgres do web; criar **route handlers Next** em `app/api/comments/*`
  (list/create/edit/delete/vote) usando `getDb()` + sessão Better Auth.
- Componente `components/Comments.tsx` (threads, votos, markdown safe) substitui
  `DisqusComments.tsx` em `app/manga/[id]/page.tsx` e `app/read/[id]/page.tsx`.
- Comentar exige login (CTA "entrar para comentar"). Remover env/uso Disqus.

### D. Doações via Pix (Mercado Pago)

- `lib/payments/mercadopago.ts` | criar pagamento Pix (retorna QR + copia-e-cola).
- `app/api/donations/create` (cria pagamento) + `app/api/donations/webhook`
  (confirma, atualiza `donations.status`). Env `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`.
- `app/doar/page.tsx` | valores sugeridos, gera QR, status em tempo real (polling).

### E. Explore vira home + Discord

- Tornar `app/explorar/page.tsx` a raiz: mover seu conteúdo para `app/page.tsx`
  (ou redirect `/` → conteúdo do explore) e remover a home curada antiga.
  Ajustar nav/links que apontam para `/explorar`.
- `components/DiscordCard.tsx` | banner CTA, link de `NEXT_PUBLIC_DISCORD_URL` (env).
  Inserir na home e/ou footer (corrigir href `#` do `Footer.tsx`).

### F. Obras de usuário + equipes + agendamento + revisão

- Schema `userWorks/teams/teamMembers/userChapters/chapterPages/chapterReviews`.
- `app/studio/*` (área de criação): criar obra, gerenciar equipe e cargos, upload de
  capítulo (páginas → R2), **agendar** (`scheduledAt`), **enviar para revisão**,
  **preview** (`/studio/preview/...`), publicar.
- Permissões: helper `lib/perms.ts` (owner/editor/translator/reviewer) checado em todas
  as mutations. Reviewer aprova em `chapterReviews`; publish só com aprovação.
- Agendador: Vercel Cron (já há `CRON_SECRET`) | `app/api/cron/publish-scheduled`
  publica capítulos com `scheduledAt <= now` e `status=scheduled`.
- Render: obras de usuário aparecem no explore/leitor reusando os componentes de leitura,
  lendo de `userChapters/chapterPages` (R2) em vez dos conectores.

### G. Painel admin

- `app/admin/*` (guard role=admin): usuários (papéis/ban), moderação de comentários,
  fila de revisão/denúncias, doações, e flush/refresh do cache de obras.

### H. Persistência cache-on-read (conectores → DB + R2)

- `lib/r2.ts` + tabelas `cachedWorks/cachedChapters/cachedPages` + hook no carregamento
  de `manga/[id]` e `read/[id]` para popular DB/R2 de forma idempotente e preferir R2.

---

## Ordem de execução (incremental, cada passo testável)

1. **Schema + migração** de tudo (auth, comments, donations, userWorks, cached\*) e
   `lib/r2.ts`. `db:generate`/`db:push`.
2. **Better Auth** (server/client/route) + telas login/signup/verify/reset + Google +
   header logado.
3. **AniList linking** (refatorar fluxo atual para vincular ao usuário).
4. **Comentários nativos** + remover Disqus.
5. **Explore como home** + **Discord card** (corrigir footer).
6. **Perfil** + **settings**.
7. **Doações Pix (Mercado Pago)** + webhook.
8. **Obras de usuário**: studio, equipes/cargos, upload R2, agendamento, revisão, preview,
   publish + cron.
9. **Admin**.
10. **Cache-on-read** R2 para obras de conector.

## Env novas

`BETTER_AUTH_API_KEY`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`,
`NEXT_PUBLIC_DISCORD_URL`. (Remover `NEXT_PUBLIC_DISQUS_SHORTNAME`.)

## Verificação

- `bun run db:generate` sem erros; tabelas criadas no Neon (`db:push`).
- `bun run dev` (web) → signup → email de verificação (Resend) → login → Google login.
- Vincular 2 contas AniList ao mesmo usuário; aparecem em settings.
- Comentar em obra/capítulo logado; editar/excluir/votar; deslogado vê CTA.
- `/` renderiza o explore; card do Discord abre o link da env.
- Doar: gera QR Pix (MP sandbox), webhook marca `approved`, UI atualiza.
- Studio: criar obra, adicionar membro com cargo, subir capítulo, agendar, revisar,
  preview, publicar; cron publica agendado; obra aparece no explore/leitor.
- Admin: alterar papel, moderar comentário, ver doações.
- Cache-on-read: 2ª visita a uma obra serve imagens de `R2_PUBLIC_URL` e lê metadados do DB.

```

```
