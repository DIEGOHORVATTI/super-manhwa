import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { LearnCta } from "../components/LearnCta";

/** LearnCta is a pure server component — render it to static HTML and assert. */
describe("LearnCta", () => {
  it("links to /learn with the learn-English pitch", () => {
    const html = renderToStaticMarkup(<LearnCta />);
    expect(html).toContain('href="/learn"');
    expect(html).toContain("Aprenda inglês");
    expect(html).toContain("Começar");
  });
});
