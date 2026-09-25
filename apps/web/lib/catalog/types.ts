export type NovelStatus = "ongoing" | "completed" | "hiatus";

export type NovelSort = "popular" | "update" | "latest" | "rating" | "title";

export type Genre = { slug: string; name: string };

export type NovelSummary = {
  slug: string;
  title: string;
  cover?: string;
  genres: string[];
  excerpt?: string;
  rating?: number;
  latestChapter?: string;
};

export type NovelPage = { list: NovelSummary[]; hasNextPage: boolean };

export type Novel = {
  slug: string;
  title: string;
  cover?: string;
  synopsis?: string;
  altTitles: string[];
  genres: Genre[];
  status?: NovelStatus;
  author?: string;
  types: string[];
  year?: string;
};

export type ChapterSummary = {
  slug: string;
  title: string;
  date: string;
};

export type Chapter = ChapterSummary & {
  novelSlug?: string;
  paragraphs: string[];
};
