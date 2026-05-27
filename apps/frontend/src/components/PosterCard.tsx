import { Link } from "@tanstack/react-router";
import type { MangaEntry } from "@packages/contracts";
import { img } from "../lib/img";

interface Props {
  entry: MangaEntry;
  source: string;
  sourceName: string;
}

export function PosterCard({ entry, source, sourceName }: Props) {
  return (
    <Link className="poster" to="/manga" search={{ source, url: entry.link, title: entry.name }}>
      <div className="poster-cover">
        {entry.imageUrl ? (
          <img loading="lazy" src={img(source, entry.imageUrl)} alt={entry.name} />
        ) : (
          <div className="poster-noimg">sem capa</div>
        )}
        <span className="poster-src">{sourceName}</span>
      </div>
      <div className="poster-name">{entry.name}</div>
    </Link>
  );
}
