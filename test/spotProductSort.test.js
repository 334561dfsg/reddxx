import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const pageSource = readSource('../src/pages/admin/spot/SpotProductPage.vue')
const mockSource = readSource('../src/admin/mock/spot.js')

test('spot products sort descending without mutating source', async () => {
  let spotConstants = {}
  try {
    spotConstants = await import('../src/admin/constants/spotProduct.js')
  } catch {}
  assert.equal(typeof spotConstants.sortSpotProducts, 'function')

  const rows = [
    { productId: 'low', sortOrder: 10 },
    { productId: 'missing' },
    { productId: 'high', sortOrder: 90 },
    { productId: 'same', sortOrder: 90 }
  ]
  assert.deepEqual(
    spotConstants.sortSpotProducts(rows).map((row) => row.productId),
    ['high', 'same', 'low', 'missing']
  )
  assert.deepEqual(rows.map((row) => row.productId), ['low', 'missing', 'high', 'same'])
})

test('spot product editor saves numeric sort and sorts before pagination', () => {
  assert.match(pageSource, /状态[\s\S]*产品排序/)
  assert.match(pageSource, /v-model\.number="formData\.sortOrder"/)
  assert.match(pageSource, /sortOrder: Number\(product\.sortOrder/)
  assert.match(pageSource, /sortOrder: Number\(formData\.value\.sortOrder\)/)
  assert.match(pageSource, /Math\.max\([\s\S]*sortOrder[\s\S]*\+ 10/)
  assert.match(pageSource, /sortSpotProducts/)
  assert.match(pageSource, /数字越大越靠前/)
  assert.match(mockSource, /sortOrder:/)
})
