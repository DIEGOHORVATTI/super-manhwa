import { isProduction } from "@/config/env";

/**
 * Tiny structured logger — JSON in production (Docker stdout → log aggregation),
 * pretty/coloured in dev. Adapted from `novo-horizonte/server/src/shared/logger.ts`.
 */
type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const RESET = "\x1b[0m";
const GRAY = "\x1b[90m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const BLUE = "\x1b[34m";

const LEVEL_META: Record<LogLevel, { ansi: string; prefix: string }> = {
  debug: { prefix: "·", ansi: GRAY },
  info: { prefix: "ℹ", ansi: CYAN },
  warn: { prefix: "!", ansi: YELLOW },
  error: { prefix: "✖", ansi: RED },
};

const colorize = (ansi: string, text: string) => `${ansi}${text}${RESET}`;

/** Per-verb tint so the method column scans at a glance. */
const VERB_ANSI: Record<string, string> = {
  GET: GREEN,
  POST: BLUE,
  PUT: YELLOW,
  PATCH: YELLOW,
  DELETE: RED,
  HEAD: GRAY,
  OPTIONS: GRAY,
};

/** HTTP status → colour by class (5xx red, 4xx yellow, 3xx cyan, 2xx green). */
const statusAnsi = (status?: number): string => {
  if (status == null) return GRAY;
  if (status >= 500) return RED;
  if (status >= 400) return YELLOW;
  if (status >= 300) return CYAN;
  return GREEN;
};

/** Human duration: sub-second in ms, otherwise seconds with two decimals. */
const fmtDuration = (ms: number): string => (ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`);

/** Requests slower than this are tinted to stand out in the dev stream. */
const SLOW_MS = 1_000;
/** Max chars of a logged JSON body before clipping (lists like chapters are huge). */
const MAX_BODY = 3_000;
const clipBody = (s: string) => (s.length > MAX_BODY ? `${s.slice(0, MAX_BODY)}…` : s);

export type HttpLog = {
  method: string;
  path: string;
  /** Route input — decoded query string (GET) or body preview (mutations). */
  input?: string;
  /** Parsed JSON response body — pretty-printed under the line in dev. */
  output?: unknown;
  ms: number;
  status?: number;
  /** False when no route matched the request (renders as `unmatched`). */
  matched?: boolean;
  error?: string;
};

const emit = (level: LogLevel, message: string, context?: LogContext) => {
  const timestamp = new Date();
  if (isProduction || process.env.LOG_FORMAT === "json") {
    process.stdout.write(
      JSON.stringify({
        level,
        message,
        timestamp: timestamp.toISOString(),
        ...context,
      }) + "\n",
    );
    return;
  }
  const { prefix, ansi } = LEVEL_META[level];
  const tag = colorize(ansi, `${prefix} ${level.padEnd(5)}`);
  const ts = colorize("\x1b[90m", timestamp.toTimeString().slice(0, 8));
  const msg = level === "error" ? colorize("\x1b[31m", message) : message;
  const meta = context
    ? "\n  " + colorize("\x1b[90m", JSON.stringify(context, null, 2).replace(/\n/g, "\n  "))
    : "";
  process.stdout.write(`${ts} ${tag} ${msg}${meta}\n`);
};

/**
 * Render one line per request for the dev stream — a GET conceptually goes in
 * and comes back as one thing, so we log it once on completion, e.g.
 *   `09:06:43 GET    /manga/core ?id=30002  200 284ms  core lang=pt-br`
 *   `09:06:43 GET    /manga/chapters  200 40.27s  chapters:107 (mangafire-ptbr:60) lang=pt-br`
 *   `09:06:43 GET    /manga/pages  500 1.20s  flaresolverr 500`
 */
const emitHttpPretty = (e: HttpLog) => {
  const ts = colorize(GRAY, new Date().toTimeString().slice(0, 8));
  const verb = colorize(VERB_ANSI[e.method] ?? RESET, e.method.padEnd(6));
  const input = e.input ? ` ${colorize(GRAY, e.input)}` : "";
  // A thrown error has no status — treat it as a 5xx so the line reads red.
  const tone = e.error ? RED : statusAnsi(e.status);
  const status = colorize(tone, e.status ? String(e.status) : e.error ? "ERR" : "---");
  const dur = ` ${colorize(e.ms >= SLOW_MS ? YELLOW : GRAY, fmtDuration(e.ms))}`;
  const tail = e.error
    ? `  ${colorize(RED, e.error)}`
    : e.matched === false
      ? `  ${colorize(YELLOW, "unmatched")}`
      : "";
  process.stdout.write(`${ts} ${verb} ${e.path}${input}  ${status}${dur}${tail}\n`);

  // The JSON response body, pretty-printed and indented underneath — like `jq`.
  if (e.output !== undefined && !e.error && e.matched !== false) {
    const body = clipBody(JSON.stringify(e.output, null, 2)).replace(/^/gm, "  ");
    process.stdout.write(`${colorize(GRAY, body)}\n`);
  }
};

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
  /**
   * One structured access-log line per request. In prod (or `LOG_FORMAT=json`)
   * it emits a JSON line at a status-derived level (5xx/error → error, 4xx →
   * warn, else info) for aggregators; in dev a compact coloured single line.
   */
  http: (e: HttpLog) => {
    if (isProduction || process.env.LOG_FORMAT === "json") {
      const level: LogLevel =
        e.error || (e.status ?? 0) >= 500 ? "error" : (e.status ?? 0) >= 400 ? "warn" : "info";
      emit(level, "http", {
        method: e.method,
        path: e.path,
        ...(e.input ? { input: e.input } : {}),
        ...(e.output !== undefined ? { output: clipBody(JSON.stringify(e.output)) } : {}),
        ms: e.ms,
        ...(e.status != null ? { status: e.status } : {}),
        ...(e.matched != null ? { matched: e.matched } : {}),
        ...(e.error ? { error: e.error } : {}),
      });
      return;
    }
    emitHttpPretty(e);
  },
} as const;
