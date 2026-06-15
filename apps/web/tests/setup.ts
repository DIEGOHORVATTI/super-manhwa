import { mock } from "bun:test";

/**
 * Test preload. `server-only` is a Next-provided marker package (not in
 * node_modules); in the bun test runtime it doesn't resolve, so we stub it to an
 * empty module. This lets us import any `lib/*` / route handler that guards
 * itself with `import "server-only"` without pulling in the Next bundler.
 */
mock.module("server-only", () => ({}));
