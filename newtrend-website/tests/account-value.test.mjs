import 'vue'
import {createServer as createHttpServer} from 'node:http'
import test, {before, after} from 'node:test'
import assert from 'node:assert/strict'
import {fileURLToPath} from 'node:url'
import {createServer} from 'vite'

// accountValue reads the price snapshot through data.js (Vite-only imports), so the modules load through Vite's SSR
// loader; every store is taken from the same module graph.
let server, accountValues, totalValue, balanceOf, debit, c2cStateFor, quantFundAccount, walletRecords, earnPortfolioFor, tradeOrdersFor
before(async () => {
  globalThis.location = {pathname: '/NewQuantCapital/'}
  const saved = new Map()
  globalThis.localStorage = {getItem: k => saved.get(k) || null, setItem: (k, v) => saved.set(k, v), removeItem: k => saved.delete(k)}
  globalThis.document = {documentElement: {lang: ''}}
  server = await createServer({root: fileURLToPath(new URL('..', import.meta.url)), server: {middlewareMode: true, hmr: {server: createHttpServer()}}, appType: 'custom'})
  const load = path => server.ssrLoadModule(path)
  ;({accountValues, totalValue} = await load('/src/server/accountValue.js'))
  ;({balanceOf, debit} = await load('/src/mock/ledger.js'))
  ;({c2cStateFor} = await load('/src/server/c2cStore.js'))
  ;({quantFundAccount} = await load('/src/server/quantFundPortfolio.js'))
  ;({walletRecords} = await load('/src/server/walletRecords.js'))
  ;({earnPortfolioFor} = await load('/src/server/earnPortfolio.js'))
  ;({tradeOrdersFor} = await load('/src/server/tradingFunds.js'))
})
after(async () => { await server?.close() })

const DEMO = 'common.demo.demo'
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≈ ${b}`)

test('money that left the available balance but is still the user\'s keeps counting toward the total', () => {
  const before = totalValue(DEMO)
  // A pending withdrawal: debited and recorded as pending.
  assert.ok(debit(DEMO, 'USDT', 100))
  walletRecords.demo.unshift({id: 'w-test', kind: 'withdraw', amount: 100, symbol: 'USDT', status: 'pending', createdAt: Date.now()})
  near(totalValue(DEMO), before)
  // A C2C sell waiting for review: the coin is locked.
  assert.ok(debit(DEMO, 'USDT', 200))
  c2cStateFor(DEMO).orders.unshift({id: 'c-test', side: 'sell', symbol: 'USDT', status: 'pending_review', locked: 200})
  near(totalValue(DEMO), before)
  // An Earn subscription waiting for review: the amount is debited.
  assert.ok(debit(DEMO, 'USDT', 300))
  earnPortfolioFor(DEMO).orders.unshift({id: 'e-test', symbol: 'USDT', amount: 300, status: 'pending_review'})
  near(totalValue(DEMO), before)
  // A Quant Fund order under redemption review still holds its principal.
  const order = quantFundAccount.orders.find(o => o.mode === 'demo' && o.status === 'active')
  if (order) {
    const fund = accountValues(DEMO)['assets.distribution.quantFundAccount']
    order.status = 'redeem_pending_review'
    near(accountValues(DEMO)['assets.distribution.quantFundAccount'], fund)
    order.status = 'active'
  }
  // An open limit order locks its unfilled share only.
  assert.ok(debit(DEMO, 'USDT', 50))
  tradeOrdersFor(DEMO).unshift({id: 't-test', bucket: 'openOrders', quantity: 2, filledQuantity: 0, reserved: {asset: 'USDT', amount: 50}})
  near(totalValue(DEMO), before)
  assert.ok(balanceOf(DEMO, 'USDT') >= 0)
})
