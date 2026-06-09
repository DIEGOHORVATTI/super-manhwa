import { afterEach, describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { DiscordCard } from "../components/DiscordCard";

/**
 * DiscordCard is a pure server component gated on NEXT_PUBLIC_DISCORD_URL — we
 * render it to static HTML (no DOM needed) and assert the gating + the invite.
 */
const original = process.env.NEXT_PUBLIC_DISCORD_URL;
afterEach(() => {
  process.env.NEXT_PUBLIC_DISCORD_URL = original;
});

describe("DiscordCard", () => {
  it("renders nothing when the Discord URL is unset", () => {
    process.env.NEXT_PUBLIC_DISCORD_URL = undefined;
    expect(renderToStaticMarkup(<DiscordCard />)).toBe("");
  });

  it("renders an external invite link when the URL is set", () => {
    process.env.NEXT_PUBLIC_DISCORD_URL = "https://discord.gg/abc123";
    const html = renderToStaticMarkup(<DiscordCard />);
    expect(html).toContain('href="https://discord.gg/abc123"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Discord");
  });
});
