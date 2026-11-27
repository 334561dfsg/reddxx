<script setup>
import AdminDialog from '../../../admin/components/antd/AdminDialog.vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import {
  COMMON_FILTER_ALL,
  DELIVERY_CONTRACT_TAB,
  DELIVERY_STATUS,
  sortDeliveryProducts
} from '../../../admin/constants/delivery'
import { ASSET_CURRENCY_TYPE } from '../../../admin/constants/assets'
import { Button, Space, Tag, TypographyText } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { createDeliveryProductsMock, createDeliveryTemplatesMock } from '../../../admin/mock/delivery'
import { createAssetsCoinsMock } from '../../../admin/mock/assets'
import { symbolApi } from '../../../admin/mock/spot'
import { createDialogCloseAction, useDialogLifecycle } from '../../../admin/composables/useDialogLifecycle.js'

const router = useRouter()

const templates = ref(createDeliveryTemplatesMock())
const products = ref(createDeliveryProductsMock())
const assetsCoins = createAssetsCoinsMock()

// Pro list (2026-11-28): one query field per filter, applied only on 查询; status moved from tabs into the query card.
const blankFilters = () => ({ name: '', code: '', pair: COMMON_FILTER_ALL, currencyType: COMMON_FILTER_ALL, status: COMMON_FILTER_ALL })
const filters = ref(blankFilters())
const page = ref(1)

const normalizeCurrencyType = (value) => {
  if (value === ASSET_CURRENCY_TYPE.VIRTUAL || value === ASSET_CURRENCY_TYPE.METAL || value === ASSET_CURRENCY_TYPE.FIAT) return value
  if (value === 'onchain') return ASSET_CURRENCY_TYPE.VIRTUAL
  if (value === 'offchain') return ASSET_CURRENCY_TYPE.FIAT
  return ASSET_CURRENCY_TYPE.VIRTUAL
}

const coinTypeMap = computed(() => {
  const map = new Map()
  assetsCoins.forEach((coin) => {
    if (!coin?.symbol) return
    map.set(String(coin.symbol).toUpperCase(), normalizeCurrencyType(coin.type))
  })
  return map
})

const currencyTypeBySymbol = (symbol) => {
  if (!symbol) return ASSET_CURRENCY_TYPE.VIRTUAL
  return coinTypeMap.value.get(String(symbol).toUpperCase()) || ASSET_CURRENCY_TYPE.VIRTUAL
}

const currencyTypeByPair = (pair) => {
  const [baseCurrency] = String(pair || '').split('/')
  return currencyTypeBySymbol(baseCurrency)
}

const currencyTypeLabel = (value) => {
  const type = normalizeCurrencyType(value)
  if (type === ASSET_CURRENCY_TYPE.VIRTUAL) return '虚拟币'
  if (type === ASSET_CURRENCY_TYPE.FIAT) return '法币'
  if (type === ASSET_CURRENCY_TYPE.METAL) return '贵金属'
  return String(type || '')
}

const pairFilterOptions = computed(() => [...new Set(products.value.map((p) => p.pair).filter(Boolean))].map((value) => ({ value, label: value })))
const queryFields = computed(() => [
  { key: 'name', label: '产品名称' },
  { key: 'code', label: '合约代码' },
  { key: 'pair', label: '交易对', searchable: true, options: [{ value: COMMON_FILTER_ALL, label: '全部交易对' }, ...pairFilterOptions.value] },
  { key: 'currencyType', label: '币种类型', options: [{ value: COMMON_FILTER_ALL, label: '全部币种类型' }, { value: ASSET_CURRENCY_TYPE.VIRTUAL, label: '虚拟币' }, { value: ASSET_CURRENCY_TYPE.FIAT, label: '法币' }, { value: ASSET_CURRENCY_TYPE.METAL, label: '贵金属' }] },
  { key: 'status', label: '状态', options: [{ value: COMMON_FILTER_ALL, label: '全部状态' }, { value: DELIVERY_STATUS.ENABLED, label: '已启用' }, { value: DELIVERY_STATUS.DISABLED, label: '已禁用' }] }
])

const textHit = (value, query) => !query || String(value || '').toLowerCase().includes(String(query).trim().toLowerCase())
const allFilteredProducts = computed(() => {
  const f = filters.value
  return sortDeliveryProducts(products.value.filter((p) => (
    (f.status === COMMON_FILTER_ALL || p.status === f.status) &&
    textHit(p.name, f.name) &&
    textHit(p.code, f.code) &&
    (f.pair === COMMON_FILTER_ALL || p.pair === f.pair) &&
    (f.currencyType === COMMON_FILTER_ALL || currencyTypeByPair(p.pair) === f.currencyType)
  )))
})

const applySearch = (values) => {
  filters.value = { ...blankFilters(), ...values }
  page.value = 1
}

const resetSearch = () => {
  filters.value = blankFilters()
  page.value = 1
}

const productColumns = [
  { key: 'product', title: '产品', width: 200, fixed: 'left' },
  { key: 'pair', title: '交易对', width: 150 },
  { key: 'template', title: '周期模板', width: 260 },
  { key: 'limit', title: '交易限制（USDT）', width: 220, align: 'right' },
  { key: 'fee', title: '交割费率', width: 110, align: 'right' },
  { key: 'sortOrder', title: '排序权重', width: 100, align: 'right' },
  { key: 'status', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 90, fixed: 'right' }
]

const durationLabel = (sec) => {
  if (sec < 60) return `${sec}秒`
  if (sec % 60 === 0) return `${sec / 60}分钟`
  return `${sec}s`
}

const templateById = computed(() => Object.fromEntries(templates.value.map((t) => [t.id, t])))
const enabledTemplates = computed(() => templates.value.filter((t) => t.status === DELIVERY_STATUS.ENABLED))
const productCycles = (product) => templateById.value[product.templateId]?.cycles || []
// The template name stored on the product goes stale when the template is renamed; prefer the live template.
const productTemplateName = (product) => templateById.value[product.templateId]?.name || product.templateName || '—'
const numericLimitValue = (value) => Number(value)
const limitIsUnlimited = (value) => value !== '' && value !== null && value !== undefined && numericLimitValue(value) === 0
const productTradeLimitUnlimited = (product) => ['minBuy', 'maxBuy', 'maxHold'].every((field) => limitIsUnlimited(product[field]))
const tradeLimitDisplay = (value) => (limitIsUnlimited(value) ? '不限制' : numericLimitValue(value).toLocaleString())
const tradeLimitRangeDisplay = (product) => `${tradeLimitDisplay(product.minBuy)} - ${tradeLimitDisplay(product.maxBuy)} USDT`
const tradeLimitMaxPositionDisplay = (product) => `${tradeLimitDisplay(product.maxHold)} USDT`

const showContractModal = ref(false)
const editingContractId = ref('')
const contractTab = ref(DELIVERY_CONTRACT_TAB.BASIC)
const contractDialogRef = ref(null)
const contractDialogTitleRef = ref(null)
const contractErrorSummaryRef = ref(null)
const lastContractTrigger = ref(null)
const contractInitialSnapshot = ref(null)
const contractDiscardConfirmVisible = ref(false)
const contractDiscardConfirmRef = ref(null)
const contractDiscardCloseBypass = ref(false)
const contractPendingRouteLeavePath = ref('')
const contractHasSubmitted = ref(false)

const contractTabRegistry = [
  { id: DELIVERY_CONTRACT_TAB.BASIC, title: '基本信息', scope: 'delivery-contract-basic' },
  { id: DELIVERY_CONTRACT_TAB.CYCLE, title: '周期设置', scope: 'delivery-contract-cycle' },
  { id: DELIVERY_CONTRACT_TAB.LIMIT, title: '交易限制', scope: 'delivery-contract-limit' },
  { id: DELIVERY_CONTRACT_TAB.FEE, title: '费率设置', scope: 'delivery-contract-fee' }
]

