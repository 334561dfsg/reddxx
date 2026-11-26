import test from 'node:test'
import assert from 'node:assert/strict'
import {createMarketStream, depthBook, klineHistory} from '../src/api/marketStreamService.js'
import {createTradeApi} from '../src/api/tradeService.js'
import {tradeOrdersFor} from '../src/tradingFunds.js'
import {balanceOf} from '../src/mock/ledger.js'

const markets = [{id: 'BTCUSD', name: 'BTC/USDT', symbol: 'BTC', price: 60000, change: 1}, {id: 'ETHUSD', name: 'ETH/USDT', symbol: 'ETH', price: 1700, change: -1}]
// Manual scheduler: timers run only when flushed, so the test controls connect, snapshot and reconnect timing.
function manual() {
  let queue = []
  return {
    schedule: fn => { const t = {fn}; queue.push(t); return t },
    cancel: t => { queue = queue.filter(item => item !== t) },
    flush() { const run = queue; queue = []; run.forEach(t => t.fn()) },
  }
}
const stream = (extra = {}) => { const m = manual(); return {m, s: createMarketStream({markets, tickMs: 3600e3, latency: () => 0, schedule: m.schedule, cancel: m.cancel, ...extra})} }

test('history and depth are shaped like exchange data', () => {
  const candles = klineHistory(100, 'trade.interval_1m', 6e6)
  assert.equal(candles.length, 110)
  assert.equal(candles.at(-1).close, 100)
  assert.ok(candles.every((c, i) => c.high >= Math.max(c.open, c.close) && c.low <= Math.min(c.open, c.close) && (!i || c.time - candles[i - 1].time === 60e3)))
  const book = depthBook(100)
  assert.ok(book.asks.at(-1)[0] > 100 && book.bids[0][0] < 100, 'spread around the price')
  assert.ok(book.asks[0][0] > book.asks.at(-1)[0], 'asks farthest first')
})

test('connect → snapshot → pushes; unknown markets get nothing; last unsubscribe closes', () => {
  const {m, s} = stream()
  const got = []
  const off = s.subscribe('ticker', {id: 'BTCUSD'}, message => got.push(message))
  assert.equal(s.status.value, 'connecting')
  m.flush() // open
  assert.equal(s.status.value, 'open')
  m.flush() // snapshot
  assert.equal(got[0].price, 60000)
  s.step()
  assert.equal(got.length, 2)
  assert.notEqual(got[1].price, 60000, 'watched market moves every tick')
  assert.equal(s.lastPrice('BTC/USDT'), got[1].price)
  const none = []
  s.subscribe('ticker', {id: 'NOPE'}, message => none.push(message))
  m.flush()
  assert.deepEqual(none, [null])
  off()
  assert.equal(s.status.value, 'open', 'another subscriber still open')
})

test('kline pushes update the last candle; depth pushes the full book', () => {
  const {m, s} = stream()
  const kline = [], depth = []
  s.subscribe('kline', {id: 'BTCUSD', interval: 'trade.interval_1h'}, message => kline.push(message))
  s.subscribe('depth', {id: 'BTCUSD'}, message => depth.push(message))
  m.flush(); m.flush()
  assert.equal(kline[0].replace, true)
  assert.equal(kline[0].candles.length, 110)
  s.step()
  const update = kline.at(-1)
  assert.equal(update.replace, false)
  assert.equal(update.candles.at(-1).close, s.lastPrice('BTCUSD'))
  assert.equal(depth.at(-1).asks.length, 14)
})

test('a dropped connection reconnects and re-sends snapshots; a failing one keeps retrying', () => {
  const {m, s} = stream()
  const got = []
  s.subscribe('tickers', {}, message => got.push(message))
  m.flush(); m.flush()
  assert.equal(Object.keys(got[0]).length, 2)
  s.drop()
  assert.equal(s.status.value, 'reconnecting')
  s.step()
  const before = got.length
  m.flush() // reconnect timer → connect
  m.flush() // open
  assert.equal(s.status.value, 'open')
  m.flush() // fresh snapshot
  assert.equal(got.length, before + 1)
  assert.equal(Object.keys(got.at(-1)).length, 2, 'full snapshot after reconnect')

  const failing = stream({fail: true})
  failing.s.subscribe('ticker', {id: 'BTCUSD'}, () => assert.fail('no data while disconnected'))
  failing.m.flush(); failing.m.flush()
  assert.equal(failing.s.status.value, 'reconnecting')
})

test('trade service fills market orders and closes positions at the live price', async () => {
  const prices = {'BTC/USDT': 61000}
  const api = createTradeApi({lastPrice: name => prices[name] ?? null})
  const mode = 'common.demo.demo'
  const positions = await api.listTradeRecords(mode, 'futures', 'positions')
  const btc = positions.find(p => p.marketName === 'BTC/USDT')
  assert.equal(btc.markPrice, 61000, 'records mark positions to the live price')

  const cash = balanceOf(mode, 'USDT')
  const order = {id: 'live-1', kind: 'futures', marketName: 'BTC/USDT', direction: 'buy', price: 61000, markPrice: 0, amount: 100, quantity: 100 / 61000, margin: 10, fee: .05, bucket: 'positions', recordStatus: 'trade.filled'}
  const placed = await api.placeTradeOrder({mode, order, sizing: {kind: 'futures', side: 'buy', pending: false, estimate: {margin: 10, fee: .05}, amount: 100, base: 'BTC'}})
  assert.equal(placed.markPrice, 61000)
  assert.equal(balanceOf(mode, 'USDT'), cash - 10.05)
  await assert.rejects(api.placeTradeOrder({mode: 'common.demo.real', order: {...order, id: 'live-2'}, sizing: {kind: 'futures', side: 'buy', pending: false, estimate: {margin: 1e12, fee: 0}, amount: 1, base: 'BTC'}}), {code: 'overlay.ui.insufficientBalanceSwitchToDemoToTryThisLocally'})

  prices['BTC/USDT'] = 62000
  const closed = await api.finishTrade({mode, id: btc.id})
  assert.equal(closed.closePrice, 62000)
  assert.ok(tradeOrdersFor(mode).some(o => o.id === 'closed-' + btc.id))
  await assert.rejects(api.finishTrade({mode, id: btc.id}), {code: 'conflict'})
})
