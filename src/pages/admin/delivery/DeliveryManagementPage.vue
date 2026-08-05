<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import {
  COMMON_FILTER_ALL,
  DELIVERY_CONTRACT_TAB,
  DELIVERY_STATUS,
  sortDeliveryProducts
} from '../../../admin/constants/delivery'
import { ASSET_CURRENCY_TYPE } from '../../../admin/constants/assets'
import CurrencyTypeSelect from '../../../admin/components/CurrencyTypeSelect.vue'
import { createDeliveryProductsMock, createDeliveryTemplatesMock } from '../../../admin/mock/delivery'
import { createAssetsCoinsMock } from '../../../admin/mock/assets'
import { symbolApi } from '../../../admin/mock/spot'
import { createDialogCloseAction, useDialogLifecycle } from '../../../admin/composables/useDialogLifecycle.js'

const router = useRouter()
const statusTab = ref(COMMON_FILTER_ALL)
const searchDraft = ref('')
const currencyTypeDraft = ref('all')
const searchApplied = ref('')
const currencyTypeApplied = ref('all')
const searchCompositionActive = ref(false)

const statusFilterTabRegistry = [
  { id: COMMON_FILTER_ALL, title: '全部', scope: 'delivery-contract-status-all' },
  { id: DELIVERY_STATUS.ENABLED, title: '已启用', scope: 'delivery-contract-status-enabled' },
  { id: DELIVERY_STATUS.DISABLED, title: '已禁用', scope: 'delivery-contract-status-disabled' }
]

const templates = ref(createDeliveryTemplatesMock())
const products = ref(createDeliveryProductsMock())
const assetsCoins = createAssetsCoinsMock()

// 分页状态
const pagination = reactive({
  currentPage: 1,
  pageSize: 5,
  total: 0
})

const applySearch = () => {
  if (searchCompositionActive.value) return
  searchApplied.value = searchDraft.value
  currencyTypeApplied.value = currencyTypeDraft.value
  pagination.currentPage = 1
}

const resetSearch = () => {
  currencyTypeDraft.value = 'all'
  searchDraft.value = ''
  statusTab.value = COMMON_FILTER_ALL
  applySearch()
}

const focusStatusFilterTab = async (tabId) => {
  await nextTick()
  document.getElementById(`delivery-contract-status-tab-${tabId}`)?.focus()
}

const setStatusFilterTab = async (tabId, { focus = false } = {}) => {
  if (!statusFilterTabRegistry.some((tab) => tab.id === tabId)) return
  statusTab.value = tabId
  if (focus) await focusStatusFilterTab(tabId)
}

const handleStatusFilterTabKeydown = (event) => {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (!keys.includes(event.key)) return

  event.preventDefault()
  const currentIndex = statusFilterTabRegistry.findIndex((tab) => tab.id === statusTab.value)
  const lastIndex = statusFilterTabRegistry.length - 1
  const nextIndex = event.key === 'Home' ? 0
    : event.key === 'End' ? lastIndex
      : event.key === 'ArrowLeft' ? (currentIndex <= 0 ? lastIndex : currentIndex - 1)
        : (currentIndex >= lastIndex ? 0 : currentIndex + 1)
  setStatusFilterTab(statusFilterTabRegistry[nextIndex].id, { focus: true })
}

const handleSearchCompositionStart = () => {
  searchCompositionActive.value = true
}

const handleSearchCompositionEnd = () => {
  searchCompositionActive.value = false
}

const handleSearchKeydown = (event) => {
  if (event.key !== 'Enter') return
  if (event.isComposing || searchCompositionActive.value) return

  event.preventDefault()
  applySearch()
}

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

const allFilteredProducts = computed(() => {
  const kw = searchApplied.value.trim().toLowerCase()
  return sortDeliveryProducts(products.value.filter((p) => {
    const hitStatus = statusTab.value === COMMON_FILTER_ALL || p.status === statusTab.value
    const hitKw = !kw || `${p.name} ${p.code} ${p.pair}`.toLowerCase().includes(kw)
    const hitCurrencyType = currencyTypeApplied.value === 'all' || currencyTypeByPair(p.pair) === currencyTypeApplied.value
    return hitStatus && hitKw && hitCurrencyType
  }))
})

const filteredProducts = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return allFilteredProducts.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(allFilteredProducts.value.length / pagination.pageSize))
const resultRangeStart = computed(() => allFilteredProducts.value.length ? (pagination.currentPage - 1) * pagination.pageSize + 1 : 0)
const resultRangeEnd = computed(() => Math.min(pagination.currentPage * pagination.pageSize, allFilteredProducts.value.length))
const deliveryContractResultSummaryText = computed(() => (
  allFilteredProducts.value.length
    ? `显示 ${resultRangeStart.value}-${resultRangeEnd.value}，共 ${allFilteredProducts.value.length} 条记录`
    : '当前筛选条件无匹配产品'
))
const hasAppliedDeliveryFilters = computed(() => (
  Boolean(searchApplied.value.trim()) ||
  currencyTypeApplied.value !== 'all' ||
  statusTab.value !== COMMON_FILTER_ALL
))

