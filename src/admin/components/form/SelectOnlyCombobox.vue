<script>
let selectOnlyComboboxSequence = 0
</script>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import {
  registerDialogPopupHost,
  unregisterDialogPopupHost
} from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  options: { type: Array, default: () => [] },
  label: { type: String, required: true },
  placeholder: { type: String, default: '请选择' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  errorId: { type: String, default: '' },
  hint: { type: String, default: '' },
  describedBy: { type: [String, Array], default: '' },
  idBase: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'change'])

const fallbackId = `select-only-combobox-${++selectOnlyComboboxSequence}`
const stableIdBase = props.idBase.trim() || fallbackId
const labelId = `${stableIdBase}-label`
const listboxId = `${stableIdBase}-listbox`
const requiredId = `${stableIdBase}-required`
const hintId = `${stableIdBase}-hint`
const orphanedId = `${stableIdBase}-orphaned`
const configErrorId = `${stableIdBase}-config-error`

const rootRef = shallowRef(null)
const triggerRef = shallowRef(null)
const popupRef = shallowRef(null)
const open = ref(false)
const rendered = ref(false)
const closing = ref(false)
const activeValue = ref(null)
const popupStyle = ref({ position: 'fixed' })
const portalTarget = shallowRef('body')
const cachedCommitted = ref({ value: undefined, label: '' })
const typeAhead = ref('')
let typeAheadTimer = null
let positionFrame = 0
let popupHostRegistration = null
let ownedBodyPopupHost = null
let lifecycleGeneration = 0
let disposed = false

const valuesEqual = (left, right) => Object.is(left, right)
const hasCommittedValue = computed(() => props.modelValue !== null && props.modelValue !== undefined)
const duplicateOption = computed(() => {
  const seen = []
  for (const option of props.options) {
    if (seen.some((value) => valuesEqual(value, option.value))) return option
    seen.push(option.value)
  }
  return null
})
const hasDuplicateOptions = computed(() => Boolean(duplicateOption.value))
const selectedOption = computed(() => (
  props.options.find((option) => valuesEqual(option.value, props.modelValue)) ?? null
))
const orphaned = computed(() => hasCommittedValue.value && !selectedOption.value)
const effectiveInvalid = computed(() => props.invalid || orphaned.value || hasDuplicateOptions.value)
const displayText = computed(() => {
  if (selectedOption.value) return String(selectedOption.value.label)
  if (hasCommittedValue.value && valuesEqual(cachedCommitted.value.value, props.modelValue)) {
    return cachedCommitted.value.label
  }
  return props.placeholder
})
const describedBy = computed(() => {
  const ids = []
  if (Array.isArray(props.describedBy)) ids.push(...props.describedBy.filter(Boolean))
  else if (props.describedBy) ids.push(props.describedBy)
  if (props.hint) ids.push(hintId)
  if (props.invalid && props.errorId) ids.push(props.errorId)
  if (orphaned.value) ids.push(orphanedId)
  if (hasDuplicateOptions.value) ids.push(configErrorId)
  return ids.join(' ') || null
})
const enabledOptions = computed(() => (
  hasDuplicateOptions.value ? [] : props.options.filter((option) => !option.disabled)
))
const activeOption = computed(() => (
  enabledOptions.value.find((option) => valuesEqual(option.value, activeValue.value)) ?? null
))
const activeDescendant = computed(() => (
  open.value && activeOption.value ? optionId(activeOption.value) : null
))

watch(
  [() => props.modelValue, selectedOption],
  ([value, option]) => {
    if (option) cachedCommitted.value = { value, label: String(option.label) }
    else if (!hasCommittedValue.value) cachedCommitted.value = { value: undefined, label: '' }
    else if (!valuesEqual(cachedCommitted.value.value, value)) cachedCommitted.value = { value, label: String(value) }
  },
  { immediate: true }
)

function encodedOptionValue(value) {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'nan'
    if (Object.is(value, -0)) return 'negative-zero'
    return String(value)
  }
  return Array.from(String(value)).map((character) => character.codePointAt(0).toString(16)).join('-') || 'empty'
}

function optionId(option) {
  return `${stableIdBase}-option-${typeof option.value}-${encodedOptionValue(option.value)}`
}

function queueInstanceTick(callback) {
  const generation = lifecycleGeneration
  nextTick(() => {
    if (!disposed && generation === lifecycleGeneration) callback()
  })
}

