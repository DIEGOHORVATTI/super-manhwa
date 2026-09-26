const API = "https://translate-google-api-v1.vercel.app/translate";
// ponytail: the API silently truncates past ~5000 chars, so paragraphs go in batches under it.
const MAX_BATCH = 4500;
const SEPARATOR = "\n\n";

/** Groups paragraphs into batches whose joined text stays under `max` chars. */
export function batchParagraphs(paragraphs: string[], max = MAX_BATCH) {
  return paragraphs.reduce<string[][]>((batches, paragraph) => {
    const last = batches.at(-1);
    const size = last ? last.join(SEPARATOR).length + SEPARATOR.length + paragraph.length : 0;
    if (last && size <= max) last.push(paragraph);
    else batches.push([paragraph]);
    return batches;
  }, []);
}

async function translate(text: string, to: string) {
  const response = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, from: "pt", to }),
  });
  if (!response.ok) throw new Error(`Tradução falhou (${response.status})`);
  return (await response.json()) as string;
}

/** Translates paragraph by paragraph, keeping the same count and order as the input. */
export async function translateParagraphs(paragraphs: string[], to = "en") {
  const batches = await Promise.all(
    batchParagraphs(paragraphs).map(async (batch) => {
      const parts = (await translate(batch.join(SEPARATOR), to)).split(/\n\s*\n/);
      // A paragraph that came back merged or split breaks alignment: redo this batch one by one.
      return parts.length === batch.length
        ? parts
        : Promise.all(batch.map((paragraph) => translate(paragraph, to)));
    }),
  );
  return batches.flat().map((paragraph) => paragraph.trim());
}
