import crypto from 'crypto';

/** Stable hash of an object regardless of key order (used to detect repeated searches). */
export function stableHash(obj: Record<string, unknown>): string {
  const normalise = (v: unknown): unknown => {
    if (Array.isArray(v)) return [...v].map(normalise).sort();
    if (v && typeof v === 'object') {
      return Object.keys(v as object)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          const val = (v as Record<string, unknown>)[k];
          if (val !== undefined && val !== null && val !== '') acc[k] = normalise(val);
          return acc;
        }, {});
    }
    return v;
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalise(obj))).digest('hex');
}

/** Start of the current ISO week (Monday 00:00 UTC). Weekly search quota resets here. */
export function startOfWeekUTC(date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Sunday -> 7
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Turns "Ali Khan!!" into "alikhan" (candidate for creator usernames). */
export function toUsernameCandidate(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 30);
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}