const contractForm = reactive({
  name: '',
  code: '',
  baseCurrency: 'BTC',
  quoteCurrency: 'USDT',
  spotSymbol: '',
  status: DELIVERY_STATUS.ENABLED,
  sortOrder: 0,
  templateId: 'tpl-standard',
  minBuy: '10',
  maxBuy: '10000',
  maxHold: '50000',
  buyFee: '0',
  sellFee: '0.2'
})

const contractStatusOptionRegistry = [
  { id: DELIVERY_STATUS.ENABLED, label: '已启用', disabled: false, permission: 'editable' },
  { id: DELIVERY_STATUS.DISABLED, label: '已禁用', disabled: false, permission: 'editable' }
]

const contractErrors = reactive({
  name: '',
  code: '',
  spotSymbol: '',
  templateId: '',
  sortOrder: '',
  minBuy: '',
  maxBuy: '',
  maxHold: '',
  sellFee: ''
})

const selectedTemplate = computed(() => templates.value.find((t) => t.id === contractForm.templateId) || null)
const selectedTemplateCycles = computed(() => selectedTemplate.value?.cycles || [])
const selectedTemplateDisabled = computed(() => selectedTemplate.value?.status === DELIVERY_STATUS.DISABLED)
const selectedTemplatePolicyText = computed(() => (
  !selectedTemplate.value
    ? '当前周期模板不存在，请重新选择可用模板后保存。'
    : selectedTemplateDisabled.value
      ? '当前周期模板已禁用，保存前需要重新选择启用模板。'
      : '周期模板只提供交割周期配置，交易限制请在交易限制页配置；最低买入、最高买入或最大持仓填写 0 表示对应项不限制。'
))

const createContractFormSnapshot = () => ({
  name: contractForm.name.trim(),
  code: contractForm.code.trim().toUpperCase(),
  baseCurrency: contractForm.baseCurrency,
  quoteCurrency: contractForm.quoteCurrency,
  spotSymbol: contractForm.spotSymbol,
  status: contractForm.status,
  sortOrder: Number(contractForm.sortOrder),
  templateId: contractForm.templateId,
  minBuy: String(contractForm.minBuy),
  maxBuy: String(contractForm.maxBuy),
  maxHold: String(contractForm.maxHold),
  buyFee: String(contractForm.buyFee),
  sellFee: String(contractForm.sellFee)
})

const contractFormDirty = computed(() => {
  if (!contractInitialSnapshot.value) return false
  return JSON.stringify(createContractFormSnapshot()) !== JSON.stringify(contractInitialSnapshot.value)
})

watch(contractFormDirty, (dirty) => {
  if (!dirty) contractDiscardConfirmVisible.value = false
})

const contractFormLayoutState = computed(() => ({
  formLayoutOwnerId: editingContractId.value ? `delivery-contract-edit-${editingContractId.value}` : 'delivery-contract-create',
  layoutSurface: 'dialog',
  fieldRegistry: [
    'name',
    'code',
    'spotSymbol',
    'status',
    'sortOrder',
    'templateId',
    'minBuy',
    'maxBuy',
    'maxHold',
    'sellFee'
  ],
  groupRegistry: contractTabRegistry.map((tab) => tab.id),
  layoutMode: 'two-column',
  breakpointPolicy: 'desktop two-column where fields are short; narrow and zoomed layouts collapse through existing grid breakpoints',
  fieldOrder: 'visual, DOM, Tab, and screen-reader order follow the active panel field order',
  alignmentPolicy: 'visible label, control, help text, and error text are stacked per field',
  spanPolicy: 'template preview, selected-template policy help, and unlimited-limit notices span the active panel width',
  densityPolicy: 'dialog form density with reachable 40px-plus controls and fixed footer actions',
  overflowPolicy: 'long labels, selected template names, help, notices, cycle chips, and errors wrap inside their panels',
  errorPlacementPolicy: 'field errors stay adjacent to fields; error summary focuses before field navigation',
  actionBarAvoidance: 'dialog frame is non-scrolling; only body scrolls between fixed header and footer',
  responsivePolicy: 'core fields and save/cancel remain present through viewport changes',
  focusRestorationPolicy: 'dialog lifecycle restores trigger focus; error summary routes focus to active field',
  lifecycleDisposal: 'shared dialog lifecycle owns scroll lock, inert, keydown listener, and cleanup',
  runtimeVerification: 'static tests, production build, and Chromium smoke verified for dialog visibility, mobile width, and 200% zoom entry; screen reader, physical touch, virtual keyboard, reduced-motion, high-contrast, and real safe-area checks remain unverified'
}))

const contractFormState = computed(() => ({
  formOwnerId: editingContractId.value ? `delivery-contract-form-${editingContractId.value}` : 'delivery-contract-form-create',
  pristine: !contractFormDirty.value,
  dirty: contractFormDirty.value,
  submitPhase: 'idle',
  validating: false,
  submitting: false,
  submitError: '',
  submitSucceeded: false,
  hasSubmitted: contractHasSubmitted.value,
  initialValue: contractInitialSnapshot.value,
  currentValue: createContractFormSnapshot(),
  closePolicy: 'dirty dialog close shows an in-dialog discard confirmation before lifecycle begins closing',
  successPolicy: 'save updates the form baseline and closes the dialog',
  disposalPolicy: 'dialog lifecycle releases focus, scroll lock, inert, and keydown listener after close animation'
}))

const contractEditSurfaceState = computed(() => ({
  surfaceId: editingContractId.value ? `delivery-contract-edit-surface-${editingContractId.value}` : 'delivery-contract-create-surface',
  mode: editingContractId.value ? 'edit' : 'create',
  surfaceType: 'dialog',
  choiceReason: 'short delivery contract product configuration keeps source list context and does not require a deep-linkable long editing workspace',
  sourceListSnapshot: {
    owner: 'delivery-contract-product-table',
    query: filters.value,
    sort: { field: 'sortOrder', direction: 'desc', stableTieBreaker: 'source order' },
    pagination: {
      currentPage: page.value,
      pageSize: 10,
      total: allFilteredProducts.value.length
    },
    focusTrigger: lastContractTrigger.value?.id || 'delivery-contract-create-or-card-edit-action',
    capability: 'create-or-edit delivery contract product'
  },
  recordIdentity: editingContractId.value
    ? {
        id: editingContractId.value,
        version: 'local-admin-mock',
        permissionScope: 'delivery-contract-product-edit'
      }
    : {
        collection: 'delivery-contract-products',
        prefillSource: 'default delivery contract draft',
        permissionScope: 'delivery-contract-product-create'
      },
  permissionVersion: 'local-admin-mock',
  formSessionId: contractFormState.value.formOwnerId,
  returnStrategy: {
    onSuccess: 'update local list, refresh form baseline, close dialog, and restore source trigger focus through lifecycle',
    onCancel: contractFormDirty.value ? 'show discard confirmation before closing' : 'close dialog and restore source trigger focus',
    onFailure: 'keep dialog open, retain draft, focus validation summary or field error',
    onSourceUnavailable: 'restore focus to delivery-contract-create button'
  },
  inlineEditBoundary: 'list rows expose create/edit actions only; record fields stay inside the dialog form owner',
  runtimeVerification: 'static tests, production build, and Chromium smoke verified for focus containment, dirty close, mobile width, and 200% zoom; screen reader, physical touch, virtual keyboard, reduced-motion, high-contrast, and real safe-area checks remain unverified'
}))

