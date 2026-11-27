import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as liquidityConstants from '../src/admin/constants/liquidityLocked.js'

const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const adminSource = readSource('../src/pages/admin/liquidity/LiquidityLockedProductsPage.vue')
const clientSource = readSource('../src/pages/front/finance/liquidity/FinanceLiquidityListPage.vue')
const mockSource = readSource('../src/admin/mock/liquidityLocked.js')

test('liquidity locked products sort descending without mutating source', () => {
  assert.equal(typeof liquidityConstants.sortLiquidityLockedProducts, 'function')
  const rows = [
    { id: 'low', sortOrder: 10 },
    { id: 'missing' },
    { id: 'high', sortOrder: 90 },
    { id: 'same', sortOrder: 90 }
  ]
  assert.deepEqual(
    liquidityConstants.sortLiquidityLockedProducts(rows).map((row) => row.id),
    ['high', 'same', 'low', 'missing']
  )
  assert.deepEqual(rows.map((row) => row.id), ['low', 'missing', 'high', 'same'])
})

test('liquidity product sorting is configured in admin and applied to client list', () => {
  assert.match(adminSource, /产品状态[\s\S]*产品排序/)
  assert.match(adminSource, /v-model\.number="productForm\.sortOrder"/)
  assert.match(adminSource, /productForm\.sortOrder = Number\(product\.sortOrder/)
  assert.match(adminSource, /sortOrder: Number\(productForm\.sortOrder\)/)
  assert.match(adminSource, /Math\.max\([\s\S]*sortOrder[\s\S]*\+ 10/)
  assert.match(adminSource, /sortLiquidityLockedProducts/)
  assert.match(clientSource, /sortLiquidityLockedProducts/)
  assert.match(mockSource, /sortOrder:/)
})

test('liquidity period inputs have visible titles with dynamic currency units', () => {
  assert.match(adminSource, /锁仓天数（天）/)
  assert.match(adminSource, /年化收益率（%）/)
  assert.match(adminSource, /最低申购金额（\{\{ productForm\.currency \}\}）/)
  assert.match(adminSource, /最高申购金额（\{\{ productForm\.currency \}\}）/)
  assert.match(adminSource, /锁仓天数（天）[\s\S]*v-model\.number="period\.days"/)
  assert.match(adminSource, /年化收益率（%）[\s\S]*v-model\.number="period\.annualRate"/)
})

test('liquidity product editor includes a product currency select', () => {
  assert.match(adminSource, /productCurrency:\s*'USDT'/)
  assert.match(adminSource, /productForm\.productCurrency\s*=\s*'USDT'/)
  assert.match(adminSource, /productForm\.productCurrency\s*=\s*product\.productCurrency\s*\?\?\s*product\.currency/)
  assert.match(adminSource, /productCurrency:\s*productForm\.productCurrency/)
  assert.match(adminSource, />产品品种<\/label>/)
  assert.match(adminSource, /v-model="productForm\.productCurrency"/)
  assert.match(adminSource, /v-model="productForm\.productCurrency"[\s\S]*v-for="curr in SUPPORTED_CURRENCIES"/)
})
