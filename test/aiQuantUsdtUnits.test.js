import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as aiQuantConstants from '../src/admin/constants/aiQuant.js'

const adminProductSource = readFileSync(
  new URL('../src/pages/admin/aiQuant/AiQuantProductPage.vue', import.meta.url),
  'utf8'
)
const adminOrderSource = readFileSync(
  new URL('../src/pages/admin/aiQuant/AiQuantOrderPage.vue', import.meta.url),
  'utf8'
)
const frontListSource = readFileSync(
  new URL('../src/pages/front/finance/aiQuant/FinanceAiQuantListPage.vue', import.meta.url),
  'utf8'
)
const frontDetailSource = readFileSync(
  new URL('../src/pages/front/finance/aiQuant/FinanceAiQuantDetailPage.vue', import.meta.url),
  'utf8'
)
const mockCatalogSource = readFileSync(new URL('../src/admin/mock/aiQuant.js', import.meta.url), 'utf8')

test('AI quant admin displays subscription ranges and monetary limits in USDT', () => {
  assert.match(adminProductSource, /tier\.minAmount \}\}-\{\{ tier\.maxAmount \}\} USDT/)
  assert.match(adminProductSource, /适用申购金额区间（USDT）/)
  assert.match(adminProductSource, /单用户最大持仓（USDT）/)
  assert.match(adminProductSource, /产品总限额（USDT）/)
  assert.match(adminProductSource, /产品总限额：\{\{ productForm\.limitCount \}\} USDT/)
  assert.match(adminProductSource, /每月限购次数：\{\{ productForm\.monthlyLimitCount \}\} 次/)
  assert.match(adminProductSource, /tier\.minAmount \* tier\.dailyRate \/ 100\)\.toFixed\(2\) \}\} USDT/)
  assert.match(adminProductSource, /tier\.minAmount \* tier\.dailyRate \/ 100 \* previewYieldDays\)\.toFixed\(2\) \}\} USDT/)
})

test('AI quant customer pages display subscription ranges and monetary limits in USDT', () => {
  assert.match(frontListSource, /formatAmountSpan\(row\.tier\.minAmount, row\.tier\.maxAmount, 'USDT'\)/)
  assert.match(frontDetailSource, /区间（USDT）/)
  assert.match(frontDetailSource, /单用户持仓上限约 \{\{ product\.limitAmount \}\} USDT/)
  assert.match(frontDetailSource, /产品总限额 \{\{ product\.limitCount \}\} USDT/)
  assert.match(frontDetailSource, /每月申购上限 \{\{ product\.monthlyLimitCount \}\} 笔/)
})

test('AI quant aggregate operating amounts are displayed in USDT', () => {
  assert.match(adminProductSource, /锁定: \{\{ product\.totalLocked \}\} USDT/)
  assert.match(adminProductSource, /收益: \{\{ product\.totalYield \}\} USDT/)
  assert.match(adminProductSource, /订单: \{\{ product\.totalOrders \}\} 笔/)
  assert.match(frontDetailSource, /\{\{ product\.totalLocked \}\} USDT/)
  assert.match(frontDetailSource, /\{\{ product\.totalYield \}\} USDT/)
})

test('AI quant mock products use coherent USDT subscription ranges and monetary limits', () => {
  const products = [...mockCatalogSource.matchAll(/id: '(aiq-prod-\d+)'[\s\S]*?tiers: \[([\s\S]*?)\],[\s\S]*?limitAmount: ([\d.]+),\s*limitCount: ([\d.]+),/g)]
  assert.equal(products.length, 9)

  for (const [, id, tiersSource, userLimitRaw, totalLimitRaw] of products) {
    const maximums = [...tiersSource.matchAll(/maxAmount: ([\d.]+)/g)].map((match) => Number(match[1]))
    const highestTierAmount = Math.max(...maximums)
    const userLimit = Number(userLimitRaw)
    const totalLimit = Number(totalLimitRaw)

    assert.ok(userLimit >= highestTierAmount, `${id} user limit must cover its highest tier`)
    assert.ok(totalLimit >= userLimit, `${id} product total must cover its user limit`)
  }
})

test('AI quant products sort by descending configured order and keep missing values last', () => {
  assert.equal(typeof aiQuantConstants.sortAiQuantProducts, 'function')

  const products = [
    { id: 'missing' },
    { id: 'later', sortOrder: 30 },
    { id: 'first', sortOrder: 10 },
    { id: 'same', sortOrder: 30 }
  ]

  assert.deepEqual(
    aiQuantConstants.sortAiQuantProducts(products).map((product) => product.id),
    ['later', 'same', 'first', 'missing']
  )
  assert.deepEqual(products.map((product) => product.id), ['missing', 'later', 'first', 'same'])
})

