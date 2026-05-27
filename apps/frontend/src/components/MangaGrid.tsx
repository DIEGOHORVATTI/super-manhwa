import type { MangaEntry } from "@packages/contracts";
import { PosterCard } from "./PosterCard";

interface Props {
  list: MangaEntry[];
  source: string;
  sourceName: string;
}

export function MangaGrid({ list, source, sourceName }: Props) {
  if (list.length === 0) return <p className="muted">Nada encontrado.</p>;
  return (
    <div className="poster-grid">
      {list.map((m, i) => (
        <PosterCard key={m.link + i} entry={m} source={source} sourceName={sourceName} />
      ))}
    </div>
  );
}
