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

test('perpetual product editor hides trade limits when selected leverage template is unlimited', () => {
  assert.match(pageSource, /const selectedTemplateTradeLimitUnlimited = computed/)
  assert.match(pageSource, /selectedTemplate\.value\?\.tradeLimitUnlimited === true/)
  assert.match(pageSource, /const limitOk = selectedTemplateTradeLimitUnlimited\.value/)
  assert.match(pageSource, /v-if="selectedTemplateTradeLimitUnlimited"/)
  assert.match(pageSource, /不限交易额度已经打开/)
  assert.match(pageSource, /如需调整，在杠杆模版中进行处理/)
  assert.match(pageSource, /<template v-else>[\s\S]*最低买入量 \(USDT\)[\s\S]*最大买入量 \(USDT\)[\s\S]*最大持仓量 \(USDT\)/)
})

test('perpetual product cards show unlimited trade limits from leverage template', () => {
  assert.match(pageSource, /tradeLimitUnlimited: template\.tradeLimitUnlimited === true/)
  assert.match(pageSource, /tradeLimitUnlimited: selectedTemplate\.value\.tradeLimitUnlimited === true/)
  assert.match(pageSource, /<template v-if="item\.tradeLimitUnlimited">[\s\S]*交易限制:[\s\S]*不限制/)
  assert.match(pageSource, /v-if="item\.tradeLimitUnlimited"[\s\S]*由杠杆模版统一声明为不限额/)
  assert.match(pageSource, /<ul v-else[\s\S]*最低买入:[\s\S]*最大买入:[\s\S]*最大持仓:/)
})
