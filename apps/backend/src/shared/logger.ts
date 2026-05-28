import { isProduction } from "@/config/env";

/**
 * Tiny structured logger — JSON in production (Docker stdout → log aggregation),
 * pretty/coloured in dev. Adapted from `novo-horizonte/server/src/shared/logger.ts`.
 */
type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const RESET = "\x1b[0m";
const LEVEL_META: Record<LogLevel, { ansi: string; prefix: string }> = {
  debug: { prefix: "·", ansi: "\x1b[90m" }, // gray
  info: { prefix: "ℹ", ansi: "\x1b[36m" },  // cyan
  warn: { prefix: "!", ansi: "\x1b[33m" },  // yellow
  error: { prefix: "✖", ansi: "\x1b[31m" }, // red
};

const colorize = (ansi: string, text: string) => `${ansi}${text}${RESET}`;

const emit = (level: LogLevel, message: string, context?: LogContext) => {
  const timestamp = new Date();
  if (isProduction || process.env.LOG_FORMAT === "json") {
    process.stdout.write(JSON.stringify({
      level, message, timestamp: timestamp.toISOString(), ...context,
    }) + "\n");
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

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
} as const;
