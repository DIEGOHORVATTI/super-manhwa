"use client";
import type { MangaSummary } from "@packages/contracts";
import Link from "next/link";
import { AniListSync } from "@/components/AniListSync";
import { ContinueReading } from "@/components/ContinueReading";
import { Icon } from "@/components/Icon";
import { PosterGrid } from "@/components/PosterGrid";
import { useFavorites } from "@/lib/library";

/**
 * The local library screen — favorites grid + the continue-reading rail, both
 * sourced from localStorage. Client-only by nature; the server page wraps it so
 * metadata still renders. Empty state nudges to the catalog.
 */
export function LibraryView() {
  const favorites = useFavorites();
  // LibEntry → the minimal MangaSummary shape PosterGrid needs.
  const items: MangaSummary[] = favorites.map((f) => ({
    id: f.id,
    name: f.name,
    imageUrl: f.imageUrl,
    lang: "",
  }));

  return (
    <>
      <h1 className="home-title" style={{ marginBottom: 12 }}>
        Biblioteca
      </h1>

      <AniListSync />

      <ContinueReading />

      <h2 className="section">Favoritos</h2>
      {items.length === 0 ? (
        <p className="muted">
          Nenhuma obra salva ainda. Toque em <Icon name="heart" size={13} /> numa obra para
          adicioná-la — fica salvo só neste navegador.{" "}
          <Link href="/explorar">Explorar o catálogo</Link>.
        </p>
      ) : (
        <PosterGrid items={items} />
      )}
    </>
  );
}