test('AI quant product editor exposes numeric sort order beside product status', () => {
  assert.match(adminProductSource, /v-model\.number="productForm\.sortOrder"/)
  assert.match(adminProductSource, /产品状态[\s\S]*产品排序/)
  assert.match(adminProductSource, /sortAiQuantProducts/)
  assert.match(frontListSource, /sortAiQuantProducts/)
  assert.match(mockCatalogSource, /sortOrder:/)
})

test('AI quant product editor includes a product currency select', () => {
  assert.match(adminProductSource, /productCurrency:\s*'USDT'/)
  assert.match(adminProductSource, /productForm\.productCurrency\s*=\s*'USDT'/)
  assert.match(adminProductSource, /productForm\.productCurrency\s*=\s*product\.productCurrency\s*\?\?\s*product\.currency/)
  assert.match(adminProductSource, />产品品种<\/label>/)
  assert.match(adminProductSource, /v-model="productForm\.productCurrency"/)
  assert.match(adminProductSource, /v-model="productForm\.productCurrency"[\s\S]*v-for="currency in SUPPORTED_CURRENCIES"/)
})

test('AI quant list mock covers unlimited-term orders across visible states', () => {
  const orderBlocks = [...mockCatalogSource.matchAll(/(\{\s*id: '(aiq-ord-\d+)'[\s\S]*?status: ORDER_STATUS\.([A-Z_]+),[\s\S]*?\n\s*\})/g)]
  const unlimitedBlocks = orderBlocks.filter(([, block]) =>
    /productId: 'aiq-prod-001'/.test(block) && /endDate: null/.test(block) && /totalDays: 0/.test(block)
  )

  assert.ok(unlimitedBlocks.some(([, , , status]) => status === 'RUNNING'))
  assert.ok(unlimitedBlocks.some(([, , , status]) => status === 'SETTLED'))
  assert.ok(unlimitedBlocks.some(([, , , status]) => status === 'EARLY_REDEEMED'))
  assert.match(frontListSource, /formatAiQuantOrderEndLabel\(o\)/)
})

test('AI quant admin order page formats unlimited-term cycle fields safely', () => {
  assert.match(adminOrderSource, /formatAiQuantOrderCycleLabel\(order\)/)
  assert.match(adminOrderSource, /formatAiQuantOrderEndLabel\(selectedOrder\)/)
  assert.match(adminOrderSource, /aiQuantOrderProgressPercent\(selectedOrder\)/)
  assert.match(adminOrderSource, /formatAiQuantOrderRemainingYield\(selectedOrder\)/)
  assert.doesNotMatch(adminOrderSource, /selectedOrder\.daysElapsed \/ selectedOrder\.totalDays/)
})

test('AI quant order yield adjustment is replaced by point-control status for controlled users', () => {
  assert.match(adminOrderSource, /import \{ userControlState \} from '..\/..\/..\/admin\/state\/userControlState\.js'/)
  assert.match(adminOrderSource, /ACTIVE_USER_CONTROL_STATUSES = new Set\(\['active', 'processing'\]\)/)
  assert.match(adminOrderSource, /userControlLookupKeys/)
  assert.match(adminOrderSource, /raw\.replace\(\/-\/g, '_'\)/)
  assert.match(adminOrderSource, /raw\.replace\(\/_\/g, '-'\)/)
  assert.match(adminOrderSource, /userControlState\.value\.rules\[key\]\?\.aiQuant/)
  assert.match(adminOrderSource, /isAiQuantUserPointControlled\(order\)/)
  assert.match(adminOrderSource, /v-if="isAiQuantUserPointControlled\(order\)"/)
  assert.match(adminOrderSource, /v-if="selectedOrder && isAiQuantUserPointControlled\(selectedOrder\)"/)
  assert.match(adminOrderSource, /用户点控中，订单收益调整不可用/)
  assert.match(adminOrderSource, />\s*点控中\s*</)
  assert.match(adminOrderSource, /const canYieldAdjust = \(order\) => Boolean\(order\?\.status && YIELD_ADJUST_ALLOWED_STATUSES\.has\(order\.status\) && !isAiQuantUserPointControlled\(order\)\)/)
})
