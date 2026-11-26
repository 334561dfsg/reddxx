// Shared display formatting for the public site. Pure functions (locale passed in), so they work in tests too.
// Site convention: amounts use en-US grouping; dates show in Asia/Manila time (the reference's display zone).
export const SITE_TIME_ZONE = 'Asia/Manila'

const n = value => Number(value)

/** Fixed two decimals: 1,234.50 */
export const money = value => n(value).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
/** Up to two decimals, no forced zeros: 4,999 / 21.9 */
export const amount = value => n(value).toLocaleString('en-US', {maximumFractionDigits: 2})
/** Explicit sign, two decimals: +12.40 / -8.50 / 0.00 */
export const signedMoney = value => (n(value) > 0 ? '+' : n(value) < 0 ? '-' : '') + money(Math.abs(n(value)))

/** Locale date + time (minutes) in the site time zone; '—' when missing. */
export function dateTime(value, locale = 'en-US') {
  if (value == null || value === '' || Number.isNaN(new Date(value).getTime())) return '—'
  return new Date(value).toLocaleString(locale, {timeZone: SITE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false})
}
/** Trading-record style 2026-11-26 14:05:09 in the site time zone; '—' when missing. */
export function isoDateTime(value) {
  if (value == null || value === '' || Number.isNaN(new Date(value).getTime())) return '—'
  return new Intl.DateTimeFormat('sv-SE', {timeZone: SITE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false}).format(new Date(value))
}
