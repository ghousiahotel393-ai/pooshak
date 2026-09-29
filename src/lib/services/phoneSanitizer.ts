/**
 * Phone Sanitizer Utility
 * Prevents numeric coercion bugs (e.g. 3224444692.0 -> 03224444692).
 * Preserves leading zero for mobile numbers and cleans trailing decimals.
 */

export function cleanStorePhone(raw: any): string {
  if (raw === null || raw === undefined) return '';
  let s = String(raw).trim();
  if (!s) return '';

  // Strip accidental trailing float decimals (.0, .00, etc.)
  s = s.replace(/\.0+$/, '');

  // If 10-digit mobile number missing national leading zero (e.g. 3224444692, 3021234567, 3241445512)
  if (/^3\d{9}$/.test(s)) {
    s = '0' + s;
  }

  return s;
}
