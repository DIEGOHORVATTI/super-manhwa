export type CustomEmoji = { name: string; path: string };

// Custom image emojis served from /public/emojis/
// Add entries here as you add files to the public/emojis/ directory.
export const CUSTOM_EMOJIS: Record<string, CustomEmoji> = {};

// Quick-access Unicode emojis shown in the picker
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
 * Unicode emojis are already in the text as characters — no parsing needed.
 */
export function parseBody(
  text: string,
): Array<string | { type: "emoji"; name: string; path: string }> {
  if (!/:([a-z0-9_-]+):/i.test(text)) return [text];

  const re = /:([a-z0-9_-]+):/gi;
  const parts: Array<string | { type: "emoji"; name: string; path: string }> = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const key = match[1].toLowerCase();
    const emoji = CUSTOM_EMOJIS[key];
    if (emoji) {
      parts.push({ type: "emoji", name: emoji.name, path: `/${emoji.path}` });
    } else {
      parts.push(match[0]);
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
