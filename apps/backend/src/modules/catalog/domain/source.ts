/**
 * A Mangayomi-compatible source (extension). The frontend never sees this type;
 * sources exist only inside the catalog module to be iterated by aggregation
 * and resolved by id when decoding an opaque manga/chapter/image reference.
 */
export type Source = {
  id: string;
  name: string;
  lang: string;
  baseUrl: string;
  iconUrl: string;
  codeUrl: string;
  hasCloudflare: boolean;
  isNsfw: boolean;
  featured?: boolean;
};

export type SourceRegistry = {
  /** All curated sources we actively aggregate from. */
  listCurated(): readonly Source[];
  /** Resolve a source by id — curated first, then the dynamic upstream index. */
  resolve(id: string): Promise<Source | undefined>;
};
