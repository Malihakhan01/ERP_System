// lib/utils/format.ts
// Shared formatting utilities — currency, dates, numbers

/**
 * Format a number as Pakistani Rupee currency.
 * Locale can be overridden for other markets.
 */
export function formatCurrency(
  amount: number,
  currency = "PKR",
  locale = "en-PK"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPKR(amount: number): string {
  return `PKR ${Math.round(amount || 0).toLocaleString("en-PK")}`;
}

/**
 * Format a number with thousands separators.
 */
export function formatNumber(n: number, locale = "en-PK"): string {
  return new Intl.NumberFormat(locale).format(n);
}

/**
 * Format a date as a human-readable string.
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-PK", options).format(d);
}

/**
 * Format a date + time.
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Return a relative time string (e.g. "2 hours ago").
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffSecs) < 60) return rtf.format(-diffSecs, "second");
  if (Math.abs(diffMins) < 60) return rtf.format(-diffMins, "minute");
  if (Math.abs(diffHours) < 24) return rtf.format(-diffHours, "hour");
  return rtf.format(-diffDays, "day");
}

/**
 * Truncate a string to a max length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Convert a number to a compact representation (1K, 1M, etc.)
 */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(n);
}
