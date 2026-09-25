import type { BrowseState } from "@/components/novel/BrowseFilters";
import type { NovelSort, NovelStatus } from "./types";

const SORTS: NovelSort[] = ["popular", "update", "latest", "rating", "title"];
const STATUSES: NovelStatus[] = ["ongoing", "completed", "hiatus"];

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

export function parseBrowseState(params: RawParams): BrowseState {
  const status = first(params.status) as NovelStatus;
  const sort = first(params.sort) as NovelSort;
  return {
    q: first(params.q).trim(),
    genre: first(params.genre),
    status: STATUSES.includes(status) ? status : "",
    sort: SORTS.includes(sort) ? sort : "popular",
  };
}

export function toListParams(state: BrowseState): Record<string, string> {
  return Object.fromEntries(Object.entries(state).filter(([, value]) => value));
}
