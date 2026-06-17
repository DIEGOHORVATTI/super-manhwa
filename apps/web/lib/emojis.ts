// Quick-access Unicode emojis shown in the picker (no network needed)
export const UNICODE_EMOJIS = [
  "😂",
  "😭",
  "🔥",
  "💀",
  "😍",
  "🤔",
  "👀",
  "😤",
  "🗿",
  "👏",
  "💪",
  "❤️",
  "💯",
  "😎",
  "🤣",
  "😢",
  "😡",
  "🤯",
  "🥹",
  "🙏",
  "✨",
  "👍",
  "👎",
  "😱",
  "🤩",
  "😴",
  "🫡",
  "💔",
  "😏",
  "🤌",
  "🫶",
  "🥲",
];

/**
 * Parse comment text into segments: plain string or a custom image emoji.
 * Custom emojis are written as :name: and resolved via the API at render time.
 * Unicode emojis are already inline characters — no parsing needed.
 */
export function parseBody(
  text: string,
  emojiMap: Record<string, string> = {},
): Array<string | { type: "emoji"; name: string; url: string }> {
  if (!/:([a-z0-9_-]+):/i.test(text)) return [text];

  const re = /:([a-z0-9_-]+):/gi;
  const parts: Array<string | { type: "emoji"; name: string; url: string }> = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const key = match[1].toLowerCase();
    const url = emojiMap[key];
    if (url) {
      parts.push({ type: "emoji", name: key, url });
    } else {
      parts.push(match[0]);
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
