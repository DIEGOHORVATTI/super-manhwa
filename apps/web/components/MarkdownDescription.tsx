import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

/**
 * Manga synopses arrive in two shapes: MangaDex sends real markdown, AniList
 * sends light HTML (`<br>`, `<i>`, `<b>`). We render both — GFM for markdown,
 * `rehype-raw` to parse the embedded HTML — with `allowedElements` acting as the
 * sanitiser (any tag outside the list is dropped). We then rewrite the link layer:
 *
 *   - links to ANY known source domain (mangadex, webtoons, …) are stripped to
 *     plain text so the wire stays source-agnostic and the browser never sees
 *     the upstream URL
 *   - other links open in a new tab with `rel="noopener noreferrer"`
 *
 * Pure server component — no browser APIs, safe to render in RSC.
 */

const BLOCKED_HOSTS = [
  "mangadex.org",
  "mangadex.network",
  "webtoons.com",
  "weebcentral.com",
  "manhwaz.com",
  "mangaworld.cx",
  "mangaworld.ac",
  "asuracomic.net",
  "tsuki-mangas.com",
  "mangalivre.net",
  "mangayabu.top",
];

const isBlocked = (href: string | undefined): boolean => {
  if (!href) return true;
  try {
    const u = new URL(href);
    // Only http(s) renders as a link — blocks `javascript:`/`data:` URLs that
    // rehype-raw would otherwise let through (XSS vector).
    if (u.protocol !== "http:" && u.protocol !== "https:") return true;
    return BLOCKED_HOSTS.some((host) => u.hostname === host || u.hostname.endsWith(`.${host}`));
  } catch {
    return true;
  }
};

export function MarkdownDescription({ text }: { text?: string | null }) {
  if (!text || !text.trim()) return null;

  return (
    <div className="detail-desc detail-desc-md">
      <Markdown
        remarkPlugins={[remarkGfm]}
        // Parse embedded HTML (AniList synopses use `<br>`, `<i>`, `<b>`).
        rehypePlugins={[rehypeRaw]}
        // Allow only the elements that make sense in a synopsis — anything
        // else (images, scripts, raw HTML) is stripped silently. This list is
        // the sanitiser for the rehype-raw output.
        allowedElements={[
          "p",
          "br",
          "strong",
          "b",
          "em",
          "i",
          "del",
          "code",
          "ul",
          "ol",
          "li",
          "blockquote",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "a",
          "hr",
        ]}
        unwrapDisallowed
        components={{
          a({ href, children }) {
            if (isBlocked(href)) {
              // Render as plain text — keeps the description readable while
              // stripping the upstream URL from the browser.
              return <span>{children}</span>;
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
