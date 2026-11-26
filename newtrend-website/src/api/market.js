// The site's market stream: marketStreamService bound to the trading catalogue. Debug switches (read once from the
// URL, like the HTTP transport): ?mock-fail=market never connects (keeps reconnecting); ?mock-stream=flaky drops
// the connection every 20 s; ?mock-delay=<ms> also sets the connect/snapshot latency.
import {tradingMarkets} from '../data.js'
import {createMarketStream} from './marketStreamService.js'

const query = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams()
const fail = (query.get('mock-fail') || '').split(',').some(name => ['market', 'all'].includes(name.trim()))
const delay = query.get('mock-delay')
const latency = delay !== null && Number(delay) >= 0 ? () => Number(delay) : () => 300 + Math.random() * 500

export const marketStream = createMarketStream({markets: tradingMarkets, latency, fail, flaky: query.get('mock-stream') === 'flaky'})
