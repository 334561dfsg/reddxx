// The site's market stream: marketStreamService bound to the trading catalogue. Debug switches (read once from the
// URL, like the HTTP transport): ?mock-fail=market never connects (keeps reconnecting); ?mock-stream=flaky drops
// the connection every 20 s; ?mock-delay=<ms> also sets the connect/snapshot latency.
import {hotStocks, markets, tradingMarkets} from '../data.js'
import {createMarketStream} from './marketStreamService.js'
import {setLivePrices} from '../mock/prices.js'

const query = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams()
const fail = (query.get('mock-fail') || '').split(',').some(name => ['market', 'all'].includes(name.trim()))
const delay = query.get('mock-delay')
const latency = delay !== null && Number(delay) >= 0 ? () => Number(delay) : () => 300 + Math.random() * 500

// One catalogue for the whole site: every home/market-list instrument plus the trading-only energy quotes. Hot stocks
// start from their published card values so the home cards open where they always did.
const hot = Object.fromEntries(hotStocks.map(([symbol, price, , change]) => [symbol, {price: Number(price), change: Number(change.replace('%', ''))}]))
export const streamMarkets = [...new Map([...markets, ...tradingMarkets].map(m => [m.id, {...m, ...hot[m.symbol]}])).values()]

export const marketStream = createMarketStream({markets: streamMarkets, latency, fail, flaky: query.get('mock-stream') === 'flaky'})
// Valuation everywhere follows the live stream once a quote has arrived (mock/prices.js).
const idBySymbol = Object.fromEntries(streamMarkets.map(m => [m.symbol, m.id]))
setLivePrices(symbol => (idBySymbol[symbol] ? marketStream.lastPrice(idBySymbol[symbol]) : null))
