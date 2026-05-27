/** Route a remote image through the backend proxy (adds Referer + CORS). */
export const img = (source: string, url?: string) =>
  url ? `/api/img?source=${source}&url=${encodeURIComponent(url)}` : "";

const STATUS: Record<number, string> = {
  0: "Em andamento",
  1: "Completo",
  2: "Hiato",
  3: "Cancelado",
  4: "Publicação finalizada",
};
export const statusLabel = (s?: number) => (s != null ? STATUS[s] ?? "—" : "—");

export const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === "string" ? e : "Falha na requisição.";
