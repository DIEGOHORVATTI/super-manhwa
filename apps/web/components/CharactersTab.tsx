"use client";
import type { MangaCharacter } from "@packages/contracts";
import { use } from "react";
import { CharacterGrid } from "@/components/CharacterGrid";

/** Accent-insensitive haystack for the in-tab filter. */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Consumes the streamed characters promise (via `use()`) inside the detail
 * page's Suspense boundary, so the hero/tabs paint while AniList resolves. Owns
 * its own name filter against the active `query`.
 */
export function CharactersTab({
  promise,
  query,
}: {
  promise: Promise<MangaCharacter[]>;
  query: string;
}) {
  const characters = use(promise);
  if (characters.length === 0) return <p className="muted">Nenhum personagem disponível.</p>;

  const q = norm(query.trim());
  const shown = q ? characters.filter((c) => norm(c.name).includes(q)) : characters;
  if (shown.length === 0) return <p className="muted">Nenhum personagem encontrado.</p>;
  return <CharacterGrid characters={shown} />;
}
