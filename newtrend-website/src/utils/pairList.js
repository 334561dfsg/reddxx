// Rows, filters and sorting for the trading pair list (PairList.vue: desktop pair panel and phone pair drawer).
import {tradeMarketCategories, tradeMarketCategory} from './tradeProducts.js'

/** One row per market with the latest pushed price/change when the all-markets stream has it. */
export function pairRows(markets, tickers) {
  return markets.map(market => {
    const quote = tickers?.[market.id], volume = Number(market.volume)
    return {
      id: market.id, name: market.name, symbol: market.symbol, category: tradeMarketCategory(market),
      volume: Number.isFinite(volume) && volume > 0 ? volume : null,
      price: quote?.price ?? market.price,
      change: quote ? Number(quote.change.toFixed(2)) : market.change,
    }
  })
}

/** 'all' plus every catalogue category that has at least one row, in catalogue order. */
export const pairTabs = rows => ['all', ...tradeMarketCategories.filter(category => rows.some(row => row.category === category))]

const compactName = text => text.toLowerCase().replace('/', '')

/**
 * Rows for the current tab ('all', 'favorites' or a category), search text (matches the pair name with or without the
 * slash) and sort ({key: ''|'name'|'volume'|'price'|'change', desc}). Missing values sort last; ties keep name order.
 */
export function filterPairs(rows, {tab = 'all', query = '', favorites = [], sort = {key: '', desc: true}} = {}) {
  const text = compactName(query.trim())
  let list = rows.filter(row =>
    (tab === 'all' || (tab === 'favorites' ? favorites.includes(row.id) : row.category === tab)) &&
    (!text || compactName(row.name).includes(text)))
  const {key, desc} = sort
  if (key) {
    const dir = desc ? -1 : 1
    list = [...list].sort((a, b) => key === 'name'
      ? dir * a.name.localeCompare(b.name)
      : dir * ((a[key] ?? -Infinity) - (b[key] ?? -Infinity)) || a.name.localeCompare(b.name))
  }
  return list
}

/** Header sort cycle: descending → ascending → original order. */
export const nextSort = (sort, key) => sort.key !== key ? {key, desc: true} : sort.desc ? {key, desc: false} : {key: '', desc: true}