const contractNavigationState = computed(() => ({
  routeOwnerId: 'delivery-contract-management-route',
  currentLocation: {
    path: '/admin/delivery/contracts',
    legacyPath: '/admin/delivery/contract',
    pageSemantic: 'delivery contract product list and editor dialog',
    permissionVersion: 'local-admin-mock'
  },
  sourceContext: {
    owner: 'delivery-contract-product-list',
    appliedFilters: filters.value,
    pagination: {
      currentPage: page.value,
      pageSize: 10
    },
    activeDialog: showContractModal.value ? contractFormState.value.formOwnerId : ''
  },
  returnPolicy: {
    fallbackTarget: '/admin/delivery/contracts',
    routeLeaveRequiresConfirmation: contractFormDirty.value,
    canDiscard: true,
    canSaveBeforeLeave: true
  },
  historyIntent: contractPendingRouteLeavePath.value ? 'blocked' : 'idle',
  permissionVersion: 'local-admin-mock',
  dirtyBlockers: contractFormDirty.value
    ? [{
        owner: contractFormState.value.formOwnerId,
        reason: 'delivery contract editor has unsaved changes',
        canSave: true,
        canDiscard: true,
        asyncState: 'idle',
        confirmationText: contractPendingRouteLeavePath.value
          ? '离开页面后这些修改不会保存，请确认是否放弃并继续离开。'
          : '关闭后这些修改不会保存，请确认是否放弃。',
        continueTarget: contractPendingRouteLeavePath.value || 'close-dialog',
        pendingTarget: contractPendingRouteLeavePath.value
      }]
    : [],
  focusRestoreTarget: contractDiscardConfirmVisible.value
    ? 'delivery-contract-unsaved-confirmation'
    : showContractModal.value ? contractDialogTitleId : 'delivery-contract-create',
  disposalLog: 'dialog lifecycle owns overlay disposal; route leave guard blocks dirty navigation before component unmount',
  runtimeVerification: 'static tests, production build, and Chromium smoke verified for canonical route rendering; Back/Forward, menu navigation, screen reader, physical touch, reduced-motion, high-contrast, and real safe-area checks remain unverified'
}))

const contractDiscardConfirmState = computed(() => ({
  title: '当前交割合约配置有未保存修改',
  body: contractPendingRouteLeavePath.value
    ? '离开页面后这些修改不会保存，请确认是否放弃并继续离开。'
    : '关闭后这些修改不会保存，请确认是否放弃。',
  confirmLabel: contractPendingRouteLeavePath.value ? '放弃并离开' : '放弃修改',
  confirmAriaLabel: contractPendingRouteLeavePath.value
    ? '放弃交割合约未保存修改并离开当前页面'
    : '放弃交割合约未保存修改并关闭'
}))

const contractFieldGuidanceState = computed(() => ({
  guidanceOwnerId: 'delivery-contract-editor-field-guidance',
  guidanceSurface: 'form-field',
  fieldGuidanceRegistry: [
    { field: 'name', label: '合约名称', requirementPolicy: 'required', descriptionPolicy: 'short product display name', placeholderPolicy: 'example only' },
    { field: 'code', label: '合约代码', requirementPolicy: 'required', descriptionPolicy: 'uppercase contract code submitted after normalization', placeholderPolicy: 'example only' },
    { field: 'spotSymbol', label: '选择交易对', requirementPolicy: 'required', descriptionPolicy: 'selects base and quote currency from available spot symbols', placeholderPolicy: 'none' },
    { field: 'status', label: '产品状态', requirementPolicy: 'required with default value and visible required marker', descriptionPolicy: 'radio group writes status draft and saves with the form; status changes take effect only after saving', placeholderPolicy: 'none' },
    { field: 'sortOrder', label: '排序权重', requirementPolicy: 'required numeric value, zero allowed', descriptionPolicy: 'larger values appear earlier in the product list', placeholderPolicy: 'example only' },
    { field: 'templateId', label: '选择周期模板', requirementPolicy: 'required enabled template', descriptionPolicy: 'selects the delivery period template; trade limits are configured independently in the trade limit tab and 0 means unlimited', placeholderPolicy: 'none' },
    { field: 'minBuy', label: '最低买入额', requirementPolicy: 'required numeric value, zero means no minimum buy limit', descriptionPolicy: 'USDT amount greater than or equal to zero', placeholderPolicy: 'none' },
    { field: 'maxBuy', label: '最高买入额', requirementPolicy: 'required numeric value, zero means no maximum buy limit', descriptionPolicy: 'USDT amount greater than or equal to minimum buy amount when both values are greater than zero', placeholderPolicy: 'none' },
    { field: 'maxHold', label: '最大持仓额', requirementPolicy: 'required numeric value, zero means no maximum position limit', descriptionPolicy: 'USDT amount greater than or equal to maximum buy amount when both values are greater than zero', placeholderPolicy: 'none' },
    { field: 'sellFee', label: '交割手续费率', requirementPolicy: 'required numeric value from 0 to 100', descriptionPolicy: 'percent value shown with visible unit suffix', placeholderPolicy: 'none' }
  ],
  errorRelationship: 'help, unit, and field error ids are recomputed through contractFieldDescribedBy',
  responsivePolicy: 'labels, required indicators, help text, units, and errors stay visible in the scrollable dialog body',
  lifecycleDisposal: 'field guidance recomputes when template unlimited state, errors, or dialog form session changes',
  runtimeVerification: 'static tests, production build, and Chromium smoke verified for dialog keyboard containment and mobile width; screen reader, physical touch, permissions, language expansion, reduced-motion, high-contrast, and breakpoint conversion checks remain unverified'
}))

const contractTabViewState = computed(() => ({
  tabOwnerId: 'delivery-contract-editor-tabs',
  surfaceKind: 'settings-tabs',
  tabRegistry: contractTabRegistry,
  activeTabId: contractTab.value,
  pendingTabIntent: null,
  panelState: Object.fromEntries(contractTabRegistry.map((tab) => [
    tab.id,
    {
      ready: true,
      dirtyBoundary: 'same-dialog-form',
      keepAlive: false
    }
  ])),
  requestBinding: 'none',
  urlHistoryBinding: 'none',
  permissionBoundary: 'all-tabs-visible-for-editor',
  dirtyBoundary: 'tab-switch-does-not-submit-or-discard-current-form-values',
  focusAnnouncementPolicy: 'aria-selected, aria-controls, and aria-labelledby stay bound to active panel',
  responsivePolicy: 'horizontal tablist remains scrollable without changing active tab semantics'
}))

