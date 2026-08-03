<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from '../../constants/user.js'
import { getDescendants, getDirectReferrals } from '../../repositories/userRelationshipRepository.js'
import {
  createDialogCloseAction,
  getFocusableElements,
  registerDialogPopupHost,
  unregisterDialogPopupHost,
  useDialogLifecycle
} from '../../composables/useDialogLifecycle.js'
import CompactPagination from '../CompactPagination.vue'

const PAGE_SIZE = 10
const FILTER_PANEL_FALLBACK_HEIGHT = { status: 142, role: 102 }

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  mode: { type: String, default: 'direct' },
  returnFocus: { type: [Object, Function], default: null }
})

const emit = defineEmits(['close', 'closed'])
const popupLayerRef = shallowRef(null)
const drawerRef = shallowRef(null)
const titleRef = shallowRef(null)
const statusFilterToggleRef = shallowRef(null)
const roleFilterToggleRef = shallowRef(null)
const filterPanelRef = shallowRef(null)
const filterPortalTarget = shallowRef('body')
const filterPanelStyle = ref({ position: 'fixed' })
const filterPlacement = ref('bottom')
const keyword = ref('')
const status = ref('all')
const role = ref('all')
const selectedMember = ref(null)
const currentPage = ref(1)
const openFilter = ref(null)
let filterPopupHostRegistration = null
let filterPositionFrame = 0
let filterVisualViewport = null
let filterSessionVersion = 0
let disposed = false

const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const isAllMode = computed(() => props.mode === 'all')
const title = computed(() => isAllMode.value ? '查看全部裂变下级' : '查看直属裂变下级')
const allMembers = computed(() => {
  if (!userId.value) return []
  if (isAllMode.value) return getDescendants(userId.value)
  return getDirectReferrals(userId.value).map((member) => ({
    ...member,
    depth: 1,
    path: [props.user, member].filter(Boolean)
  }))
})

const filteredMembers = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  return allMembers.value.filter((member) => {
    const matchesSearch = !search || [member.id, member.userId, member.username, member.email]
      .some((value) => String(value ?? '').toLowerCase().includes(search))
    const matchesStatus = status.value === 'all' || member.status === status.value
    const matchesRole = role.value === 'all' || member.role === role.value
    return matchesSearch && matchesStatus && matchesRole
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredMembers.value.length / PAGE_SIZE)))
const pagedMembers = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredMembers.value.slice(start, start + PAGE_SIZE)
})

const hasFilters = computed(() => Boolean(keyword.value.trim()) || status.value !== 'all' || role.value !== 'all')
const filterPanelId = computed(() => `relationship-drawer-${openFilter.value}-filter-panel`)
const filterPanelLabel = computed(() => openFilter.value === 'status' ? '账户状态筛选' : '用户角色筛选')
const filterLegend = computed(() => openFilter.value === 'status' ? '账户状态' : '用户角色')
const filterItems = computed(() => openFilter.value === 'status'
  ? [{ value: 'all', label: '全部状态' }, ...USER_STATUS_OPTIONS]
  : [{ value: 'all', label: '全部角色' }, ...USER_ROLE_OPTIONS])
const selectedFilterValue = computed(() => openFilter.value === 'status' ? status.value : role.value)
const statusLabel = (value) => USER_STATUS_OPTIONS.find((item) => item.value === value)?.label || value || '—'
const roleLabel = (value) => USER_ROLE_OPTIONS.find((item) => item.value === value)?.label || value || '—'
const formatMoney = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value || 0))
const formatTime = (value) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'
const pathLabel = (member) => (member.path || []).map((row) => row?.username || row?.id).filter(Boolean).join(' → ')

const {
  rendered,
  phase,
  layerStyle,
  requestDialogClose,
  onAfterEnter,
  onAfterLeave
} = useDialogLifecycle({
  open: computed(() => props.visible),
  dialogRef: drawerRef,
  initialFocusRef: titleRef,
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close')
})

const close = createDialogCloseAction(requestDialogClose)

