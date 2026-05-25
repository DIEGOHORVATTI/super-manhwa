// Formato exato observado na resposta de wp-manga-search-manga:
// {"success":true,"data":[{"title":"...","url":"...","type":"manga"}]}
export interface MangaResult {
  title: string;
  url: string;
  type: string;
}

export interface SearchResponse {
  success: boolean;
  data: MangaResult[];
}

// Um capítulo, extraído do HTML de /ajax/chapters/ do tema Madara.
export interface Chapter {
  title: string;
  url: string;
}
