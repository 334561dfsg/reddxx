// "2 hours ago" in the reader's language (Intl, so no per-locale strings are needed); older than a week shows the date.
export function relativeTime(at, locale, now = Date.now()) {
  const seconds = Math.round((at - now) / 1000), abs = Math.abs(seconds)
  const rtf = new Intl.RelativeTimeFormat(locale, {numeric: 'auto'})
  if (abs < 60) return rtf.format(0, 'second')
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour')
  if (abs < 7 * 86400) return rtf.format(Math.round(seconds / 86400), 'day')
  return new Intl.DateTimeFormat(locale, {year: 'numeric', month: '2-digit', day: '2-digit'}).format(at)
}
