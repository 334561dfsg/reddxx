// Display helpers for the strategy admin pages (zh-CN grouping, 2 decimals for USDT).
export const amount = value => Number(value || 0).toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})
export const signed = value => (value > 0 ? '+' : value < 0 ? '−' : '') + amount(Math.abs(value))
export const dateTime = value => (value ? new Date(value).toLocaleString('zh-CN', {hour12: false}) : '—')
export const percent = (value, capital) => (capital ? (value / capital * 100).toFixed(2) + '%' : '—')
