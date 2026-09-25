import { load } from "cheerio";

import type { Genre, Novel, NovelPage, NovelStatus } from "./types";

const STATUS_BY_LABEL: Record<string, NovelStatus> = {
  "em andamento": "ongoing",
  completo: "completed",
  hiato: "hiatus",
};

export const STATUS_FILTER: Record<NovelStatus, string> = {
  ongoing: "em andamento",
  completed: "completo",
  hiatus: "hiato",
};

export function slugFromUrl(url: string): string {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
  } catch {
    return "";
  }
}

export function fullSizeCover(src?: string): string | undefined {
  if (!src) return undefined;
  return src.replace(/\?resize=\d+,\d+$/, "");
}

export function parseStatus(label?: string): NovelStatus | undefined {
  return label ? STATUS_BY_LABEL[label.trim().toLowerCase()] : undefined;
}

export function decodeEntities(text: string): string {
  return load(`<p>${text}</p>`)("p").text().replace(/\s+/g, " ").trim();
}

export function parseNovelList(html: string): NovelPage {
  const $ = load(html);
  const list = $(".listupd article.maindet")
    .toArray()
    .map((article) => {
      const card = $(article);
      const link = card.find(".mdinfo h2 a").first();
      const rating = Number.parseFloat(card.find(".mdminf").text().trim());
      return {
        slug: slugFromUrl(link.attr("href") ?? ""),
        title: link.text().trim(),
        cover: fullSizeCover(card.find(".mdthumb img").attr("src")),
        genres: card
          .find(".mdgenre a")
          .toArray()
          .map((genre) => $(genre).text().replace(/^#\s*/, "").trim()),
        excerpt: card.find(".contexcerpt").text().trim() || undefined,
        rating: Number.isFinite(rating) ? rating : undefined,
        latestChapter: card.find(".nchapter a").text().trim() || undefined,
      };
    })
    .filter((novel) => novel.slug && novel.title);

  const hasNextPage = $(".hpage a.r, a.next.page-numbers").length > 0;
  return { list, hasNextPage };
}

export function parseGenres(html: string): Genre[] {
  const $ = load(html);
  const genres = $('input[name="genre[]"]')
    .toArray()
    .map((input) => ({
      slug: $(input).attr("value") ?? "",
      name: $(`label[for="${$(input).attr("id")}"]`)
        .first()
        .text()
        .trim(),
    }))
    .filter((genre) => genre.slug && genre.name);

  return [...new Map(genres.map((genre) => [genre.slug, genre])).values()];
}

export function parseNovel(slug: string, html: string): Novel {
  const $ = load(html);
  const info = new Map(
    $(".info-content .spe > span")
      .toArray()
      .map((span) => {
        const label = $(span).find("b").first().text().replace(":", "").trim().toLowerCase();
        const value = $(span).clone().children("b").remove().end().text().trim();
        return [
          label,
          {
            value,
            links: $(span)
              .find("a")
              .toArray()
              .map((a) => $(a).text().trim()),
          },
        ];
      }),
  );

  const synopsis = $('.entry-content[itemprop="description"] p')
    .toArray()
    .map((paragraph) => $(paragraph).text().trim())
    .filter(Boolean)
    .join("\n\n");

  return {
    slug,
    title: $("h1.entry-title").first().text().trim(),
    cover: fullSizeCover($(".thumb img").first().attr("src")),
    synopsis: synopsis || undefined,
    altTitles: ($(".alter").first().text() || "")
      .split(/[,;]/)
      .map((title) => title.trim())
      .filter(Boolean),
    genres: $(".genxed a")
      .toArray()
      .map((a) => ({ slug: slugFromUrl($(a).attr("href") ?? ""), name: $(a).text().trim() })),
    status: parseStatus(info.get("status")?.value),
    author: info.get("autor")?.links.join(", ") || info.get("autor")?.value || undefined,
    types: info.get("tipo")?.links ?? [],
    year: info.get("lançamento")?.value || undefined,
  };
}

export function parseChapterParagraphs(html: string): string[] {
  const $ = load(html);
  $("sup, script, style, .code-block, ins").remove();
  return $("p")
    .toArray()
    .map((paragraph) => $(paragraph).text().replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export { chapterLabel } from "./labels";
