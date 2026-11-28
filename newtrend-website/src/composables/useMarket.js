import {computed, getCurrentScope, onScopeDispose, shallowRef, watch} from 'vue'
import {marketStream} from '../api/market.js'

// Market-stream subscriptions for components. Each returns {data, ready, stale}:
//   data  — null until the channel's snapshot arrives (render skeletons), then kept current by pushes;
//   ready — a snapshot has arrived for the current parameters;
//   stale — the connection is not open (data may be outdated; trading actions are held).
// Changing the parameters (pair, interval) drops the old data and resubscribes. Unsubscribes on scope dispose.

export const streamStatus = marketStream.status
export const streamStale = computed(() => streamStatus.value !== 'open')
export const lastPrice = marketStream.lastPrice

function useChannel(channel, params, merge = (_, message) => message) {
  const data = shallowRef(null)
  let unsubscribe = null
  const stop = () => { unsubscribe?.(); unsubscribe = null }
  // Compare parameters by value: callers pass getters over objects that change on every price push (the live
  // pair), and only a different market/interval may resubscribe.
  watch(() => JSON.stringify(params() || null), key => {
    stop()
    data.value = null
    const value = JSON.parse(key)
    if (!value) return
    unsubscribe = marketStream.subscribe(channel, value, message => { data.value = merge(data.value, message) })
  }, {immediate: true})
  if (getCurrentScope()) onScopeDispose(stop)
  return {data, ready: computed(() => data.value !== null), stale: streamStale}
}

/** One market's ticker. `id` is a getter/ref of the market id. */
export const useTicker = id => useChannel('ticker', () => id() && {id: id()})

/** Every market's ticker, keyed by id; pushes carry only the changed markets. */
export const useTickers = () => useChannel('tickers', () => ({}), (current, message) => current ? {...current, ...message} : message)

/** Order book for one market (each push is the full book). */
export const useDepth = id => useChannel('depth', () => id() && {id: id()})

/** Recent public trades for one market, newest first (snapshot, then new trades prepended; keeps the latest 30). */
export const useTrades = id => useChannel('trades', () => id() && {id: id()}, (current, message) => message.replace || !current ? message.trades : [...message.trades, ...current].slice(0, 30))

/** Candles for a market and interval: a history snapshot, then updates of the last candle(s). */
export const useKline = (id, interval) => useChannel('kline', () => id() && {id: id(), interval: interval()}, (current, message) => {
  if (message.replace || !current) return message.candles
  const next = [...current]
  for (const candle of message.candles) {
    const index = next.findIndex(c => c.time === candle.time)
    if (index >= 0) next[index] = candle
    else next.push(candle)
  }
  return next.length > 110 ? next.slice(-110) : next
})

/**
 * The selected market with live figures, for trading pages. `pair` is a getter of a catalogue market. `livePair` is
 * the market with the pushed price (null until the first ticker), change, 24h high and low; `live` is the raw ticker
 * (null while loading). Switching pairs resubscribes the single-market ticker; until its snapshot arrives the same
 * market's entry from the all-markets stream is used, so the header keeps real figures (no skeleton flash).
 * `tickers` (every market) is returned for callers that also need other markets' prices.
 */
export function useLivePair(pair) {
  const ticker = useTicker(() => pair().id), tickers = useTickers()
  const live = computed(() => ticker.data.value ?? tickers.data.value?.[pair().id] ?? null)
  const livePair = computed(() => {
    const market = pair(), quote = live.value
    return {...market, price: quote?.price ?? null, change: quote ? Number(quote.change.toFixed(2)) : market.change, high: quote?.high, low: quote?.low}
  })
  // Snapshot-only markets carry volume '—': show a dash instead of NaN volume / turnover.
  const hasVolume = computed(() => { const {volume, price} = pair(); return Number(volume) > 0 && Number(price) > 0 })
  return {live, livePair, tickers, hasVolume}
}