const pageHeaderState = computed(() => ({
  headerOwnerId: 'delivery-contract-page-header',
  headerSurface: 'list-page',
  pageIdentity: {
    pageOwner: 'delivery-contract-management',
    url: '/admin/delivery/contracts',
    legacyUrl: '/admin/delivery/contract',
    collection: 'delivery contract products',
    permissionVersion: 'local-admin-mock'
  },
  titleBinding: {
    title: '交割合约管理',
    titleElementId: 'delivery-contract-page-title',
    source: 'static route owner',
    safeFallback: '交割合约管理'
  },
  subtitlePolicy: 'summarizes delivery contract products, period templates, trade limits, and settlement fee configuration without exposing stale remote data',
  contextBinding: {
    appliedFilters: {
      keyword: searchApplied.value,
      currencyType: currencyTypeApplied.value,
      status: statusTab.value
    },
    resultSummary: deliveryContractResultSummaryText.value
  },
  statusSummary: {
    total: allFilteredProducts.value.length,
    visible: filteredProducts.value.length,
    zeroResults: !filteredProducts.value.length,
    unlimitedTradeLimitSource: 'product trade limit fields use 0 as unlimited'
  },
  primaryActionSlot: {
    buttonId: 'delivery-contract-create',
    actionObject: 'delivery contract',
    location: 'product-list-header',
    resultOwner: 'delivery-contract-editor-dialog'
  },
  secondaryActionSlot: {
    filterOwner: 'delivery-contract-filter-bar',
    statusTabsOwner: 'delivery-contract-status-filter-tabs'
  },
  navigationBinding: {
    routeName: 'delivery-contracts',
    redirects: ['/admin/delivery/contract']
  },
  permissionBoundary: 'local admin mock data; no remote tenant or permission-sensitive object names are rendered',
  responsivePolicy: 'page title, subtitle, result status, filter recovery, and create entry remain reachable with wrapping layouts, 200% zoom, and safe-area aware overlays',
  focusAnnouncementPolicy: 'unique h1 labels the page main region; result count updates through delivery-contract-result-summary only',
  lifecycleDisposal: 'computed owner state recalculates from route-local state and has no async header request to clean up',
  runtimeVerification: 'static tests, production build, and Chromium smoke verified for desktop dialog, backdrop, focus containment, dirty close, mobile width, and 200% zoom; screen reader, physical touch, virtual keyboard, route-change, reduced-motion, high-contrast, and real safe-area checks remain unverified'
}))

const keywordSearchInputState = computed(() => ({
  keywordOwnerId: 'delivery-contract-keyword-search',
  surfaceKind: 'list-keyword',
  inputDraft: searchDraft.value,
  normalizedDraft: searchDraft.value.trim().toLowerCase(),
  committedKeyword: searchApplied.value,
  compositionState: {
    active: searchCompositionActive.value,
    submitBlockedWhileComposing: true
  },
  submitPolicy: 'enter-and-button explicit',
  debounceState: 'none',
  clearPolicy: 'resetSearch restores default keyword and reapplies the product list query',
  requestBinding: 'local list filter',
  historyBinding: 'not-synced',
  permissionBoundary: 'local admin mock data',
  feedbackBinding: hasAppliedDeliveryFilters.value && !filteredProducts.value.length ? 'zero-results-empty-state' : 'result-summary',
  responsivePolicy: 'input, reset, search, result summary, and empty recovery remain visible in responsive wrapping toolbar'
}))

const queryFilterState = computed(() => ({
  filterOwnerId: 'delivery-contract-filter-bar',
  filterDraft: {
    keyword: searchDraft.value,
    currencyType: currencyTypeDraft.value,
    status: statusTab.value
  },
  appliedFilters: {
    keyword: searchApplied.value,
    currencyType: currencyTypeApplied.value,
    status: statusTab.value
  },
  defaultFilters: {
    keyword: '',
    currencyType: 'all',
    status: COMMON_FILTER_ALL
  },
  filterSchema: {
    keyword: { type: 'keyword', applyMode: 'explicit', urlSafe: false, sensitive: false },
    currencyType: { type: 'single-select', applyMode: 'explicit', urlSafe: false, sensitive: false },
    status: { type: 'tab-filter', applyMode: 'immediate', urlSafe: false, sensitive: false }
  },
  queryIntent: {
    owner: 'delivery-contract-product-list',
    source: 'explicit-search-or-status-tab',
    resetsPagination: true
  },
  urlState: 'not-synced',
  requestBinding: 'local mock product list reads appliedFilters only'
}))

const emptyStateDecision = computed(() => ({
  emptyStateOwnerId: 'delivery-contract-zero-results',
  emptySurface: 'card-list',
  emptyReason: filteredProducts.value.length ? 'none' : hasAppliedDeliveryFilters.value ? 'zero-results' : 'true-empty',
  dataScopeSnapshot: 'local delivery contract products',
  querySnapshot: queryFilterState.value.appliedFilters,
  permissionBoundary: 'local admin mock data',
  capabilityPolicy: {
    canCreate: true,
    canResetFilters: hasAppliedDeliveryFilters.value
  },
  contentPolicy: 'zero-results explains filters can be adjusted without claiming the data source is empty',
  primaryActionPolicy: hasAppliedDeliveryFilters.value ? 'reset filters to default query' : 'create delivery contract',
  secondaryActionPolicy: 'adjust keyword, currency type, or status filter',
  recoveryPolicy: 'resetSearch restores default filters and creates a new local query intent',
  illustrationPolicy: 'none',
  feedbackBinding: 'list result empty feedback',
  resultOwnerBinding: 'delivery-contract-product-results',
  responsivePolicy: 'empty title, explanation, and recovery button stay in the card list region',
  focusAnnouncementPolicy: 'role=status announces zero-results without duplicate toast',
  lifecycleDisposal: 'query changes recompute this decision with the current owner state',
  runtimeVerification: 'static tests, production build, and Chromium smoke verified for zero-results surface, desktop route, mobile width, and 200% zoom; screen reader, physical touch, virtual keyboard, reduced-motion, high-contrast, and real safe-area checks remain unverified'
}))

const listResultControlsState = computed(() => ({
  resultControlsOwnerId: 'delivery-contract-product-results',
  surfaceKind: 'card-list',
  appliedQueryBinding: queryFilterState.value.appliedFilters,
  querySnapshot: {
    filters: queryFilterState.value.appliedFilters,
    sort: { field: 'sortOrder', direction: 'desc', stableTieBreaker: 'source order' },
    pagination: {
      mode: 'numbered',
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize
    }
  },
  requestGeneration: 0,
  requestPhase: 'ready',
  sortState: { field: 'sortOrder', direction: 'desc' },
  paginationState: {
    mode: 'numbered',
    currentPage: pagination.currentPage,
    pageSize: pagination.pageSize,
    total: allFilteredProducts.value.length,
    totalReliable: true,
    rangeStart: resultRangeStart.value,
    rangeEnd: resultRangeEnd.value
  },
  refreshState: 'local-static',
  resultSummary: {
    visibleCount: filteredProducts.value.length,
    total: allFilteredProducts.value.length,
    text: deliveryContractResultSummaryText.value,
    announcementOwner: 'delivery-contract-result-summary'
  },
  selectionImpact: 'no selection action on this card list',
  urlHistoryBinding: 'not-synced',
  permissionBoundary: 'local admin mock data',
  feedbackBinding: filteredProducts.value.length ? 'ready-results' : 'zero-results-empty-state',
  responsivePolicy: 'card list wraps and pagination controls remain reachable'
}))

