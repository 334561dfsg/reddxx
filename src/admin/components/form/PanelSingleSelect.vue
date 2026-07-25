<script>
let panelSingleSelectSequence = 0
</script>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  label: {
    type: String,
    required: true
  },
  placeholder: {
    type: String,
    default: '请选择'
  },
  searchLabel: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  invalid: {
    type: Boolean,
    default: false
  },
  errorId: {
    type: String,
    default: ''
  },
  idBase: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const fallbackId = `panel-single-select-${++panelSingleSelectSequence}`
const stableIdBase = props.idBase.trim() || fallbackId
const labelId = `${stableIdBase}-label`
const panelId = `${stableIdBase}-panel`
const searchId = `${stableIdBase}-search`
const listboxId = `${stableIdBase}-listbox`
const orphanedId = `${stableIdBase}-orphaned`

const rootRef = shallowRef(null)
const triggerRef = shallowRef(null)
const panelRef = shallowRef(null)
const searchRef = shallowRef(null)
const open = ref(false)
const expanded = ref(false)
const commitPending = ref(false)
const query = ref('')
const activeValue = ref(null)
const motionState = ref('closed')
const closeReason = ref('intentional')
const tabFocusTarget = shallowRef(null)
const portalTarget = shallowRef('body')
const resolvedPlacement = ref('bottom')
const panelStyle = ref({ position: 'fixed' })
const sessionSnapshot = ref(null)
const cachedCommitted = ref({ value: undefined, label: '' })

const valuesEqual = (left, right) => Object.is(left, right)

const hasCommittedValue = computed(() => (
  props.modelValue !== '' && props.modelValue !== null && props.modelValue !== undefined
))

const selectedOption = computed(() => (
  props.options.find((option) => valuesEqual(option.value, props.modelValue)) ?? null
))

watch(
  [() => props.modelValue, selectedOption],
  ([value, option]) => {
    if (option) {
      cachedCommitted.value = { value, label: String(option.label) }
      return
    }
    if (!hasCommittedValue.value) {
      cachedCommitted.value = { value: undefined, label: '' }
      return
    }
    if (!valuesEqual(cachedCommitted.value.value, value)) {
      cachedCommitted.value = { value, label: String(value) }
    }
  },
  { immediate: true }
)

const orphaned = computed(() => hasCommittedValue.value && !selectedOption.value)
const effectiveInvalid = computed(() => props.invalid || orphaned.value)

const displayText = computed(() => {
  if (selectedOption.value) return String(selectedOption.value.label)
  if (hasCommittedValue.value && valuesEqual(cachedCommitted.value.value, props.modelValue)) {
    return cachedCommitted.value.label
  }
  return props.placeholder
})

const describedBy = computed(() => {
  const ids = []
  if (effectiveInvalid.value && props.errorId) ids.push(props.errorId)
  if (orphaned.value) ids.push(orphanedId)
  return ids.join(' ') || null
})

const triggerLabel = computed(() => {
  const state = props.readonly ? '只读。' : '更改选择。'
  return `${props.label}。当前选择：${displayText.value}。${state}`
})

const resolvedSearchLabel = computed(() => props.searchLabel || `搜索${props.label}`)

