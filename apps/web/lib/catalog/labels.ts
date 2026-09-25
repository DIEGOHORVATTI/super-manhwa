export function chapterLabel(chapterTitle: string, novelTitle = ""): string {
  if (!novelTitle || !chapterTitle.startsWith(novelTitle)) return chapterTitle;
  return chapterTitle.slice(novelTitle.length).replace(/^\s*[–—:-]\s*/, "") || chapterTitle;
}
