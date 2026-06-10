# Variáveis de ambiente — guia completo

Inventário de **toda** configuração do projeto, onde mora, se é obrigatória e **como
obter/gerar** cada valor. Os arquivos `.env.example` (root, `apps/web`, `apps/backend`)
trazem o mesmo conteúdo comentado — copie-os para `.env` / `.env.local` e preencha.

> As features degradam graciosamente quando suas vars não estão setadas
> (`dbEnabled` / `r2Enabled` / `mpEnabled` / `emailEnabled`) — preencha só o que precisar.

---

## 1. Segredos que você gera (sem cadastro)

Gere e cole no arquivo indicado. **Em produção, gere valores novos.**

```bash
openssl rand -base64 32   # BETTER_AUTH_SECRET
openssl rand -hex 32      # CRON_SECRET, IMAGE_TOKEN_SECRET, IMAGE_SIGN_SECRET
openssl rand -hex 24      # API_KEY
```

| Variável | Arquivo(s) | Observação |
|---|---|---|
| `BETTER_AUTH_SECRET` | `apps/web/.env.local` | assina as sessões do Better Auth |
| `CRON_SECRET` | `apps/web/.env.local` (+ Vercel) | protege `/api/cron/*` |
| `IMAGE_TOKEN_SECRET` | root `.env` + `apps/backend/.env` | AES do id-store de imagens |
| `IMAGE_SIGN_SECRET` | **os 3**: root + `apps/backend` + `apps/web` | HMAC de capas — **mesmo valor nos três** |
| `API_KEY` | **os 3** | X-API-KEY web↔backend — **mesmo valor nos três** |

> ⚠️ `IMAGE_SIGN_SECRET` e `API_KEY` precisam ser **idênticos** entre web e backend.

---

## 2. Valores simples (sem cadastro)

```bash
# apps/web/.env.local
DELIVERY_SERVICE_URL=http://localhost:8787   # URL do backend
BETTER_AUTH_URL=http://localhost:3000        # URL base do app
SITE_URL=http://localhost:3000               # canonical/OG

# root .env e apps/backend/.env
PORT=8787
```

---

## 3. Chaves de provedores (exigem cadastro)

| Variável(is) | Onde | Obrigatória p/ | Passo a passo |
|---|---|---|---|
| `DATABASE_URL` | [neon.tech](https://neon.tech) | contas, comentários, doações, **aprendizado** | Crie o projeto → **Connection string** (pooled). Depois: `cd apps/web && bun run db:push`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | [console.cloud.google.com](https://console.cloud.google.com) | login com Google (opcional) | APIs & Services → OAuth consent screen → **Credentials → Create OAuth client ID → Web**. Redirect URI: `<BETTER_AUTH_URL>/api/auth/callback/google`. |
| `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_EMAIL` | [resend.com](https://resend.com) | e-mail de verificação + reset | API Keys → Create. `MAIL_FROM` = remetente de domínio verificado. Sem a key, os links caem no **log do servidor**. |
| `R2_ACCOUNT_ID`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_PUBLIC_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Cloudflare → **R2** | upload de capítulos/novel + cache-on-read | Crie o bucket; **Settings → Public access** → `R2_PUBLIC_URL`; **Manage R2 API Tokens → Create** (Object Read & Write) → access key + secret. |
| `MP_ACCESS_TOKEN` | [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers) | doações Pix + assinatura Premium | Crie a aplicação → **Credenciais** → `TEST-…` (sandbox) ou `APP_USR-…` (produção). Webhook de preapproval é configurado no painel do MP. |
| `NEXT_PUBLIC_ANILIST_CLIENT_ID`, `ANILIST_CLIENT_SECRET` | anilist.co → Settings → Developer | sync de favoritos + vínculo de conta | Create client. Redirect URL: `<SITE_URL>/auth/anilist`. |
| `NEXT_PUBLIC_DISCORD_URL` | seu servidor Discord | card/botões do Discord | Convidar pessoas → *Nunca expirar* → copie o link. |

---

## 4. Opcionais / flags

| Variável | Arquivo | Para quê |
|---|---|---|
| `LEARN_PREMIUM_PRICE` | `apps/web/.env.local` | preço mensal BRL do Premium (default `14.90`) |
| `FLARESOLVERR_URL` | `apps/backend/.env` | solver de Cloudflare p/ fontes protegidas |
| `LOG_FORMAT` | `apps/backend/.env` | `json` (prod) ou `pretty` (dev) |
| `NEXT_PUBLIC_NEWSLETTER_ENABLED` | `apps/web/.env.local` | `true` mostra o signup (precisa DB + Resend) |

**Remover:** `NEXT_PUBLIC_DISQUS_SHORTNAME` — o Disqus foi substituído por comentários nativos.

---

## 5. Mínimo para subir local agora

```bash
# apps/web/.env.local
DATABASE_URL=...                 # Neon
BETTER_AUTH_SECRET=...           # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

cd apps/web && bun run db:push   # cria as tabelas + migração 0001
bun run dev                      # http://localhost:3000
```

Isso libera **login, comentários, perfil e `/learn`** (crie uma novel no Studio).
Incrementais: **R2** → uploads de capítulo; **Mercado Pago** → doações/assinatura;
**Google/Resend** → login social e e-mails.

---

## 6. Por feature — o que cada uma exige

| Feature | Vars necessárias |
|---|---|
| Login / contas / verificação | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (+ `RESEND_API_KEY` p/ e-mail real) |
| Login com Google | + `GOOGLE_CLIENT_ID/SECRET` |
| Comentários, perfil, admin | `DATABASE_URL` |
| Doações Pix | `DATABASE_URL`, `MP_ACCESS_TOKEN` |
| Obras de usuário (Studio) + cache R2 | `DATABASE_URL`, `R2_*` |
| Aprendizado (novels/SRS) | `DATABASE_URL` (+ `R2_*` se a novel tiver capa) |
| Premium (assinatura) | `MP_ACCESS_TOKEN` (+ `LEARN_PREMIUM_PRICE`) |
| Card do Discord | `NEXT_PUBLIC_DISCORD_URL` |
| Cron (newsletter + publicação agendada) | `CRON_SECRET` |
