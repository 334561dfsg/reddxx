import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { sortPortfolioProducts } from '../src/admin/constants/portfolio.js'

const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('portfolio sorting follows the global larger-number-first contract', () => {
  const rows = [
    { id: 'low', sortOrder: 10 },
    { id: 'missing' },
    { id: 'high', sortOrder: 90 },
    { id: 'same', sortOrder: 90 }
  ]
  assert.deepEqual(sortPortfolioProducts(rows).map((row) => row.id), ['high', 'same', 'low', 'missing'])
  assert.deepEqual(rows.map((row) => row.id), ['low', 'missing', 'high', 'same'])
})

test('all seven product editors expose and persist the same numeric sorting contract', () => {
  const editors = [
    ['../src/pages/admin/spot/SpotProductPage.vue', 'formData'],
    ['../src/pages/admin/perpetual/PerpetualManagementPage.vue', 'contractForm'],
    ['../src/pages/admin/delivery/DeliveryManagementPage.vue', 'contractForm'],
    ['../src/pages/admin/liquidity/LiquidityLockedProductsPage.vue', 'productForm'],
    ['../src/pages/admin/lending/LendingProductPage.vue', 'formData'],
    ['../src/pages/admin/aiQuant/AiQuantProductPage.vue', 'productForm'],
    ['../src/pages/admin/portfolio/PortfolioProductPage.vue', 'productForm']
  ]

  for (const [path, model] of editors) {
    const source = readSource(path)
    assert.match(source, new RegExp(`v-model\\.number="${model}\\.sortOrder"`), path)
    assert.match(source, /数字越大越靠前/, path)
    assert.match(source, /Math\.max\([\s\S]*sortOrder[\s\S]*\+ 10/, path)
    assert.match(source, /sortOrder:\s*Number\(/, path)
  }
})

test('all shared customer product lists use their domain sorting helper', () => {
  const clients = [
    ['../src/pages/front/finance/liquidity/FinanceLiquidityListPage.vue', 'sortLiquidityLockedProducts'],
    ['../src/pages/front/finance/lending/FinanceLendingListPage.vue', 'sortLendingProducts'],
    ['../src/pages/front/finance/aiQuant/FinanceAiQuantListPage.vue', 'sortAiQuantProducts'],
    ['../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', 'sortPortfolioProducts']
  ]

  for (const [path, helper] of clients) {
    assert.match(readSource(path), new RegExp(helper), path)
  }
})
