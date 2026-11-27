import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as deliveryConstants from '../src/admin/constants/delivery.js'

import { assertAdminDialogFrame } from './helpers/adminDrawerFrame.js'
const pageSource = readFileSync(
  new URL('../src/pages/admin/delivery/DeliveryManagementPage.vue', import.meta.url),
  'utf8'
)
const routerSource = readFileSync(
  new URL('../src/router/modules/console.js', import.meta.url),
  'utf8'
)
const dialogLifecycleSource = readFileSync(
  new URL('../src/admin/composables/useDialogLifecycle.js', import.meta.url),
  'utf8'
)
const currencyTypeSelectSource = readFileSync(
  new URL('../src/admin/components/CurrencyTypeSelect.vue', import.meta.url),
  'utf8'
)
const deliveryMockSource = readFileSync(
  new URL('../src/admin/mock/delivery.js', import.meta.url),
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
  assert.match(pageSource, /产品状态[\s\S]*排序权重/)
  assert.match(pageSource, /v-model:value\.number="contractForm\.sortOrder"/)
  assert.match(pageSource, /数值越大越靠前/)
  assert.match(pageSource, /sortOrder: Number\(contractForm\.sortOrder\)/)
  assert.match(pageSource, /contractForm\.sortOrder = Number\(item\.sortOrder/)
  assert.match(pageSource, /sortDeliveryProducts/)
})

test('delivery contract numeric fields prevent accidental wheel changes', () => {
  const numberInputCount = (pageSource.match(/type="number"/g) || []).length
  const wheelPreventCount = (pageSource.match(/@wheel\.prevent/g) || []).length

  assert.equal(numberInputCount, 5)
  assert.equal(wheelPreventCount, numberInputCount)
  assert.match(pageSource, /runtimeVerification: 'static validation and wheel prevention verified; paste, IME, and mobile keyboard unverified'/)
})

test('delivery contract editor keeps trade limits editable and uses zero as unlimited', () => {
  assert.doesNotMatch(pageSource, /selectedTemplateTradeLimitUnlimited/)
  assert.doesNotMatch(pageSource, /不限交易额度已经打开/)
  assert.match(pageSource, /输入 0 表示最低买入额不限制/)
  assert.match(pageSource, /输入 0 表示最高买入额不限制/)
  assert.match(pageSource, /输入 0 表示最大持仓额不限制/)
  assert.match(pageSource, /class="grid gap-6 md:grid-cols-3"/)
  assert.match(pageSource, /min="0"[\s\S]*step="0\.000001"/)
})

test('delivery contract editor blocks disabled period templates on save', () => {
  assert.match(pageSource, /const enabledTemplates = computed\(\(\) => templates\.value\.filter\(\(t\) => t\.status === DELIVERY_STATUS\.ENABLED\)\)/)
  assert.match(pageSource, /const selectedTemplateDisabled = computed\(\(\) => selectedTemplate\.value\?\.status === DELIVERY_STATUS\.DISABLED\)/)
  assert.match(pageSource, /contractForm\.templateId = enabledTemplates\.value\[0\]\?\.id \|\| templates\.value\[0\]\?\.id \|\| ''/)
  assert.match(pageSource, /if \(!contractErrors\.templateId && !selectedTemplate\.value\) contractErrors\.templateId = '当前周期模板不存在，请重新选择'/)
  assert.match(pageSource, /if \(!contractErrors\.templateId && selectedTemplateDisabled\.value\) contractErrors\.templateId = '当前周期模板已禁用，请重新选择启用模板'/)
  assert.match(pageSource, /:disabled="tpl\.status === DELIVERY_STATUS\.DISABLED"[\s\S]*\{\{ tpl\.name \}\}\{\{ tpl\.status === DELIVERY_STATUS\.DISABLED \? '（已禁用）' : '' \}\}/)
  assert.match(pageSource, /当前周期模板不存在，请重新选择可用模板后保存。/)
  assert.match(pageSource, /当前周期模板已禁用，保存前需要重新选择启用模板。/)
})