const contractNumericInputStates = computed(() => ({
  sortOrder: {
    numericOwnerId: 'delivery-contract-sort-order',
    fieldIdentity: 'delivery contract display order',
    valueKind: 'order',
    draftText: String(contractForm.sortOrder ?? ''),
    parsedValue: Number(contractForm.sortOrder),
    committedValue: Number(contractForm.sortOrder),
    displayFormat: 'integer without grouping while editing',
    unitBinding: 'display priority',
    precisionPolicy: 'integer step 1',
    rangePolicy: 'hard minimum 0',
    submitSnapshotPolicy: 'saveContract freezes Number(contractForm.sortOrder)',
    runtimeVerification: 'static validation and wheel prevention verified; paste, IME, and mobile keyboard unverified'
  },
  minBuy: {
    numericOwnerId: 'delivery-contract-min-buy',
    fieldIdentity: 'delivery contract minimum buy amount',
    valueKind: 'money',
    draftText: String(contractForm.minBuy ?? ''),
    parsedValue: Number(contractForm.minBuy),
    committedValue: Number(contractForm.minBuy),
    displayFormat: 'decimal amount',
    unitBinding: 'USDT',
    precisionPolicy: 'step 0.000001',
    rangePolicy: 'hard minimum 0; 0 means no minimum buy limit',
    submitSnapshotPolicy: 'saveContract always validates and submits the numeric field; 0 is explicit unlimited value',
    runtimeVerification: 'static validation and wheel prevention verified; paste, IME, and mobile keyboard unverified'
  },
  maxBuy: {
    numericOwnerId: 'delivery-contract-max-buy',
    fieldIdentity: 'delivery contract maximum buy amount',
    valueKind: 'money',
    draftText: String(contractForm.maxBuy ?? ''),
    parsedValue: Number(contractForm.maxBuy),
    committedValue: Number(contractForm.maxBuy),
    displayFormat: 'decimal amount',
    unitBinding: 'USDT',
    precisionPolicy: 'step 0.000001',
    rangePolicy: 'hard minimum 0; 0 means no maximum buy limit; when both minBuy and maxBuy are greater than 0, maxBuy must be at least minBuy',
    submitSnapshotPolicy: 'saveContract always validates and submits the numeric field; 0 is explicit unlimited value',
    runtimeVerification: 'static validation and wheel prevention verified; paste, IME, and mobile keyboard unverified'
  },
  maxHold: {
    numericOwnerId: 'delivery-contract-max-hold',
    fieldIdentity: 'delivery contract maximum holding amount',
    valueKind: 'money',
    draftText: String(contractForm.maxHold ?? ''),
    parsedValue: Number(contractForm.maxHold),
    committedValue: Number(contractForm.maxHold),
    displayFormat: 'decimal amount',
    unitBinding: 'USDT',
    precisionPolicy: 'step 0.000001',
    rangePolicy: 'hard minimum 0; 0 means no maximum position limit; when both maxBuy and maxHold are greater than 0, maxHold must be at least maxBuy',
    submitSnapshotPolicy: 'saveContract always validates and submits the numeric field; 0 is explicit unlimited value',
    runtimeVerification: 'static validation and wheel prevention verified; paste, IME, and mobile keyboard unverified'
  },
  sellFee: {
    numericOwnerId: 'delivery-contract-sell-fee',
    fieldIdentity: 'delivery contract settlement fee rate',
    valueKind: 'percent',
    draftText: String(contractForm.sellFee ?? ''),
    parsedValue: Number(contractForm.sellFee),
    committedValue: Number(contractForm.sellFee),
    displayFormat: 'percent number',
    unitBinding: 'percent submitted as 0-100 value',
    precisionPolicy: 'step 0.01',
    rangePolicy: 'hard range 0 to 100',
    submitSnapshotPolicy: 'saveContract freezes Number(contractForm.sellFee)',
    runtimeVerification: 'static validation and wheel prevention verified; paste, IME, and mobile keyboard unverified'
  }
}))

const contractSelectionControlState = computed(() => ({
  status: {
    controlOwnerId: 'delivery-contract-status-control',
    controlKind: 'radio-group',
    optionSet: contractStatusOptionRegistry,
    draftValue: contractForm.status,
    committedValue: editingContractId.value
      ? products.value.find((product) => product.id === editingContractId.value)?.status || contractForm.status
      : DELIVERY_STATUS.ENABLED,
    commitMode: 'form-submit',
    required: true,
    indeterminateState: 'not-applicable',
    permissionState: 'all-options-editable-in-local-admin-form',
    riskPolicy: 'low-risk-form-draft; actual enable-disable effect occurs only after Save contract',
    feedbackState: 'idle',
    a11yPolicy: 'required role=radiogroup with labelled owner, visible required marker, aria-required, described help text, role=radio options, aria-checked, roving tabindex, Space/Enter button activation, and arrow/Home/End selection',
    responsivePolicy: 'two short options wrap with the field and keep touch targets reachable'
  }
}))

const clearContractErrors = () => {
  Object.keys(contractErrors).forEach((key) => {
    contractErrors[key] = ''
  })
}

const contractErrorItems = computed(() => Object.entries(contractErrors)
  .filter(([, message]) => Boolean(message))
  .map(([field, message]) => ({ field, message })))

const contractDialogTitleId = 'delivery-contract-dialog-title'
const contractErrorSummaryId = 'delivery-contract-error-summary'
const contractFieldId = (field) => `delivery-contract-${field}`
const contractFieldErrorId = (field) => `delivery-contract-${field}-error`
const contractFieldDescribedBy = (field, helpId = '') => {
  const ids = []
  if (helpId) ids.push(helpId)
  if (contractErrors[field]) ids.push(contractFieldErrorId(field))
  return ids.length ? ids.join(' ') : undefined
}

const validateNonNegativeNumber = (value) => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0

const pairOptions = ref([])
const pairOptionsLoading = ref(false)
const pairOptionsError = ref('')
const selectedSpotSymbolUnavailable = computed(() => Boolean(contractForm.spotSymbol) && pairOptions.value.length > 0 && !pairOptions.value.includes(contractForm.spotSymbol))

const validateContractForm = () => {
  clearContractErrors()

  if (!contractForm.name.trim()) contractErrors.name = '请输入合约名称'
  if (!contractForm.code.trim()) contractErrors.code = '请输入合约代码'
  if (!contractForm.spotSymbol) contractErrors.spotSymbol = '请选择交易对'
  if (!contractErrors.spotSymbol && pairOptionsLoading.value) contractErrors.spotSymbol = '交易对列表加载中，请稍后再保存'
  if (!contractErrors.spotSymbol && pairOptionsError.value) contractErrors.spotSymbol = pairOptionsError.value
  if (!contractErrors.spotSymbol && selectedSpotSymbolUnavailable.value) contractErrors.spotSymbol = '当前交易对不在可用交易对列表中，请重新选择'
  if (!contractForm.templateId) contractErrors.templateId = '请选择周期模板'
  if (!contractErrors.templateId && !selectedTemplate.value) contractErrors.templateId = '当前周期模板不存在，请重新选择'
  if (!contractErrors.templateId && selectedTemplateDisabled.value) contractErrors.templateId = '当前周期模板已禁用，请重新选择启用模板'
  if (!validateNonNegativeNumber(contractForm.sortOrder)) contractErrors.sortOrder = '排序权重必须是大于等于 0 的数字'

  if (!validateNonNegativeNumber(contractForm.minBuy)) contractErrors.minBuy = '最低买入额必须是大于等于 0 的数字'
  if (!validateNonNegativeNumber(contractForm.maxBuy)) contractErrors.maxBuy = '最高买入额必须是大于等于 0 的数字'
  if (!validateNonNegativeNumber(contractForm.maxHold)) contractErrors.maxHold = '最大持仓额必须是大于等于 0 的数字'
  if (!contractErrors.minBuy && !contractErrors.maxBuy && Number(contractForm.minBuy) > 0 && Number(contractForm.maxBuy) > 0 && Number(contractForm.maxBuy) < Number(contractForm.minBuy)) {
    contractErrors.maxBuy = '最高买入额不能小于最低买入额；任一项填 0 表示该项不限制'
  }
  if (!contractErrors.maxBuy && !contractErrors.maxHold && Number(contractForm.maxBuy) > 0 && Number(contractForm.maxHold) > 0 && Number(contractForm.maxHold) < Number(contractForm.maxBuy)) {
    contractErrors.maxHold = '最大持仓额不能小于最高买入额；任一项填 0 表示该项不限制'
  }

  if (!validateNonNegativeNumber(contractForm.sellFee) || Number(contractForm.sellFee) > 100) {
    contractErrors.sellFee = '交割手续费率必须在 0 到 100 之间'
  }

  return contractErrorItems.value.length === 0
}

watch(
  () => [
    contractForm.name,
    contractForm.code,
    contractForm.spotSymbol,
    contractForm.sortOrder,
    contractForm.templateId,
    contractForm.minBuy,
    contractForm.maxBuy,
    contractForm.maxHold,
    contractForm.sellFee,
    pairOptionsError.value,
    selectedSpotSymbolUnavailable.value
  ],
  () => {
    if (contractHasSubmitted.value) validateContractForm()
  }
)

