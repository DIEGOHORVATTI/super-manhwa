import { expect, test } from "bun:test";

import { groupChapters, toChapterItem } from "@/lib/catalog/chapter-groups";

const chapter = (title: string, slug = title) => ({ slug, title, date: "2026-01-01T00:00:00" });

test("separa volume, número e nome do capítulo", () => {
  const novel = "Mushoku Tensei";
  expect(toChapterItem(chapter("Mushoku Tensei – Volume 16 – Capítulo 4"), novel)).toMatchObject({
    volume: "16",
    number: "4",
    name: "Capítulo 4",
  });
  expect(toChapterItem(chapter("Mushoku Tensei – Volume 3 – Capítulo 2,5"), novel).number).toBe(
    "2.5",
  );
  expect(toChapterItem(chapter("Mushoku Tensei – Volume 3 – Extra"), novel)).toMatchObject({
    volume: "3",
    number: undefined,
    name: "Extra",
  });
});

test("obra com volumes agrupa por volume, mais novo primeiro", () => {
  const groups = groupChapters(
    [
      chapter("X – Volume 2 – Capítulo 1"),
      chapter("X – Volume 1 – Epílogo"),
      chapter("X – Volume 1 – Capítulo 2"),
      chapter("X – Volume 1 – Capítulo 1"),
    ],
    "X",
  );
  expect(groups.map((group) => [group.title, group.chapters.length])).toEqual([
    ["Volume 2", 1],
    ["Volume 1", 3],
  ]);
});

test("obra sem volumes agrupa em blocos de 100 a partir do primeiro capítulo", () => {
  const chapters = Array.from({ length: 250 }, (_, index) =>
    chapter(`Y – Capítulo ${250 - index}`),
  );
  const groups = groupChapters(chapters, "Y");
  expect(groups.map((group) => group.title)).toEqual([
    "Capítulos 201–250",
    "Capítulos 101–200",
    "Capítulos 1–100",
  ]);
  expect(groups[0].chapters[0].number).toBe("250");
});
