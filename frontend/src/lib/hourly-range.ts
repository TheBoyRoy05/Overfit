/**
 * Format and parse hourly range for display/manual input.
 * Parsing is minimal (plain numbers only) - full parsing is done on the backend.
 */

/** Format [83.65] or [23, 42] for display */
export function formatHourlyRange(arr: number[] | null): string {
  if (!arr?.length) return "";
  if (arr.length === 1 || arr[0] === arr[1]) return arr[0].toFixed(2);
  return `${arr[0].toFixed(2)} - ${arr[1].toFixed(2)}`;
}

/** Parse manual input like "23.25 - 42.75" or "23.25" to number[] */
export function parseManualHourlyRange(text: string): number[] | null {
  const num = (s: string) => parseFloat(s.replace(/,/g, "")) || 0;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const rangeRe = /([\d,]+(?:\.\d+)?)\s*[-–—]\s*([\d,]+(?:\.\d+)?)/;
  const range = trimmed.match(rangeRe);
  if (range) {
    const lo = round2(num(range[1]));
    const hi = round2(num(range[2]));
    if (lo > 0 && hi > 0) return [Math.min(lo, hi), Math.max(lo, hi)];
  }

  const singleRe = /([\d,]+(?:\.\d+)?)/;
  const single = trimmed.match(singleRe);
  if (single) {
    const v = round2(num(single[1]));
    if (v > 0 && v < 10000) return [v];
  }

  return null;
}
