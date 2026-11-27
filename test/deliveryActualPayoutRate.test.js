import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assertAdminDialogFrame } from './helpers/adminDrawerFrame.js'
const deliveryMockSource = readFileSync(
  new URL('../src/admin/mock/delivery.js', import.meta.url),
  'utf8'
)
const templatePageSource = readFileSync(
  new URL('../src/pages/admin/delivery/DeliveryTemplatePage.vue', import.meta.url),
  'utf8'
)
const managementPageSource = readFileSync(
  new URL('../src/pages/admin/delivery/DeliveryManagementPage.vue', import.meta.url),
  'utf8'
)
const orderMockSource = readFileSync(
  new URL('../src/admin/mock/deliveryOrder.js', import.meta.url),
  'utf8'
)

test('delivery template cycles contain actual payout rates', () => {
  const configuredCycles = deliveryMockSource.match(/durationSec:\s*\d+,\s*payoutPct:\s*[\d.]+,\s*actualPayoutPct:\s*[\d.]+/g) || []

  assert.equal(configuredCycles.length, 9)
})

test('period template editor saves and displays the actual payout rate', () => {
  assert.match(templatePageSource, /<span aria-hidden="true" class="text-rose-500 mr-1">\*<\/span>周期配置/)
  assert.match(templatePageSource, /周期\{\{ index \+ 1 \}\}/)
  assert.match(templatePageSource, /实际收益率/)
  assert.match(templatePageSource, /v-model:value\.number="cycle\.actualPayoutPct"/)
  assert.match(templatePageSource, /actualPayoutPct: Number\(c\.actualPayoutPct\)/)
  assert.doesNotMatch(templatePageSource, /<table class="w-full text-left border-collapse ant-table">/)
})

test('period template editor keeps trade limits out of period templates', () => {
  assert.doesNotMatch(deliveryMockSource, /tradeLimitUnlimited/)
  assert.match(deliveryMockSource, /saveDeliveryTemplatesMock/)
  assert.match(templatePageSource, /saveDeliveryTemplatesMock/)
  assert.doesNotMatch(templatePageSource, /\['trade', '交易'\]/)
  assert.doesNotMatch(templatePageSource, /templateForm\.tradeLimitUnlimited/)
  assert.doesNotMatch(templatePageSource, /role="switch"/)
  assert.doesNotMatch(templatePageSource, /交易限制配置已移至产品编辑/)
  assert.doesNotMatch(templatePageSource, /模板不再控制交易限额/)
})

test('period template dialog follows modal and tab interaction semantics', () => {
  // Migrated onto the shared Ant frame (AdminDialog, 2026-11-27): it owns dialog semantics, background isolation,
  // scroll lock, focus trap, Escape and motion, so the page no longer hand-builds them.
  assertAdminDialogFrame(templatePageSource)
  assert.match(templatePageSource, /<AdminDialog\b[^>]*ref="templateFrame"[^>]*title-id="delivery-template-dialog-title"[^>]*:request-close="templateRequestClose"[^>]*@closed="handleTemplateAfterLeave"/)
  assert.match(templatePageSource, /<AdminDialog\b[^>]*:open="showTemplateUnsavedConfirm"[^>]*title-id="delivery-template-unsaved-title"[^>]*:request-close="cancelTemplateUnsavedClose"/)
  assert.doesNotMatch(templatePageSource, /isolateTemplateDialogBackground|lockPageScroll|handleTemplateDialogKeydown|appRoot\.inert/)
  assert.match(templatePageSource, /isTemplateClosing/)
  assert.match(templatePageSource, /requestTemplateClose/)
  assert.match(templatePageSource, /performTemplateClose/)
  assert.match(templatePageSource, /showTemplateUnsavedConfirm/)
  assert.match(templatePageSource, /confirmTemplateUnsavedClose/)
  assert.match(templatePageSource, /cancelTemplateUnsavedClose/)
  assert.doesNotMatch(templatePageSource, /role="tablist"/)
  assert.doesNotMatch(templatePageSource, /role="tab"/)
  assert.doesNotMatch(templatePageSource, /role="tabpanel"/)
  assert.doesNotMatch(templatePageSource, /handleTemplateTabKeydown/)
  assert.doesNotMatch(templatePageSource, /window\.confirm/)
})

test('period template editor validates fields and links errors to controls', () => {
  assert.match(templatePageSource, /templateHasSubmitted/)
  assert.match(templatePageSource, /templateErrors/)
  assert.match(templatePageSource, /visibleTemplateErrors/)
  assert.match(templatePageSource, /focusTemplateErrorTarget/)
  assert.match(templatePageSource, /请输入模板名称/)
  assert.match(templatePageSource, /请至少添加一个周期/)
  assert.match(templatePageSource, /周期时长必须大于 0 秒/)
  assert.match(templatePageSource, /收益率不能小于 0/)
  assert.match(templatePageSource, /<FeedbackToast[\s\S]*visibleTemplateErrors\.map\(item => item\.message\)/)
  assert.match(templatePageSource, /:aria-invalid="!!getTemplateFieldError/)
  assert.match(templatePageSource, /:aria-describedby="getTemplateFieldDescribedBy/)
  assert.match(templatePageSource, /id="template-cycles-empty"/)
  assert.match(templatePageSource, /@wheel\.prevent/)
  assert.match(templatePageSource, /inputmode="numeric"/)
  assert.match(templatePageSource, /inputmode="decimal"/)
  assert.match(templatePageSource, /当前周期模板有未保存的修改，关闭后这些修改不会保存/)
})

test('existing template and contract previews keep their original display layout', () => {
  assert.doesNotMatch(managementPageSource, /cycle\.actualPayoutPct/)
  // The list shows each cycle's configured payout as 收益 (not the actual payout rate) in a table Tag (Pro list 2026-11-28).
  assert.match(templatePageSource, /<Tag v-for="cycle in visibleCycles\(record\)"[^>]*>\{\{ durationLabel\(cycle\.durationSec\) \}\} · 收益 \{\{ Number\(cycle\.payoutPct\)\.toFixed\(1\) \}\}%<\/Tag>/)
  assert.doesNotMatch(templatePageSource, /展示:/)
})

test('demo orders use the actual payout rate', () => {
  assert.match(orderMockSource, /cycle\.actualPayoutPct \/ 100/)
  assert.doesNotMatch(orderMockSource, /expectedPayout = investAmount \* \(cycle\.payoutPct \/ 100\)/)
  assert.match(orderMockSource, /actualPayoutPct: cycle\.actualPayoutPct/)
})
