import { redirect } from "next/navigation";

type SP = Promise<{ q?: string; genre?: string; status?: string; sort?: string; page?: string }>;

/**
 * `/explorar` is now the home page (`/`). This redirect preserves old links,
 * bookmarks and shared filter URLs by forwarding the querystring to `/`.
 */
export default async function ExplorarRedirect({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) params.set(k, v);
  const qs = params.toString();
  redirect(qs ? `/?${qs}` : "/");
}
