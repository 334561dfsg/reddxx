// Simulated market-data WebSocket for the trading pages. Shaped like a real exchange stream: one connection,
// channel subscriptions, a snapshot per subscription and pushed updates afterwards, plus connection status and
// automatic reconnection (every subscriber gets a fresh snapshot after a reconnect). Replacing this with a real
// socket must not require component changes: components only use subscribe() and the status ref.
//
// Channels (params → message):
//   'tickers'                  → {[id]: Ticker}                      all markets (snapshot, then changed ones)
//   'ticker'  {id}             → Ticker                               one market
//   'depth'   {id}             → {asks: [[price, qty]], bids, price} best levels, full book each push
//   'kline'   {id, interval}   → {candles: Candle[], replace: bool}   history snapshot, then the updated last candle(s)
//   'trades'  {id}             → {trades: Trade[], replace: bool}     recent public trades (newest first), then new ones
// Ticker = {id, name, symbol, price, change, high, low, volume, reference}
// Candle = {time, open, high, low, close, volume}
// Trade = {id, time, price, qty, side: 'buy'|'sell'}
import {shallowRef} from 'vue'

export const INTERVAL_MS = {
  'trade.interval_1m': 60e3, 'trade.interval_5m': 300e3, 'trade.interval_15m': 900e3, 'trade.interval_30m': 1800e3,
  'trade.interval_1h': 3600e3, 'trade.interval_1d': 86400e3, 'trade.interval_1w': 604800e3, 'trade.interval_1M': 2592000e3,
}
const CANDLES = 110
const decimals = price => price < 1 ? 6 : price < 10 ? 4 : price < 1000 ? 3 : 2
const round = (value, price) => Number(value.toFixed(decimals(price)))

/** Deterministic history ending at `price` (same shape the chart drew before the stream existed). */
export function klineHistory(price, interval, now = Date.now()) {
  const anchors = [[0, 1.032], [18, 1.006], [25, .938], [39, 1.024], [59, 1.018], [78, 1.03], [86, 1.077], [91, 1.021], [109, 1]]
  const seed = [...interval].reduce((sum, c) => sum + c.charCodeAt(0), 0), step = INTERVAL_MS[interval] || 3600e3
  const start = Math.floor(now / step) * step - (CANDLES - 1) * step
  return Array.from({length: CANDLES}, (_, i) => {
    const end = anchors.findIndex(p => p[0] >= i), a = anchors[Math.max(0, end - 1)], b = anchors[end]
    const value = a[1] + (b[1] - a[1]) * (b[0] === a[0] ? 0 : (i - a[0]) / (b[0] - a[0]))
    const close = i === CANDLES - 1 ? price : price * (value + Math.sin(i * 2.3 + seed) * .003)
    const open = close + price * Math.sin(i * 1.7 + seed) * .004
    return {
      time: start + i * step, open, close,
      high: Math.max(open, close) + price * (.001 + Math.abs(Math.sin(i)) * .002),
      low: Math.min(open, close) - price * (.001 + Math.abs(Math.cos(i)) * .002),
      volume: 15 + Math.abs(Math.sin(i * 1.77)) * 25 + (i === 25 || i === 86 ? 140 : 0),
    }
  })
}

/** Book levels around `price`; `levels` per side, nearest first for bids, farthest first for asks (display order). */
export function depthBook(price, sequence = 0, levels = 14) {
  const tick = price * .00002
  // Each level's size changes every 4th tick, staggered by level and side, so roughly a quarter of the book updates
  // per push (as on a live exchange) and the order book can flash just the levels that changed.
  const step = (n, side) => Math.floor((sequence + (n * 5 + side * 2) % 4) / 4)
  const qty = (n, side) => Number((n * .0017 * (1 + .35 * Math.sin(step(n, side) * 2.3 + n * 1.3 + side))).toFixed(4))
  const asks = Array.from({length: levels}, (_, i) => { const n = levels - i; return [round(price + n * tick, price), qty(n, 1)] })
  const bids = Array.from({length: levels}, (_, i) => { const n = i + 1; return [round(price - n * tick, price), qty(n, 2)] })
  return {asks, bids, price}
}