function scrollActiveIntoView() {
  queueInstanceTick(() => {
    if (!activeDescendant.value || typeof document === 'undefined') return
    document.getElementById?.(activeDescendant.value)?.scrollIntoView?.({ block: 'nearest' })
  })
}

function reconcileActive() {
  const enabled = props.options.filter((option) => !option.disabled)
  if (enabled.some((option) => valuesEqual(option.value, activeValue.value))) return
  activeValue.value = enabled.find((option) => valuesEqual(option.value, props.modelValue))?.value
    ?? enabled[0]?.value
    ?? null
}

function moveActive(direction, event) {
  event?.preventDefault?.()
  const options = enabledOptions.value
  if (!options.length) {
    activeValue.value = null
    return
  }
  const currentIndex = options.findIndex((option) => valuesEqual(option.value, activeValue.value))
  const nextIndex = currentIndex < 0
    ? (direction > 0 ? 0 : options.length - 1)
    : (currentIndex + direction + options.length) % options.length
  activeValue.value = options[nextIndex].value
  scrollActiveIntoView()
}

function moveToEdge(index, event) {
  event?.preventDefault?.()
  const options = enabledOptions.value
  activeValue.value = options.at(index)?.value ?? null
  scrollActiveIntoView()
}

function normalizeTypeAhead(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase()
}

function moveByTypeAhead(key) {
  if (!open.value || !key) return
  const normalizedKey = normalizeTypeAhead(key)
  if (!normalizedKey) return
  const previousQuery = normalizeTypeAhead(typeAhead.value)
  const repeatedCharacterCycle = previousQuery.length > 0 && Array.from(previousQuery).every((character) => (
    character === normalizedKey
  ))
  typeAhead.value = repeatedCharacterCycle ? normalizedKey : `${previousQuery}${normalizedKey}`
  if (typeAheadTimer) clearTimeout(typeAheadTimer)
  typeAheadTimer = setTimeout(() => { typeAhead.value = '' }, 500)
  const options = enabledOptions.value
  const currentIndex = options.findIndex((option) => valuesEqual(option.value, activeValue.value))
  const match = Array.from({ length: options.length }, (_, index) => (
    options[(Math.max(currentIndex, -1) + index + 1) % options.length]
  )).find((option) => normalizeTypeAhead(option.label).startsWith(typeAhead.value))
  if (match) {
    activeValue.value = match.value
    scrollActiveIntoView()
  }
}

function parentOf(element) {
  return element?.parentElement ?? element?.parent ?? null
}

function findOwningModal() {
  let current = parentOf(triggerRef.value)
  while (current && current !== document.body) {
    if (current.getAttribute?.('role') === 'dialog' && current.getAttribute?.('aria-modal') === 'true') return current
    current = parentOf(current)
  }
  return null
}

function styleValue(element, property) {
  const inline = element?.style?.[property]
  if (inline !== undefined && inline !== '') return String(inline)
  return String(window.getComputedStyle?.(element)?.[property] ?? '')
}

function isViewportPopupHost(element) {
  if (styleValue(element, 'position') !== 'fixed') return false
  const inset = styleValue(element, 'inset')
  const allZero = /^0(?:px)?(?:\s+0(?:px)?){0,3}$/.test(inset.trim())
  const edges = ['top', 'right', 'bottom', 'left'].every((edge) => /^0(?:px)?$/.test(styleValue(element, edge).trim()))
  if (!allZero && !edges) return false
  const overflow = styleValue(element, 'overflow') || 'visible'
  if ((styleValue(element, 'overflowX') || overflow) !== 'visible') return false
  if ((styleValue(element, 'overflowY') || overflow) !== 'visible') return false
  if (['transform', 'perspective', 'filter', 'backdropFilter'].some((property) => {
    const value = styleValue(element, property)
    return value && value !== 'none'
  })) return false
  if (/(?:layout|paint|strict|content)/.test(styleValue(element, 'contain'))) return false
  return !/(?:transform|perspective|filter)/.test(styleValue(element, 'willChange'))
}

function resolvePortalTarget(modal) {
  if (!modal) return document.body
  let current = parentOf(modal)
  while (current && current !== document.body) {
    if (isViewportPopupHost(current)) return current
    current = parentOf(current)
  }
  return document.body
}