test('delivery contract editor always submits product trade limits including explicit zero', () => {
  assert.match(pageSource, /contractForm\.minBuy = item\.minBuy \?\? '10'/)
  assert.match(pageSource, /contractForm\.maxBuy = item\.maxBuy \?\? '10000'/)
  assert.match(pageSource, /contractForm\.maxHold = item\.maxHold \?\? '50000'/)
  assert.match(pageSource, /const payload = \{[\s\S]*templateName: selectedTemplate\.value\?\.name \|\| '-'[\s\S]*buyFee: '0'[\s\S]*sellFee: contractForm\.sellFee[\s\S]*\}/)
  assert.match(pageSource, /Object\.assign\(payload, \{[\s\S]*buyRange: `\$\{tradeLimitDisplay\(contractForm\.minBuy\)\} - \$\{tradeLimitDisplay\(contractForm\.maxBuy\)\} USDT`[\s\S]*maxPosition: `\$\{tradeLimitDisplay\(contractForm\.maxHold\)\} USDT`[\s\S]*minBuy: contractForm\.minBuy[\s\S]*maxBuy: contractForm\.maxBuy[\s\S]*maxHold: contractForm\.maxHold/)
})

test('delivery contract table shows unlimited trade limits from zero product fields', () => {
  assert.match(deliveryMockSource, /name: 'ETH期权'[\s\S]*templateId: 'tpl-fast'[\s\S]*minBuy: '0'[\s\S]*maxBuy: '0'[\s\S]*maxHold: '0'/)
  assert.match(pageSource, /const productTradeLimitUnlimited = \(product\) => \['minBuy', 'maxBuy', 'maxHold'\]\.every\(\(field\) => limitIsUnlimited\(product\[field\]\)\)/)
  assert.match(pageSource, /const tradeLimitDisplay = \(value\) => \(limitIsUnlimited\(value\) \? '不限制' : numericLimitValue\(value\)\.toLocaleString\(\)\)/)
  assert.match(pageSource, /<Tag v-if="productTradeLimitUnlimited\(record\)"[^>]*>不限制<\/Tag>/)
  assert.match(pageSource, /:aria-label="`\$\{record\.name\} 交易限制不限制`"/)
  assert.match(pageSource, /tradeLimitRangeDisplay\(record\)[\s\S]*最大持仓 \{\{ tradeLimitMaxPositionDisplay\(record\) \}\}/)
})

test('delivery contract editor dialog follows modal semantics', () => {
  assert.match(pageSource, /import \{ createDialogCloseAction, useDialogLifecycle \} from '..\/..\/..\/admin\/composables\/useDialogLifecycle\.js'/)
  assert.match(pageSource, /useDialogLifecycle\(\{[\s\S]*open: showContractModal[\s\S]*dialogRef: contractDialogRef[\s\S]*initialFocusRef: contractDialogTitleRef[\s\S]*returnFocusRef: computed\(\(\) => lastContractTrigger\.value\)[\s\S]*requestClose: requestContractModalClose/)
  assert.match(pageSource, /const closeContractModal = createDialogCloseAction\(requestContractDialogClose\)/)
  // The shared Ant frame (AdminDialog) drives this page-owned lifecycle (dialog migration 2026-11-27).
  assertAdminDialogFrame(pageSource)
  assert.match(pageSource, /<AdminDialog :open="contractDialogRendered" :lifecycle="contractDialogLifecycle"[^>]*:title-id="contractDialogTitleId"/)
  assert.match(pageSource, /const contractDialogLifecycle = \{ rendered: contractDialogRendered, phase: contractDialogPhase, layerStyle: contractDialogLayerStyle, requestDialogClose: requestContractDialogClose, onAfterEnter: onContractDialogAfterEnter, onAfterLeave: handleContractModalAfterLeave, dialogRef: contractDialogRef \}/)
  assert.doesNotMatch(pageSource, /@click\.self="showContractModal = false"/)
  assert.doesNotMatch(pageSource, /@keydown="handleContractDialogKeydown"/)
  assert.match(dialogLifecycleSource, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(dialogLifecycleSource, /document\.documentElement\.style\.overflow = 'hidden'/)
  assert.match(dialogLifecycleSource, /setAttribute\?\.\('inert', ''\)/)
  assert.match(dialogLifecycleSource, /setAttribute\?\.\('aria-hidden', 'true'\)/)
  assert.match(dialogLifecycleSource, /document\.addEventListener\('keydown', keydownListener\)/)
  assert.match(dialogLifecycleSource, /event\.key === 'Escape'/)
  assert.match(dialogLifecycleSource, /event\.key !== 'Tab'/)
  assert.match(dialogLifecycleSource, /onAfterLeave/)
})

test('delivery contract editor declares interaction owner states required by standards', () => {
  assert.match(pageSource, /const contractFormLayoutState = computed\(\(\) => \(\{/)
  assert.match(pageSource, /formLayoutOwnerId/)
  assert.match(pageSource, /layoutSurface: 'dialog'/)
  assert.match(pageSource, /fieldRegistry:/)
  assert.match(pageSource, /actionBarAvoidance: 'dialog frame is non-scrolling; only body scrolls between fixed header and footer'/)
  assert.match(pageSource, /spanPolicy: 'template preview, selected-template policy help, and unlimited-limit notices span the active panel width'/)
  assert.match(pageSource, /overflowPolicy: 'long labels, selected template names, help, notices, cycle chips, and errors wrap inside their panels'/)
  assert.match(pageSource, /runtimeVerification: 'static tests, production build, and Chromium smoke verified for dialog visibility, mobile width, and 200% zoom entry; screen reader, physical touch, virtual keyboard, reduced-motion, high-contrast, and real safe-area checks remain unverified'/)
  assert.match(pageSource, /const contractFormState = computed\(\(\) => \(\{/)
  assert.match(pageSource, /dirty: contractFormDirty\.value/)
  assert.match(pageSource, /hasSubmitted: contractHasSubmitted\.value/)
  assert.match(pageSource, /closePolicy: 'dirty dialog close shows an in-dialog discard confirmation before lifecycle begins closing'/)
  assert.match(pageSource, /successPolicy: 'save updates the form baseline and closes the dialog'/)
  assert.match(pageSource, /const contractEditSurfaceState = computed\(\(\) => \(\{/)
  assert.match(pageSource, /surfaceId: editingContractId\.value \? `delivery-contract-edit-surface-\$\{editingContractId\.value\}` : 'delivery-contract-create-surface'/)
  assert.match(pageSource, /mode: editingContractId\.value \? 'edit' : 'create'/)
  assert.match(pageSource, /surfaceType: 'dialog'/)
  assert.match(pageSource, /choiceReason: 'short delivery contract product configuration keeps source list context and does not require a deep-linkable long editing workspace'/)
  assert.match(pageSource, /sourceListSnapshot:[\s\S]*owner: 'delivery-contract-product-table'[\s\S]*query: filters\.value[\s\S]*sort: \{ field: 'sortOrder', direction: 'desc'[\s\S]*focusTrigger: lastContractTrigger\.value\?\.id \|\| 'delivery-contract-create-or-card-edit-action'/)
  assert.match(pageSource, /recordIdentity: editingContractId\.value[\s\S]*id: editingContractId\.value[\s\S]*permissionScope: 'delivery-contract-product-edit'[\s\S]*collection: 'delivery-contract-products'[\s\S]*permissionScope: 'delivery-contract-product-create'/)
  assert.match(pageSource, /formSessionId: contractFormState\.value\.formOwnerId/)
  assert.match(pageSource, /returnStrategy:[\s\S]*onSuccess: 'update local list, refresh form baseline, close dialog, and restore source trigger focus through lifecycle'[\s\S]*onCancel: contractFormDirty\.value \? 'show discard confirmation before closing' : 'close dialog and restore source trigger focus'[\s\S]*onFailure: 'keep dialog open, retain draft, focus validation summary or field error'/)
  assert.match(pageSource, /inlineEditBoundary: 'list rows expose create\/edit actions only; record fields stay inside the dialog form owner'/)
  assert.match(pageSource, /runtimeVerification: 'static tests, production build, and Chromium smoke verified for focus containment, dirty close, mobile width, and 200% zoom; screen reader, physical touch, virtual keyboard, reduced-motion, high-contrast, and real safe-area checks remain unverified'/)
  assert.match(pageSource, /<form[\s\S]*:id="contractFormState\.formOwnerId"[\s\S]*novalidate[\s\S]*:aria-describedby="contractErrorItems\.length \? contractErrorSummaryId : undefined"[\s\S]*@submit\.prevent="saveContract"/)
  assert.match(pageSource, /type="submit"[\s\S]*aria-label="保存交割合约"[\s\S]*保存合约/)
  assert.doesNotMatch(pageSource, /aria-label="保存交割合约"[\s\S]*@click="saveContract"/)
  assert.match(pageSource, /const contractFieldGuidanceState = computed\(\(\) => \(\{/)
  assert.match(pageSource, /guidanceOwnerId: 'delivery-contract-editor-field-guidance'/)
  assert.match(pageSource, /fieldGuidanceRegistry: \[/)
  assert.match(pageSource, /requirementPolicy: 'required'/)
  assert.match(pageSource, /descriptionPolicy: 'selects the delivery period template; trade limits are configured independently in the trade limit tab and 0 means unlimited'/)
  assert.match(pageSource, /requirementPolicy: 'required numeric value, zero means no minimum buy limit'/)
  assert.match(pageSource, /errorRelationship: 'help, unit, and field error ids are recomputed through contractFieldDescribedBy'/)
  assert.match(pageSource, /const contractTabViewState = computed\(\(\) => \(\{/)
  assert.match(pageSource, /tabOwnerId: 'delivery-contract-editor-tabs'/)
  assert.match(pageSource, /tabRegistry: contractTabRegistry/)
  assert.match(pageSource, /dirtyBoundary: 'tab-switch-does-not-submit-or-discard-current-form-values'/)
  assert.match(pageSource, /const contractNumericInputStates = computed\(\(\) => \(\{/)
  assert.match(pageSource, /numericOwnerId: 'delivery-contract-sort-order'/)
  assert.match(pageSource, /numericOwnerId: 'delivery-contract-min-buy'/)
  assert.match(pageSource, /numericOwnerId: 'delivery-contract-max-buy'/)
  assert.match(pageSource, /numericOwnerId: 'delivery-contract-max-hold'/)
  assert.match(pageSource, /numericOwnerId: 'delivery-contract-sell-fee'/)
  assert.match(pageSource, /const contractSelectionControlState = computed\(\(\) => \(\{/)
  assert.match(pageSource, /controlOwnerId: 'delivery-contract-status-control'/)
  assert.match(pageSource, /controlKind: 'radio-group'/)
  assert.match(pageSource, /optionSet: contractStatusOptionRegistry/)
  assert.match(pageSource, /commitMode: 'form-submit'/)
})

test('delivery contract editor tabs support accessible keyboard navigation', () => {
  assert.match(pageSource, /const contractTabRegistry = \[/)
  assert.match(pageSource, /const handleContractTabKeydown = \(event\) =>/)
  assert.match(pageSource, /const keys = \['ArrowLeft', 'ArrowRight', 'Home', 'End'\]/)
  assert.match(pageSource, /setContractTab\(contractTabRegistry\[nextIndex\]\.id, \{ focus: true \}\)/)
  assert.match(pageSource, /role="tablist"[\s\S]*aria-orientation="horizontal"[\s\S]*@keydown="handleContractTabKeydown"/)
  assert.match(pageSource, /v-for="tab in contractTabRegistry"/)
  assert.match(pageSource, /@click="setContractTab\(tab\.id\)"/)
  assert.match(pageSource, /:tabindex="contractTab === tab\.id \? 0 : -1"/)
  assert.match(pageSource, /v-show="contractTab === DELIVERY_CONTRACT_TAB\.BASIC"[\s\S]*role="tabpanel"[\s\S]*:hidden="contractTab !== DELIVERY_CONTRACT_TAB\.BASIC"/)
  assert.match(pageSource, /v-show="contractTab === DELIVERY_CONTRACT_TAB\.CYCLE"[\s\S]*role="tabpanel"[\s\S]*:hidden="contractTab !== DELIVERY_CONTRACT_TAB\.CYCLE"/)
  assert.match(pageSource, /v-show="contractTab === DELIVERY_CONTRACT_TAB\.LIMIT"[\s\S]*role="tabpanel"[\s\S]*:hidden="contractTab !== DELIVERY_CONTRACT_TAB\.LIMIT"/)
  assert.match(pageSource, /v-show="contractTab === DELIVERY_CONTRACT_TAB\.FEE"[\s\S]*role="tabpanel"[\s\S]*:hidden="contractTab !== DELIVERY_CONTRACT_TAB\.FEE"/)
  assert.doesNotMatch(pageSource, /v-if="contractTab === DELIVERY_CONTRACT_TAB\.(BASIC|CYCLE|LIMIT|FEE)"/)
})

test('delivery contract status radio group supports selection-control keyboard behavior', () => {
  assert.match(pageSource, /const contractStatusOptionRegistry = \[/)
  assert.match(pageSource, /const handleContractStatusKeydown = \(event\) =>/)
  assert.match(pageSource, /const keys = \['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'\]/)
  assert.match(pageSource, /setContractStatus\(enabledOptions\[nextIndex\]\.id, \{ focus: true \}\)/)
  assert.match(pageSource, /id="delivery-contract-status-label"[\s\S]*<span aria-hidden="true" class="text-rose-500 mr-1">\*<\/span>产品状态/)
  assert.match(pageSource, /role="radiogroup"[\s\S]*aria-labelledby="delivery-contract-status-label"[\s\S]*aria-describedby="delivery-contract-status-help"[\s\S]*aria-required="true"[\s\S]*@keydown="handleContractStatusKeydown"/)
  assert.match(pageSource, /id="delivery-contract-status-help"[\s\S]*状态调整会随本次保存一起生效/)
  assert.match(pageSource, /v-for="option in contractStatusOptionRegistry"/)
  assert.match(pageSource, /role="radio"/)
  assert.match(pageSource, /:aria-checked="contractForm\.status === option\.id"/)
  assert.match(pageSource, /:tabindex="contractForm\.status === option\.id \? 0 : -1"/)
  assert.match(pageSource, /required: true/)
  assert.match(pageSource, /requirementPolicy: 'required with default value and visible required marker'/)
  assert.match(pageSource, /a11yPolicy: 'required role=radiogroup with labelled owner, visible required marker, aria-required, described help text/)
  assert.match(pageSource, /@click="setContractStatus\(option\.id\)"/)
})

test('delivery contract list uses the Pro query card and table card', () => {
  assert.match(pageSource, /import PageShell from '\.\.\/earn\/EarnPageShell\.vue'/)
  assert.match(pageSource, /import SearchForm from '\.\.\/earn\/EarnSearchForm\.vue'/)
  assert.match(pageSource, /import AdminTable from '\.\.\/earn\/EarnAdminTable\.vue'/)
  assert.doesNotMatch(pageSource, /<h1/)
  assert.doesNotMatch(pageSource, /role="tablist"[\s\S]*交割合约产品状态筛选/)
  assert.match(pageSource, /<PageShell>[\s\S]*<SearchForm name="delivery-contract-filters" :model="filters" :fields="queryFields" @search="applySearch" @reset="resetSearch" \/>/)
  // One query field per filter (no combined keyword box); status, currency type and pair keep their filter capability.
  assert.match(pageSource, /\{ key: 'name', label: '产品名称' \}/)
  assert.match(pageSource, /\{ key: 'code', label: '合约代码' \}/)
  assert.match(pageSource, /\{ key: 'pair', label: '交易对', searchable: true, options:/)
  assert.match(pageSource, /\{ key: 'currencyType', label: '币种类型', options:/)
  assert.match(pageSource, /\{ key: 'status', label: '状态', options:/)
  assert.match(pageSource, /const applySearch = \(values\) => \{[\s\S]*filters\.value = \{ \.\.\.blankFilters\(\), \.\.\.values \}[\s\S]*page\.value = 1/)
  assert.match(pageSource, /const resetSearch = \(\) => \{[\s\S]*filters\.value = blankFilters\(\)[\s\S]*page\.value = 1/)
  assert.match(pageSource, /return sortDeliveryProducts\(products\.value\.filter/)
  assert.match(pageSource, /<AdminTable title="交割合约产品" v-model:page="page" :rows="allFilteredProducts" :columns="productColumns" row-key="id" desktop-only>/)
  assert.match(pageSource, /<template #toolbar>[\s\S]*id="delivery-contract-create" type="primary" aria-label="新增交割合约" @click="openCreateContract\(\$event\)"/)
  assert.match(pageSource, /\{ key: 'limit', title: '交易限制（USDT）', width: 220, align: 'right' \}/)
  assert.match(pageSource, /\{ key: 'sortOrder', title: '排序权重', width: 100, align: 'right' \}/)
  assert.match(pageSource, /<Tag v-else-if="column\.key === 'status'"[^>]*>\{\{ record\.status === DELIVERY_STATUS\.ENABLED \? '已启用' : '已禁用' \}\}<\/Tag>/)
  assert.match(pageSource, /<Button v-else-if="column\.key === 'actions'" type="link"[^>]*:aria-label="`编辑交割合约 \$\{record\.name\}`" @click="openEditContract\(record, \$event\)">编辑<\/Button>/)
})

test('delivery contract dialog keeps a fixed frame with scrollable content', () => {
  assertAdminDialogFrame(pageSource)
  assert.match(pageSource, /<div class="shrink-0 border-b border-slate-100 bg-white px-6">/)
  assert.match(pageSource, /<div class="min-h-0 flex-1 space-y-6 overflow-y-auto bg-white p-6">/)
  assert.match(pageSource, /<footer class="shrink-0 border-t border-slate-100 px-6 py-4 \[padding-bottom:max\(1rem,env\(safe-area-inset-bottom\)\)\]">/)
  assert.match(pageSource, /<div class="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">[\s\S]*class="w-full sm:w-auto"[\s\S]*<a-button type="primary"[\s\S]*?class="[^"]*w-full sm:w-auto"/)
})

test('delivery contract template preview wraps selected template details', () => {
  assert.match(pageSource, /<article v-if="selectedTemplate" class="space-y-4 rounded border border-blue-100 bg-blue-50\/30 p-4">/)
  assert.match(pageSource, /class="flex flex-wrap items-start justify-between gap-2"[\s\S]*class="min-w-0 break-words text-sm font-semibold text-slate-900"[\s\S]*class="shrink-0 text-xs text-blue-600"/)
  assert.match(pageSource, /v-for="cycle in selectedTemplateCycles"[\s\S]*class="flex max-w-full flex-wrap items-center gap-2 rounded border border-blue-100 bg-white px-3 py-1\.5 text-xs"/)
})

test('delivery contract editor exposes validation summary and field errors', () => {
  assert.match(pageSource, /const contractErrors = reactive/)
  assert.match(pageSource, /const contractHasSubmitted = ref\(false\)/)
  assert.match(pageSource, /const pairOptionsLoading = ref\(false\)/)
  assert.match(pageSource, /const pairOptionsError = ref\(''\)/)
  assert.match(pageSource, /const selectedSpotSymbolUnavailable = computed\(\(\) => Boolean\(contractForm\.spotSymbol\) && pairOptions\.value\.length > 0 && !pairOptions\.value\.includes\(contractForm\.spotSymbol\)\)/)
  assert.match(pageSource, /const validateContractForm = \(\) =>/)
  assert.match(pageSource, /watch\(\s*\n\s*\(\) => \[[\s\S]*contractForm\.name[\s\S]*contractForm\.sellFee[\s\S]*pairOptionsError\.value[\s\S]*if \(contractHasSubmitted\.value\) validateContractForm\(\)/)
  assert.match(pageSource, /contractHasSubmitted\.value = true[\s\S]*if \(!validateContractForm\(\)\)/)
  assert.match(pageSource, /contractHasSubmitted\.value = false[\s\S]*contractInitialSnapshot\.value = createContractFormSnapshot\(\)/)
  assert.match(pageSource, /contractErrorItems\.map\(item => item\.message\)/)
  assert.match(pageSource, /contractErrorSummaryRef\.value\?\.focus/)
  assert.match(pageSource, /<FeedbackToast[^>]*:id="contractErrorSummaryId"/)
  assert.match(pageSource, /focusContractField\(contractErrorItems\[0\]\.field\)/)
  assert.match(pageSource, /if \(!contractErrors\.spotSymbol && pairOptionsError\.value\) contractErrors\.spotSymbol = pairOptionsError\.value/)
  assert.match(pageSource, /if \(!contractErrors\.spotSymbol && pairOptionsLoading\.value\) contractErrors\.spotSymbol = '交易对列表加载中，请稍后再保存'/)
  assert.match(pageSource, /if \(!contractErrors\.spotSymbol && selectedSpotSymbolUnavailable\.value\) contractErrors\.spotSymbol = '当前交易对不在可用交易对列表中，请重新选择'/)
  assert.match(pageSource, /if \(!contractForm\.spotSymbol\) \{[\s\S]*contractForm\.spotSymbol = pairOptions\.value\[0\] \|\| ''[\s\S]*\}/)
  assert.doesNotMatch(pageSource, /if \(!contractForm\.spotSymbol \|\| !pairOptions\.value\.includes\(contractForm\.spotSymbol\)\)/)
  assert.match(pageSource, /:aria-invalid="Boolean\(contractErrors\.name\)"/)
  assert.match(pageSource, /:id="contractFieldId\('name'\)"[\s\S]*required[\s\S]*aria-required="true"[\s\S]*:aria-invalid="Boolean\(contractErrors\.name\)"/)
  assert.match(pageSource, /:id="contractFieldId\('code'\)"[\s\S]*required[\s\S]*aria-required="true"[\s\S]*:aria-invalid="Boolean\(contractErrors\.code\)"/)
  assert.match(pageSource, /:id="contractFieldId\('spotSymbol'\)"[\s\S]*required[\s\S]*aria-required="true"[\s\S]*:aria-invalid="Boolean\(contractErrors\.spotSymbol\)"/)
  assert.match(pageSource, /class="space-y-1\.5 md:col-span-2" :aria-busy="pairOptionsLoading \? 'true' : undefined"/)
  assert.match(pageSource, /:id="contractFieldId\('spotSymbol'\)"[\s\S]*:disabled="pairOptionsLoading"[\s\S]*<a-select-option v-if="pairOptionsLoading" value="">交易对加载中\.\.\.<\/a-select-option>/)
  assert.match(pageSource, /v-else-if="contractForm\.spotSymbol && !pairOptions\.includes\(contractForm\.spotSymbol\)"[\s\S]*\{\{ contractForm\.spotSymbol \}\}（当前不可用）/)
  assert.match(pageSource, /id="delivery-contract-spot-symbol-help" class="text-xs text-slate-400" aria-live="polite"[\s\S]*当前交易对已不在可用列表中，请重新选择后保存/)
  assert.match(pageSource, /v-if="pairOptionsError"[\s\S]*:disabled="pairOptionsLoading"[\s\S]*aria-label="重新加载交割合约可用交易对"[\s\S]*@click="loadSpotSymbols"/)
  assert.match(pageSource, /:id="contractFieldId\('sortOrder'\)"[\s\S]*required[\s\S]*aria-required="true"[\s\S]*:aria-invalid="Boolean\(contractErrors\.sortOrder\)"/)
  assert.match(pageSource, /:id="contractFieldId\('templateId'\)"[\s\S]*required[\s\S]*aria-required="true"[\s\S]*:aria-invalid="Boolean\(contractErrors\.templateId\)"/)
  assert.match(pageSource, /const selectedTemplatePolicyText = computed\(\(\) => \([\s\S]*当前周期模板不存在，请重新选择可用模板后保存。[\s\S]*当前周期模板已禁用，保存前需要重新选择启用模板。[\s\S]*周期模板只提供交割周期配置，交易限制请在交易限制页配置；最低买入、最高买入或最大持仓填写 0 表示对应项不限制。/)
  assert.match(pageSource, /:aria-describedby="contractFieldDescribedBy\('templateId', 'delivery-contract-template-help'\)"/)
  assert.match(pageSource, /id="delivery-contract-template-help" class="text-xs leading-5 text-slate-400" aria-live="polite"[\s\S]*\{\{ selectedTemplatePolicyText \}\}/)
  assert.match(pageSource, /:id="contractFieldId\('minBuy'\)"[\s\S]*required[\s\S]*aria-required="true"[\s\S]*:aria-invalid="Boolean\(contractErrors\.minBuy\)"/)
  assert.match(pageSource, /:id="contractFieldId\('maxBuy'\)"[\s\S]*required[\s\S]*aria-required="true"[\s\S]*:aria-invalid="Boolean\(contractErrors\.maxBuy\)"/)
  assert.match(pageSource, /:id="contractFieldId\('maxHold'\)"[\s\S]*required[\s\S]*aria-required="true"[\s\S]*:aria-invalid="Boolean\(contractErrors\.maxHold\)"/)
  assert.match(pageSource, /:id="contractFieldId\('sellFee'\)"[\s\S]*required[\s\S]*aria-required="true"[\s\S]*:aria-invalid="Boolean\(contractErrors\.sellFee\)"/)
  assert.match(pageSource, /:aria-describedby="contractFieldDescribedBy\('name'\)"/)
  assert.match(pageSource, /最低买入额必须是大于等于 0 的数字/)
  assert.match(pageSource, /最高买入额不能小于最低买入额；任一项填 0 表示该项不限制/)
  assert.match(pageSource, /最大持仓额不能小于最高买入额；任一项填 0 表示该项不限制/)
  assert.match(pageSource, /交割手续费率必须在 0 到 100 之间/)
})

test('delivery contract form protects dirty edits before closing the dialog', () => {
  assert.match(pageSource, /import \{ computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch \} from 'vue'/)
  assert.match(pageSource, /import \{ onBeforeRouteLeave, useRouter \} from 'vue-router'/)
  assert.match(pageSource, /const router = useRouter\(\)/)
  assert.match(pageSource, /const contractInitialSnapshot = ref\(null\)/)
  assert.match(pageSource, /const contractDiscardConfirmVisible = ref\(false\)/)
  assert.match(pageSource, /const contractDiscardConfirmRef = ref\(null\)/)
  assert.match(pageSource, /const contractDiscardCloseBypass = ref\(false\)/)
  assert.match(pageSource, /const contractPendingRouteLeavePath = ref\(''\)/)
  assert.match(pageSource, /const createContractFormSnapshot = \(\) => \(\{/)
  assert.match(pageSource, /const contractFormDirty = computed\(\(\) => \{[\s\S]*JSON\.stringify\(createContractFormSnapshot\(\)\) !== JSON\.stringify\(contractInitialSnapshot\.value\)/)
  assert.match(pageSource, /const contractNavigationState = computed\(\(\) => \(\{/)
  assert.match(pageSource, /dirtyBlockers: contractFormDirty\.value[\s\S]*owner: contractFormState\.value\.formOwnerId[\s\S]*reason: 'delivery contract editor has unsaved changes'[\s\S]*asyncState: 'idle'[\s\S]*confirmationText: contractPendingRouteLeavePath\.value[\s\S]*continueTarget: contractPendingRouteLeavePath\.value \|\| 'close-dialog'[\s\S]*pendingTarget: contractPendingRouteLeavePath\.value/)
  assert.match(pageSource, /historyIntent: contractPendingRouteLeavePath\.value \? 'blocked' : 'idle'/)
  assert.match(pageSource, /const contractDiscardConfirmState = computed\(\(\) => \(\{/)
  assert.match(pageSource, /body: contractPendingRouteLeavePath\.value[\s\S]*离开页面后这些修改不会保存，请确认是否放弃并继续离开。[\s\S]*关闭后这些修改不会保存，请确认是否放弃。/)
  assert.match(pageSource, /confirmLabel: contractPendingRouteLeavePath\.value \? '放弃并离开' : '放弃修改'/)
  assert.match(pageSource, /closePolicy: 'dirty dialog close shows an in-dialog discard confirmation before lifecycle begins closing'/)
  assert.match(pageSource, /const showContractDiscardConfirm = async \(\) => \{[\s\S]*contractDiscardConfirmVisible\.value = true[\s\S]*contractDiscardConfirmRef\.value\?\.focus\(\)/)
  assert.match(pageSource, /const requestContractModalClose = \(\) => \{[\s\S]*if \(contractFormDirty\.value && !contractDiscardCloseBypass\.value\)[\s\S]*showContractDiscardConfirm\(\)[\s\S]*return false[\s\S]*contractPendingRouteLeavePath\.value = ''[\s\S]*showContractModal\.value = false[\s\S]*return true/)
  assert.match(pageSource, /const keepEditingContract = \(\) => \{[\s\S]*contractDiscardConfirmVisible\.value = false/)
  assert.match(pageSource, /contractPendingRouteLeavePath\.value = ''/)
  assert.match(pageSource, /const discardContractChanges = async \(\) => \{[\s\S]*const pendingRoute = contractPendingRouteLeavePath\.value[\s\S]*contractDiscardCloseBypass\.value = true[\s\S]*closeContractModal\(\)[\s\S]*router\.push\(pendingRoute\)/)
  assert.match(pageSource, /onBeforeRouteLeave\(\(to\) => \{[\s\S]*showContractModal\.value && contractFormDirty\.value && !contractDiscardCloseBypass\.value[\s\S]*contractPendingRouteLeavePath\.value = to\.fullPath \|\| to\.path[\s\S]*showContractDiscardConfirm\(\)[\s\S]*return false[\s\S]*return true/)
  assert.match(pageSource, /const handleContractBeforeUnload = \(event\) => \{[\s\S]*!showContractModal\.value \|\| !contractFormDirty\.value \|\| contractDiscardCloseBypass\.value[\s\S]*event\.preventDefault\(\)[\s\S]*event\.returnValue = ''[\s\S]*return ''/)
  assert.match(pageSource, /onMounted\(\(\) => \{[\s\S]*loadSpotSymbols\(\)[\s\S]*window\.addEventListener\('beforeunload', handleContractBeforeUnload\)[\s\S]*\}\)/)
  assert.match(pageSource, /onBeforeUnmount\(\(\) => \{[\s\S]*window\.removeEventListener\('beforeunload', handleContractBeforeUnload\)[\s\S]*\}\)/)
  assert.match(pageSource, /contractInitialSnapshot\.value = createContractFormSnapshot\(\)[\s\S]*openContractModal\(event\)/)
  assert.match(pageSource, /contractDiscardCloseBypass\.value = true[\s\S]*closeContractModal\(\)/)
  assert.match(pageSource, /contractInitialSnapshot\.value = createContractFormSnapshot\(\)[\s\S]*closeContractModal\(\)/)
  assert.match(pageSource, /v-if="contractDiscardConfirmVisible"[\s\S]*role="alert"[\s\S]*\{\{ contractDiscardConfirmState\.title \}\}/)
  assert.match(pageSource, /\{\{ contractDiscardConfirmState\.body \}\}/)
  assert.match(pageSource, /<div class="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">[\s\S]*class="w-full sm:w-auto"[\s\S]*<a-button type="primary"[\s\S]*?class="[^"]*w-full sm:w-auto"/)
  assert.match(pageSource, /@click="keepEditingContract"/)
  assert.match(pageSource, /:aria-label="contractDiscardConfirmState\.confirmAriaLabel"/)
  assert.match(pageSource, /@click="discardContractChanges"/)
  assert.match(pageSource, /\{\{ contractDiscardConfirmState\.confirmLabel \}\}/)
  assert.doesNotMatch(pageSource, /window\.confirm/)
})

test('delivery contracts route opens the optimized contract management page', () => {
  assert.match(routerSource, /path: 'delivery'[\s\S]*redirect: '\/admin\/delivery\/contracts'/)
  assert.match(routerSource, /path: 'delivery\/contract'[\s\S]*redirect: '\/admin\/delivery\/contracts'/)
  assert.match(routerSource, /path: 'delivery\/contracts'[\s\S]*name: 'delivery-contracts'[\s\S]*DeliveryManagementPage\.vue/)
})