/** Deterministic recent public trades ending at `price` (newest first), for the trades snapshot. */
export function recentTrades(price, now = Date.now(), count = 20) {
  return Array.from({length: count}, (_, i) => {
    const side = Math.sin(i * 2.1 + price) > 0 ? 'buy' : 'sell'
    return {id: `${now}-${i}`, time: now - i * 2300 - Math.round(Math.abs(Math.sin(i * 1.3)) * 1500),
      price: round(price * (1 + Math.sin(i * 1.7) * .00015 * (i ? 1 : 0)), price), qty: Number((.002 + Math.abs(Math.sin(i * 3.1 + price)) * .08).toFixed(4)), side}
  })
}

export function createMarketStream({markets, random = Math.random, tickMs = 1000, latency = () => 400, schedule = setTimeout, cancel = clearTimeout, clock = () => Date.now(), fail = false, flaky = false}) {
  const status = shallowRef('idle')
  const quotes = new Map(markets.map(m => [m.id, {
    id: m.id, name: m.name, symbol: m.symbol, price: Number(m.price), change: Number(m.change) || 0,
    reference: Number(m.price) / (1 + (Number(m.change) || 0) / 100), high: Number(m.price) * 1.064, low: Number(m.price) * .979,
    volume: Number(m.volume),
  }]))
  const subscribers = new Set()
  const klines = new Map() // `${id}|${interval}` → candles (server-side history, kept while subscribed)
  let sequence = 0, tickTimer = null, connectTimer = null, flakyTimer = null

  const ticker = id => { const quote = quotes.get(id); if (!quote) return quote; const {side, ...rest} = quote; return rest }
  const send = (sub, message) => { if (sub.active) sub.onMessage(message) }
  function snapshotFor(sub) {
    const {channel, params} = sub
    if (channel === 'tickers') return Object.fromEntries([...quotes.keys()].map(id => [id, ticker(id)]))
    const quote = quotes.get(params.id)
    if (!quote) return null
    if (channel === 'ticker') return ticker(params.id)
    if (channel === 'depth') return depthBook(quote.price, sequence)
    if (channel === 'trades') return {trades: recentTrades(quote.price, clock()), replace: true}
    if (channel === 'kline') {
      const key = params.id + '|' + params.interval
      if (!klines.has(key)) klines.set(key, klineHistory(quote.price, params.interval, clock()))
      return {candles: klines.get(key).map(c => ({...c})), replace: true}
    }
    return null
  }
  // Each subscription receives its snapshot after its own latency once the connection is open.
  function deliverSnapshot(sub) {
    sub.timer = schedule(() => { if (status.value === 'open') { sub.ready = true; send(sub, snapshotFor(sub)) } }, latency())
  }

  function step() {
    sequence++
    const watched = new Set([...subscribers].filter(s => s.params?.id).map(s => s.params.id))
    const changed = []
    let i = 0
    for (const quote of quotes.values()) {
      // Watched markets move every tick; the rest roughly every third tick (spread like the home ticker).
      if (watched.has(quote.id) || (i + sequence) % 3 === 0) {
        // Random walk with a weak pull back toward the session reference, so prices wander but stay plausible.
        const drift = (quote.reference - quote.price) / quote.reference * 8
        const direction = random() < .5 + Math.max(-.2, Math.min(.2, drift)) ? 1 : -1
        const tick = 10 ** -decimals(quote.price)
        quote.side = direction > 0 ? 'buy' : 'sell'
        quote.price = round(Math.max(tick, quote.price + direction * Math.max(tick, quote.price * .00012 * (.5 + random() * 2))), quote.price)
        quote.change = (quote.price / quote.reference - 1) * 100
        quote.high = Math.max(quote.high, quote.price); quote.low = Math.min(quote.low, quote.price)
        changed.push(quote.id)
      }
      i++
    }
    const now = clock()
    for (const sub of subscribers) {
      if (!sub.ready) continue
      if (sub.channel === 'tickers') send(sub, Object.fromEntries(changed.map(id => [id, ticker(id)])))
      else if (sub.channel === 'ticker' && changed.includes(sub.params.id)) send(sub, ticker(sub.params.id))
      else if (sub.channel === 'depth') send(sub, depthBook(quotes.get(sub.params.id).price, sequence))
      else if (sub.channel === 'trades' && changed.includes(sub.params.id)) {
        const quote = quotes.get(sub.params.id)
        send(sub, {trades: [{id: `${now}-${sequence}`, time: now, price: quote.price, qty: Number((.001 + random() * .12).toFixed(4)), side: quote.side || 'buy'}], replace: false})
      }
      else if (sub.channel === 'kline') {
        const candles = klines.get(sub.params.id + '|' + sub.params.interval), price = quotes.get(sub.params.id).price
        const last = candles.at(-1), span = INTERVAL_MS[sub.params.interval] || 3600e3
        if (now >= last.time + span) candles.push({time: last.time + span, open: last.close, high: Math.max(last.close, price), low: Math.min(last.close, price), close: price, volume: 0})
        else Object.assign(last, {close: price, high: Math.max(last.high, price), low: Math.min(last.low, price), volume: last.volume + .3})
        if (candles.length > CANDLES) candles.splice(0, candles.length - CANDLES)
        send(sub, {candles: candles.slice(-2).map(c => ({...c})), replace: false})
      }
    }
  }

  function connect() {
    cancel(connectTimer)
    status.value = status.value === 'idle' ? 'connecting' : 'reconnecting'
    connectTimer = schedule(() => {
      if (fail) { connect(); return }
      status.value = 'open'
      for (const sub of subscribers) deliverSnapshot(sub)
      // unref: in Node (tests) an open stream must not keep the process alive; browsers return a number.
      if (!tickTimer) { tickTimer = setInterval(step, tickMs); tickTimer?.unref?.() }
      if (flaky) flakyTimer = schedule(drop, 20000)
    }, fail ? 2000 : latency())
  }
  /** Connection lost: pushes stop, every subscriber waits for a new snapshot after the reconnect. */
  function drop() {
    if (status.value !== 'open') return
    clearInterval(tickTimer); tickTimer = null; cancel(flakyTimer)
    for (const sub of subscribers) { sub.ready = false; cancel(sub.timer) }
    status.value = 'reconnecting'
    connectTimer = schedule(connect, 2000)
  }
  function idle() {
    clearInterval(tickTimer); tickTimer = null; cancel(connectTimer); cancel(flakyTimer)
    status.value = 'idle'
  }

  /** Subscribes to a channel; returns the unsubscribe function. The last unsubscribe closes the connection. */
  function subscribe(channel, params, onMessage) {
    const sub = {channel, params, onMessage, ready: false, active: true, timer: null}
    subscribers.add(sub)
    if (status.value === 'idle') connect()
    else if (status.value === 'open') deliverSnapshot(sub)
    return () => {
      sub.active = false; cancel(sub.timer); subscribers.delete(sub)
      if (channel === 'kline' && ![...subscribers].some(s => s.channel === 'kline' && s.params.id === params.id && s.params.interval === params.interval)) klines.delete(params.id + '|' + params.interval)
      if (!subscribers.size) idle()
    }
  }

  /** Server-side last price (fills and closes use it). */
  const lastPrice = idOrName => [...quotes.values()].find(q => q.id === idOrName || q.name === idOrName)?.price ?? null

  return {status, subscribe, lastPrice, drop, step}
}
