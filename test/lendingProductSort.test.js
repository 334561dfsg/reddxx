import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as lendingConstants from '../src/admin/constants/cryptoLending.js'

const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const adminSource = readSource('../src/pages/admin/lending/LendingProductPage.vue')
const clientSource = readSource('../src/pages/front/finance/lending/FinanceLendingListPage.vue')
const mockSource = readSource('../src/admin/mock/cryptoLending.js')

test('lending products sort descending without mutating source', () => {
  assert.equal(typeof lendingConstants.sortLendingProducts, 'function')
  const rows = [
    { productId: 'low', sortOrder: 10 },
    { productId: 'missing' },
    { productId: 'high', sortOrder: 90 },
    { productId: 'same', sortOrder: 90 }
  ]
  assert.deepEqual(
    lendingConstants.sortLendingProducts(rows).map((row) => row.productId),
    ['high', 'same', 'low', 'missing']
  )
  assert.deepEqual(rows.map((row) => row.productId), ['low', 'missing', 'high', 'same'])
})

test('lending product sorting is configured in admin and applied to client list', () => {
  assert.match(adminSource, /产品状态[\s\S]*产品排序/)
  assert.match(adminSource, /v-model\.number="formData\.sortOrder"/)
  assert.match(adminSource, /sortOrder: Number\(product\.sortOrder/)
  assert.match(adminSource, /sortOrder: Number\(formData\.value\.sortOrder\)/)
  assert.match(adminSource, /Math\.max\([\s\S]*sortOrder[\s\S]*\+ 10/)
  assert.match(adminSource, /sortLendingProducts/)
  assert.match(clientSource, /sortLendingProducts/)
  assert.match(mockSource, /sortOrder:/)
})
