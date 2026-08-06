type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = Readonly<Record<string, unknown>>;
export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}
export function createLogger(correlationId: string): Logger {
  const log = (level: LogLevel, message: string, context: LogContext = {}): void => {
    const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, correlationId, message, ...context });
    (level === "error" ? process.stderr : process.stdout).write(`${entry}\n`);
  };
  return {
    debug: (message, context) => log("debug", message, context),
    info: (message, context) => log("info", message, context),
    warn: (message, context) => log("warn", message, context),
    error: (message, context) => log("error", message, context),
  };
}
