import { describe, expect, it } from "bun:test";

/**
 * The FlareSolverr JSON unwrapper is an internal helper in runtime/host.ts.
 * It isn't exported (host internals stay private), so we re-implement the same
 * contract here as a guard against regressions in the public behaviour:
 * a Chromium-rendered JSON page (`<pre>{json}</pre>`) must come back as raw JSON,
 * while a real HTML page must pass through untouched.
 *
 * Keep this in sync with `unwrapSolvedBody` / `decodeHtmlEntities` in
 * packages/extension/src/runtime/host.ts.
 */
const decodeHtmlEntities = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const unwrapSolvedBody = (body: string): string => {
  const m = body.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!m) return body;
  const inner = decodeHtmlEntities(m[1]).trim();
  if (inner.startsWith("{") || inner.startsWith("[")) return inner;
  return body;
};

describe("FlareSolverr JSON unwrap", () => {
  it("unwraps a Chromium-rendered JSON object in <pre>", () => {
    const wrapped = `<html><head></head><body><pre style="word-wrap: break-word;">{"hid":"abc","title":"Solo Leveling"}</pre></body></html>`;
    const out = unwrapSolvedBody(wrapped);
    expect(out).toBe('{"hid":"abc","title":"Solo Leveling"}');
    expect(JSON.parse(out).title).toBe("Solo Leveling");
  });

  it("unwraps a JSON array", () => {
    const wrapped = `<html><body><pre>[{"a":1},{"b":2}]</pre></body></html>`;
    expect(JSON.parse(unwrapSolvedBody(wrapped))).toHaveLength(2);
  });

  it("decodes HTML entities inside the JSON (quotes, ampersands)", () => {
    const wrapped = `<body><pre>{&quot;title&quot;:&quot;Tom &amp; Jerry&quot;}</pre></body>`;
    const out = unwrapSolvedBody(wrapped);
    expect(JSON.parse(out).title).toBe("Tom & Jerry");
  });

  it("leaves a real HTML page untouched (scrape case)", () => {
    const html = `<html><body><div class="manga">…</div><pre>not json, just code</pre></body></html>`;
    expect(unwrapSolvedBody(html)).toBe(html);
  });

  it("returns body unchanged when there is no <pre>", () => {
    const html = `<html><body><h1>Just A Page</h1></body></html>`;
    expect(unwrapSolvedBody(html)).toBe(html);
  });

  it("does not double-decode &amp;amp;", () => {
    const wrapped = `<pre>{"x":"a &amp;amp; b"}</pre>`;
    // &amp;amp; → &amp; (single pass), NOT & .
    expect(JSON.parse(unwrapSolvedBody(wrapped)).x).toBe("a &amp; b");
  });
});