const focusFirstContractError = async () => {
  await nextTick()
  contractErrorSummaryRef.value?.focus()
}

const focusContractField = async (field) => {
  contractTab.value = field === 'templateId' ? DELIVERY_CONTRACT_TAB.CYCLE
    : ['minBuy', 'maxBuy', 'maxHold'].includes(field) ? DELIVERY_CONTRACT_TAB.LIMIT
      : field === 'sellFee' ? DELIVERY_CONTRACT_TAB.FEE
        : DELIVERY_CONTRACT_TAB.BASIC
  await nextTick()
  document.getElementById(contractFieldId(field))?.focus()
}

const focusContractTab = async (tabId) => {
  await nextTick()
  document.getElementById(`delivery-contract-tab-${tabId}`)?.focus()
}

const setContractTab = async (tabId, { focus = false } = {}) => {
  if (!contractTabRegistry.some((tab) => tab.id === tabId)) return
  contractTab.value = tabId
  if (focus) await focusContractTab(tabId)
}

const handleContractTabKeydown = (event) => {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (!keys.includes(event.key)) return

  event.preventDefault()
  const currentIndex = contractTabRegistry.findIndex((tab) => tab.id === contractTab.value)
  const lastIndex = contractTabRegistry.length - 1
  const nextIndex = event.key === 'Home' ? 0
    : event.key === 'End' ? lastIndex
      : event.key === 'ArrowLeft' ? (currentIndex <= 0 ? lastIndex : currentIndex - 1)
        : (currentIndex >= lastIndex ? 0 : currentIndex + 1)
  setContractTab(contractTabRegistry[nextIndex].id, { focus: true })
}

const focusContractStatusOption = async (status) => {
  await nextTick()
  document.getElementById(`delivery-contract-status-${status}`)?.focus()
}

const setContractStatus = async (status, { focus = false } = {}) => {
  if (!contractStatusOptionRegistry.some((option) => option.id === status && !option.disabled)) return
  contractForm.status = status
  if (focus) await focusContractStatusOption(status)
}

const handleContractStatusKeydown = (event) => {
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
  if (!keys.includes(event.key)) return

  event.preventDefault()
  const enabledOptions = contractStatusOptionRegistry.filter((option) => !option.disabled)
  const currentIndex = enabledOptions.findIndex((option) => option.id === contractForm.status)
  const lastIndex = enabledOptions.length - 1
  const nextIndex = event.key === 'Home' ? 0
    : event.key === 'End' ? lastIndex
      : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? (currentIndex <= 0 ? lastIndex : currentIndex - 1)
        : (currentIndex >= lastIndex ? 0 : currentIndex + 1)
  setContractStatus(enabledOptions[nextIndex].id, { focus: true })
}

const showContractDiscardConfirm = async () => {
  contractDiscardConfirmVisible.value = true
  await nextTick()
  contractDiscardConfirmRef.value?.focus()
}

const requestContractModalClose = () => {
  if (contractFormDirty.value && !contractDiscardCloseBypass.value) {
    showContractDiscardConfirm()
    return false
  }
  contractDiscardCloseBypass.value = false
  contractDiscardConfirmVisible.value = false
  contractPendingRouteLeavePath.value = ''
  showContractModal.value = false
  return true
}

const keepEditingContract = () => {
  contractDiscardConfirmVisible.value = false
  contractPendingRouteLeavePath.value = ''
}

const discardContractChanges = async () => {
  const pendingRoute = contractPendingRouteLeavePath.value
  contractPendingRouteLeavePath.value = ''
  contractDiscardCloseBypass.value = true
  closeContractModal()
  if (pendingRoute) {
    await nextTick()
    router.push(pendingRoute)
  }
}

onBeforeRouteLeave((to) => {
  if (showContractModal.value && contractFormDirty.value && !contractDiscardCloseBypass.value) {
    contractPendingRouteLeavePath.value = to.fullPath || to.path
    showContractDiscardConfirm()
    return false
  }
  return true
})

const handleContractBeforeUnload = (event) => {
  if (!showContractModal.value || !contractFormDirty.value || contractDiscardCloseBypass.value) return undefined

  event.preventDefault()
  event.returnValue = ''
  return ''
}

const {
  rendered: contractDialogRendered,
  phase: contractDialogPhase,
  layerStyle: contractDialogLayerStyle,
  requestDialogClose: requestContractDialogClose,
  onAfterEnter: onContractDialogAfterEnter,
  onAfterLeave: onContractDialogAfterLeave
} = useDialogLifecycle({
  open: showContractModal,
  dialogRef: contractDialogRef,
  initialFocusRef: contractDialogTitleRef,
  returnFocusRef: computed(() => lastContractTrigger.value),
  requestClose: requestContractModalClose
})

const closeContractModal = createDialogCloseAction(requestContractDialogClose)

const openContractModal = (event) => {
  lastContractTrigger.value = event?.currentTarget || null
  clearContractErrors()
  showContractModal.value = true
}

const handleContractModalAfterLeave = async () => {
  if (!await onContractDialogAfterLeave()) return
  lastContractTrigger.value = null
}

const openCreateContract = (event) => {
  editingContractId.value = ''
  contractTab.value = DELIVERY_CONTRACT_TAB.BASIC
  contractForm.name = ''
  contractForm.code = ''
  contractForm.baseCurrency = 'BTC'
  contractForm.quoteCurrency = 'USDT'
  contractForm.spotSymbol = ''
  contractForm.status = DELIVERY_STATUS.ENABLED
  contractForm.sortOrder = Math.max(0, ...products.value.map((item) => Number(item.sortOrder) || 0)) + 10
  contractForm.templateId = enabledTemplates.value[0]?.id || templates.value[0]?.id || ''
  contractForm.minBuy = '10'
  contractForm.maxBuy = '10000'
  contractForm.maxHold = '50000'
  contractForm.buyFee = '0'
  contractForm.sellFee = '0.2'
  contractHasSubmitted.value = false
  contractInitialSnapshot.value = createContractFormSnapshot()
  openContractModal(event)
}

const openEditContract = (item, event) => {
  editingContractId.value = item.id
  contractTab.value = DELIVERY_CONTRACT_TAB.BASIC
  contractForm.name = item.name
  contractForm.code = item.code
  const [baseCurrency, quoteCurrency] = item.pair.split('/')
  contractForm.baseCurrency = baseCurrency
  contractForm.quoteCurrency = quoteCurrency
  contractForm.spotSymbol = `${baseCurrency}/${quoteCurrency}`
  contractForm.status = item.status
  contractForm.sortOrder = Number(item.sortOrder ?? 0)
  contractForm.templateId = item.templateId
  contractForm.minBuy = item.minBuy ?? '10'
  contractForm.maxBuy = item.maxBuy ?? '10000'
  contractForm.maxHold = item.maxHold ?? '50000'
  contractForm.buyFee = '0'
  contractForm.sellFee = item.sellFee ?? item.deliveryFee ?? '0'
  contractHasSubmitted.value = false
  contractInitialSnapshot.value = createContractFormSnapshot()
  openContractModal(event)
}

