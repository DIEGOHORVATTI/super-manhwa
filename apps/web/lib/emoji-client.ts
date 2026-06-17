// Shared emoji fetching + caching for client components.
// Module-level cache: one fetch per page load, shared across all consumers.

type EmojiEntry = { name: string; url: string };

let cache: EmojiEntry[] | null = null;
let promise: Promise<EmojiEntry[]> | null = null;

export async function fetchEmojis(): Promise<EmojiEntry[]> {
  if (cache !== null) return cache;
  if (promise) return promise;
  promise = fetch("/api/emojis")
    .then((r) => r.json())
    .then((d) => {
      cache = (d.emojis ?? []) as EmojiEntry[];
      return cache;
    })
    .catch(() => {
      cache = [];
      return cache as EmojiEntry[];
    });
  return promise;
}

/** Build a name→url lookup from the fetched emoji list. */
export async function fetchEmojiMap(): Promise<Record<string, string>> {
  const list = await fetchEmojis();
  return Object.fromEntries(list.map((e) => [e.name, e.url]));
}
