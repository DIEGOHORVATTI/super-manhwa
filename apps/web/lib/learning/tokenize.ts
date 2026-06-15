/**
 * Deterministic text tokenizer for the language-learning layer | NO AI/LLM.
 * Splits a chapter into sentences and ordered tokens (words + punctuation/space),
 * and reduces each word to a dictionary "lemma". PT/EN only for now (whitespace
 * languages); CJK segmentation (kuromoji/jieba) is a future language pack.
 *
 * Pre-run once at chapter save and cached in `chapter_tokens`/`sentences` | never
 * at read time. Pure + side-effect-free so it's fully unit-testable.
 */
export type LearnLanguage = "pt" | "en";

export interface Token {
  idx: number; // position within the chapter (0-based, includes non-words)
  sentenceIdx: number; // which sentence this token belongs to
  surface: string; // text as displayed
  lemma: string | null; // dictionary form (null for non-words)
  isWord: boolean; // false = whitespace/punctuation
}

export interface SentenceSpan {
  idx: number;
  text: string;
  start: number; // char offset in the source text
  end: number;
}

export interface TokenizedChapter {
  tokens: Token[];
  sentences: SentenceSpan[];
}

/** Matches one token: a word (starts with a letter), whitespace, or other run. */
const TOKEN_RE = /(\p{L}[\p{L}\p{M}'’-]*)|(\s+)|([^\s\p{L}]+)/gu;

/** Splits text into sentence spans, keeping char offsets. Terminators: . ! ? … and newlines. */
export function splitSentences(text: string): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  const re = /[^.!?…\n]*[.!?…]+|[^.!?…\n]+(?:\n|$)|\n+/gu;
  let idx = 0;
  for (const m of text.matchAll(re)) {
    const raw = m[0];
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const start = m.index + (raw.length - raw.trimStart().length);
    spans.push({ idx: idx++, text: trimmed, start, end: start + trimmed.length });
  }
  return spans;
}

/**
 * Naive MVP lemmatizer. Lowercases and strips a few regular inflections so
 * conjugations/plurals collapse onto one headword. Intentionally conservative |
 * a real lemma dictionary (per language) replaces this in a later phase.
 */
export function normalizeLemma(surface: string, language: LearnLanguage): string {
  let w = surface.toLowerCase().replace(/^['’-]+|['’-]+$/g, "");
  if (w.length <= 3) return w;
  if (language === "en") {
    if (w.endsWith("ies")) return `${w.slice(0, -3)}y`;
    if (/(ches|shes|sses|xes|zes)$/.test(w)) return w.slice(0, -2);
    if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  } else {
    // pt: regular plural -s / -es (very rough; keeps accents)
    if (w.endsWith("es") && w.length > 4) return w.slice(0, -2);
    if (w.endsWith("s")) return w.slice(0, -1);
  }
  return w;
}

export function tokenize(text: string, language: LearnLanguage): TokenizedChapter {
  const sentences = splitSentences(text);

  // Assign each char offset to a sentence (binary-search-free: sentences are ordered).
  const sentenceAt = (pos: number): number => {
    for (let i = sentences.length - 1; i >= 0; i--) {
      if (pos >= sentences[i].start) return sentences[i].idx;
    }
    return sentences.length ? sentences[0].idx : 0;
  };

  const tokens: Token[] = [];
  let idx = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const surface = m[0];
    const isWord = m[1] !== undefined;
    tokens.push({
      idx: idx++,
      sentenceIdx: sentenceAt(m.index),
      surface,
      lemma: isWord ? normalizeLemma(surface, language) : null,
      isWord,
    });
  }
  return { tokens, sentences };
}

/** Distinct word lemmas in a tokenized chapter (for dictionary lookup / counts). */
export function uniqueLemmas(tc: TokenizedChapter): string[] {
  const set = new Set<string>();
  for (const t of tc.tokens) if (t.isWord && t.lemma) set.add(t.lemma);
  return [...set];
}
