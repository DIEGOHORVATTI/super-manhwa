import type { ChapterSummary } from "./types";

import { chapterLabel } from "./labels";

export type ChapterItem = ChapterSummary & {
  name: string;
  number?: string;
  volume?: string;
};

export type ChapterGroup = {
  key: string;
  title: string;
  chapters: ChapterItem[];
};

const VOLUME = /\bVol(?:ume|\.)?\s*([\p{L}\d.]+)/iu;
const NUMBER = /\bCap(?:[íi]tulo|\.)?\s*(\d+(?:[.,]\d+)?)/iu;
const SEPARATOR = /^[\s–—:-]+|[\s–—:-]+$/g;
const RANGE_SIZE = 100;

export function toChapterItem(chapter: ChapterSummary, novelTitle: string): ChapterItem {
  const label = chapterLabel(chapter.title, novelTitle);
  const volume = VOLUME.exec(label);
  const number = NUMBER.exec(label)?.[1].replace(",", ".");
  const withoutVolume = volume ? label.replace(volume[0], "") : label;

  return {
    ...chapter,
    name: withoutVolume.replace(SEPARATOR, "") || label,
    number,
    volume: volume?.[1],
  };
}

function rangeTitle(items: ChapterItem[]) {
  const numbers = items.map((item) => Number(item.number)).filter(Number.isFinite);
  if (numbers.length === 0) return "Capítulos";
  const [low, high] = [Math.min(...numbers), Math.max(...numbers)];
  return low === high ? `Capítulo ${low}` : `Capítulos ${low}–${high}`;
}

/** Newest-first chapters in, newest-first groups out (volumes, or blocks of 100). */
export function groupChapters(chapters: ChapterSummary[], novelTitle: string): ChapterGroup[] {
  const items = chapters.map((chapter) => toChapterItem(chapter, novelTitle));

  if (items.some((item) => item.volume)) {
    const byVolume = Map.groupBy(items, (item) => item.volume ?? "");
    return [...byVolume].map(([volume, grouped]) => ({
      key: `volume-${volume || "extras"}`,
      title: volume ? `Volume ${volume}` : "Extras",
      chapters: grouped,
    }));
  }

  const oldestFirst = items.toReversed();
  const groups: ChapterGroup[] = [];
  for (let start = 0; start < oldestFirst.length; start += RANGE_SIZE) {
    const block = oldestFirst.slice(start, start + RANGE_SIZE).toReversed();
    groups.push({ key: `range-${start}`, title: rangeTitle(block), chapters: block });
  }
  return groups.toReversed();
}
