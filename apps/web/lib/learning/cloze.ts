/**
 * Cloze-card construction | pure. Builds the default review card: the real
 * sentence from the text with the target word blanked (front) and the answer
 * (back). Always in context, never the word in isolation (Clozemaster-style).
 */
export interface Cloze {
  front: string; // sentence with the target replaced by ___
  back: string; // the original surface answer
}

const BLANK = "＿＿＿";

/** Escape a surface for use in a word-boundary-ish regex. */
function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace the first occurrence of `targetSurface` in `sentence` with a blank.
 * Case-insensitive match on the displayed surface; falls back to appending the
 * blank if the surface isn't found (e.g. lemma differs from surface).
 */
export function makeCloze(sentence: string, targetSurface: string): Cloze {
  const re = new RegExp(`(^|\\P{L})(${escape(targetSurface)})(\\P{L}|$)`, "iu");
  const m = re.exec(sentence);
  if (!m) {
    return { front: `${sentence} (${BLANK})`, back: targetSurface };
  }
  const end = m.index + m[0].length;
  const front = sentence.slice(0, m.index) + m[1] + BLANK + m[3] + sentence.slice(end);
  return { front, back: m[2] };
}

/** A sentence-mining card: full sentence front, translation/note back. */
export function makeSentenceCard(sentence: string, note: string): Cloze {
  return { front: sentence, back: note };
}