const filterTriggerRef = (filter = openFilter.value) => (
  filter === 'status' ? statusFilterToggleRef : roleFilterToggleRef
)

const cancelFilterPositionFrame = () => {
  if (filterPositionFrame && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(filterPositionFrame)
  }
  filterPositionFrame = 0
}

const releaseFilterPopupHost = () => {
  unregisterDialogPopupHost(filterPopupHostRegistration)
  filterPopupHostRegistration = null
}

const resetFilterPopup = () => {
  cancelFilterPositionFrame()
  releaseFilterPopupHost()
  filterPlacement.value = 'bottom'
  filterPanelStyle.value = { position: 'fixed' }
}

const ensureFilterPopupHost = () => {
  const popupLayer = popupLayerRef.value
  if (!popupLayer || !drawerRef.value) return false
  filterPortalTarget.value = popupLayer
  if (!filterPopupHostRegistration) {
    filterPopupHostRegistration = registerDialogPopupHost(drawerRef.value, popupLayer)
  }
  return Boolean(filterPopupHostRegistration)
}

const positionFilterPanel = () => {
  if (disposed || !openFilter.value || typeof window === 'undefined' || typeof document === 'undefined') return
  const trigger = filterTriggerRef().value
  if (!trigger?.getBoundingClientRect) return

  const rect = trigger.getBoundingClientRect()
  const visualViewport = window.visualViewport
  const viewportWidth = visualViewport?.width || window.innerWidth || document.documentElement?.clientWidth || 0
  const viewportHeight = visualViewport?.height || window.innerHeight || document.documentElement?.clientHeight || 0
  const viewportLeft = visualViewport?.offsetLeft || 0
  const viewportTop = visualViewport?.offsetTop || 0
  if (!viewportWidth || !viewportHeight) return

  const viewportRight = viewportLeft + viewportWidth
  const viewportBottom = viewportTop + viewportHeight
  const margin = 8
  const gap = 6
  const minimumWidth = 288
  const maximumPanelHeight = 240
  const width = Math.min(
    Math.max(rect.width, minimumWidth),
    Math.max(1, viewportWidth - (margin * 2))
  )
  const left = Math.min(
    Math.max(rect.left, viewportLeft + margin),
    Math.max(viewportLeft + margin, viewportRight - margin - width)
  )
  const fallbackHeight = FILTER_PANEL_FALLBACK_HEIGHT[openFilter.value] || maximumPanelHeight
  const measuredHeight = filterPanelRef.value?.scrollHeight || filterPanelRef.value?.offsetHeight || fallbackHeight
  const preferredHeight = Math.min(measuredHeight, maximumPanelHeight)
  const availableBelow = Math.max(0, viewportBottom - rect.bottom - gap - margin)
  const availableAbove = Math.max(0, rect.top - viewportTop - gap - margin)
  const placeAbove = availableBelow < preferredHeight && availableAbove > availableBelow
  const availableHeight = Math.max(1, placeAbove ? availableAbove : availableBelow)
  const renderedHeight = Math.min(preferredHeight, availableHeight)
  const top = placeAbove
    ? Math.max(viewportTop + margin, rect.top - gap - renderedHeight)
    : Math.min(viewportBottom - margin, rect.bottom + gap)

  filterPlacement.value = placeAbove ? 'top' : 'bottom'
  filterPanelStyle.value = {
    position: 'fixed',
    top: `max(${Math.round(top)}px, env(safe-area-inset-top, 0px))`,
    left: `max(${Math.round(left)}px, env(safe-area-inset-left, 0px))`,
    width: `min(${Math.round(width)}px, calc(100vw - max(8px, env(safe-area-inset-left, 0px)) - max(8px, env(safe-area-inset-right, 0px))))`,
    maxHeight: `min(${Math.floor(availableHeight)}px, calc(100vh - max(8px, env(safe-area-inset-top, 0px)) - max(8px, env(safe-area-inset-bottom, 0px))))`,
    overflowX: 'hidden',
    overflowY: preferredHeight > availableHeight ? 'auto' : 'visible',
    overscrollBehaviorY: 'contain'
  }
}

