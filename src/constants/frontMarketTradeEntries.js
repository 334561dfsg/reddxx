import { TRADE_PRODUCT_MODE_META } from './frontNav.js'

const DEFAULT_TRADE_MODES = ['perpetual']
const SUPPORTED_TRADE_MODES = ['spot', 'perpetual', 'delivery']

export function normalizeFrontMarketTradeModes(row) {
  const modes = Array.isArray(row?.tradeModes) ? row.tradeModes : DEFAULT_TRADE_MODES
  const unique = []
  for (const mode of modes) {
    if (!SUPPORTED_TRADE_MODES.includes(mode) || unique.includes(mode)) continue
    unique.push(mode)
  }
  return unique.length ? unique : DEFAULT_TRADE_MODES
}

export function frontMarketPairQuery(row) {
  const base = String(row?.base || row?.symbol || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/\//g, '-')
    .replace(/_/g, '-')
  const quote = String(row?.quote || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
  if (quote && !base.includes('-')) return `${base}-${quote}`
  return base
}

export function buildFrontMarketTradeEntries(prefix, row) {
  const assetClass = row?.assetClass || 'crypto'
  const pair = frontMarketPairQuery(row)
  return normalizeFrontMarketTradeModes(row).map((mode) => ({
    key: mode,
    label: TRADE_PRODUCT_MODE_META[mode]?.label || mode,
    to: `${prefix}/trade/${assetClass}/${mode}${pair ? `?pair=${encodeURIComponent(pair)}` : ''}`
  }))
}
