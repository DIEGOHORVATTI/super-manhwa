/**
 * Minimal HTML sanitizer for novel chapter prose from third-party connectors.
 * Whitelist approach (drop everything not explicitly allowed) | safe because
 * novel content is just paragraphs and light inline emphasis. This is a trust
 * boundary: the HTML is scraped from external sites, so it must never reach the
 * DOM unsanitized.
 *
 * ponytail: regex whitelist, no DOM/parser dependency. It strips disallowed
 * tags and ALL attributes (so no `onerror`, `style`, `href`, `src` survive),
 * which is exactly what prose needs. Upgrade path: swap for `sanitize-html` if
 * we ever need to keep attributes (e.g. footnote anchors).
 */

const ALLOWED = new Set([
  "p",
  "br",
  "hr",
  "em",
  "strong",
  "i",
  "b",
  "u",
  "s",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
]);

export function sanitizeProse(html: string): string {
  // 1. Drop whole dangerous elements (tag + contents): script/style/iframe/etc.
  let out = html.replace(
    /<(script|style|iframe|object|embed|form|input|svg|math|noscript|template)\b[\s\S]*?<\/\1>/gi,
    "",
  );
  // 2. Rewrite every remaining tag: keep it only if whitelisted, and strip ALL
  //    attributes (no event handlers, styles, or javascript: URLs can survive).
  out = out.replace(/<(\/?)([a-z0-9]+)\b[^>]*>/gi, (_m, slash: string, tag: string) =>
    ALLOWED.has(tag.toLowerCase()) ? `<${slash}${tag.toLowerCase()}>` : "",
  );
  // 3. Neutralize any stray angle-bracket leftovers / comments.
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  return out.trim();
}
