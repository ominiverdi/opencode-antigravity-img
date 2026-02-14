import type { AccountsConfig, Account } from "./types";

export const MAX_RETRIES = 3;
export const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Select the least-recently-used account that is not rate-limited or excluded.
 * Returns null if no account is available.
 */
export function selectAccount(
  config: AccountsConfig,
  excludeEmails: string[] = [],
  now: number = Date.now()
): Account | null {
  const available = config.accounts.filter((a) => {
    if (excludeEmails.includes(a.email)) return false;
    if (a.rateLimitedUntil && a.rateLimitedUntil > now) return false;
    return true;
  });

  if (available.length === 0) return null;

  // Least recently used first (never-used accounts get top priority)
  available.sort((a, b) => (a.lastUsed || 0) - (b.lastUsed || 0));

  return available[0];
}

/**
 * Mark an account as recently used (mutates in place).
 */
export function markUsed(config: AccountsConfig, email: string, now: number = Date.now()): void {
  const account = config.accounts.find((a) => a.email === email);
  if (account) {
    account.lastUsed = now;
  }
}

/**
 * Mark an account as rate-limited with a cooldown (mutates in place).
 */
export function markRateLimited(
  config: AccountsConfig,
  email: string,
  now: number = Date.now()
): void {
  const account = config.accounts.find((a) => a.email === email);
  if (account) {
    account.rateLimitedUntil = now + RATE_LIMIT_COOLDOWN_MS;
  }
}
