"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { ShelfScroller } from "@/components/ShelfScroller";
import { type ProgressEntry, removeProgress, updateProgressCover, useHistory } from "@/lib/library";
import { routes } from "@/lib/routes";

const readHref = (e: ProgressEntry) =>
  routes.read(e.chapterId, { m: e.id, mn: e.name, n: e.chapterName });

/**
 * Cover for a history entry. The stored URL can be stale (a connector cover that
 * now blocks, an old signed path) | on error we re-resolve the *current* cover
 * from our catalog by work id and heal the stored entry, so it loads next time
 * without a round-trip. Falls back to "sem capa" only if the catalog has none.
 */
function ContinueCover({ entry }: { entry: ProgressEntry }) {
  const [src, setSrc] = useState<string | undefined>(entry.imageUrl);
  const [dead, setDead] = useState(false);
  const triedCatalog = useRef(false);

  const onError = async () => {
    if (triedCatalog.current) {
      setDead(true);
      return;
    }
    triedCatalog.current = true;
    try {
      const res = await fetch(
        `/api/manga/core?id=${encodeURIComponent(entry.id)}&name=${encodeURIComponent(entry.name)}`,
      );
      const fresh = (await res.json())?.core?.imageUrl as string | undefined;
      if (fresh && fresh !== src) {
        setSrc(fresh);
        updateProgressCover(entry.id, fresh);
      } else {
        setDead(true);
      }
    } catch {
      setDead(true);
    }
  };

  if (!src || dead) return <div className="poster-noimg">sem capa</div>;
  return (
    <Image
      src={src}
      alt={entry.name}
      fill
      sizes="120px"
      style={{ objectFit: "cover" }}
      unoptimized
      onError={onError}
    />
  );
}

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
                <ContinueCover entry={e} />
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