const cardListResultState = computed(() => ({
  cardListOwnerId: 'delivery-contract-card-list',
  surfaceKind: 'list',
  capabilityTier: 'item-action',
  sourceBinding: listResultControlsState.value.querySnapshot,
  cardIdentityMap: filteredProducts.value.map((product) => ({
    id: product.id,
    objectType: 'delivery-contract',
    safeName: product.name,
    permissionVersion: 'local'
  })),
  fieldMapping: {
    title: 'name',
    subtitle: 'code',
    primaryStatus: 'status',
    template: 'templateName',
    tradeLimit: 'product buy limit fields; 0 means unlimited for that field',
    fee: 'sellFee'
  },
  interactionZones: {
    itemAction: 'edit button',
    selection: 'none',
    primaryOpen: 'none'
  },
  selectionBinding: 'not-instantiated',
  actionBinding: 'edit opens delivery contract dialog',
  requestBinding: 'local static list',
  permissionBoundary: 'local admin mock data',
  feedbackBinding: listResultControlsState.value.feedbackBinding,
  responsivePolicy: 'cards naturally wrap fields and expose edit action',
  focusKeyboardPolicy: 'Tab enters per-card edit actions and pagination controls',
  runtimeVerification: 'static tests, production build, and Chromium smoke verified for card unlimited-limit display and desktop route; screen reader, physical touch, reduced-motion, high-contrast, and real safe-area checks remain unverified'
}))

const deliveryContractCardTextOverflowState = computed(() => ({
  textOwnerId: 'delivery-contract-card-text',
  textSurface: 'card-field',
  sourceBinding: cardListResultState.value.cardIdentityMap,
  contentIdentity: {
    objectName: 'delivery contract name',
    code: 'delivery contract code',
    summary: 'pair, trade limit, buy range, and maximum position',
    limitAmounts: 'minimum buy, maximum buy, maximum hold',
    selectedTemplatePreview: 'template name, cycle count, and cycle chips in the editor preview',
    critical: true
  },
  displayPolicy: 'wrap important identity and numeric fields instead of truncating them',
  truncationPolicy: 'not-truncated; card height may grow at narrow width, translated text, or 200% zoom',
  fullTextAccessPolicy: 'full text remains inline through break-words and break-all; no hover-only tooltip is required',
  copyPolicy: 'not-provided for local mock card fields',
  tooltipPopoverBoundary: 'tooltip is not the only full-text access path',
  lineWrapPolicy: 'Chinese names wrap by words; codes, numeric strings, selected template names, and cycle chips break or wrap to avoid horizontal overflow',
  measurementPolicy: 'CSS wrapping responds to container width, language expansion, and browser zoom without a JS measuring task',
  permissionBoundary: 'same as cardListResultState local admin mock permission boundary',
  responsivePolicy: 'card identity, trade limit status, key amounts, edit action, and pagination remain reachable on narrow and zoomed layouts',
  focusAnnouncementPolicy: 'static text does not receive tabindex; edit and pagination buttons remain the focus targets',
  lifecycleDisposal: 'computed state follows current filtered card list and has no external listeners to clean up',
  runtimeVerification: 'static tests, production build, and Chromium smoke verified for mobile dialog width and 200% zoom entry; screen reader, physical touch, long translation, reduced-motion, high-contrast, and real safe-area checks remain unverified'
}))

const buttonActionStates = computed(() => ({
  applyFilters: {
    buttonId: 'delivery-contract-apply-filters',
    actionKind: 'command',
    hierarchy: 'primary',
    availability: 'enabled',
    disabledReasonOwner: 'none',
    asyncPhase: 'idle',
    requestIdentity: queryFilterState.value.filterDraft,
    resultOwner: 'delivery-contract-product-results',
    accessibleName: '应用交割合约筛选条件'
  },
  resetFilters: {
    buttonId: 'delivery-contract-reset-filters',
    actionKind: 'command',
    hierarchy: 'secondary',
    availability: 'enabled',
    disabledReasonOwner: 'none',
    asyncPhase: 'idle',
    requestIdentity: queryFilterState.value.defaultFilters,
    resultOwner: 'delivery-contract-product-results',
    accessibleName: '重置交割合约筛选条件'
  },
  createContract: {
    buttonId: 'delivery-contract-create',
    actionKind: 'command',
    hierarchy: 'primary',
    availability: 'enabled',
    disabledReasonOwner: 'none',
    asyncPhase: 'idle',
    requestIdentity: 'new delivery contract draft',
    resultOwner: 'delivery-contract-editor-dialog',
    accessibleName: '新增交割合约'
  },
  saveContract: {
    buttonId: 'delivery-contract-save',
    actionKind: 'submit',
    hierarchy: 'primary',
    availability: 'enabled',
    disabledReasonOwner: 'form-validation',
    asyncPhase: 'idle',
    requestIdentity: 'delivery contract form snapshot',
    resultOwner: 'delivery-contract-product-results',
    accessibleName: '保存交割合约'
  }
}))