const normalizeSearchText = (value) => String(value ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .trim()

const filteredOptions = computed(() => {
  const normalizedQuery = normalizeSearchText(query.value)
  if (!normalizedQuery) return props.options
  return props.options.filter((option) => (
    normalizeSearchText(`${option.label} ${option.searchText ?? ''}`).includes(normalizedQuery)
  ))
})

const optionKey = (option) => `${typeof option.value}:${String(option.value)}`
const optionId = (option) => {
  const encodedValue = Array.from(String(option.value))
    .map((character) => character.codePointAt(0).toString(16))
    .join('-') || 'empty'
  return `${stableIdBase}-option-${typeof option.value}-${encodedValue}`
}

const optionIsActive = (option) => valuesEqual(option.value, activeValue.value)

const renderedActiveOption = computed(() => (
  filteredOptions.value.find((option) => !option.disabled && optionIsActive(option)) ?? null
))

const activeDescendant = computed(() => (
  renderedActiveOption.value ? optionId(renderedActiveOption.value) : null
))

const resultStatus = computed(() => {
  const count = filteredOptions.value.length
  return `${count} 个结果`
})

function scrollActiveIntoView() {
  nextTick(() => {
    if (!activeDescendant.value || typeof document === 'undefined') return
    document.getElementById?.(activeDescendant.value)?.scrollIntoView?.({ block: 'nearest' })
  })
}

function positionPanel() {
  if (!open.value || typeof window === 'undefined') return
  const anchor = triggerRef.value
  if (!anchor?.getBoundingClientRect) return

  const rect = anchor.getBoundingClientRect()
  const visualViewport = window.visualViewport
  const viewportWidth = visualViewport?.width || window.innerWidth || document.documentElement?.clientWidth || 0
  const viewportHeight = visualViewport?.height || window.innerHeight || document.documentElement?.clientHeight || 0
  const viewportLeft = visualViewport?.offsetLeft || 0
  const viewportTop = visualViewport?.offsetTop || 0
  const viewportRight = viewportLeft + viewportWidth
  const viewportBottom = viewportTop + viewportHeight
  if (!viewportWidth || !viewportHeight) return

  const margin = 8
  const gap = 6
  const minimumWidth = 288
  const maximumPanelHeight = 384
  const width = Math.min(
    Math.max(rect.width, minimumWidth),
    Math.max(1, viewportWidth - (margin * 2))
  )
  const left = Math.min(
    Math.max(rect.left, viewportLeft + margin),
    Math.max(viewportLeft + margin, viewportRight - margin - width)
  )
  const measuredHeight = panelRef.value?.scrollHeight || panelRef.value?.offsetHeight || maximumPanelHeight
  const preferredHeight = Math.min(measuredHeight, maximumPanelHeight)
  const availableBelow = Math.max(0, viewportBottom - rect.bottom - gap - margin)
  const availableAbove = Math.max(0, rect.top - viewportTop - gap - margin)
  const placeAbove = availableBelow < preferredHeight && availableAbove > availableBelow
  const availableHeight = placeAbove ? availableAbove : availableBelow
  const renderedHeight = Math.min(preferredHeight, availableHeight)
  const top = placeAbove
    ? Math.max(viewportTop + margin, rect.top - gap - renderedHeight)
    : Math.min(viewportBottom - margin, rect.bottom + gap)

  resolvedPlacement.value = placeAbove ? 'top' : 'bottom'
  panelStyle.value = {
    position: 'fixed',
    top: `max(${Math.round(top)}px, env(safe-area-inset-top, 0px))`,
    left: `max(${Math.round(left)}px, env(safe-area-inset-left, 0px))`,
    width: `min(${Math.round(width)}px, calc(100vw - max(8px, env(safe-area-inset-left, 0px)) - max(8px, env(safe-area-inset-right, 0px))))`,
    maxHeight: `min(${Math.floor(availableHeight)}px, calc(100vh - 16px), calc(100dvh - max(8px, env(safe-area-inset-top, 0px)) - max(8px, env(safe-area-inset-bottom, 0px))))`
  }
}

let positionFrame = 0

function schedulePanelPosition() {
  if (!open.value) return
  positionPanel()
  if (typeof requestAnimationFrame !== 'function') return
  cancelAnimationFrame(positionFrame)
  positionFrame = requestAnimationFrame(positionPanel)
}

function reconcileActive() {
  if (!expanded.value || motionState.value === 'closing') return
  const enabledOptions = filteredOptions.value.filter((option) => !option.disabled)
  const current = enabledOptions.find((option) => optionIsActive(option))
  if (current) return

  const committed = enabledOptions.find((option) => valuesEqual(option.value, props.modelValue))
  activeValue.value = committed?.value ?? enabledOptions[0]?.value ?? null
  scrollActiveIntoView()
}

function resolvePortalTarget() {
  let current = triggerRef.value?.parentElement ?? triggerRef.value?.parent ?? null
  while (current && current !== document.body) {
    if (
      current.getAttribute?.('role') === 'dialog' &&
      current.getAttribute?.('aria-modal') === 'true'
    ) {
      return current
    }
    current = current.parentElement ?? current.parent ?? null
  }
  return document.body
}

watch(
  [filteredOptions, () => props.modelValue],
  () => {
    reconcileActive()
    nextTick(schedulePanelPosition)
  },
  { deep: true, flush: 'post' }
)

function openSelect() {
  if (props.disabled || props.readonly || expanded.value || motionState.value !== 'closed') return
  sessionSnapshot.value = {
    selectedValue: props.modelValue,
    cachedLabel: displayText.value,
    query: '',
    activeValue: null
  }
  query.value = ''
  activeValue.value = null
  commitPending.value = false
  portalTarget.value = resolvePortalTarget()
  expanded.value = true
  open.value = true
  motionState.value = 'opening'
  reconcileActive()
  nextTick(() => {
    schedulePanelPosition()
    searchRef.value?.focus()
  })
}

function requestClose(reason = 'intentional') {
  if (!expanded.value || motionState.value === 'closing' || motionState.value === 'closed') return
  closeReason.value = reason
  motionState.value = 'closing'
  open.value = false
}

function handleTriggerClick() {
  if (motionState.value === 'opening' || motionState.value === 'closing') return
  if (open.value) requestClose('trigger')
  else openSelect()
}

function handleAfterEnter() {
  if (open.value && motionState.value === 'opening') motionState.value = 'open'
}

function handleAfterLeave() {
  const requestedFocusTarget = closeReason.value === 'tab'
    ? tabFocusTarget.value
    : triggerRef.value
  expanded.value = false
  motionState.value = 'closed'
  query.value = sessionSnapshot.value?.query ?? ''
  activeValue.value = null
  resolvedPlacement.value = 'bottom'
  panelStyle.value = { position: 'fixed' }
  portalTarget.value = document.body
  sessionSnapshot.value = null
  tabFocusTarget.value = null
  nextTick(() => {
    const fallbackTarget = !props.disabled ? triggerRef.value : null
    const focusTarget = requestedFocusTarget?.isConnected ? requestedFocusTarget : fallbackTarget
    focusTarget?.focus?.()
  })
}

function commitOption(option) {
  if (!option || option.disabled || commitPending.value || motionState.value === 'closing') return
  if (!filteredOptions.value.some((candidate) => valuesEqual(candidate.value, option.value))) return
  commitPending.value = true
  activeValue.value = option.value
  emit('update:modelValue', option.value)
  emit('change', option.value, option)
  nextTick(() => requestClose('commit'))
}

function moveActive(direction) {
  const enabledOptions = filteredOptions.value.filter((option) => !option.disabled)
  if (!enabledOptions.length) {
    activeValue.value = null
    return
  }

  const currentIndex = enabledOptions.findIndex((option) => optionIsActive(option))
  const nextIndex = currentIndex < 0
    ? (direction > 0 ? 0 : enabledOptions.length - 1)
    : (currentIndex + direction + enabledOptions.length) % enabledOptions.length
  activeValue.value = enabledOptions[nextIndex].value
  scrollActiveIntoView()
}

function isAvailableTabTarget(element) {
  if (!element || element.disabled || element.hidden || element.tabIndex < 0) return false
  if (element.getAttribute?.('aria-hidden') === 'true') return false
  const styles = window.getComputedStyle?.(element)
  return styles?.display !== 'none' && styles?.visibility !== 'hidden'
}

function findNextPageTabTarget() {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',')
  const candidates = Array.from(
    document.querySelectorAll?.(selector) ?? document.body?.querySelectorAll?.() ?? []
  ).filter(isAvailableTabTarget)
  const triggerIndex = candidates.indexOf(triggerRef.value)
  if (triggerIndex < 0) return null
  return candidates
    .slice(triggerIndex + 1)
    .find((candidate) => !panelRef.value?.contains(candidate)) ?? null
}

