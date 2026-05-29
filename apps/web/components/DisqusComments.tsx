"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Disqus comment thread, scoped by a stable `identifier` (one thread per work,
 * one per chapter). Gated on `NEXT_PUBLIC_DISQUS_SHORTNAME` — unset → renders
 * nothing, so the feature is fully optional.
 *
 * Two bits of care for an App-Router SPA:
 *  - **Lazy**: the embed script only loads once the section scrolls near the
 *    viewport (IntersectionObserver), so it doesn't tax every page view.
 *  - **Reset on navigation**: when the identifier changes (client nav to another
 *    work/chapter) we call `DISQUS.reset` instead of re-injecting the script.
 */
const SHORTNAME = process.env.NEXT_PUBLIC_DISQUS_SHORTNAME;
export const disqusConfigured = Boolean(SHORTNAME);

type DisqusPage = { page: { identifier?: string; url?: string; title?: string } };
declare global {
  interface Window {
    DISQUS?: { reset: (o: { reload: boolean; config: (this: DisqusPage) => void }) => void };
    disqus_config?: (this: DisqusPage) => void;
  }
}

export function DisqusComments({
  identifier,
  title,
  url,
}: {
  identifier: string;
  title: string;
  url: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  // Load only when the section is about to enter the viewport.
  useEffect(() => {
    if (!SHORTNAME || visible) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  // Mount once visible; reset thread when the identifier changes.
  useEffect(() => {
    if (!SHORTNAME || !visible) return;
    const config = function (this: DisqusPage) {
      this.page.identifier = identifier;
      this.page.url = url;
      this.page.title = title;
    };
    window.disqus_config = config;
    if (window.DISQUS) {
      window.DISQUS.reset({ reload: true, config });
    } else {
      const s = document.createElement("script");
      s.src = `https://${SHORTNAME}.disqus.com/embed.js`;
      s.async = true;
      s.setAttribute("data-timestamp", String(Date.now()));
      document.body.appendChild(s);
    }
  }, [visible, identifier, title, url]);

  if (!SHORTNAME) return null;
  return (
    <section className="comments" ref={ref}>
      <h2 className="section">Comentários</h2>
      <div id="disqus_thread" className="disqus-thread" />
    </section>
  );
}
