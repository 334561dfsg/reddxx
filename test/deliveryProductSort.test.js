import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as deliveryConstants from '../src/admin/constants/delivery.js'

const pageSource = readFileSync(
  new URL('../src/pages/admin/delivery/DeliveryManagementPage.vue', import.meta.url),
  'utf8'
)

test('delivery products sort by descending configured number without mutating source', () => {
  assert.equal(typeof deliveryConstants.sortDeliveryProducts, 'function')

  const products = [
    { id: 'low', sortOrder: 10 },
    { id: 'missing' },
    { id: 'high', sortOrder: 90 },
    { id: 'same', sortOrder: 90 }
  ]

  assert.deepEqual(
    deliveryConstants.sortDeliveryProducts(products).map((product) => product.id),
    ['high', 'same', 'low', 'missing']
  )
  assert.deepEqual(products.map((product) => product.id), ['low', 'missing', 'high', 'same'])
})

test('delivery contract editor places numeric sort input beside status and saves it', () => {
  assert.match(pageSource, /产品状态[\s\S]*产品排序/)
  assert.match(pageSource, /v-model\.number="contractForm\.sortOrder"/)
  assert.match(pageSource, /数字越大越靠前/)
  assert.match(pageSource, /sortOrder: Number\(contractForm\.sortOrder\)/)
  assert.match(pageSource, /contractForm\.sortOrder = Number\(item\.sortOrder/)
  assert.match(pageSource, /sortDeliveryProducts/)
})

test('delivery contract editor hides trade limits when selected period template is unlimited', () => {
  assert.match(pageSource, /selectedTemplateTradeLimitUnlimited/)
  assert.match(pageSource, /v-if="selectedTemplateTradeLimitUnlimited"/)
  assert.match(pageSource, /不限交易额度已经打开/)
  assert.match(pageSource, /如需调整，在周期模版中进行处理/)
  assert.match(pageSource, /v-else class="grid gap-6 md:grid-cols-3"/)
})

test('delivery contract cards show unlimited trade limits from period template', () => {
  assert.match(pageSource, /const productTradeLimitUnlimited = \(product\) => templateById\.value\[product\.templateId\]\?\.tradeLimitUnlimited === true/)
  assert.match(pageSource, /<template v-if="productTradeLimitUnlimited\(item\)">[\s\S]*交易限制:[\s\S]*不限制/)
  assert.match(pageSource, /v-if="productTradeLimitUnlimited\(item\)"[\s\S]*由周期模版统一声明为不限额/)
  assert.match(pageSource, /<ul v-else class="mt-3 grid grid-cols-3 gap-4 text-sm">[\s\S]*最低买入[\s\S]*最大买入[\s\S]*最大持仓/)
})

test('delivery contract editor dialog follows modal semantics', () => {
  assert.match(pageSource, /role="dialog"/)
  assert.match(pageSource, /aria-modal="true"/)
  assert.match(pageSource, /:aria-labelledby="contractDialogTitleId"/)
  assert.match(pageSource, /aria-label="关闭"/)
  assert.match(pageSource, /@keydown="handleContractDialogKeydown"/)
  assert.match(pageSource, /@after-leave="handleContractModalAfterLeave"/)
  assert.match(pageSource, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(pageSource, /handleContractModalAfterLeave[\s\S]*document\.body\.style\.overflow = ''[\s\S]*lastContractTrigger\.value\?\.focus/)
  assert.doesNotMatch(pageSource, /@click\.self="showContractModal = false"/)
  assert.match(pageSource, /\.modal-enter-from > section[\s\S]*transform: scale\(0\.96\)/)
  assert.match(pageSource, /prefers-reduced-motion: reduce/)
})

test('delivery contract editor exposes validation summary and field errors', () => {
  assert.match(pageSource, /const contractErrors = reactive/)
  assert.match(pageSource, /const validateContractForm = \(\) =>/)
  assert.match(pageSource, /请修复以下 \{\{ contractErrorItems\.length \}\} 项后再保存/)
  assert.match(pageSource, /contractErrorSummaryRef\.value\?\.focus/)
  assert.match(pageSource, /focusContractField\(error\.field\)/)
  assert.match(pageSource, /:aria-invalid="Boolean\(contractErrors\.name\)"/)
  assert.match(pageSource, /:aria-describedby="contractFieldDescribedBy\('name'\)"/)
  assert.match(pageSource, /最低买入额必须大于 0/)
  assert.match(pageSource, /最高买入额不能小于最低买入额/)
  assert.match(pageSource, /最大持仓额不能小于最高买入额/)
  assert.match(pageSource, /交割手续费率必须在 0 到 100 之间/)
})
