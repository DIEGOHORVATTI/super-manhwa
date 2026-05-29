"use client";
import useEmblaCarousel from "embla-carousel-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * Horizontal discovery shelf powered by Embla (free-drag scroll + momentum). The
 * prev/next arrows live OUTSIDE the card row (in the side gutters) and are always
 * visible, disabling at the extremes. Card markup is server-rendered and passed
 * as children; only the scroll behaviour is client-side.
 */
export function ShelfScroller({ children }: { children: ReactNode }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    dragFree: true,
    align: "start",
    containScroll: "trimSnaps",
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect).on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="shelf-scroller">
      <button
        type="button"
        className="shelf-arrow"
        aria-label="Anterior"
        disabled={!canPrev}
        onClick={() => emblaApi?.scrollPrev()}
      >
        <Icon name="chevron-left" size={22} />
      </button>

      <div className="shelf-viewport" ref={emblaRef}>
        <ul className="shelf-row">{children}</ul>
      </div>

      <button
        type="button"
        className="shelf-arrow"
        aria-label="Próximo"
        disabled={!canNext}
        onClick={() => emblaApi?.scrollNext()}
      >
        <Icon name="chevron-right" size={22} />
      </button>
    </div>
  );
}