const scheduleFilterPanelPosition = () => {
  if (disposed || !openFilter.value) return
  positionFilterPanel()
  if (typeof requestAnimationFrame !== 'function') return
  cancelFilterPositionFrame()
  const version = filterSessionVersion
  filterPositionFrame = requestAnimationFrame(() => {
    filterPositionFrame = 0
    if (disposed || version !== filterSessionVersion || !openFilter.value) return
    positionFilterPanel()
  })
}

const closeFilters = async ({ restoreFocus = true } = {}) => {
  const closingFilter = openFilter.value
  if (!closingFilter) return
  const version = ++filterSessionVersion
  openFilter.value = null
  cancelFilterPositionFrame()
  await nextTick()
  if (disposed || version !== filterSessionVersion || openFilter.value) return
  resetFilterPopup()
  if (restoreFocus) filterTriggerRef(closingFilter).value?.focus()
}

const toggleFilter = async (filter) => {
  if (openFilter.value === filter) {
    await closeFilters()
    return
  }
  const version = ++filterSessionVersion
  ensureFilterPopupHost()
  openFilter.value = filter
  await nextTick()
  if (disposed || version !== filterSessionVersion || openFilter.value !== filter) return
  ensureFilterPopupHost()
  scheduleFilterPanelPosition()
}

const handleFilterTriggerKeydown = (event) => {
  if (!openFilter.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    closeFilters()
    return
  }
  if (event.key !== 'Tab' || event.shiftKey || event.currentTarget !== roleFilterToggleRef.value) return
  const firstOption = getFocusableElements(filterPanelRef.value)[0]
  if (!firstOption) return
  event.preventDefault()
  event.stopPropagation()
  firstOption.focus()
}

const handleFilterPanelKeydown = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    closeFilters()
    return
  }
  if (event.key !== 'Tab') return

  const popupFocusable = getFocusableElements(filterPanelRef.value)
  const target = event.target || document.activeElement
  if (event.shiftKey && target === popupFocusable[0]) {
    event.preventDefault()
    event.stopPropagation()
    roleFilterToggleRef.value?.focus()
    return
  }
  if (!event.shiftKey && target === popupFocusable.at(-1)) {
    const drawerFocusable = getFocusableElements(drawerRef.value)
    const roleTriggerIndex = drawerFocusable.indexOf(roleFilterToggleRef.value)
    const nextTarget = drawerFocusable[roleTriggerIndex + 1] || drawerFocusable[0]
    if (!nextTarget) return
    event.preventDefault()
    event.stopPropagation()
    nextTarget.focus()
  }
}
const selectFilter = async (value) => {
  if (openFilter.value === 'status') status.value = value
  else if (openFilter.value === 'role') role.value = value
  await closeFilters()
}
const handleAfterLeave = async () => {
  if (!await onAfterLeave()) return
  emit('closed')
}

watch(() => [props.visible, userId.value, props.mode], ([visible]) => {
  filterSessionVersion += 1
  openFilter.value = null
  resetFilterPopup()
  if (!visible) return
  keyword.value = ''
  status.value = 'all'
  role.value = 'all'
  selectedMember.value = null
  currentPage.value = 1
})

watch(() => [keyword.value, status.value, role.value], () => {
  currentPage.value = 1
  selectedMember.value = null
})

watch(currentPage, () => {
  selectedMember.value = null
})

watch(totalPages, (nextTotalPages) => {
  currentPage.value = Math.min(currentPage.value, nextTotalPages)
})

const handleFilterViewportChange = () => {
  scheduleFilterPanelPosition()
}

onMounted(() => {
  window.addEventListener?.('resize', handleFilterViewportChange)
  window.addEventListener?.('scroll', handleFilterViewportChange, true)
  filterVisualViewport = window.visualViewport
  filterVisualViewport?.addEventListener?.('resize', handleFilterViewportChange)
  filterVisualViewport?.addEventListener?.('scroll', handleFilterViewportChange)
})

