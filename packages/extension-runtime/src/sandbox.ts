/**
 * Sandbox runner (ADR-0004): executes a Mangayomi-format extension inside a
 * SYNCHRONOUS QuickJS (WASM) isolate, driving network from the host.
 *
 * Why sync + host-driven promises (not asyncify): quickjs-emscripten's asyncify
 * can only suspend the VM for ONE host call made before the first VM-level `await`;
 * any host call reached from an await-continuation job crashes ("call_indirect
 * signature mismatch") or hangs. So instead the VM creates a Promise per request,
 * the host runs the real `fetch()` on its own event loop, then pushes the result
 * back into the VM (`__resolveFetch`/`__rejectFetch`) and pumps the VM job queue.
 * This handles unlimited sequential/parallel fetches and stays in-process (no
 * workers, no subprocesses) — keeping the backend lightweight (ADR-0007).
 */
import {
  newQuickJSWASMModuleFromVariant,
  type QuickJSContext,
  type QuickJSHandle,
  type QuickJSWASMModule,
} from "quickjs-emscripten-core";
// Singlefile variant: the WASM is embedded as base64, so there is no separate
// .wasm file to trace/bundle — reliable on Vercel serverless (ADR-0007).
import variant from "@jitl/quickjs-singlefile-cjs-release-sync";
import { PRELUDE } from "./prelude";
import {
  DomStore,
  hostFetch,
  hostPrefGet,
  aesEncryptCryptoJS,
  aesDecryptCryptoJS,
  cryptoHandler,
  unpackJs,
  type HostRequest,
} from "./host";

// Load the WASM module once and reuse across runs.
let modulePromise: Promise<QuickJSWASMModule> | undefined;
function getModule(): Promise<QuickJSWASMModule> {
  return (modulePromise ??= newQuickJSWASMModuleFromVariant(variant));
}

export interface RunOptions {
  /** Raw extension source (the `.js` file content). */
  code: string;
  /** Method to invoke, e.g. "getPopular". */
  method: string;
  /** Arguments for the method, e.g. [1]. */
  args: unknown[];
  /** Fields merged over the extension's own `mangayomiSources[0]` (e.g. { lang }). */
  source?: Record<string, unknown>;
  onLog?: (level: string, msg: string) => void;
  /** Overall wall-clock budget for the extension run. */
  timeoutMs?: number;
  /** Route host fetches through the Cloudflare solver (ADR-0005) if configured. */
  cloudflare?: boolean;
}

interface RunnerResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
  stack?: string | null;
}

type Inflight = { id: number; ok: boolean; raw?: string; err?: string };

