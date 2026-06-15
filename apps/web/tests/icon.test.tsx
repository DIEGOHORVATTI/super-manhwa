import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Icon } from "../components/Icon";

/** The Icon set must include the names the new auth/menu UI references. */
describe("Icon", () => {
  it("renders an inline SVG with the requested size", () => {
    const html = renderToStaticMarkup(<Icon name="user" size={17} />);
    expect(html).toContain("<svg");
    expect(html).toContain('width="17"');
    expect(html).toContain('viewBox="0 0 24 24"');
  });

  it("includes the icons added for the account UI", () => {
    for (const name of ["log-in", "log-out", "settings", "shield", "pen-line"] as const) {
      const html = renderToStaticMarkup(<Icon name={name} />);
      expect(html).toContain("<svg");
      expect(html.length).toBeGreaterThan(40); // has path data, not an empty svg
    }
  });
});
