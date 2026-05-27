/**
 * Backend implementation of the shared contract (ADR-0008 + GUIA-ORPC). oRPC lives
 * only here (transport layer). Handlers delegate to the loader + the generic
 * extension runtime — we write zero per-source business logic.
 */
import { implement, ORPCError } from "@orpc/server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import { ZodSmartCoercionPlugin } from "@orpc/zod";
import { contracts } from "../../../packages/contracts/src/index.js";
import { runExtension } from "../../../packages/extension-runtime/src/sandbox.js";
import { type SourceInfo, fetchCode, listAllSources, listSources, resolveSource } from "./loader.js";

const os = implement(contracts);

async function run<T>(sourceId: string, method: string, args: unknown[]): Promise<{ src: SourceInfo; out: T }> {
  const src = await resolveSource(sourceId);
  if (!src) throw new ORPCError("NOT_FOUND", { message: `Unknown source: ${sourceId}` });
  const code = await fetchCode(src.codeUrl);
  const out = await runExtension<T>({
    code, method, args,
    source: { lang: src.lang },
    cloudflare: src.hasCloudflare,
    timeoutMs: 25_000,
  });
  return { src, out };
}

const ref = (s: SourceInfo) => ({ id: s.id, name: s.name, lang: s.lang, hasCloudflare: s.hasCloudflare });

type Page = { list?: Array<{ name: string; link: string; imageUrl?: string }>; hasNextPage?: boolean };

export const router = {
  sources: {
    list: os.sources.list.handler(async ({ input }) => ({
      sources: input.all ? await listAllSources() : listSources(),
    })),
  },
  manga: {
    popular: os.manga.popular.handler(async ({ input }) => {
      const { src, out } = await run<Page>(input.source, "getPopular", [input.page]);
      return { source: ref(src), list: out.list ?? [], hasNextPage: !!out.hasNextPage };
    }),
    search: os.manga.search.handler(async ({ input }) => {
      const { src, out } = await run<Page>(input.source, "search", [input.q, input.page, []]);
      return { source: ref(src), list: out.list ?? [], hasNextPage: !!out.hasNextPage };
    }),
    detail: os.manga.detail.handler(async ({ input }) => {
      const { src, out } = await run<Record<string, unknown>>(input.source, "getDetail", [input.url]);
      return { source: ref(src), detail: out ?? {} };
    }),
    pages: os.manga.pages.handler(async ({ input }) => {
      const { src, out } = await run<Array<string | { url: string }>>(input.source, "getPageList", [input.url]);
      const pages = (Array.isArray(out) ? out : []).map((p) => (typeof p === "string" ? p : p.url));
      return { source: ref(src), pages };
    }),
  },
};

export const apiHandler = new OpenAPIHandler(router, {
  plugins: [
    new CORSPlugin({ origin: "*", allowMethods: ["GET", "OPTIONS"] }),
    new ZodSmartCoercionPlugin(),
  ],
});