export async function runExtension<T = unknown>(opts: RunOptions): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const QuickJS = await getModule();
  const ctx = QuickJS.newContext();

  let settled: RunnerResult<T> | undefined;
  const inflight = new Map<number, Promise<Inflight>>();
  const handles: QuickJSHandle[] = [];
  const dom = new DomStore();

  const reg = (name: string, fn: Parameters<QuickJSContext["newFunction"]>[1]) => {
    const h = ctx.newFunction(name, fn);
    ctx.setProp(ctx.global, name, h);
    h.dispose();
  };

  const pump = () => {
    while (ctx.runtime.hasPendingJob()) {
      const jobs = ctx.runtime.executePendingJobs();
      if (jobs.error) {
        const err = ctx.dump(jobs.error);
        jobs.error.dispose();
        throw new Error("Sandbox job error: " + JSON.stringify(err));
      }
    }
  };

  try {
    reg("__hostLog", (levelH, msgH) => {
      (opts.onLog ?? ((l, m) => console.log(`[ext:${l}]`, m)))(
        ctx.getString(levelH),
        ctx.getString(msgH),
      );
    });
    reg("__hostPrefGet", (keyH) => {
      const v = hostPrefGet(ctx.getString(keyH));
      return v === undefined ? ctx.undefined : ctx.newString(JSON.stringify(v));
    });
    reg("__hostDone", (jsonH) => {
      settled = JSON.parse(ctx.getString(jsonH)) as RunnerResult<T>;
    });

    // --- host: crypto (utils.dart) ---
    reg("__aesEncrypt", (pH, passH) =>
      ctx.newString(aesEncryptCryptoJS(ctx.getString(pH), ctx.getString(passH))),
    );
    reg("__aesDecrypt", (eH, passH) =>
      ctx.newString(aesDecryptCryptoJS(ctx.getString(eH), ctx.getString(passH))),
    );
    reg("__cryptoHandler", (tH, ivH, kH, encH) =>
      ctx.newString(
        cryptoHandler(
          ctx.getString(tH),
          ctx.getString(ivH),
          ctx.getString(kH),
          ctx.dump(encH) === true,
        ),
      ),
    );
    reg("__unpackJs", (sH) => ctx.newString(unpackJs(ctx.getString(sH))));
    // --- host: HTML DOM (cheerio) ---
    reg("__domParse", (htmlH) => ctx.newNumber(dom.parse(ctx.getString(htmlH))));
    reg("__domSelect", (idH, selH) =>
      ctx.newString(JSON.stringify(dom.selectAll(ctx.getNumber(idH), ctx.getString(selH)))),
    );
    reg("__domSelectFirst", (idH, selH) => {
      const r = dom.selectFirst(ctx.getNumber(idH), ctx.getString(selH));
      return r === null ? ctx.undefined : ctx.newNumber(r);
    });
    reg("__domById", (idH, eidH) => {
      const r = dom.byId(ctx.getNumber(idH), ctx.getString(eidH));
      return r === null ? ctx.undefined : ctx.newNumber(r);
    });
    reg("__domByClass", (idH, cH) =>
      ctx.newString(JSON.stringify(dom.byClass(ctx.getNumber(idH), ctx.getString(cH)))),
    );
    reg("__domByTag", (idH, tH) =>
      ctx.newString(JSON.stringify(dom.byTag(ctx.getNumber(idH), ctx.getString(tH)))),
    );
    reg("__domText", (idH) => ctx.newString(dom.text(ctx.getNumber(idH))));
    reg("__domAttr", (idH, nameH) =>
      ctx.newString(dom.attr(ctx.getNumber(idH), ctx.getString(nameH))),
    );
    reg("__domHasAttr", (idH, nameH) =>
      ctx.newNumber(dom.hasAttr(ctx.getNumber(idH), ctx.getString(nameH)) ? 1 : 0),
    );
    reg("__domHtml", (idH) => ctx.newString(dom.html(ctx.getNumber(idH))));
    reg("__domOuterHtml", (idH) => ctx.newString(dom.outerHtml(ctx.getNumber(idH))));

    reg("__hostFetchStart", (idH, reqH) => {
      const id = ctx.getNumber(idH);
      const req = JSON.parse(ctx.getString(reqH)) as HostRequest;
      inflight.set(
        id,
        hostFetch(req, { cloudflare: opts.cloudflare }).then(
          (res): Inflight => ({ id, ok: true, raw: JSON.stringify(res) }),
          (e): Inflight => ({ id, ok: false, err: String(e) }),
        ),
      );
    });

    const runner = [
      PRELUDE,
      opts.code,
      ";(async () => {",
      "  try {",
      "    var __meta = (typeof mangayomiSources !== 'undefined' && mangayomiSources[0]) ? mangayomiSources[0] : {};",
      `    globalThis.__SOURCE = Object.assign({}, __meta, ${JSON.stringify(opts.source ?? {})});`,
      "    var __inst = new DefaultExtension();",
      "    try { if (typeof __inst.getSourcePreferences === 'function') globalThis.__PREFS = __extractPrefDefaults(__inst.getSourcePreferences()); } catch (e) {}",
      `    var __method = ${JSON.stringify(opts.method)};`,
      `    var __args = ${JSON.stringify(opts.args)};`,
      // Most search() implementations expect the source's own filter list (with
      // default states); supply it when the caller passed none.
      "    if (__method === 'search' && (!__args[2] || __args[2].length === 0) && typeof __inst.getFilterList === 'function') {",
      "      try { __args[2] = __inst.getFilterList(); } catch (e) {}",
      "    }",
      "    var __out = await __inst[__method](...__args);",
      "    __hostDone(JSON.stringify({ ok: true, value: __out }));",
      "  } catch (e) {",
      "    __hostDone(JSON.stringify({ ok: false, error: String(e), stack: (e && e.stack) || null }));",
      "  }",
      "})()",
    ].join("\n");

    const evalResult = ctx.evalCode(runner);
    if (evalResult.error) {
      const err = ctx.dump(evalResult.error);
      evalResult.error.dispose();
      throw new Error("Sandbox eval error: " + JSON.stringify(err));
    }
    evalResult.value.dispose();

    // Cache the VM-side promise resolvers.
    const resolveFetch = ctx.getProp(ctx.global, "__resolveFetch");
    const rejectFetch = ctx.getProp(ctx.global, "__rejectFetch");
    handles.push(resolveFetch, rejectFetch);

    pump(); // run synchronous prefix; queues the first fetch(es)

    const deadline = Date.now() + timeoutMs;
    while (!settled) {
      if (inflight.size === 0) {
        // No outstanding I/O and no result: either finished or stuck.
        if (!ctx.runtime.hasPendingJob()) break;
        pump();
        continue;
      }
      if (Date.now() > deadline) throw new Error(`Extension timed out after ${timeoutMs}ms`);

      const winner = await Promise.race(inflight.values());
      inflight.delete(winner.id);

      const idH = ctx.newNumber(winner.id);
      const payloadH = ctx.newString(winner.ok ? winner.raw! : winner.err!);
      const call = ctx.callFunction(
        winner.ok ? resolveFetch : rejectFetch,
        ctx.undefined,
        idH,
        payloadH,
      );
      idH.dispose();
      payloadH.dispose();
      if (call.error) {
        const err = ctx.dump(call.error);
        call.error.dispose();
        throw new Error("Sandbox resolve error: " + JSON.stringify(err));
      }
      call.value.dispose();

      pump(); // run the continuation (may queue more fetches)
    }

    if (!settled) throw new Error("Extension finished without producing a result");
    if (!settled.ok) {
      throw new Error(
        "Extension error: " + settled.error + (settled.stack ? "\n" + settled.stack : ""),
      );
    }
    return settled.value as T;
  } finally {
    dom.dispose();
    for (const h of handles) h.dispose();
    ctx.dispose();
  }
}