const saveContract = async () => {
  contractHasSubmitted.value = true
  if (!validateContractForm()) {
    await focusFirstContractError()
    return
  }

  const payload = {
    name: contractForm.name.trim(),
    code: contractForm.code.trim().toUpperCase(),
    pair: `${contractForm.baseCurrency}/${contractForm.quoteCurrency}`,
    status: contractForm.status,
    sortOrder: Number(contractForm.sortOrder),
    templateId: contractForm.templateId,
    templateName: selectedTemplate.value?.name || '-',
    buyFee: '0',
    sellFee: contractForm.sellFee
  }

  Object.assign(payload, {
    buyRange: `${tradeLimitDisplay(contractForm.minBuy)} - ${tradeLimitDisplay(contractForm.maxBuy)} USDT`,
    maxPosition: `${tradeLimitDisplay(contractForm.maxHold)} USDT`,
    minBuy: contractForm.minBuy,
    maxBuy: contractForm.maxBuy,
    maxHold: contractForm.maxHold
  })

  if (editingContractId.value) {
    products.value = products.value.map((item) => (item.id === editingContractId.value ? { ...item, ...payload } : item))
  } else {
    products.value.unshift({ id: `prod-${Date.now()}`, ...payload })
  }

  contractInitialSnapshot.value = createContractFormSnapshot()
  contractDiscardCloseBypass.value = true
  contractHasSubmitted.value = false
  closeContractModal()
}

const syncPairToCurrencies = (pair) => {
  const parts = String(pair || '').split('/')
  const base = parts[0] || ''
  const quote = parts[1] || ''
  if (base) contractForm.baseCurrency = base
  if (quote) contractForm.quoteCurrency = quote
}

const loadSpotSymbols = async () => {
  pairOptionsLoading.value = true
  pairOptionsError.value = ''
  try {
    const result = await symbolApi.getSymbolList({
      page: 1,
      pageSize: 1000,
      is_open: '1',
      includeDeleted: false
    })
    if (result?.success) {
      const list = Array.isArray(result.data?.list) ? result.data.list : []
      const pairs = Array.from(
        new Set(
          list
            .map((it) => String(it.symbol_name || '').trim())
            .filter(Boolean)
        )
      )
      pairOptions.value = pairs
      if (!contractForm.spotSymbol) {
        contractForm.spotSymbol = pairOptions.value[0] || ''
      }
      syncPairToCurrencies(contractForm.spotSymbol)
    } else {
      pairOptionsError.value = '交易对列表加载失败，请稍后重试'
    }
  } catch (e) {
    pairOptionsError.value = '交易对列表加载失败，请稍后重试'
  } finally {
    pairOptionsLoading.value = false
  }
}

watch(
  () => contractForm.spotSymbol,
  (val) => {
    syncPairToCurrencies(val)
  }
)

onMounted(() => {
  loadSpotSymbols()
  window.addEventListener('beforeunload', handleContractBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleContractBeforeUnload)
})

// The shared Ant frames (AdminDialog) drive these page-owned lifecycles (dialog migration 2026-11-27). Defined last so
// every handler they reference is initialised.
const contractDialogLifecycle = { rendered: contractDialogRendered, phase: contractDialogPhase, layerStyle: contractDialogLayerStyle, requestDialogClose: requestContractDialogClose, onAfterEnter: onContractDialogAfterEnter, onAfterLeave: handleContractModalAfterLeave, dialogRef: contractDialogRef }
</script>

