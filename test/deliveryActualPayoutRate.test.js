import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
  assert.match(templatePageSource, /周期配置 <span class="text-rose-500">\*<\/span>/)
  assert.match(templatePageSource, /周期\{\{ index \+ 1 \}\}/)
  assert.match(templatePageSource, /实际收益率/)
  assert.match(templatePageSource, /v-model\.number="cycle\.actualPayoutPct"/)
  assert.match(templatePageSource, /actualPayoutPct: Number\(c\.actualPayoutPct\)/)
  assert.doesNotMatch(templatePageSource, /<table class="w-full text-left border-collapse ant-table">/)
})

test('period template editor stores the unlimited trade limit switch', () => {
  assert.match(deliveryMockSource, /tradeLimitUnlimited: false/)
  assert.match(deliveryMockSource, /saveDeliveryTemplatesMock/)
  assert.match(templatePageSource, /saveDeliveryTemplatesMock/)
  assert.match(templatePageSource, /\['trade', '交易'\]/)
  assert.match(templatePageSource, /templateForm\.tradeLimitUnlimited/)
  assert.match(templatePageSource, /role="switch"/)
  assert.match(templatePageSource, /不限交易额度/)
  assert.match(templatePageSource, /最低买入额、最高买入额和最大持仓额/)
  assert.match(templatePageSource, /当前状态：/)
  assert.match(templatePageSource, /grid grid-cols-1 gap-4 sm:grid-cols-\[minmax\(0,1fr\)_auto\]/)
  assert.match(templatePageSource, /inline-flex h-7 w-12 shrink-0 overflow-hidden rounded-full/)
  assert.match(templatePageSource, /sm:justify-self-end/)
})

test('period template dialog follows modal and tab interaction semantics', () => {
  assert.match(templatePageSource, /<Teleport to="body">/)
  assert.match(templatePageSource, /role="dialog"/)
  assert.match(templatePageSource, /aria-modal="true"/)
  assert.match(templatePageSource, /aria-labelledby="delivery-template-dialog-title"/)
  assert.match(templatePageSource, /aria-label="关闭"/)
  assert.match(templatePageSource, /isolateTemplateDialogBackground/)
  assert.match(templatePageSource, /releaseTemplateDialogBackground/)
  assert.match(templatePageSource, /appRoot\.inert = true/)
  assert.match(templatePageSource, /appRoot\.inert = false/)
  assert.match(templatePageSource, /isTemplateClosing/)
  assert.match(templatePageSource, /@after-leave="handleTemplateAfterLeave"/)
  assert.match(templatePageSource, /@keydown="handleTemplateDialogKeydown"/)
  assert.match(templatePageSource, /requestTemplateClose/)
  assert.match(templatePageSource, /performTemplateClose/)
  assert.match(templatePageSource, /lockPageScroll/)
  assert.match(templatePageSource, /unlockPageScroll/)
  assert.match(templatePageSource, /showTemplateUnsavedConfirm/)
  assert.match(templatePageSource, /delivery-template-unsaved-title/)
  assert.match(templatePageSource, /confirmTemplateUnsavedClose/)
  assert.match(templatePageSource, /cancelTemplateUnsavedClose/)
  assert.match(templatePageSource, /role="tablist"/)
  assert.match(templatePageSource, /role="tab"/)
  assert.match(templatePageSource, /role="tabpanel"/)
  assert.match(templatePageSource, /:aria-selected="templateTab === tab\[0\]"/)
  assert.match(templatePageSource, /:aria-controls="templatePanelIds\[tab\[0\]\]"/)
  assert.match(templatePageSource, /handleTemplateTabKeydown/)
  assert.match(templatePageSource, /prefers-reduced-motion: reduce/)
  assert.doesNotMatch(templatePageSource, /@click\.self="requestTemplateClose"/)
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
  assert.match(templatePageSource, /请修正以下内容后再保存模板/)
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
  assert.match(templatePageSource, /<span class="text-slate-500">收益:<\/span>/)
  assert.doesNotMatch(templatePageSource, /<span class="text-slate-500">展示:<\/span>/)
})

test('demo orders use the actual payout rate', () => {
  assert.match(orderMockSource, /cycle\.actualPayoutPct \/ 100/)
  assert.doesNotMatch(orderMockSource, /expectedPayout = investAmount \* \(cycle\.payoutPct \/ 100\)/)
  assert.match(orderMockSource, /actualPayoutPct: cycle\.actualPayoutPct/)
})
