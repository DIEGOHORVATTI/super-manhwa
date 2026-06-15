import path from "node:path";

/**
 * Mangafire signs every search/detail/chapter request with a `vrf` token,
 * computed by a ~300-line obfuscated crypto routine (RC4 + byte transforms).
 * That routine is bundled in the vendored `all/mangafire.js`. It runs fine in
 * a modern JS engine (Bun) but throws under our QuickJS sandbox | the class
 * uses arrow-function class fields (`add8 = (n) => …`) that QuickJS-emscripten
 * doesn't initialise.
 *
 * Rather than hand-port (and risk subtly breaking) the crypto, we load the
 * extension's own `DefaultExtension` class in native Bun and call its
 * `generate_vrf`. This reuses the exact upstream algorithm, so a re-sync of
 * `mangafire.js` automatically updates the signing too. Compiled once, cached.
 */

const VENDORED = path.join(
  import.meta.dir,
  "..",
  "..",
  "javascript",
  "manga",
  "src",
  "all",
  "mangafire.js",
);

interface VrfClass {
  source: { lang: string; baseUrl: string };
  generate_vrf(input: string): string;
}

let instance: VrfClass | null = null;

const loadInstance = async (): Promise<VrfClass> => {
  if (instance) return instance;
  const src = await Bun.file(VENDORED).text();
  const classBody = src.slice(src.indexOf("class DefaultExtension"));
  // `MProvider` is the runtime base class; an empty stub is enough | we only
  // call the self-contained crypto methods, which don't touch the base.
  const factory = new Function(
    `class MProvider {}\n${classBody}\nreturn DefaultExtension;`,
  ) as () => new () => VrfClass;
  const Ext = factory();
  const inst = new Ext();
  inst.source = { lang: "pt-br", baseUrl: "https://mangafire.to" };
  instance = inst;
  return inst;
};

/** Compute the Mangafire `vrf` signature for a given input string. */
export const generateVrf = async (input: string): Promise<string> => {
  const inst = await loadInstance();
  return inst.generate_vrf(input);
};