const pageContentLayoutState = computed(() => ({
  contentOwnerId: 'delivery-contract-page-content',
  contentSurface: 'list-page',
  pageBinding: {
    pageOwner: pageHeaderState.value.pageIdentity.pageOwner,
    headerOwnerId: pageHeaderState.value.headerOwnerId,
    routeUrl: pageHeaderState.value.pageIdentity.url,
    mainRegionLabelledBy: pageHeaderState.value.titleBinding.titleElementId
  },
  sectionRegistry: [
    { id: 'delivery-contract-filter-section', name: '筛选条件', contentType: 'query-filter', ownerHandoff: 'queryFilterState' },
    { id: 'delivery-contract-product-section', name: '产品结果', contentType: 'card-list-results', ownerHandoff: 'listResultControlsState and cardListResultState' },
    { id: 'delivery-contract-pagination-section', name: '分页', contentType: 'list-pagination', ownerHandoff: 'listResultControlsState' },
    { id: 'delivery-contract-editor-dialog', name: '新增或编辑交割合约', contentType: 'record-editor-dialog', ownerHandoff: 'contractEditSurfaceState, contractFormState, and dialog lifecycle' }
  ],
  layoutGridPolicy: 'single-column admin list page; filters wrap, product cards remain vertical results, and internal card metrics collapse before requiring horizontal scrolling',
  scrollBoundary: 'application shell owns the main page scroll; dialog owns a separate fixed frame with only its body scrolling',
  stickyBoundary: 'no page sticky footer; dialog footer and pagination account for safe-area and wrapping controls',
  densityPolicy: 'quiet admin density with readable card spacing, visible labels, and touch-reachable actions',
  contentPriority: ['page header', 'filters', 'status summary and create entry', 'product cards', 'pagination', 'editor dialog when open'],
  emptyLoadingErrorBinding: {
    empty: 'emptyStateDecision',
    resultStatus: 'delivery-contract-result-summary',
    pairOptionsError: 'contractErrors.spotSymbol and retry button'
  },
  ownerHandoff: {
    filterSection: 'queryFilterState and keywordSearchInputState',
    resultSection: 'listResultControlsState and cardListResultState',
    buttons: 'buttonActionStates',
    dialog: 'contractEditSurfaceState, contractFormState, contractFormLayoutState, contractTabViewState, and dialog lifecycle'
  },
  permissionBoundary: 'local admin mock data; hidden or disabled permission variants are not instantiated in this mock page',
  responsivePolicy: 'core sections, filter reset, create/edit actions, result summary, pagination, validation errors, and dialog actions remain present through wrapping and fixed-frame dialog layout',
  focusAnnouncementPolicy: 'main region is labelled by the h1; status and validation announcements have single owners',
  lifecycleDisposal: 'route or component unmount disposes dialog lifecycle, local computed owners, and mock async pair loading through component teardown',
  runtimeVerification: 'static tests, production build, and Chromium smoke verified for desktop route, mobile dialog width, and 200% zoom entry; screen reader, physical touch, virtual keyboard, route-change, reduced-motion, high-contrast, and real safe-area checks remain unverified'
}))

// 监听筛选变化，重置页码
watch([statusTab, searchApplied, currencyTypeApplied], () => {
  pagination.currentPage = 1
})

const durationLabel = (sec) => {
  if (sec < 60) return `${sec}秒`
  if (sec % 60 === 0) return `${sec / 60}分钟`
  return `${sec}s`
}

