"use client";
import { type ReactNode, useState } from "react";

/**
 * Client-side tab switcher for the detail page. Each tab's content is rendered
 * on the server and passed in as a ReactNode slot — the client only toggles
 * which one is visible, so chapter Links and markdown stay server-rendered.
 */
export function DetailTabs({
  tabs,
}: {
  tabs: Array<{ key: string; label: string; content: ReactNode }>;
}) {
  const [active, setActive] = useState(tabs[0]?.key);
  return (
    <>
      <nav className="detail-tabs" aria-label="Seções da obra">
        {tabs.map((t) => (
          <button
            type="button"
            key={t.key}
            className={`detail-tab${active === t.key ? " is-active" : ""}`}
            aria-current={active === t.key ? "true" : undefined}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tabs.map((t) => (
        <div key={t.key} hidden={active !== t.key}>
          {t.content}
        </div>
      ))}
    </>
  );
}
