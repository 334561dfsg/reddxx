import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as perpetualConstants from '../src/admin/constants/perpetual.js'

const pageSource = readFileSync(
  new URL('../src/pages/admin/perpetual/PerpetualManagementPage.vue', import.meta.url),
  'utf8'
)

test('perpetual products sort by descending configured number without mutating source', () => {
  assert.equal(typeof perpetualConstants.sortPerpetualProducts, 'function')

  const products = [
    { id: 'low', sortOrder: 10 },
    { id: 'missing' },
    { id: 'high', sortOrder: 90 },
    { id: 'same', sortOrder: 90 }
  ]

  assert.deepEqual(
    perpetualConstants.sortPerpetualProducts(products).map((product) => product.id),
    ['high', 'same', 'low', 'missing']
  )
  assert.deepEqual(products.map((product) => product.id), ['low', 'missing', 'high', 'same'])
})

test('perpetual product editor places numeric sort input beside status and saves it', () => {
  assert.match(pageSource, /产品状态[\s\S]*产品排序/)
  assert.match(pageSource, /v-model\.number="contractForm\.sortOrder"/)
  assert.match(pageSource, /数字越大越靠前/)
  assert.match(pageSource, /sortOrder: Number\(contractForm\.sortOrder\)/)
  assert.match(pageSource, /contractForm\.sortOrder = Number\(item\.sortOrder/)
  assert.match(pageSource, /sortPerpetualProducts/)
})

test('perpetual product editor keeps trade limits editable and uses zero as unlimited', () => {
  assert.doesNotMatch(pageSource, /selectedTemplateTradeLimitUnlimited/)
  assert.doesNotMatch(pageSource, /不限交易额度已经打开/)
  assert.match(pageSource, /最低买入量 \(USDT\)[\s\S]*最大买入量 \(USDT\)[\s\S]*最大持仓量 \(USDT\)/)
  assert.match(pageSource, /输入 0 表示最低买入量不限制/)
  assert.match(pageSource, /输入 0 表示最大买入量不限制/)
  assert.match(pageSource, /输入 0 表示最大持仓量不限制/)
  assert.match(pageSource, /上述限制输入 0 表示不限制/)
  assert.match(pageSource, /const tradeLimitValuesValid = computed/)
  assert.match(pageSource, /minBuy > 0 && maxBuy > 0 && maxBuy < minBuy/)
  assert.match(pageSource, /maxBuy > 0 && maxPosition > 0 && maxPosition < maxBuy/)
})

test('perpetual product cards show trade limits from product fields only', () => {
  assert.doesNotMatch(pageSource, /tradeLimitUnlimited/)
  assert.match(pageSource, /buyRange: tradeLimitRangeText\(contractForm\.minBuy, contractForm\.maxBuy\)/)
  assert.match(pageSource, /maxPosition: tradeLimitUsdtText\(contractForm\.maxPosition\)/)
  assert.match(pageSource, /minBuy: tradeLimitUsdtText\(contractForm\.minBuy\)/)
  assert.match(pageSource, /maxBuy: tradeLimitUsdtText\(contractForm\.maxBuy\)/)
  assert.match(pageSource, /<ul class="mt-2 space-y-1 text-sm text-slate-700">[\s\S]*最低买入:[\s\S]*最大买入:[\s\S]*最大持仓:/)
})