function handleCompositeTab(event) {
  event.preventDefault()
  tabFocusTarget.value = event.shiftKey ? triggerRef.value : findNextPageTabTarget()
  requestClose('tab')
}

function handleSearchKeydown(event) {
  if (event.key === 'Tab') {
    handleCompositeTab(event)
    return
  }
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
    return
  }
  if (event.key === 'Enter') {
    if (!renderedActiveOption.value) return
    event.preventDefault()
    commitOption(renderedActiveOption.value)
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    requestClose('escape')
    return
  }
}

function activateOption(option) {
  if (option.disabled || motionState.value === 'closing') return
  activeValue.value = option.value
}

function handleDocumentPointerDown(event) {
  if (!expanded.value || motionState.value === 'closing') return
  if (rootRef.value?.contains(event.target) || panelRef.value?.contains(event.target)) return
  requestClose('outside')
}

function handleViewportChange() {
  schedulePanelPosition()
}

watch(
  [() => props.disabled, () => props.readonly],
  ([disabled, readonly]) => {
    if ((disabled || readonly) && expanded.value) requestClose('state')
  }
)

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
  window.addEventListener?.('resize', handleViewportChange)
  window.addEventListener?.('scroll', handleViewportChange, true)
  window.visualViewport?.addEventListener?.('resize', handleViewportChange)
  window.visualViewport?.addEventListener?.('scroll', handleViewportChange)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  window.removeEventListener?.('resize', handleViewportChange)
  window.removeEventListener?.('scroll', handleViewportChange, true)
  window.visualViewport?.removeEventListener?.('resize', handleViewportChange)
  window.visualViewport?.removeEventListener?.('scroll', handleViewportChange)
  cancelAnimationFrame(positionFrame)
})
</script>

