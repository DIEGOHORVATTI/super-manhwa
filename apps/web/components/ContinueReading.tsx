"use client";
import Link from "next/link";
import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { ShelfScroller } from "@/components/ShelfScroller";
import { type ProgressEntry, removeProgress, useHistory } from "@/lib/library";
import { routes } from "@/lib/routes";

const readHref = (e: ProgressEntry) =>
  routes.read(e.chapterId, { m: e.id, mn: e.name, n: e.chapterName });

/**
 * "Continuar lendo" rail on the home | a client island fed entirely by
 * localStorage history, so it renders nothing on the server / for new visitors
 * and never opts the (cached) home page out of static-ish rendering.
 */
export function ContinueReading() {
  const history = useHistory();
  if (history.length === 0) return null;

  return (
    <section className="continue" aria-label="Continuar lendo">
      <h2 className="continue-head">
        <Icon name="clock" size={18} /> Continuar lendo
      </h2>
      <ShelfScroller>
        {history.map((e) => (
          <li key={e.id} className="continue-card">
            <Link className="continue-link" href={readHref(e)}>
              <span className="continue-cover">
                <Cover src={e.imageUrl} alt={e.name} sizes="120px" />
              </span>
              <span className="continue-name">{e.name}</span>
              <span className="continue-chap">
                {typeof e.chapterNo === "number" ? `Cap. ${e.chapterNo}` : "Continuar"}
              </span>
            </Link>
            <button
              type="button"
              className="continue-remove"
              aria-label={`Remover ${e.name} do histórico`}
              onClick={() => removeProgress(e.id)}
            >
              <Icon name="x" size={14} />
            </button>
          </li>
        ))}
      </ShelfScroller>
    </section>
  );
}
