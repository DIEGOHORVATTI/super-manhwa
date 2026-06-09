# Plano — Camada de Aprendizado de Idiomas (Brief 1, MVP)

> Carro-chefe. Transforma a leitura de **novels (texto)** em aquisição ativa de idioma,
> **sem IA/LLM**: tokenização determinística + dicionário + repetição espaçada (FSRS).

## Decisões travadas
| Tema | Decisão |
|---|---|
| Conteúdo | Adicionar tipo **novel (texto)** ao Studio (capítulos de texto, além de imagem) |
| 1º idioma | **PT/EN** (split por espaço + lematização simples — sem o desafio de segmentação CJK) |
| Monetização | **Freemium + assinatura premium** (limite diário grátis; ilimitado + export Anki no premium) |
| Runtime | Tudo puro-JS/Bun/Vercel — **sem binários nativos** (MeCab/Jieba ficam para JP/CN, fase futura) |

## Contexto / pré-requisito
A plataforma hoje é leitor de **imagem** (capítulos = imagens no R2). **Não havia conteúdo de
texto.** Esta feature primeiro introduz o tipo *novel*: `userWorks.kind = "novel"`, capítulos
guardam **texto** + tokens **pré-computados** (não tokenizar em runtime).

## Sem IA — como cada parte é determinística
- Segmentar texto → split por espaço/pontuação + lematização por regras/dicionário (PT/EN).
- Tradução da palavra → lookup em dicionário bilíngue estático (verbete por lemma).
- Agendar revisões → **FSRS** (algoritmo, lib open source).
- Status de palavra, XP, streak, cloze → lógica de aplicação.

## Modelo de dados (Drizzle, em `apps/web/lib/db/schema.ts`)
**Conteúdo de texto** (estende o Studio):
- `userWorks.kind` — `"manga" | "novel"`.
- `chapterText` — (chapterId, language, content) texto bruto do capítulo.
- `chapterTokens` — (chapterId, index, surface, lemma, reading?, sentenceIndex, isWord) — **cache** da tokenização.
- `sentences` — (chapterId, index, text) — frases para cloze + mining.

**Vocabulário & SRS** (§8 do brief):
- `words` — (id, language, lemma, reading?, frequency?, dictJson) único (language, lemma).
- `userWords` — (userId, wordId, status `new|learning|known|ignored`, FSRS: stability, difficulty, due, reps, lapses, lastReviewedAt) único (userId, wordId).
- `cards` — (userId, userWordId, type `cloze|sentence`, sentenceId?, front/back) item de revisão.
- `reviewLogs` — (cardId, userId, rating 1–4, reviewedAt, snapshot FSRS) — input do FSRS.

**Gamificação & plano** (no `user` + tabelas):
- `user`: `xp`, `streakDays`, `lastActiveDate`, `dailyGoal`, `plan` (`free|premium`), `premiumUntil`.
- `achievements` / `userAchievements`.
- `subscriptions` — (userId, provider `mercadopago`, providerSubId, status, currentPeriodEnd) — assinatura recorrente (MP preapproval).

## Gating freemium (regra única, testável)
Helper puro `lib/learning/entitlements.ts`: dado `plan` + uso do dia, decide limites
(ex.: grátis = 20 palavras novas/dia, teto de cards, sem export Anki; premium = ilimitado +
cloze/mining + estatísticas + export Anki). Centralizado para teste e reuso nas rotas.

## Ordem de fases (cada uma entregável e testável)
1. **Fundação (ESTA entrega)**: schema + migração; pipeline de tokenização PT/EN puro + testes.
2. **Conteúdo novel no Studio**: criar/editar obra `kind=novel`, capítulo de texto; pré-tokeniza no upload (popula `chapterTokens`/`sentences`).
3. **Leitura interativa**: render do capítulo com palavras clicáveis + popup (tradução/leitura/exemplo) + status por usuário (cores) + contador de palavras conhecidas.
4. **SRS (FSRS)**: fila de revisão, cards **cloze** (frase real com lacuna), `reviewLogs`.
5. **Sentence mining**: minerar frase → card.
6. **Gamificação**: XP, streak, meta diária, conquistas.
7. **Dicionário**: importar JMdict/CC-CEDICT/etc. + frequência (verificar licença comercial); dificuldade graduada (i+1).
8. **Paywall**: entitlements + assinatura MP (preapproval) + export Anki (.apkg).
9. **JP/CN**: tokenizadores kuromoji.js / segmentador JS (fase futura).

## Verificação (Fase 1)
- `bun run db:generate` sem erros; tabelas criadas.
- `bun test` cobre o tokenizador (frases, pontuação, contrações, maiúsculas, posições/sentenças).
- `bun run ci` verde (oxfmt + oxlint + tsc).
