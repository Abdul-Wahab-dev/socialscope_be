import { ApiError } from '../utils/api-error';
import { logger } from './logger';

interface RequestOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  /** Sent as JSON unless `form` is true. */
  body?: Record<string, unknown>;
  form?: boolean;
  timeoutMs?: number;
}

/** Thin fetch wrapper used by third-party integrations. Normalises failures into ApiError(502). */
export async function httpRequest<T>(url: string, opts: RequestOptions = {}): Promise<T> {
  const u = new URL(url);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) u.searchParams.set(k, String(v));

  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
  let body: string | undefined;
  if (opts.body) {
    if (opts.form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(Object.entries(opts.body).map(([k, v]): [string, string] => [k, String(v)])).toString();
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }

  let res: Response;
  try {
    res = await fetch(u, { method: opts.method ?? 'GET', headers, body, signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000) });
  } catch (err) {
    logger.error(`HTTP request failed: ${u.origin}${u.pathname}`, err);
    throw ApiError.badGateway('Upstream service is unreachable');
  }

  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    logger.warn(`Upstream ${res.status} from ${u.origin}${u.pathname}`, json ?? text.slice(0, 300));
    throw ApiError.badGateway('Upstream service returned an error', { status: res.status });
  }
  return json as T;
}
