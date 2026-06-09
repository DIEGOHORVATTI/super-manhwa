/**
 * Minimal Drizzle-shaped fake for handler integration tests. Every builder
 * method (`select`, `from`, `where`, `insert`, `values`, `returning`, `update`,
 * `set`, `limit`, `onConflictDoUpdate`, …) returns the same chainable proxy, and
 * awaiting the chain resolves to the next queued result (FIFO).
 *
 * Order the `results` array to match the sequence of awaited queries in the
 * handler under test. A terminal await (e.g. `await db.select()...limit(1)` or
 * `await db.insert()...returning()`) consumes one entry.
 */
export function makeFakeDb(results: unknown[] = []) {
  let i = 0;
  const next = () => (i < results.length ? results[i++] : []);

  const handler: ProxyHandler<() => void> = {
    get(_t, prop) {
      // Make the chain awaitable: resolve to the next queued result.
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(next());
      }
      // Any other property is a chainable builder method.
      return () => proxy;
    },
    apply() {
      return proxy;
    },
  };
  // biome-ignore lint/complexity/noBannedTypes: proxy target must be callable
  const proxy: any = new Proxy(function () {}, handler);
  return { db: proxy, consumed: () => i };
}
