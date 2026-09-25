import { describe, expect, test } from "bun:test";

import {
  chapterLabel,
  decodeEntities,
  parseChapterParagraphs,
  parseGenres,
  parseNovel,
  parseNovelList,
} from "@/lib/catalog/parse";

const card = (slug: string, title: string) => `
  <article class="maindet"><div class="inmain">
    <div class="mdthumb"><a href="https://centralnovel.com/series/${slug}/" class="tip">
      <img src="https://i2.wp.com/centralnovel.com/wp-content/uploads/${slug}.png?resize=151,215" />
    </a></div>
    <div class="mdinfo">
      <span class="mdgenre"><a href="/genre/acao/"># Ação</a> <a href="/genre/drama/"># Drama</a></span>
      <h2><a href="https://centralnovel.com/series/${slug}/" class="tip">${title}</a></h2>
      <div class="contexcerpt"><p>Sinopse curta&#8230;</p></div>
      <div class="mdinfodet"><span class="mdminf"><i></i> 9.5</span>
        <span class="nchapter"><a href="/x-capitulo-10/"><i></i> Vol. 1 Cap. 10</a></span></div>
    </div>
  </div></article>`;

describe("parseNovelList", () => {
  test("lê cards com slug, capa em tamanho cheio, gêneros e nota", () => {
    const html = `<div class="listupd">${card("obra-a-20260913", "Obra A")}${card("obra-b", "Obra B")}</div>
      <div class="hpage"><a href="?page=2" class="r">Próximo</a></div>`;
    const { list, hasNextPage } = parseNovelList(html);

    expect(hasNextPage).toBe(true);
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({
      slug: "obra-a-20260913",
      title: "Obra A",
      cover: "https://i2.wp.com/centralnovel.com/wp-content/uploads/obra-a-20260913.png",
      genres: ["Ação", "Drama"],
      excerpt: "Sinopse curta…",
      rating: 9.5,
      latestChapter: "Vol. 1 Cap. 10",
    });
  });

  test("ignora cards fora da listagem e detecta última página", () => {
    const html = `<div id="sidebar">${card("lateral", "Lateral")}</div><div class="listupd"></div>`;
    expect(parseNovelList(html)).toEqual({ list: [], hasNextPage: false });
  });
});

test("parseGenres remove duplicados dos dois formulários de filtro", () => {
  const filter = `<input type="checkbox" id="genre-acao" name="genre[]" value="acao"><label for="genre-acao">Ação</label>`;
  expect(parseGenres(filter + filter)).toEqual([{ slug: "acao", name: "Ação" }]);
});

test("parseNovel lê título, capa, sinopse, status, autor e gêneros", () => {
  const html = `
    <div class="thumb"><img src="https://x/capa.png?resize=370,500" /></div>
    <h1 class="entry-title">Shadow Slave</h1>
    <span class="alter">Escravo das Sombras, Slave of Shadows</span>
    <div class="info-content"><div class="spe">
      <span><b>Status:</b> Em andamento</span>
      <span><b>Tipo:</b> <a href="/type/webnovel/">Webnovel</a></span>
      <span><b>Autor:</b> <a href="/writer/g/">Guiltythree</a></span>
      <span class="split"><b>Lançamento:</b> 2022</span>
    </div></div>
    <div class="genxed"><a href="https://centralnovel.com/genre/acao/">Ação</a></div>
    <div class="entry-content" itemprop="description"><p>Primeiro.</p><p>Segundo.</p></div>`;

  expect(parseNovel("shadow-slave", html)).toEqual({
    slug: "shadow-slave",
    title: "Shadow Slave",
    cover: "https://x/capa.png",
    synopsis: "Primeiro.\n\nSegundo.",
    altTitles: ["Escravo das Sombras", "Slave of Shadows"],
    genres: [{ slug: "acao", name: "Ação" }],
    status: "ongoing",
    author: "Guiltythree",
    types: ["Webnovel"],
    year: "2022",
  });
});

test("parseChapterParagraphs remove notas de rodapé e parágrafos vazios", () => {
  const html = `<div><p>— Olá<sup>1</sup> — disse ela.</p><p> </p><p>Fim.</p></div>`;
  expect(parseChapterParagraphs(html)).toEqual(["— Olá — disse ela.", "Fim."]);
});

test("chapterLabel tira o nome da obra do título do capítulo", () => {
  expect(chapterLabel("Obra X – Volume 1 – Capítulo 2", "Obra X")).toBe("Volume 1 – Capítulo 2");
  expect(chapterLabel("Capítulo 5", "Obra X")).toBe("Capítulo 5");
});

test("decodeEntities decodifica e normaliza espaços dos títulos do WordPress", () => {
  expect(decodeEntities("Mushoku Tensei:  Jobless &#8211;\n  Volume 1")).toBe(
    "Mushoku Tensei: Jobless – Volume 1",
  );
});
