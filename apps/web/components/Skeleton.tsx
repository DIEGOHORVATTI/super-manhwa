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

/** Related-works placeholder | Suspense fallback while the relation lookups
 *  stream in on the detail page. Mirrors the `.related-works` section + grid. */
export function RelatedWorksSkeleton({ count = 6 }: { count?: number }) {
  return (
    <section className="related-works" aria-hidden="true">
      <h2 className="section">Obras relacionadas</h2>
      <div className="poster-grid">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="poster">
            <div className="poster-cover skel" />
            <div className="skel skel-line" style={{ width: "80%", marginTop: 8 }} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Chapter-grid placeholder | the Suspense fallback while the cross-source
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

/** Detail-page placeholder | mirrors the hero (cover + info), the tab bar and the
 *  chapter grid so the swap to real content doesn't shift the layout. */
export function DetailSkeleton() {
  return (
    <div aria-hidden="true">
      <section className="detail-hero">
        <div className="detail-hero-inner">
          <div className="skel detail-cover" />
          <div className="detail-info" style={{ flex: "1 1 280px", minWidth: 0 }}>
            <div
              className="skel skel-line"
              style={{ width: "55%", height: 28, marginBottom: 14 }}
            />
            <div className="skel skel-line" style={{ width: 150, height: 20, marginBottom: 14 }} />
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[58, 76, 48].map((w) => (
                <div
                  key={w}
                  className="skel skel-line"
                  style={{ width: w, height: 22, borderRadius: 999 }}
                />
              ))}
            </div>
            <div className="skel skel-line" style={{ width: "100%", marginBottom: 7 }} />
            <div className="skel skel-line" style={{ width: "85%" }} />
          </div>
        </div>
      </section>

      <div style={{ display: "flex", gap: 14, margin: "18px 0 14px" }}>
        {[68, 92, 58].map((w) => (
          <div key={w} className="skel skel-line" style={{ width: w, height: 18 }} />
        ))}
      </div>

      <ChaptersGridSkeleton count={12} />
    </div>
  );
}

/** Reader placeholder | a toolbar bar plus a stack of tall page slots, mirroring
 *  `.reader-nav` + `.pages`/`.page-img` so the swap to real pages doesn't jump. */
export function ReaderSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden="true">
      <div className="reader-nav">
        <div className="skel skel-line" style={{ width: 150, height: 20 }} />
        <div className="reader-nav-spacer" />
        <div className="skel skel-line" style={{ width: 180, height: 20 }} />
      </div>
      <div className="pages">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="skel"
            style={{ width: "100%", maxWidth: 860, aspectRatio: "2 / 3" }}
          />
        ))}
      </div>
    </div>
  );
}

/** Donation page placeholder | mirrors the heading + the Pix form card so the
 *  swap to the real form doesn't shift layout. */
export function DonateSkeleton() {
  return (
    <div className="donate-wrap" aria-hidden="true">
      <div className="skel skel-line" style={{ width: "55%", height: 26, marginBottom: 12 }} />
      <div className="skel skel-line" style={{ width: "100%", marginBottom: 6 }} />
      <div className="skel skel-line" style={{ width: "80%", marginBottom: 20 }} />
      <div className="settings-card">
        <div className="donate-presets">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skel" style={{ height: 40, borderRadius: 10 }} />
          ))}
        </div>
        {[42, 42, 44].map((h, i) => (
          <div
            key={i}
            className="skel"
            style={{ height: h, borderRadius: 10, marginTop: i === 0 ? 16 : 12 }}
          />
        ))}
      </div>
    </div>
  );
}

/** Profile page placeholder | mirrors the banner header, avatar, name/handle,
 *  the stat-card row and the heatmap so the swap doesn't jump. */
export function ProfileSkeleton() {
  return (
    <div className="profile-wrap" aria-hidden="true">
      <header className="profile-header">
        <div className="profile-banner skel" />
        <div className="profile-id">
          <div className="profile-avatar profile-avatar-lg skel" />
          <div className="profile-info">
            <div className="skel skel-line" style={{ width: 190, height: 26, marginBottom: 10 }} />
            <div className="skel skel-line" style={{ width: 150, height: 15, marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 6 }}>
              {[60, 84].map((w) => (
                <div
                  key={w}
                  className="skel skel-line"
                  style={{ width: w, height: 22, borderRadius: 999 }}
                />
              ))}
            </div>
          </div>
        </div>
      </header>
      <div className="profile-stats">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="profile-stat">
            <div
              className="skel skel-line"
              style={{ width: 44, height: 22, margin: "0 auto 8px" }}
            />
            <div
              className="skel skel-line"
              style={{ width: "65%", height: 11, margin: "0 auto" }}
            />
          </div>
        ))}
      </div>
      <div className="skel" style={{ height: 150, borderRadius: 12, marginTop: 22 }} />
    </div>
  );
}