<template>
  <PageShell>
    <SearchForm name="delivery-contract-filters" :model="filters" :fields="queryFields" @search="applySearch" @reset="resetSearch" />
    <AdminTable title="交割合约产品" v-model:page="page" :rows="allFilteredProducts" :columns="productColumns" row-key="id" desktop-only>
      <template #toolbar>
        <Button id="delivery-contract-create" type="primary" aria-label="新增交割合约" @click="openCreateContract($event)"><template #icon><PlusOutlined /></template>新增合约</Button>
      </template>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'product'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.name }}</TypographyText>
          <TypographyText type="secondary" class="font-mono">{{ record.code }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'pair'" direction="vertical" :size="0">
          <span>{{ record.pair }}</span>
          <TypographyText type="secondary">{{ currencyTypeLabel(currencyTypeByPair(record.pair)) }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'template'" direction="vertical" :size="0">
          <span>{{ productTemplateName(record) }}</span>
          <TypographyText type="secondary">{{ productCycles(record).map((cycle) => `${durationLabel(cycle.durationSec)} ${Number(cycle.payoutPct).toFixed(1)}%`).join(' · ') || '无可选周期' }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'limit'">
          <Tag v-if="productTradeLimitUnlimited(record)" :aria-label="`${record.name} 交易限制不限制`">不限制</Tag>
          <Space v-else direction="vertical" :size="0" align="end">
            <span>{{ tradeLimitRangeDisplay(record) }}</span>
            <TypographyText type="secondary">最大持仓 {{ tradeLimitMaxPositionDisplay(record) }}</TypographyText>
          </Space>
        </template>
        <template v-else-if="column.key === 'fee'">{{ Number(record.sellFee).toFixed(2) }}%</template>
        <template v-else-if="column.key === 'sortOrder'">{{ Number(record.sortOrder) || 0 }}</template>
        <Tag v-else-if="column.key === 'status'" :color="record.status === DELIVERY_STATUS.ENABLED ? 'green' : 'default'">{{ record.status === DELIVERY_STATUS.ENABLED ? '已启用' : '已禁用' }}</Tag>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" :aria-label="`编辑交割合约 ${record.name}`" @click="openEditContract(record, $event)">编辑</Button>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
    <!-- 编辑模态框 -->
    <AdminDialog :open="contractDialogRendered" :lifecycle="contractDialogLifecycle" :title="editingContractId ? '编辑交割合约' : '新增交割合约'" :title-id="contractDialogTitleId" :width="768" plain>
      <div class="shrink-0 border-b border-slate-100 bg-white px-6">
            <div
              class="flex gap-8 overflow-x-auto"
              role="tablist"
              aria-label="交割合约编辑步骤"
              aria-orientation="horizontal"
              @keydown="handleContractTabKeydown"
            >
              <a-button type="text"
                v-for="tab in contractTabRegistry"
                :key="tab.id"
                html-type="button"
                role="tab"
                :id="`delivery-contract-tab-${tab.id}`"
                :aria-selected="contractTab === tab.id"
                :tabindex="contractTab === tab.id ? 0 : -1"
                :aria-controls="`delivery-contract-panel-${tab.id}`"
                class="shrink-0"
                :class="
                  contractTab === tab.id
                    ? 'text-blue-600 font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                "
                @click="setContractTab(tab.id)"
              >
                {{ tab.title }}
              </a-button>
            </div>
          </div>

          <form
            :id="contractFormState.formOwnerId"
            class="min-h-0 flex flex-1 flex-col overflow-hidden"
            novalidate
            :aria-describedby="contractErrorItems.length ? contractErrorSummaryId : undefined"
            @submit.prevent="saveContract"
          >
          <div class="min-h-0 flex-1 space-y-6 overflow-y-auto bg-white p-6">
            <FeedbackToast v-if="contractErrorItems.length" :id="contractErrorSummaryId" ref="contractErrorSummaryRef" type="error" :source="() => (contractErrorItems.length) ? (contractErrorItems.map(item => item.message).join('；')) : ''"><a-button type="link" @click="focusContractField(contractErrorItems[0].field)">定位首个错误</a-button></FeedbackToast>

            <div class="space-y-6">
              <div
                v-show="contractTab === DELIVERY_CONTRACT_TAB.BASIC"
                :id="`delivery-contract-panel-${DELIVERY_CONTRACT_TAB.BASIC}`"
                role="tabpanel"
                :aria-labelledby="`delivery-contract-tab-${DELIVERY_CONTRACT_TAB.BASIC}`"
                :hidden="contractTab !== DELIVERY_CONTRACT_TAB.BASIC"
                class="grid gap-6 md:grid-cols-2"
              >
                <div class="space-y-1.5">
                  <label class="text-sm text-slate-900" :for="contractFieldId('name')"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>合约名称</label>
                  <a-input
                    :id="contractFieldId('name')"
                    v-model:value="contractForm.name"
                    type="text"
                   
                    placeholder="如：BTC 周期合约"
                    required
                    aria-required="true"
                    :aria-invalid="Boolean(contractErrors.name)"
                    :aria-describedby="contractFieldDescribedBy('name')"
                  />
                  <FeedbackToast v-if="contractErrors.name" :id="contractFieldErrorId('name')" type="error" :source="() => (contractErrors.name) ? (contractErrors.name) : ''"></FeedbackToast>
                </div>
                <div class="space-y-1.5">
                  <label class="text-sm text-slate-900" :for="contractFieldId('code')"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>合约代码</label>
                  <a-input
                    :id="contractFieldId('code')"
                    v-model:value="contractForm.code"
                    type="text"
                   
                    placeholder="如：BTC_DELIVERY"
                    required
                    aria-required="true"
                    :aria-invalid="Boolean(contractErrors.code)"
                    :aria-describedby="contractFieldDescribedBy('code')"
                  />
                  <FeedbackToast v-if="contractErrors.code" :id="contractFieldErrorId('code')" type="error" :source="() => (contractErrors.code) ? (contractErrors.code) : ''"></FeedbackToast>
                </div>
                <div class="space-y-1.5 md:col-span-2" :aria-busy="pairOptionsLoading ? 'true' : undefined">
                  <label class="text-sm text-slate-900" :for="contractFieldId('spotSymbol')"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>选择交易对</label>
                  <a-select :get-popup-container="(trigger) => trigger.parentElement"
                    :id="contractFieldId('spotSymbol')"
                    v-model:value="contractForm.spotSymbol"
                    class="w-full"
                    required
                    aria-required="true"
                    :disabled="pairOptionsLoading"
                    :aria-invalid="Boolean(contractErrors.spotSymbol)"
                    :aria-describedby="contractFieldDescribedBy('spotSymbol', 'delivery-contract-spot-symbol-help')"
                  >
                    <a-select-option v-if="pairOptionsLoading" value="">交易对加载中...</a-select-option>
                    <a-select-option v-else-if="contractForm.spotSymbol && !pairOptions.includes(contractForm.spotSymbol)" :value="contractForm.spotSymbol">
                      {{ contractForm.spotSymbol }}（当前不可用）
                    </a-select-option>
                    <a-select-option v-for="opt in pairOptions" :key="`pair-${opt}`" :value="opt">{{ opt }}</a-select-option>
                  </a-select>
                  <p id="delivery-contract-spot-symbol-help" class="text-xs text-slate-400" aria-live="polite">
                    <template v-if="pairOptionsLoading">正在加载可用交易对。</template>
                    <FeedbackToast v-else-if="pairOptionsError" :source="() => (pairOptionsError) ? (pairOptionsError) : ''"/>
                    <template v-else-if="selectedSpotSymbolUnavailable">当前交易对已不在可用列表中，请重新选择后保存。</template>
                    <template v-else>保存时会同步合约的基础币种和计价币种。</template>
                  </p>
                  <a-button
                    v-if="pairOptionsError"
                    html-type="button"
                    class="ant-btn ant-btn-sm"
                    :disabled="pairOptionsLoading"
                    aria-label="重新加载交割合约可用交易对"
                    @click="loadSpotSymbols"
                  >
                    重新加载交易对
                  </a-button>
                  <FeedbackToast v-if="contractErrors.spotSymbol" :id="contractFieldErrorId('spotSymbol')" type="error" :source="() => (contractErrors.spotSymbol) ? (contractErrors.spotSymbol) : ''"></FeedbackToast>
                </div>
                <div class="space-y-1.5">
                  <span id="delivery-contract-status-label" class="block text-sm text-slate-900"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>产品状态</span>
                  <div
                    class="inline-flex flex-wrap rounded border border-slate-200 bg-slate-50 p-0.5"
                    role="radiogroup"
                    aria-labelledby="delivery-contract-status-label"
                    aria-describedby="delivery-contract-status-help"
                    aria-required="true"
                    @keydown="handleContractStatusKeydown"
                  >
                    <a-button type="text"
                      v-for="option in contractStatusOptionRegistry"
                      :id="`delivery-contract-status-${option.id}`"
                      :key="option.id"
                      html-type="button"
                      role="radio"
                      :aria-checked="contractForm.status === option.id"
                      :aria-disabled="option.disabled ? 'true' : undefined"
                      :tabindex="contractForm.status === option.id ? 0 : -1"
                     
                      :class="[
                        contractForm.status === option.id
                          ? 'bg-white shadow-sm text-blue-600 font-medium'
                          : 'text-slate-500 hover:text-slate-700',
                        option.disabled ? 'cursor-not-allowed opacity-60' : ''
                      ]"
                      @click="setContractStatus(option.id)"
                    >
                      {{ option.label }}
                    </a-button>
                  </div>
                  <p id="delivery-contract-status-help" class="text-xs text-slate-400">状态调整会随本次保存一起生效。</p>
                </div>
                <div class="space-y-1.5">
                  <label class="block text-sm text-slate-900" :for="contractFieldId('sortOrder')"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>排序权重</label>
                  <a-input
                    :id="contractFieldId('sortOrder')"
                    v-model:value.number="contractForm.sortOrder"
                    type="number"
                    :min="0"
                    inputmode="numeric"
                    class="font-mono"
                    placeholder="数值越大越靠前"
                    required
                    aria-required="true"
                    :aria-invalid="Boolean(contractErrors.sortOrder)"
                    :aria-describedby="contractFieldDescribedBy('sortOrder', 'delivery-contract-sort-help')"
                    @wheel.prevent
                  />
                  <p id="delivery-contract-sort-help" class="text-xs text-slate-400">数值越大越靠前，必须为大于等于 0 的数字。</p>
                  <FeedbackToast v-if="contractErrors.sortOrder" :id="contractFieldErrorId('sortOrder')" type="error" :source="() => (contractErrors.sortOrder) ? (contractErrors.sortOrder) : ''"></FeedbackToast>
                </div>
              </div>

              <div
                v-show="contractTab === DELIVERY_CONTRACT_TAB.CYCLE"
                :id="`delivery-contract-panel-${DELIVERY_CONTRACT_TAB.CYCLE}`"
                role="tabpanel"
                :aria-labelledby="`delivery-contract-tab-${DELIVERY_CONTRACT_TAB.CYCLE}`"
                :hidden="contractTab !== DELIVERY_CONTRACT_TAB.CYCLE"
                class="space-y-6"
              >
                <div class="space-y-1.5">
                  <label class="text-sm text-slate-900" :for="contractFieldId('templateId')"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>选择周期模板</label>
                  <a-select :get-popup-container="(trigger) => trigger.parentElement"
                    :id="contractFieldId('templateId')"
                    v-model:value="contractForm.templateId"
                    class=""
                    required
                    aria-required="true"
                    :aria-invalid="Boolean(contractErrors.templateId)"
                    :aria-describedby="contractFieldDescribedBy('templateId', 'delivery-contract-template-help')"
                  >
                    <a-select-option
                      v-for="tpl in templates"
                      :key="tpl.id"
                      :value="tpl.id"
                      :disabled="tpl.status === DELIVERY_STATUS.DISABLED"
                    >
                      {{ tpl.name }}{{ tpl.status === DELIVERY_STATUS.DISABLED ? '（已禁用）' : '' }}
                    </a-select-option>
                  </a-select>
                  <p id="delivery-contract-template-help" class="text-xs leading-5 text-slate-400" aria-live="polite">
                    {{ selectedTemplatePolicyText }}
                  </p>
                  <FeedbackToast v-if="contractErrors.templateId" :id="contractFieldErrorId('templateId')" type="error" :source="() => (contractErrors.templateId) ? (contractErrors.templateId) : ''"></FeedbackToast>
                </div>
                <article v-if="selectedTemplate" class="space-y-4 rounded border border-blue-100 bg-blue-50/30 p-4">
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <h4 class="min-w-0 break-words text-sm font-semibold text-slate-900">模板详情: {{ selectedTemplate.name }}</h4>
                    <span class="shrink-0 text-xs text-blue-600">{{ selectedTemplateCycles.length }} 个预设周期</span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <div
                      v-for="cycle in selectedTemplateCycles"
                      :key="cycle.id"
                      class="flex max-w-full flex-wrap items-center gap-2 rounded border border-blue-100 bg-white px-3 py-1.5 text-xs"
                    >
                      <span class="text-slate-500">时长:</span>
                      <span class="font-bold text-slate-900">{{ durationLabel(cycle.durationSec) }}</span>
                      <span class="text-slate-200">|</span>
                      <span class="text-slate-500">收益:</span>
                      <span class="font-bold text-emerald-600">{{ cycle.payoutPct }}%</span>
                    </div>
                  </div>
                </article>
              </div>

              <div
                v-show="contractTab === DELIVERY_CONTRACT_TAB.LIMIT"
                :id="`delivery-contract-panel-${DELIVERY_CONTRACT_TAB.LIMIT}`"
                role="tabpanel"
                :aria-labelledby="`delivery-contract-tab-${DELIVERY_CONTRACT_TAB.LIMIT}`"
                :hidden="contractTab !== DELIVERY_CONTRACT_TAB.LIMIT"
                class="space-y-6"
              >
                <div class="grid gap-6 md:grid-cols-3">
                  <div class="space-y-1.5">
                    <label class="text-sm text-slate-900" :for="contractFieldId('minBuy')"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>最低买入额 (USDT)</label>
                    <a-input
                      :id="contractFieldId('minBuy')"
                      v-model:value="contractForm.minBuy"
                      type="number"
                      :min="0"
                      :step="0.000001"
                      inputmode="decimal"
                      class="font-mono"
                      required
                      aria-required="true"
                      :aria-invalid="Boolean(contractErrors.minBuy)"
                      :aria-describedby="contractFieldDescribedBy('minBuy', 'delivery-contract-limit-help')"
                      @wheel.prevent
                    />
                    <p class="text-xs leading-5 text-slate-400">输入 0 表示最低买入额不限制。</p>
                    <FeedbackToast v-if="contractErrors.minBuy" :id="contractFieldErrorId('minBuy')" type="error" :source="() => (contractErrors.minBuy) ? (contractErrors.minBuy) : ''"></FeedbackToast>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-slate-900" :for="contractFieldId('maxBuy')"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>最高买入额 (USDT)</label>
                    <a-input
                      :id="contractFieldId('maxBuy')"
                      v-model:value="contractForm.maxBuy"
                      type="number"
                      :min="0"
                      :step="0.000001"
                      inputmode="decimal"
                      class="font-mono"
                      required
                      aria-required="true"
                      :aria-invalid="Boolean(contractErrors.maxBuy)"
                      :aria-describedby="contractFieldDescribedBy('maxBuy', 'delivery-contract-limit-help')"
                      @wheel.prevent
                    />
                    <p class="text-xs leading-5 text-slate-400">输入 0 表示最高买入额不限制。</p>
                    <FeedbackToast v-if="contractErrors.maxBuy" :id="contractFieldErrorId('maxBuy')" type="error" :source="() => (contractErrors.maxBuy) ? (contractErrors.maxBuy) : ''"></FeedbackToast>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-slate-900" :for="contractFieldId('maxHold')"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>最大持仓额 (USDT)</label>
                    <a-input
                      :id="contractFieldId('maxHold')"
                      v-model:value="contractForm.maxHold"
                      type="number"
                      :min="0"
                      :step="0.000001"
                      inputmode="decimal"
                      class="font-mono"
                      required
                      aria-required="true"
                      :aria-invalid="Boolean(contractErrors.maxHold)"
                      :aria-describedby="contractFieldDescribedBy('maxHold', 'delivery-contract-limit-help')"
                      @wheel.prevent
                    />
                    <p class="text-xs leading-5 text-slate-400">输入 0 表示最大持仓额不限制。</p>
                    <FeedbackToast v-if="contractErrors.maxHold" :id="contractFieldErrorId('maxHold')" type="error" :source="() => (contractErrors.maxHold) ? (contractErrors.maxHold) : ''"></FeedbackToast>
                  </div>
                  <p id="delivery-contract-limit-help" class="text-xs text-slate-400 md:col-span-3">金额单位为 USDT；最高买入额不能小于最低买入额，最大持仓额不能小于最高买入额；当参与比较的任一字段为 0 时不做大小比较。</p>
                </div>
              </div>

              <div
                v-show="contractTab === DELIVERY_CONTRACT_TAB.FEE"
                :id="`delivery-contract-panel-${DELIVERY_CONTRACT_TAB.FEE}`"
                role="tabpanel"
                :aria-labelledby="`delivery-contract-tab-${DELIVERY_CONTRACT_TAB.FEE}`"
                :hidden="contractTab !== DELIVERY_CONTRACT_TAB.FEE"
                class="grid gap-6 md:grid-cols-1"
              >
                <div class="space-y-1.5">
                  <label class="text-sm text-slate-900" :for="contractFieldId('sellFee')"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>交割手续费率 (%)</label>
                  <div class="relative">
                    <a-input
                      :id="contractFieldId('sellFee')"
                      v-model:value="contractForm.sellFee"
                      type="number"
                      :min="0"
                      :max="100"
                      :step="0.01"
                      inputmode="decimal"
                      class="font-mono"
                      required
                      aria-required="true"
                      :aria-invalid="Boolean(contractErrors.sellFee)"
                      :aria-describedby="contractFieldDescribedBy('sellFee', 'delivery-contract-fee-help')"
                      @wheel.prevent
                    />
                    <span class="absolute right-3 top-1.5 text-slate-400 text-sm">%</span>
                  </div>
                  <p id="delivery-contract-fee-help" class="text-xs text-slate-400">费率单位为百分比，允许 0 到 100。</p>
                  <FeedbackToast v-if="contractErrors.sellFee" :id="contractFieldErrorId('sellFee')" type="error" :source="() => (contractErrors.sellFee) ? (contractErrors.sellFee) : ''"></FeedbackToast>
                </div>
              </div>
            </div>
          </div>

          <footer class="shrink-0 border-t border-slate-100 px-6 py-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
            <div
              v-if="contractDiscardConfirmVisible"
              ref="contractDiscardConfirmRef"
              tabindex="-1"
              role="alert"
              class="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 outline-none"
            >
              <p class="font-medium">{{ contractDiscardConfirmState.title }}</p>
              <p class="mt-1 text-xs text-amber-700">{{ contractDiscardConfirmState.body }}</p>
              <div class="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <a-button
                  html-type="button"
                  class="w-full sm:w-auto"
                  @click="keepEditingContract"
                >
                  继续编辑
                </a-button>
                <a-button type="primary"
                  html-type="button"
                  class="ant-btn ant-btn-primary w-full sm:w-auto"
                  :aria-label="contractDiscardConfirmState.confirmAriaLabel"
                  @click="discardContractChanges"
                >
                  {{ contractDiscardConfirmState.confirmLabel }}
                </a-button>
              </div>
            </div>
            <div class="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <a-button
                html-type="button"
                class="w-full sm:w-auto"
                @click="closeContractModal"
              >
                取消
              </a-button>
              <a-button type="primary"
                html-type="submit"
                class="ant-btn ant-btn-primary w-full sm:w-auto"
                aria-label="保存交割合约"
              >
                保存合约
              </a-button>
            </div>
          </footer>
          </form>
    </AdminDialog>
  </PageShell>
</template>

