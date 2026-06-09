import { describe, expect, it } from "bun:test";

import { normalizeLemma, splitSentences, tokenize, uniqueLemmas } from "../lib/learning/tokenize";

describe("splitSentences", () => {
  it("splits on . ! ? and trims", () => {
    const s = splitSentences("Olá mundo. Tudo bem? Sim!");
    expect(s.map((x) => x.text)).toEqual(["Olá mundo.", "Tudo bem?", "Sim!"]);
    expect(s.map((x) => x.idx)).toEqual([0, 1, 2]);
  });

  it("splits on newlines and ignores empty lines", () => {
    expect(splitSentences("linha um\n\nlinha dois").map((x) => x.text)).toEqual([
      "linha um",
      "linha dois",
    ]);
  });

  it("keeps correct char offsets", () => {
    const [a, b] = splitSentences("AB. CD.");
    expect("AB. CD.".slice(a.start, a.end)).toBe("AB.");
    expect("AB. CD.".slice(b.start, b.end)).toBe("CD.");
  });
});

describe("tokenize", () => {
  it("emits words and non-words preserving order + reconstructs the text", () => {
    const text = "O gato dorme.";
    const { tokens } = tokenize(text, "pt");
    expect(tokens.map((t) => t.surface).join("")).toBe(text); // lossless
    expect(tokens.filter((t) => t.isWord).map((t) => t.surface)).toEqual(["O", "gato", "dorme"]);
  });

  it("marks punctuation/space as non-words with null lemma", () => {
    const { tokens } = tokenize("hi, you", "en");
    const comma = tokens.find((t) => t.surface === ",");
    expect(comma?.isWord).toBe(false);
    expect(comma?.lemma).toBeNull();
  });

  it("keeps contractions and hyphenated words as single tokens", () => {
    const en = tokenize("don't well-known", "en").tokens.filter((t) => t.isWord);
    expect(en.map((t) => t.surface)).toEqual(["don't", "well-known"]);
  });

  it("assigns sentenceIdx per token", () => {
    const { tokens } = tokenize("Um dois. Três.", "pt");
    const tres = tokens.find((t) => t.surface === "Três");
    const um = tokens.find((t) => t.surface === "Um");
    expect(um?.sentenceIdx).toBe(0);
    expect(tres?.sentenceIdx).toBe(1);
  });

  it("handles accents (pt) in words", () => {
    const w = tokenize("coração ção", "pt").tokens.filter((t) => t.isWord);
    expect(w[0].surface).toBe("coração");
  });
});

describe("normalizeLemma", () => {
  it("en: collapses regular plurals", () => {
    expect(normalizeLemma("cats", "en")).toBe("cat");
    expect(normalizeLemma("boxes", "en")).toBe("box");
    expect(normalizeLemma("babies", "en")).toBe("baby");
    expect(normalizeLemma("class", "en")).toBe("class"); // -ss kept
  });

  it("pt: lowercases and strips regular plural", () => {
    expect(normalizeLemma("Gatos", "pt")).toBe("gato");
    expect(normalizeLemma("animais", "pt")).toBe("animai"); // rough MVP heuristic
  });

  it("keeps short words intact", () => {
    expect(normalizeLemma("is", "en")).toBe("is");
    expect(normalizeLemma("os", "pt")).toBe("os");
  });
});

describe("uniqueLemmas", () => {
  it("dedupes word lemmas, ignoring punctuation", () => {
    const tc = tokenize("gato, gatos. Cão!", "pt");
    expect(uniqueLemmas(tc).sort()).toEqual(["cão", "gato"]);
  });
});