function createOwnedBodyPopupHost(modal) {
  if (!modal || typeof document === 'undefined') return document.body
  if (ownedBodyPopupHost?.isConnected) return ownedBodyPopupHost
  const host = document.createElement('div')
  host.setAttribute('data-testid', 'select-only-combobox-portal-host')
  host.setAttribute('data-select-only-combobox-owner', stableIdBase)
  host.style.position = 'fixed'
  host.style.inset = '0'
  host.style.overflow = 'visible'
  host.style.pointerEvents = 'none'
  document.body.appendChild(host)
  ownedBodyPopupHost = host
  popupHostRegistration = registerDialogPopupHost(modal, host, { manageLayerStyle: true })
  return host
}

function removeOwnedBodyPopupHost() {
  if (!ownedBodyPopupHost) return
  const host = ownedBodyPopupHost
  ownedBodyPopupHost = null
  host.remove?.()
}

function releasePopupHostRegistration() {
  unregisterDialogPopupHost(popupHostRegistration)
  popupHostRegistration = null
}

function releasePopupResources() {
  releasePopupHostRegistration()
  removeOwnedBodyPopupHost()
}

function positionPopup() {
  if (!open.value || disposed || typeof window === 'undefined') return
  const rect = triggerRef.value?.getBoundingClientRect?.()
  if (!rect) return
  const viewport = window.visualViewport
  const width = viewport?.width || window.innerWidth || document.documentElement?.clientWidth || 0
  const height = viewport?.height || window.innerHeight || document.documentElement?.clientHeight || 0
  const leftOffset = viewport?.offsetLeft || 0
  const topOffset = viewport?.offsetTop || 0
  if (!width || !height) return
  const margin = 8
  const gap = 6
  const below = Math.max(0, topOffset + height - rect.bottom - gap - margin)
  const above = Math.max(0, rect.top - topOffset - gap - margin)
  const desired = Math.min(popupRef.value?.scrollHeight || 384, 384)
  const placeAbove = below < desired && above > below
  const availableHeight = placeAbove ? above : below
  const renderedHeight = Math.min(desired, availableHeight)
  const top = placeAbove ? Math.max(topOffset + margin, rect.top - gap - renderedHeight) : rect.bottom + gap
  const renderedWidth = Math.min(Math.max(rect.width, 1), Math.max(1, width - margin * 2))
  const left = Math.min(Math.max(rect.left, leftOffset + margin), leftOffset + width - margin - renderedWidth)
  const safeWidth = `min(${Math.round(renderedWidth)}px, calc(100vw - max(${margin}px, env(safe-area-inset-left, 0px)) - max(${margin}px, env(safe-area-inset-right, 0px))))`
  const safeHeight = `min(${Math.floor(availableHeight)}px, calc(100vh - max(${margin}px, env(safe-area-inset-top, 0px)) - max(${margin}px, env(safe-area-inset-bottom, 0px))), calc(100dvh - max(${margin}px, env(safe-area-inset-top, 0px)) - max(${margin}px, env(safe-area-inset-bottom, 0px))))`
  popupStyle.value = {
    position: 'fixed',
    top: `clamp(calc(${Math.round(topOffset)}px + max(${margin}px, env(safe-area-inset-top, 0px))), ${Math.round(top)}px, calc(${Math.round(topOffset + height)}px - max(${margin}px, env(safe-area-inset-bottom, 0px)) - ${safeHeight}))`,
    left: `clamp(calc(${Math.round(leftOffset)}px + max(${margin}px, env(safe-area-inset-left, 0px))), ${Math.round(left)}px, calc(${Math.round(leftOffset + width)}px - max(${margin}px, env(safe-area-inset-right, 0px)) - ${safeWidth}))`,
    width: safeWidth,
    maxHeight: safeHeight,
    pointerEvents: 'auto'
  }
}

function schedulePopupPosition() {
  positionPopup()
  if (!open.value || typeof requestAnimationFrame !== 'function') return
  cancelAnimationFrame(positionFrame)
  const generation = lifecycleGeneration
  positionFrame = requestAnimationFrame(() => {
    if (disposed || generation !== lifecycleGeneration) return
    positionFrame = 0
    positionPopup()
  })
}