const templateById = computed(() => Object.fromEntries(templates.value.map((t) => [t.id, t])))
const enabledTemplates = computed(() => templates.value.filter((t) => t.status === DELIVERY_STATUS.ENABLED))
const productCycles = (product) => templateById.value[product.templateId]?.cycles || []
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
    owner: cardListResultState.value.cardListOwnerId,
    query: queryFilterState.value.appliedFilters,
    sort: listResultControlsState.value.querySnapshot.sort,
    pagination: {
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize,
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
    onSourceUnavailable: 'restore focus to delivery-contract-page-title'
  },
  inlineEditBoundary: 'list cards expose create/edit actions only; record fields stay inside the dialog form owner',
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
    appliedFilters: queryFilterState.value.appliedFilters,
    pagination: {
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize
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
    : showContractModal.value ? contractDialogTitleId : pageHeaderState.value.titleBinding.titleElementId,
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
    { field: 'sortOrder', label: '产品排序', requirementPolicy: 'required numeric value, zero allowed', descriptionPolicy: 'larger values appear earlier in the product list', placeholderPolicy: 'example only' },
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
  if (!validateNonNegativeNumber(contractForm.sortOrder)) contractErrors.sortOrder = '产品排序必须是大于等于 0 的数字'

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

const statusClass = (status) =>
  status === DELIVERY_STATUS.ENABLED
    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
    : 'bg-rose-50 text-rose-600 border-rose-100'

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
</script>

<template>
  <section
    class="space-y-4"
    role="main"
    :aria-labelledby="pageHeaderState.titleBinding.titleElementId"
    :data-content-owner="pageContentLayoutState.contentOwnerId"
  >
    <!-- Page Header -->
    <header class="flex flex-wrap items-start justify-between gap-4" :aria-labelledby="pageHeaderState.titleBinding.titleElementId">
      <div>
        <h1 :id="pageHeaderState.titleBinding.titleElementId" class="break-words text-3xl font-semibold text-slate-900">交割合约管理</h1>
        <p class="mt-1 text-sm text-slate-500">管理平台交割合约产品的核心配置，包括周期模板、交易限额及手续费率</p>
      </div>
    </header>

    <article id="delivery-contract-filter-section" class="rounded-xl border border-slate-200 bg-white p-4" aria-label="交割合约筛选条件">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <div class="flex items-center gap-2">
            <label class="text-sm text-slate-600 whitespace-nowrap" for="delivery-contract-currency-type">币种类型</label>
            <CurrencyTypeSelect id="delivery-contract-currency-type" v-model="currencyTypeDraft" class="shrink-0" />
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto">
            <label class="text-sm text-slate-600 whitespace-nowrap" for="delivery-contract-search">产品名称</label>
            <div class="relative w-full sm:w-80">
              <input
                id="delivery-contract-search"
                v-model="searchDraft"
                type="text"
                class="ant-input w-full pl-9 !h-8"
                placeholder="搜索产品名称或代码..."
                aria-describedby="delivery-contract-search-help"
                @compositionstart="handleSearchCompositionStart"
                @compositionend="handleSearchCompositionEnd"
                @keydown="handleSearchKeydown"
              />
              <svg viewBox="0 0 20 20" class="pointer-events-none absolute left-3 top-2 h-4 w-4 text-slate-400" fill="none">
                <circle cx="9" cy="9" r="5.8" stroke="currentColor" stroke-width="1.6" />
                <path d="M13.6 13.6L16.4 16.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
              <p id="delivery-contract-search-help" class="sr-only">
                输入产品名称或代码后按 Enter 或点击搜索应用筛选；中文输入法候选确认期间不会提交搜索。
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="ant-btn !h-8"
            aria-label="重置交割合约筛选条件"
            @click="resetSearch"
          >
            <span>重置</span>
          </button>
          <button
            type="button"
            class="ant-btn ant-btn-primary !h-8"
            aria-label="应用交割合约筛选条件"
            @click="applySearch"
          >
            <span>搜索</span>
          </button>
        </div>
      </div>
    </article>

    <article id="delivery-contract-product-section" class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div class="flex flex-wrap items-center gap-6 text-sm">
          <div
            class="inline-flex max-w-full items-center gap-6 overflow-x-auto"
            role="tablist"
            aria-label="交割合约产品状态筛选"
            aria-orientation="horizontal"
            @keydown="handleStatusFilterTabKeydown"
          >
            <button
              v-for="tab in statusFilterTabRegistry"
              :key="tab.id"
              type="button"
              role="tab"
              :id="`delivery-contract-status-tab-${tab.id}`"
              :aria-selected="statusTab === tab.id"
              :tabindex="statusTab === tab.id ? 0 : -1"
              aria-controls="delivery-contract-product-list"
              class="relative py-2 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              :class="statusTab === tab.id ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600' : 'text-slate-500 hover:text-slate-700'"
              @click="setStatusFilterTab(tab.id)"
            >
              {{ tab.title }}
            </button>
          </div>
          <span
            id="delivery-contract-result-summary"
            class="text-slate-500"
            role="status"
            aria-live="polite"
          >
            {{ deliveryContractResultSummaryText }}
          </span>
        </div>

        <button
          type="button"
          class="ant-btn ant-btn-primary !h-8 shrink-0"
          aria-label="新增交割合约"
          @click="openCreateContract($event)"
        >
          <span>+ 新增合约</span>
        </button>
      </div>

      <div id="delivery-contract-product-list" class="p-4 space-y-4" role="tabpanel" :aria-labelledby="`delivery-contract-status-tab-${statusTab}`">
        <div
          v-if="!filteredProducts.length"
          class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center"
          role="status"
          aria-live="polite"
        >
          <h3 class="text-sm font-semibold text-slate-900">当前筛选条件无匹配产品</h3>
          <p class="mt-1 text-sm text-slate-500">
            可调整产品名称、币种类型或状态筛选后重新查询。
          </p>
          <button
            v-if="hasAppliedDeliveryFilters"
            type="button"
            class="ant-btn mt-4"
            aria-label="重置交割合约筛选条件并查看全部产品"
            @click="resetSearch"
          >
            重置筛选
          </button>
        </div>
        <template v-else>
          <article
            v-for="item in filteredProducts"
            :key="item.id"
            class="rounded-lg border border-slate-200 bg-white transition-all hover:border-blue-500/30 hover:shadow-md"
            :aria-label="`交割合约 ${item.name}`"
          >
          <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-4">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-3 flex-wrap">
                <h3 class="min-w-0 break-words text-base font-semibold text-slate-900">{{ item.name }}</h3>
                <span class="break-all text-sm font-mono text-slate-500">{{ item.code }}</span>
                <span
                  class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border"
                  :class="statusClass(item.status)"
                >
                  {{ item.status === DELIVERY_STATUS.ENABLED ? '已启用' : '已禁用' }}
                </span>
                <span class="px-2 py-0.5 text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded">
                  {{ currencyTypeLabel(currencyTypeByPair(item.pair)) }}
                </span>
                <span class="px-2 py-0.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded">
                  {{ item.templateName }}
                </span>
              </div>
              <p class="mt-2 break-words text-sm leading-6 text-slate-600">
                交易对: <span class="text-slate-900 font-medium">{{ item.pair }}</span>
                <span class="mx-3 text-slate-200">|</span>
                <template v-if="productTradeLimitUnlimited(item)">
                  交易限制: <span class="font-medium text-blue-600">不限制</span>
                </template>
                <template v-else>
                  买入范围: <span class="text-slate-900 font-medium">{{ tradeLimitRangeDisplay(item) }}</span>
                  <span class="mx-3 text-slate-200">|</span>
                  最大持仓: <span class="text-slate-900 font-medium">{{ tradeLimitMaxPositionDisplay(item) }}</span>
                </template>
              </p>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <span class="text-xs text-slate-400">可选周期:</span>
                <span
                  v-for="cycle in productCycles(item)"
                  :key="cycle.id"
                  class="px-2 py-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded"
                >
                  {{ durationLabel(cycle.durationSec) }} ({{ cycle.payoutPct.toFixed(1) }}%)
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="ant-btn "
                :aria-label="`编辑交割合约 ${item.name}`"
                @click="openEditContract(item, $event)"
              >
                编辑
              </button>
            </div>
          </div>

          <div class="grid gap-0 md:grid-cols-2 bg-slate-50/30">
            <div class="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">交易限制</p>
                <span
                  v-if="productTradeLimitUnlimited(item)"
                  class="inline-flex items-center rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600"
                >
                  不限制
                </span>
              </div>
              <div
                v-if="productTradeLimitUnlimited(item)"
                class="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700"
                :aria-label="`${item.name} 交易限制不限制`"
              >
                <p class="font-medium">不限制交易额度</p>
                <p class="mt-1 text-xs leading-5 text-blue-600">最低买入、最大买入和最大持仓均配置为 0，表示该产品交易额度不做限制。</p>
              </div>
              <ul v-else class="mt-3 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <li class="flex flex-col gap-1">
                  <span class="text-slate-500 text-xs">最低买入</span>
                  <span class="break-all text-slate-900 font-semibold font-mono">{{ tradeLimitDisplay(item.minBuy) }}</span>
                </li>
                <li class="flex flex-col gap-1">
                  <span class="text-slate-500 text-xs">最大买入</span>
                  <span class="break-all text-slate-900 font-semibold font-mono">{{ tradeLimitDisplay(item.maxBuy) }}</span>
                </li>
                <li class="flex flex-col gap-1">
                  <span class="text-slate-500 text-xs">最大持仓</span>
                  <span class="break-all text-slate-900 font-semibold font-mono">{{ tradeLimitDisplay(item.maxHold) }}</span>
                </li>
              </ul>
            </div>
            <div class="p-4">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">手续费率</p>
              <ul class="mt-3 grid grid-cols-1 gap-4 text-sm">
                <li class="flex flex-col gap-1">
                  <span class="text-slate-500 text-xs">交割费率</span>
                  <span class="text-rose-600 font-bold font-mono">{{ Number(item.sellFee).toFixed(2) }}%</span>
                </li>
              </ul>
            </div>
          </div>
          </article>
        </template>
      </div>

      <!-- 分页组件 -->
      <nav
        v-if="totalPages > 1"
        id="delivery-contract-pagination-section"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4"
        aria-label="交割合约产品分页"
      >
        <div class="text-sm text-slate-500" aria-describedby="delivery-contract-result-summary">
          <span aria-hidden="true">
            显示
            <span class="font-medium text-slate-900">{{ resultRangeStart }}</span>
            -
            <span class="font-medium text-slate-900">{{ resultRangeEnd }}</span>
            ，共 <span class="font-medium text-slate-900">{{ allFilteredProducts.length }}</span> 条记录
          </span>
        </div>
        <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <button
            type="button"
            class="ant-btn ant-btn-sm flex-1 sm:flex-none"
            :disabled="pagination.currentPage === 1"
            aria-label="上一页交割合约产品"
            @click="pagination.currentPage--"
          >
            上一页
          </button>
          <div class="flex flex-wrap items-center justify-center gap-1">
            <button
              v-for="p in totalPages"
              :key="p"
              type="button"
              class="ant-btn ant-btn-sm w-8 p-0"
              :class="pagination.currentPage === p ? 'ant-btn-primary' : ''"
              :aria-label="`第 ${p} 页交割合约产品`"
              :aria-current="pagination.currentPage === p ? 'page' : undefined"
              @click="pagination.currentPage = p"
            >
              {{ p }}
            </button>
          </div>
          <button
            type="button"
            class="ant-btn ant-btn-sm flex-1 sm:flex-none"
            :disabled="pagination.currentPage === totalPages"
            aria-label="下一页交割合约产品"
            @click="pagination.currentPage++"
          >
            下一页
          </button>
        </div>
      </nav>
    </article>

    <!-- 编辑模态框 -->
    <Teleport to="body">
      <Transition name="modal" appear @after-enter="onContractDialogAfterEnter" @after-leave="handleContractModalAfterLeave">
        <div
          v-if="contractDialogRendered"
          v-show="contractDialogPhase !== 'closing'"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))] [padding-top:max(1rem,env(safe-area-inset-top))] backdrop-blur-sm"
          :style="contractDialogLayerStyle"
          role="presentation"
        >
          <section
            ref="contractDialogRef"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="contractDialogTitleId"
            class="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)]"
          >
          <header class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
            <div class="min-w-0 flex-1">
              <h2
                :id="contractDialogTitleId"
                ref="contractDialogTitleRef"
                tabindex="-1"
                class="break-words text-lg font-semibold text-slate-900 outline-none"
              >
                {{ editingContractId ? '编辑交割合约' : '新增交割合约' }}
              </h2>
            </div>
            <button
              type="button"
              class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="关闭"
              @click="closeContractModal"
            >
              ×
            </button>
          </header>

          <div class="shrink-0 border-b border-slate-100 bg-white px-6">
            <div
              class="flex gap-8 overflow-x-auto"
              role="tablist"
              aria-label="交割合约编辑步骤"
              aria-orientation="horizontal"
              @keydown="handleContractTabKeydown"
            >
              <button
                v-for="tab in contractTabRegistry"
                :key="tab.id"
                type="button"
                role="tab"
                :id="`delivery-contract-tab-${tab.id}`"
                :aria-selected="contractTab === tab.id"
                :tabindex="contractTab === tab.id ? 0 : -1"
                :aria-controls="`delivery-contract-panel-${tab.id}`"
                class="relative shrink-0 py-3 text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                :class="
                  contractTab === tab.id
                    ? 'text-blue-600 font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                "
                @click="setContractTab(tab.id)"
              >
                {{ tab.title }}
              </button>
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
            <div
              v-if="contractErrorItems.length"
              :id="contractErrorSummaryId"
              ref="contractErrorSummaryRef"
              tabindex="-1"
              role="alert"
              aria-live="assertive"
              class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 outline-none focus:ring-2 focus:ring-rose-400"
            >
              <p class="font-medium">请修复以下 {{ contractErrorItems.length }} 项后再保存</p>
              <ul class="mt-2 list-disc space-y-1 pl-5">
                <li v-for="error in contractErrorItems" :key="error.field">
                  <button type="button" class="text-left underline underline-offset-2" @click="focusContractField(error.field)">
                    {{ error.message }}
                  </button>
                </li>
              </ul>
            </div>

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
                  <label class="text-sm text-slate-900" :for="contractFieldId('name')">合约名称 <span class="text-rose-500">*</span></label>
                  <input
                    :id="contractFieldId('name')"
                    v-model="contractForm.name"
                    type="text"
                    class="ant-input"
                    placeholder="如：BTC 周期合约"
                    required
                    aria-required="true"
                    :aria-invalid="Boolean(contractErrors.name)"
                    :aria-describedby="contractFieldDescribedBy('name')"
                  />
                  <p v-if="contractErrors.name" :id="contractFieldErrorId('name')" class="text-xs text-rose-600">{{ contractErrors.name }}</p>
                </div>
                <div class="space-y-1.5">
                  <label class="text-sm text-slate-900" :for="contractFieldId('code')">合约代码 <span class="text-rose-500">*</span></label>
                  <input
                    :id="contractFieldId('code')"
                    v-model="contractForm.code"
                    type="text"
                    class="ant-input uppercase"
                    placeholder="如：BTC_DELIVERY"
                    required
                    aria-required="true"
                    :aria-invalid="Boolean(contractErrors.code)"
                    :aria-describedby="contractFieldDescribedBy('code')"
                  />
                  <p v-if="contractErrors.code" :id="contractFieldErrorId('code')" class="text-xs text-rose-600">{{ contractErrors.code }}</p>
                </div>
                <div class="space-y-1.5 md:col-span-2" :aria-busy="pairOptionsLoading ? 'true' : undefined">
                  <label class="text-sm text-slate-900" :for="contractFieldId('spotSymbol')">选择交易对 <span class="text-rose-500">*</span></label>
                  <select
                    :id="contractFieldId('spotSymbol')"
                    v-model="contractForm.spotSymbol"
                    class="ant-select w-full"
                    required
                    aria-required="true"
                    :disabled="pairOptionsLoading"
                    :aria-invalid="Boolean(contractErrors.spotSymbol)"
                    :aria-describedby="contractFieldDescribedBy('spotSymbol', 'delivery-contract-spot-symbol-help')"
                  >
                    <option v-if="pairOptionsLoading" value="">交易对加载中...</option>
                    <option v-else-if="contractForm.spotSymbol && !pairOptions.includes(contractForm.spotSymbol)" :value="contractForm.spotSymbol">
                      {{ contractForm.spotSymbol }}（当前不可用）
                    </option>
                    <option v-for="opt in pairOptions" :key="`pair-${opt}`" :value="opt">{{ opt }}</option>
                  </select>
                  <p id="delivery-contract-spot-symbol-help" class="text-xs text-slate-400" aria-live="polite">
                    <template v-if="pairOptionsLoading">正在加载可用交易对。</template>
                    <template v-else-if="pairOptionsError">{{ pairOptionsError }}</template>
                    <template v-else-if="selectedSpotSymbolUnavailable">当前交易对已不在可用列表中，请重新选择后保存。</template>
                    <template v-else>保存时会同步合约的基础币种和计价币种。</template>
                  </p>
                  <button
                    v-if="pairOptionsError"
                    type="button"
                    class="ant-btn ant-btn-sm"
                    :disabled="pairOptionsLoading"
                    aria-label="重新加载交割合约可用交易对"
                    @click="loadSpotSymbols"
                  >
                    重新加载交易对
                  </button>
                  <p v-if="contractErrors.spotSymbol" :id="contractFieldErrorId('spotSymbol')" class="text-xs text-rose-600">{{ contractErrors.spotSymbol }}</p>
                </div>
                <div class="space-y-1.5">
                  <span id="delivery-contract-status-label" class="block text-sm text-slate-900">产品状态 <span class="text-rose-500">*</span></span>
                  <div
                    class="inline-flex flex-wrap rounded border border-slate-200 bg-slate-50 p-0.5"
                    role="radiogroup"
                    aria-labelledby="delivery-contract-status-label"
                    aria-describedby="delivery-contract-status-help"
                    aria-required="true"
                    @keydown="handleContractStatusKeydown"
                  >
                    <button
                      v-for="option in contractStatusOptionRegistry"
                      :id="`delivery-contract-status-${option.id}`"
                      :key="option.id"
                      type="button"
                      role="radio"
                      :aria-checked="contractForm.status === option.id"
                      :aria-disabled="option.disabled ? 'true' : undefined"
                      :tabindex="contractForm.status === option.id ? 0 : -1"
                      class="min-h-8 px-4 py-1 text-xs rounded transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      :class="[
                        contractForm.status === option.id
                          ? 'bg-white shadow-sm text-blue-600 font-medium'
                          : 'text-slate-500 hover:text-slate-700',
                        option.disabled ? 'cursor-not-allowed opacity-60' : ''
                      ]"
                      @click="setContractStatus(option.id)"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                  <p id="delivery-contract-status-help" class="text-xs text-slate-400">状态调整会随本次保存一起生效。</p>
                </div>
                <div class="space-y-1.5">
                  <label class="block text-sm text-slate-900" :for="contractFieldId('sortOrder')">产品排序 <span class="text-rose-500">*</span></label>
                  <input
                    :id="contractFieldId('sortOrder')"
                    v-model.number="contractForm.sortOrder"
                    type="number"
                    min="0"
                    inputmode="numeric"
                    class="ant-input font-mono"
                    placeholder="数字越大越靠前"
                    required
                    aria-required="true"
                    :aria-invalid="Boolean(contractErrors.sortOrder)"
                    :aria-describedby="contractFieldDescribedBy('sortOrder', 'delivery-contract-sort-help')"
                    @wheel.prevent
                  />
                  <p id="delivery-contract-sort-help" class="text-xs text-slate-400">数字越大越靠前，必须为大于等于 0 的数字。</p>
                  <p v-if="contractErrors.sortOrder" :id="contractFieldErrorId('sortOrder')" class="text-xs text-rose-600">{{ contractErrors.sortOrder }}</p>
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
                  <label class="text-sm text-slate-900" :for="contractFieldId('templateId')">选择周期模板 <span class="text-rose-500">*</span></label>
                  <select
                    :id="contractFieldId('templateId')"
                    v-model="contractForm.templateId"
                    class="ant-select"
                    required
                    aria-required="true"
                    :aria-invalid="Boolean(contractErrors.templateId)"
                    :aria-describedby="contractFieldDescribedBy('templateId', 'delivery-contract-template-help')"
                  >
                    <option
                      v-for="tpl in templates"
                      :key="tpl.id"
                      :value="tpl.id"
                      :disabled="tpl.status === DELIVERY_STATUS.DISABLED"
                    >
                      {{ tpl.name }}{{ tpl.status === DELIVERY_STATUS.DISABLED ? '（已禁用）' : '' }}
                    </option>
                  </select>
                  <p id="delivery-contract-template-help" class="text-xs leading-5 text-slate-400" aria-live="polite">
                    {{ selectedTemplatePolicyText }}
                  </p>
                  <p v-if="contractErrors.templateId" :id="contractFieldErrorId('templateId')" class="text-xs text-rose-600">{{ contractErrors.templateId }}</p>
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
                    <label class="text-sm text-slate-900" :for="contractFieldId('minBuy')">最低买入额 (USDT) <span class="text-rose-500">*</span></label>
                    <input
                      :id="contractFieldId('minBuy')"
                      v-model="contractForm.minBuy"
                      type="number"
                      min="0"
                      step="0.000001"
                      inputmode="decimal"
                      class="ant-input font-mono"
                      required
                      aria-required="true"
                      :aria-invalid="Boolean(contractErrors.minBuy)"
                      :aria-describedby="contractFieldDescribedBy('minBuy', 'delivery-contract-limit-help')"
                      @wheel.prevent
                    />
                    <p class="text-xs leading-5 text-slate-400">输入 0 表示最低买入额不限制。</p>
                    <p v-if="contractErrors.minBuy" :id="contractFieldErrorId('minBuy')" class="text-xs text-rose-600">{{ contractErrors.minBuy }}</p>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-slate-900" :for="contractFieldId('maxBuy')">最高买入额 (USDT) <span class="text-rose-500">*</span></label>
                    <input
                      :id="contractFieldId('maxBuy')"
                      v-model="contractForm.maxBuy"
                      type="number"
                      min="0"
                      step="0.000001"
                      inputmode="decimal"
                      class="ant-input font-mono"
                      required
                      aria-required="true"
                      :aria-invalid="Boolean(contractErrors.maxBuy)"
                      :aria-describedby="contractFieldDescribedBy('maxBuy', 'delivery-contract-limit-help')"
                      @wheel.prevent
                    />
                    <p class="text-xs leading-5 text-slate-400">输入 0 表示最高买入额不限制。</p>
                    <p v-if="contractErrors.maxBuy" :id="contractFieldErrorId('maxBuy')" class="text-xs text-rose-600">{{ contractErrors.maxBuy }}</p>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-slate-900" :for="contractFieldId('maxHold')">最大持仓额 (USDT) <span class="text-rose-500">*</span></label>
                    <input
                      :id="contractFieldId('maxHold')"
                      v-model="contractForm.maxHold"
                      type="number"
                      min="0"
                      step="0.000001"
                      inputmode="decimal"
                      class="ant-input font-mono"
                      required
                      aria-required="true"
                      :aria-invalid="Boolean(contractErrors.maxHold)"
                      :aria-describedby="contractFieldDescribedBy('maxHold', 'delivery-contract-limit-help')"
                      @wheel.prevent
                    />
                    <p class="text-xs leading-5 text-slate-400">输入 0 表示最大持仓额不限制。</p>
                    <p v-if="contractErrors.maxHold" :id="contractFieldErrorId('maxHold')" class="text-xs text-rose-600">{{ contractErrors.maxHold }}</p>
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
                  <label class="text-sm text-slate-900" :for="contractFieldId('sellFee')">交割手续费率 (%) <span class="text-rose-500">*</span></label>
                  <div class="relative">
                    <input
                      :id="contractFieldId('sellFee')"
                      v-model="contractForm.sellFee"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      inputmode="decimal"
                      class="ant-input font-mono pr-8"
                      required
                      aria-required="true"
                      :aria-invalid="Boolean(contractErrors.sellFee)"
                      :aria-describedby="contractFieldDescribedBy('sellFee', 'delivery-contract-fee-help')"
                      @wheel.prevent
                    />
                    <span class="absolute right-3 top-1.5 text-slate-400 text-sm">%</span>
                  </div>
                  <p id="delivery-contract-fee-help" class="text-xs text-slate-400">费率单位为百分比，允许 0 到 100。</p>
                  <p v-if="contractErrors.sellFee" :id="contractFieldErrorId('sellFee')" class="text-xs text-rose-600">{{ contractErrors.sellFee }}</p>
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
                <button
                  type="button"
                  class="ant-btn w-full sm:w-auto"
                  @click="keepEditingContract"
                >
                  继续编辑
                </button>
                <button
                  type="button"
                  class="ant-btn ant-btn-primary w-full sm:w-auto"
                  :aria-label="contractDiscardConfirmState.confirmAriaLabel"
                  @click="discardContractChanges"
                >
                  {{ contractDiscardConfirmState.confirmLabel }}
                </button>
              </div>
            </div>
            <div class="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                class="ant-btn w-full sm:w-auto"
                @click="closeContractModal"
              >
                取消
              </button>
              <button
                type="submit"
                class="ant-btn ant-btn-primary w-full sm:w-auto"
                aria-label="保存交割合约"
              >
                保存合约
              </button>
            </div>
          </footer>
          </form>
          </section>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease-out;
}
.modal-leave-active {
  transition-duration: 150ms;
  transition-timing-function: ease-in;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active > section,
.modal-leave-active > section {
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}
.modal-leave-active > section {
  transition-duration: 150ms;
  transition-timing-function: ease-in;
}
.modal-enter-from > section,
.modal-leave-to > section {
  opacity: 0;
  transform: scale(0.96);
}
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active > section,
  .modal-leave-active > section {
    transition-duration: 50ms;
  }
  .modal-enter-from > section,
  .modal-leave-to > section {
    transform: none;
  }
}
</style>
