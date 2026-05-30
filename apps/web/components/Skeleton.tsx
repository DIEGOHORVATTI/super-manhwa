/**
 * Loading placeholders shared by the route-level `loading.tsx` files. Pure
 * presentational shimmer (`.skel`); no client JS. The grid mirrors
 * `.poster-grid` so the swap to real content doesn't shift layout.
 */
export function PosterGridSkeleton({ count = 18 }: { count?: number }) {
  return (
    <div className="poster-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="poster">
          <div className="poster-cover skel" />
          <div className="skel skel-line" style={{ width: "80%", marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

/** Chapter-grid placeholder — the Suspense fallback while the cross-source
 *  chapter fan-out streams in on the detail page. Mirrors `.chapters-grid`. */
export function ChaptersGridSkeleton({ count = 18 }: { count?: number }) {
  return (
    <ul className="chapters-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="skel" style={{ height: 38, borderRadius: 8 }} />
        </li>
      ))}
    </ul>
  );
}

export function DetailSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skel" style={{ height: 280, borderRadius: "var(--radius)" }} />
      <div className="skel skel-line" style={{ width: 180, height: 22, marginTop: 16 }} />
      <div className="skel skel-line" style={{ width: 120, marginTop: 10 }} />
      <div className="chapters-grid" style={{ marginTop: 18 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="skel" style={{ height: 38, borderRadius: 8 }} />
        ))}
      </div>
    </div>
  );
}