function openPopup(event) {
  if (props.disabled || props.readonly || hasDuplicateOptions.value || open.value || closing.value) return
  event?.preventDefault?.()
  const modal = findOwningModal()
  const resolvedTarget = resolvePortalTarget(modal)
  releasePopupResources()
  if (modal && resolvedTarget === document.body) {
    portalTarget.value = createOwnedBodyPopupHost(modal)
  } else {
    portalTarget.value = resolvedTarget
    if (modal) popupHostRegistration = registerDialogPopupHost(modal, resolvedTarget)
  }
  activeValue.value = null
  reconcileActive()
  rendered.value = true
  open.value = true
  queueInstanceTick(schedulePopupPosition)
}

function closePopup(reason, event) {
  if (!open.value || closing.value) return
  if (reason !== 'tab') event?.preventDefault?.()
  open.value = false
  closing.value = true
  activeValue.value = null
  typeAhead.value = ''
  if (typeAheadTimer) clearTimeout(typeAheadTimer)
  typeAheadTimer = null
  queueInstanceTick(() => {
    if (!open.value) rendered.value = false
  })
}

function commitActive(event) {
  if (!open.value || closing.value) return
  event?.preventDefault?.()
  const option = props.options.find((candidate) => (
    !candidate.disabled && valuesEqual(candidate.value, activeValue.value)
  ))
  if (!option) return
  emit('update:modelValue', option.value)
  emit('change', option.value, option)
  closePopup('commit')
}

function handleKeydown(event) {
  if (props.disabled || props.readonly || hasDuplicateOptions.value) return
  if (!open.value && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) openPopup(event)
  else if (open.value && event.key === 'ArrowDown') moveActive(1, event)
  else if (open.value && event.key === 'ArrowUp') moveActive(-1, event)
  else if (open.value && event.key === 'Home') moveToEdge(0, event)
  else if (open.value && event.key === 'End') moveToEdge(-1, event)
  else if (open.value && (event.key === 'Enter' || event.key === ' ')) commitActive(event)
  else if (open.value && event.key === 'Escape') {
    event.stopPropagation?.()
    closePopup('escape', event)
  }
  else if (open.value && event.key === 'Tab') closePopup('tab')
  else if (!event.altKey && !event.ctrlKey && !event.metaKey && event.key.length === 1) {
    if (!open.value) openPopup(event)
    if (open.value) moveByTypeAhead(event.key)
  }
}

function handleOptionClick(option) {
  if (!open.value || closing.value || option.disabled || props.disabled || props.readonly || hasDuplicateOptions.value) return
  activeValue.value = option.value
  commitActive()
}

function handleOptionPointerDown(event) {
  event.preventDefault()
}

function handleDocumentPointerDown(event) {
  if (!open.value) return
  if (rootRef.value?.contains(event.target) || popupRef.value?.contains(event.target)) return
  closePopup('outside')
}

function handleAfterLeave() {
  closing.value = false
  releasePopupResources()
}

watch([() => props.options, () => props.modelValue], () => {
  if (open.value) reconcileActive()
  queueInstanceTick(schedulePopupPosition)
}, { deep: true, flush: 'post' })

watch([() => props.disabled, () => props.readonly, hasDuplicateOptions], ([disabled, readonly, duplicate]) => {
  if ((disabled || readonly || duplicate) && open.value) closePopup('state')
})

const focus = () => triggerRef.value?.focus?.()
defineExpose({ focus })

function handleViewportChange() {
  schedulePopupPosition()
}

onMounted(() => {
  portalTarget.value = document.body
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
  window.addEventListener?.('resize', handleViewportChange)
  window.addEventListener?.('scroll', handleViewportChange, true)
  window.visualViewport?.addEventListener?.('resize', handleViewportChange)
  window.visualViewport?.addEventListener?.('scroll', handleViewportChange)
})

onUnmounted(() => {
  disposed = true
  lifecycleGeneration += 1
  releasePopupResources()
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  window.removeEventListener?.('resize', handleViewportChange)
  window.removeEventListener?.('scroll', handleViewportChange, true)
  window.visualViewport?.removeEventListener?.('resize', handleViewportChange)
  window.visualViewport?.removeEventListener?.('scroll', handleViewportChange)
  if (typeAheadTimer) clearTimeout(typeAheadTimer)
  cancelAnimationFrame(positionFrame)
})
</script>