onBeforeUnmount(() => {
  disposed = true
  filterSessionVersion += 1
  openFilter.value = null
  resetFilterPopup()
  window.removeEventListener?.('resize', handleFilterViewportChange)
  window.removeEventListener?.('scroll', handleFilterViewportChange, true)
  filterVisualViewport?.removeEventListener?.('resize', handleFilterViewportChange)
  filterVisualViewport?.removeEventListener?.('scroll', handleFilterViewportChange)
  filterVisualViewport = null
})
</script>

<template>
  <Teleport to="body">
    <Transition name="relationship-overlay" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div
        v-if="rendered"
        v-show="phase !== 'closing'"
        class="fixed inset-0 flex justify-end bg-slate-950/50"
        style="position: fixed; inset: 0; overflow: visible; transform: none;"
        :style="layerStyle"
        role="presentation"
      >
        <section
          ref="drawerRef"
          class="relationship-panel flex h-screen max-h-screen w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl supports-[height:100dvh]:h-dvh supports-[height:100dvh]:max-h-dvh"
          role="dialog"
          aria-modal="true"
          aria-labelledby="relationship-drawer-title"
        >
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5" style="padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right));">
            <div class="min-w-0 flex-1">
              <h2 id="relationship-drawer-title" ref="titleRef" tabindex="-1" class="text-xl font-semibold text-slate-900 outline-none">
                {{ title }}
              </h2>
              <p class="mt-1 break-words text-sm text-slate-500">
                {{ user?.username || '未知用户' }} · UID {{ userId || '—' }} · 共 {{ allMembers.length }} 人
              </p>
            </div>
            <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="关闭" @click="close">×</button>
          </header>

          <div data-testid="relationship-drawer-body" class="min-h-0 flex flex-1 flex-col overflow-hidden" style="padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right));">
            <div data-testid="relationship-drawer-controls" class="shrink-0 px-4 pt-4 sm:px-5">
              <div class="relative mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label>
                  <span class="sr-only">搜索裂变下级</span>
                  <input v-model="keyword" type="search" class="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="搜索裂变下级的用户名、邮箱或 UID" />
                </label>
                <div class="mt-3 grid grid-cols-2 gap-2">
                  <button
                    ref="statusFilterToggleRef"
                    data-testid="relationship-drawer-status-filter-toggle"
                    type="button"
                    class="flex min-h-11 items-center rounded-lg px-2 text-left text-sm font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    :aria-expanded="openFilter === 'status' ? 'true' : 'false'"
                    aria-controls="relationship-drawer-status-filter-panel"
                    @click="toggleFilter('status')"
                    @keydown="handleFilterTriggerKeydown"
                  >
                    账户状态
                  </button>
                  <button
                    ref="roleFilterToggleRef"
                    data-testid="relationship-drawer-role-filter-toggle"
                    type="button"
                    class="flex min-h-11 items-center rounded-lg px-2 text-left text-sm font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    :aria-expanded="openFilter === 'role' ? 'true' : 'false'"
                    aria-controls="relationship-drawer-role-filter-panel"
                    @click="toggleFilter('role')"
                    @keydown="handleFilterTriggerKeydown"
                  >
                    用户角色
                  </button>
                </div>
              </div>
            </div>

            <div data-testid="relationship-member-scroll" class="min-h-20 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
              <div v-if="selectedMember" class="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                已选择裂变下级 {{ selectedMember.username }} · UID {{ selectedMember.id || selectedMember.userId }} · {{ roleLabel(selectedMember.role) }}
              </div>

              <div v-if="filteredMembers.length" class="space-y-2">
                <button
                  v-for="member in pagedMembers"
                  :key="member.id || member.userId"
                  type="button"
                  class="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  @click="selectedMember = member"
                >
                  <span class="flex flex-wrap items-start justify-between gap-2">
                    <span>
                      <span class="font-medium text-slate-900">{{ member.username }}</span>
                      <span class="ml-2 text-xs text-slate-500">UID {{ member.id || member.userId }}</span>
                    </span>
                    <span class="flex gap-1.5 text-xs">
                      <span class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{{ roleLabel(member.role) }}</span>
                    </span>
                  </span>
                  <span class="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-3">
                    <span>层级：第 {{ member.depth || 1 }} 层</span>
                    <span>直属裂变上级：{{ member.parentUsername || '无' }}</span>
                    <span>余额：{{ formatMoney(member.balance) }}</span>
                  </span>
                  <span v-if="isAllMode" class="mt-1.5 block break-words text-xs text-slate-500">裂变关系路径：{{ pathLabel(member) }}</span>
                  <span class="mt-1.5 block text-xs text-slate-500">注册时间：{{ formatTime(member.registerTime) }}</span>
                </button>
              </div>

              <div v-else class="grid min-h-52 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
                <div>
                  <p class="font-medium text-slate-700">{{ hasFilters ? '筛选后没有裂变下级' : '当前没有裂变下级' }}</p>
                  <p class="mt-1 text-sm text-slate-500">{{ hasFilters ? '请调整裂变下级搜索关键词或筛选条件' : '该用户目前没有符合此范围的裂变下级成员' }}</p>
                </div>
              </div>
            </div>

            <footer v-if="filteredMembers.length" data-testid="relationship-drawer-pagination" class="shrink-0 border-t border-slate-200 px-4 py-3 sm:px-5" style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom)); padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right));">
              <CompactPagination v-model:current-page="currentPage" :total-count="filteredMembers.length" :page-size="PAGE_SIZE" />
            </footer>
          </div>

          <Teleport :to="filterPortalTarget">
            <div
              v-if="openFilter"
              :id="filterPanelId"
              ref="filterPanelRef"
              :data-testid="filterPanelId"
              :data-placement="filterPlacement"
              :style="filterPanelStyle"
              class="pointer-events-auto fixed z-20 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
              role="group"
              :aria-label="filterPanelLabel"
              @keydown="handleFilterPanelKeydown"
            >
              <fieldset>
                <legend class="sr-only">{{ filterLegend }}</legend>
                <div class="grid grid-cols-2 gap-1">
                  <button
                    v-for="item in filterItems"
                    :key="item.value"
                    type="button"
                    class="min-h-9 rounded-md px-2.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500"
                    :class="selectedFilterValue === item.value ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'"
                    :aria-pressed="selectedFilterValue === item.value ? 'true' : 'false'"
                    @click="selectFilter(item.value)"
                  >
                    {{ item.label }}
                  </button>
                </div>
              </fieldset>
            </div>
          </Teleport>
        </section>
        <div
          ref="popupLayerRef"
          data-testid="relationship-drawer-popup-layer"
          class="pointer-events-none fixed inset-0"
          style="position: fixed; inset: 0; overflow: visible; transform: none;"
          role="presentation"
        ></div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.relationship-overlay-enter-active { transition: opacity 200ms ease-out; }
.relationship-overlay-leave-active { transition: opacity 150ms ease-in; }
.relationship-overlay-enter-active .relationship-panel { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.relationship-overlay-leave-active .relationship-panel { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.relationship-overlay-enter-from,
.relationship-overlay-leave-to { opacity: 0; }
.relationship-overlay-enter-from .relationship-panel,
.relationship-overlay-leave-to .relationship-panel { opacity: 0; transform: translateX(100%); }
@media (prefers-reduced-motion: reduce) {
  .relationship-overlay-enter-active,
  .relationship-overlay-leave-active,
  .relationship-overlay-enter-active .relationship-panel,
  .relationship-overlay-leave-active .relationship-panel { transition-duration: 50ms; }
  .relationship-overlay-enter-from .relationship-panel,
  .relationship-overlay-leave-to .relationship-panel { transform: none; }
}
</style>