<template>
  <div
    ref="rootRef"
    class="panel-single-select relative min-w-0"
    :data-invalid="effectiveInvalid ? 'true' : null"
  >
    <span :id="labelId" class="mb-1 block text-sm font-medium text-gray-700">
      {{ label }}
      <span v-if="required" aria-hidden="true" class="text-red-600">*</span>
    </span>

    <button
      ref="triggerRef"
      type="button"
      data-testid="panel-single-select-trigger"
      class="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 outline-none transition focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
      :disabled="disabled"
      :aria-label="triggerLabel"
      :aria-expanded="expanded ? 'true' : 'false'"
      :aria-controls="panelId"
      :aria-disabled="disabled ? 'true' : 'false'"
      :aria-readonly="readonly ? 'true' : 'false'"
      :aria-required="required ? 'true' : 'false'"
      :aria-invalid="effectiveInvalid ? 'true' : 'false'"
      :aria-describedby="describedBy"
      @click="handleTriggerClick"
    >
      <span class="min-w-0 flex-1 truncate">{{ displayText }}</span>
      <span class="shrink-0 text-xs text-gray-500">
        {{ readonly ? '只读' : '更改' }}
      </span>
    </button>

    <p
      v-if="orphaned"
      :id="orphanedId"
      data-testid="panel-single-select-orphaned"
      role="alert"
      class="mt-1 text-sm text-red-700"
    >
      所选项“{{ displayText }}”已失效，请重新选择。
    </p>

    <Teleport :to="portalTarget">
      <Transition
        name="panel-single-select"
        @after-enter="handleAfterEnter"
        @after-leave="handleAfterLeave"
      >
        <div
          v-if="open"
          :id="panelId"
          ref="panelRef"
          data-testid="panel-single-select-panel"
          :data-placement="resolvedPlacement"
          :style="panelStyle"
          class="panel-single-select__panel z-50 flex min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
        >
          <div class="shrink-0 border-b border-gray-100 p-2">
            <label :for="searchId" class="mb-1 block text-xs font-medium text-gray-700">
              {{ resolvedSearchLabel }}
            </label>
            <input
              :id="searchId"
              ref="searchRef"
              v-model="query"
              data-testid="panel-single-select-search"
              type="search"
              role="combobox"
              autocomplete="off"
              aria-autocomplete="list"
              aria-expanded="true"
              :aria-label="resolvedSearchLabel"
              :aria-controls="listboxId"
              :aria-activedescendant="activeDescendant"
              :readonly="readonly"
              class="min-h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30"
              @keydown="handleSearchKeydown"
            >
            <p
              data-testid="panel-single-select-status"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              class="mt-1 text-xs text-gray-500"
            >
              {{ resultStatus }}
            </p>
          </div>

          <ul
            :id="listboxId"
            role="listbox"
            :aria-labelledby="labelId"
            class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
          >
            <li v-if="!filteredOptions.length" role="none">
              <p
                data-testid="panel-single-select-empty"
                class="px-3 py-6 text-center text-sm text-gray-500"
              >
                没有匹配项
              </p>
            </li>
            <li
              v-for="option in filteredOptions"
              v-else
              :key="optionKey(option)"
              role="none"
            >
              <button
                :id="optionId(option)"
                type="button"
                role="option"
                tabindex="-1"
                :disabled="Boolean(option.disabled)"
                :aria-disabled="option.disabled ? 'true' : 'false'"
                :aria-selected="optionIsActive(option) ? 'true' : 'false'"
                :data-committed="valuesEqual(option.value, modelValue) ? 'true' : null"
                class="flex min-h-10 w-full items-center rounded-md px-3 py-2 text-left text-sm text-gray-800 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:text-gray-400"
                :class="[
                  optionIsActive(option) ? 'bg-blue-50 text-blue-900' : '',
                  valuesEqual(option.value, modelValue) ? 'font-semibold' : ''
                ]"
                @mouseenter="activateOption(option)"
                @click="commitOption(option)"
              >
                <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
              </button>
            </li>
          </ul>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.panel-single-select__panel {
  max-height: min(24rem, calc(100vh - 2rem));
  max-height: min(24rem, calc(100dvh - 2rem));
}

.panel-single-select-enter-active {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

.panel-single-select-leave-active {
  transition: opacity 100ms ease-in, transform 100ms ease-in;
}

.panel-single-select-enter-from,
.panel-single-select-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}

@media (prefers-reduced-motion: reduce) {
  .panel-single-select-enter-active,
  .panel-single-select-leave-active {
    transition-duration: 50ms;
  }

  .panel-single-select-enter-from,
  .panel-single-select-leave-to {
    transform: none;
  }
}
</style>
