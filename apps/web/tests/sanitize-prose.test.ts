import { describe, expect, it } from "bun:test";

import { sanitizeProse } from "../lib/sanitize-prose";

describe("sanitizeProse", () => {
  it("keeps whitelisted prose tags", () => {
    expect(sanitizeProse("<p>Olá <strong>mundo</strong></p>")).toBe(
      "<p>Olá <strong>mundo</strong></p>",
    );
  });

  it("strips disallowed tags but keeps their text", () => {
    expect(sanitizeProse('<p>oi</p><div class="ad">x</div>')).toBe("<p>oi</p>x");
  });

  it("drops script/style elements entirely", () => {
    expect(sanitizeProse("<p>a</p><script>alert(1)</script>")).toBe("<p>a</p>");
    expect(sanitizeProse("<style>p{}</style><p>b</p>")).toBe("<p>b</p>");
  });

  it("removes attributes (no onerror / style / href survive)", () => {
    expect(sanitizeProse('<p onclick="evil()">hi</p>')).toBe("<p>hi</p>");
    expect(sanitizeProse('<img src=x onerror="alert(1)">')).toBe("");
  });

  it("strips html comments", () => {
    expect(sanitizeProse("<p>a</p><!-- c -->")).toBe("<p>a</p>");
  });
});
