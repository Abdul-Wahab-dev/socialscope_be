/* Minimal structured logger. Swap for pino/winston later without touching call sites. */
type Level = 'debug' | 'info' | 'warn' | 'error';
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel: Level = (process.env.LOG_LEVEL as Level) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function write(level: Level, message: string, meta?: unknown) {
  if (order[level] < order[minLevel]) return;
  const line: Record<string, unknown> = { time: new Date().toISOString(), level, message };
  if (meta instanceof Error) line.error = { name: meta.name, message: meta.message, stack: meta.stack };
  else if (meta !== undefined) line.meta = meta;
  const out = process.env.NODE_ENV === 'production' ? JSON.stringify(line) : `[${line.time}] ${level.toUpperCase()} ${message}${meta !== undefined ? ' ' + (meta instanceof Error ? meta.stack : JSON.stringify(meta)) : ''}`;
  (level === 'error' || level === 'warn' ? console.error : console.log)(out);
}

export const logger = {
  debug: (msg: string, meta?: unknown) => write('debug', msg, meta),
  info: (msg: string, meta?: unknown) => write('info', msg, meta),
  warn: (msg: string, meta?: unknown) => write('warn', msg, meta),
  error: (msg: string, meta?: unknown) => write('error', msg, meta),
};
