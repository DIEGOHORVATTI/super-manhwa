"use client";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * Horizontal scroller for the discovery shelves: native scroll + click-and-drag
 * (pointer) + prev/next arrows for mouse users. The card markup is server-
 * rendered and passed as children; only the scroll behaviour is client-side.
 *
 * Drag uses a small movement threshold and swallows the click that would
 * otherwise follow a drag, so dragging across a card doesn't navigate into it.
 * Arrows hide at the extremes and on touch devices (where swipe is natural).
 */
export function ShelfScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const updateEdges = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [updateEdges]);

  const nudge = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="shelf-scroller">
      <button
        type="button"
        className="shelf-arrow shelf-arrow-left"
        aria-label="Anterior"
        hidden={atStart}
        onClick={() => nudge(-1)}
      >
        <Icon name="chevron-left" size={22} />
      </button>

      <ul
        className="shelf-row"
        ref={ref}
        onScroll={updateEdges}
        onPointerDown={(e) => {
          const el = ref.current;
          if (!el) return;
          drag.current = {
            active: true,
            startX: e.clientX,
            startLeft: el.scrollLeft,
            moved: false,
          };
        }}
        onPointerMove={(e) => {
          if (!drag.current.active || !ref.current) return;
          const dx = e.clientX - drag.current.startX;
          if (Math.abs(dx) > 4) drag.current.moved = true;
          ref.current.scrollLeft = drag.current.startLeft - dx;
        }}
        onPointerUp={() => {
          drag.current.active = false;
        }}
        onPointerLeave={() => {
          drag.current.active = false;
        }}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
          }
        }}
      >
        {children}
      </ul>

      <button
        type="button"
        className="shelf-arrow shelf-arrow-right"
        aria-label="Próximo"
        hidden={atEnd}
        onClick={() => nudge(1)}
      >
        <Icon name="chevron-right" size={22} />
      </button>
    </div>
  );
}