<template>
  <div ref="rootRef" class="select-only-combobox relative min-w-0" :data-invalid="effectiveInvalid ? 'true' : null">
    <span :id="labelId" class="mb-1 block text-sm font-medium text-gray-700">
      {{ label }}
      <span v-if="required" :id="requiredId" class="text-red-700">（必填）</span>
    </span>

    <div
      ref="triggerRef"
      data-testid="select-only-combobox"
      role="combobox"
      :tabindex="disabled ? -1 : 0"
      :aria-labelledby="labelId"
      aria-haspopup="listbox"
      :aria-controls="open ? listboxId : null"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-activedescendant="activeDescendant"
      :aria-required="required ? 'true' : null"
      :aria-disabled="disabled ? 'true' : null"
      :aria-readonly="readonly ? 'true' : null"
      :aria-invalid="effectiveInvalid ? 'true' : 'false'"
      :aria-describedby="describedBy"
      class="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 outline-none transition focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30"
      :class="disabled ? 'cursor-not-allowed bg-gray-100 text-gray-500' : 'cursor-pointer'"
      @click="open ? closePopup('trigger') : openPopup()"
      @keydown="handleKeydown"
    >
      <span class="min-w-0 flex-1">
        <span class="block truncate">{{ displayText }}</span>
        <span v-if="hint" :id="hintId" class="mt-0.5 block truncate text-xs leading-5 text-slate-500">
          {{ hint }}
        </span>
      </span>
      <span class="shrink-0 text-xs text-gray-500">{{ readonly ? '只读' : '选择' }}</span>
    </div>

    <p v-if="orphaned" :id="orphanedId" data-testid="select-only-combobox-orphaned" role="alert" class="mt-1 text-sm text-red-700">
      所选项“{{ displayText }}”已失效，请重新选择。
    </p>
    <p v-if="hasDuplicateOptions" :id="configErrorId" data-testid="select-only-combobox-config-error" role="alert" class="mt-1 text-sm text-red-700">
      选择控件配置无效：选项值“{{ String(duplicateOption?.value) }}”重复，请联系管理员。
    </p>

    <Teleport :to="portalTarget">
      <Transition name="select-only-combobox" @after-leave="handleAfterLeave">
        <div v-if="rendered" ref="popupRef" data-testid="select-only-combobox-popup" :style="popupStyle" class="select-only-combobox__popup z-50 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          <ul
            :id="open ? listboxId : null"
            :role="open ? 'listbox' : null"
            :aria-labelledby="open ? labelId : null"
            :aria-hidden="open ? null : 'true'"
            :inert="open ? null : ''"
            class="max-h-inherit overflow-y-auto overscroll-contain p-1"
          >
            <li v-for="option in options" :key="`${typeof option.value}:${encodedOptionValue(option.value)}`" role="none">
              <button
                :id="optionId(option)"
                type="button"
                :role="open ? 'option' : null"
                tabindex="-1"
                :disabled="Boolean(option.disabled)"
                :aria-disabled="open ? (option.disabled ? 'true' : 'false') : null"
                :aria-selected="open ? (!option.disabled && valuesEqual(option.value, activeValue) ? 'true' : 'false') : null"
                :data-committed="valuesEqual(option.value, modelValue) ? 'true' : null"
                class="flex min-h-10 w-full items-center rounded-md px-3 py-2 text-left text-sm text-gray-800 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:text-gray-400"
                :class="valuesEqual(option.value, activeValue) ? 'bg-blue-50 text-blue-900' : ''"
                @mouseenter="open && !option.disabled && (activeValue = option.value)"
                @pointerdown="handleOptionPointerDown"
                @click="handleOptionClick(option)"
              >
                {{ option.label }}
              </button>
            </li>
          </ul>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.select-only-combobox__popup {
  max-height: min(24rem, calc(100vh - 2rem));
  max-height: min(24rem, calc(100dvh - 2rem));
}

.select-only-combobox__popup [role='listbox'] {
  max-height: inherit;
  overflow-y: auto;
}

.select-only-combobox-enter-active { transition: opacity 150ms ease-out, transform 150ms ease-out; }
.select-only-combobox-leave-active { transition: opacity 100ms ease-in, transform 100ms ease-in; }
.select-only-combobox-enter-from,
.select-only-combobox-leave-to { opacity: 0; transform: translateY(-0.25rem); }

@media (prefers-reduced-motion: reduce) {
  .select-only-combobox-enter-active,
  .select-only-combobox-leave-active { transition-duration: 50ms; transform: none; }
}
</style>
