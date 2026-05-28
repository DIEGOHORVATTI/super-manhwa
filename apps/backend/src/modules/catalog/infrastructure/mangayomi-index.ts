/**
 * Shape of `index.json` from the kodjodevf/mangayomi-extensions repo. Only the
 * fields we actually read are typed; any extra fields the upstream might add
 * are tolerated by the structural type.
 *
 * @see https://github.com/kodjodevf/mangayomi-extensions/blob/main/index.json
 */

/** `0` = manga, `1` = anime/novel (we filter to 0 only). */
export type MangayomiItemType = 0 | 1 | 2;

/** `1` = JavaScript (vs Dart). We only support JS. */
export type MangayomiSourceCodeLanguage = 0 | 1;

export type MangayomiIndexEntry = {
  id: number;
  name: string;
  lang: string;
  /** Raw URL to the extension's JS source. */
  sourceCodeUrl: string;
  sourceCodeLanguage: MangayomiSourceCodeLanguage;
  itemType: MangayomiItemType;
  baseUrl?: string;
  iconUrl?: string;
  hasCloudflare?: boolean;
  isNsfw?: boolean;
  /** Other extension-author metadata we don't currently consume. */
  apiUrl?: string;
  version?: string;
  versionCode?: number;
  versionLast?: string;
  isFullData?: boolean;
  isManga?: boolean;
  isPinned?: boolean;
  isAdded?: boolean;
  notes?: string;
  appMinVerReq?: string;
  additionalParams?: string;
  isObsolete?: boolean;
};

export type MangayomiIndex = MangayomiIndexEntry[];
