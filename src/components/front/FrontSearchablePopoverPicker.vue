<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  frontSheetBackdropClass,
  frontSheetDragHandleClass,
  frontSheetPanelShellClass
} from '../../constants/frontBottomSheet'
import FrontStrokeIcon from './FrontStrokeIcon.vue'

/**
 * 窄屏：底部抽屉；lg+：锚点下拉（可选搜索）。与 FrontAdaptiveSelect 抽屉视觉一致。
 */
const props = defineProps({
  options: { type: Array, required: true },
  ariaLabel: { type: String, default: '' },
  /** 抽屉标题，默认同 ariaLabel */
  sheetTitle: { type: String, default: '' },
  fieldKey: { type: String, default: 'picker' },
  searchable: { type: Boolean, default: true },
  searchPlaceholder: { type: String, default: '搜索…' },
  panelHint: { type: String, default: '' },
  manageBodyScroll: { type: Boolean, default: true }
})

const model = defineModel({ type: String, default: '' })

const open = ref(false)
const search = ref('')
const root = ref(null)
/** (max-width: 1023px) */
const mqNarrow = ref(true)

const searchInputIdPopover = computed(() => `front-popover-search-${props.fieldKey}`)
const searchInputIdSheet = computed(() => `front-popover-search-${props.fieldKey}-sheet`)
const listboxIdPopover = computed(() => `front-popover-list-${props.fieldKey}`)
const listboxIdSheet = computed(() => `front-popover-list-${props.fieldKey}-sheet`)
const titleId = computed(() => `front-popover-sheet-title-${props.fieldKey}`)

const drawerTitle = computed(() => props.sheetTitle || props.ariaLabel || '请选择')

const showMobileSheet = computed(() => open.value && mqNarrow.value)
const showDesktopPopover = computed(() => open.value && !mqNarrow.value)

const currentLabel = computed(() => {
  const hit = props.options.find((o) => o.value === model.value)
  return hit?.label ?? '请选择'
})

const filteredOptions = computed(() => {
  const q = props.searchable ? search.value.trim().toLowerCase() : ''
  if (!q) return props.options
  return props.options.filter((o) => {
    const hay = `${o.label} ${o.value} ${o.hint ?? ''}`.toLowerCase()
    return hay.includes(q)
  })
})

const triggerClass =
  'flex h-[2.75rem] w-full min-h-[2.75rem] shrink-0 items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-0 text-left text-base font-medium leading-none text-[#eaecef] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition [-webkit-tap-highlight-color:transparent] hover:border-white/[0.14] active:bg-white/[0.06] focus:outline-none sm:px-4 sm:text-[15px] lg:rounded-lg'

function syncMq() {
  if (typeof window === 'undefined') return
  mqNarrow.value = window.matchMedia('(max-width: 1023px)').matches
}

function focusSearchWhenOpen() {
  if (!props.searchable) return
  nextTick(() => {
    const id = mqNarrow.value ? searchInputIdSheet.value : searchInputIdPopover.value
    document.getElementById(id)?.focus()
  })
}

function toggle() {
  syncMq()
  open.value = !open.value
  if (open.value) {
    search.value = ''
    focusSearchWhenOpen()
  }
}

function close() {
  open.value = false
}

function pick(value) {
  model.value = value
  open.value = false
  search.value = ''
}

function onDocPointerDown(e) {
  if (!showDesktopPopover.value || !root.value) return
  if (!root.value.contains(e.target)) open.value = false
}

function onBodyKeydown(e) {
  if (e.key === 'Escape' && open.value) {
    open.value = false
  }
}

watch(open, (v) => {
  if (!v) search.value = ''
})

watch(showMobileSheet, (v) => {
  if (!props.manageBodyScroll || typeof document === 'undefined') return
  document.body.style.overflow = v ? 'hidden' : ''
})

onMounted(() => {
  syncMq()
  window.addEventListener('resize', syncMq)
  document.addEventListener('pointerdown', onDocPointerDown, true)
  document.body.addEventListener('keydown', onBodyKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', syncMq)
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.body.removeEventListener('keydown', onBodyKeydown)
  if (props.manageBodyScroll && typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

function optionBtnClass(selected) {
  return [
    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm',
    selected
      ? 'border border-lime-400/35 bg-lime-400/[0.1] text-lime-100'
      : 'border border-transparent text-[#eaecef] hover:bg-white/[0.06]'
  ]
}
</script>

<template>
  <div ref="root" class="relative min-w-0">
    <button
      type="button"
      :class="triggerClass"
      :aria-label="ariaLabel"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-controls="mqNarrow ? listboxIdSheet : listboxIdPopover"
      @click="toggle"
    >
      <span class="flex min-w-0 flex-1 items-center gap-2">
        <slot name="leading" />
        <span class="min-w-0 truncate">{{ currentLabel }}</span>
      </span>
      <svg
        class="h-4 w-4 shrink-0 text-[#848e9c]"
        :class="open ? 'rotate-180' : ''"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m6 9 6 6 6-6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <!-- lg+：锚点面板 -->
    <div
      v-show="showDesktopPopover"
      class="absolute left-0 top-[calc(100%+0.375rem)] z-[90] max-lg:hidden max-w-[min(26rem,calc(100vw-1.5rem))] min-w-[max(100%,17.5rem)] overflow-hidden rounded-xl border border-white/[0.1] bg-[#121212] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.65)]"
      role="presentation"
      @click.stop
    >
      <p
        v-if="panelHint"
        class="border-b border-white/[0.06] px-3 py-2 text-[11px] leading-snug text-[#848e9c]"
      >
        {{ panelHint }}
      </p>
      <div v-if="searchable" class="px-2 pt-2" :class="panelHint ? '' : 'pt-2.5'">
        <input
          :id="searchInputIdPopover"
          v-model="search"
          type="search"
          autocomplete="off"
          :placeholder="searchPlaceholder"
          class="w-full rounded-lg border border-white/[0.1] bg-[#0b0c0e] px-2.5 py-2 text-sm text-[#eaecef] placeholder:text-white/35 focus:outline-none"
          @keydown.escape.stop="open = false"
        />
      </div>
      <ul
        :id="listboxIdPopover"
        class="trade-pair-scroll max-h-[min(50vh,280px)] overflow-y-auto overscroll-contain px-1 py-1.5 pr-1.5 [-webkit-overflow-scrolling:touch]"
        role="listbox"
      >
        <template v-if="filteredOptions.length">
          <li v-for="opt in filteredOptions" :key="`prop-${String(opt.value)}`" role="none">
            <button
              type="button"
              role="option"
              :class="optionBtnClass(model === opt.value)"
              :aria-selected="model === opt.value"
              @click="pick(opt.value)"
            >
              <slot name="option-leading" :option="opt" />
              <span class="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span class="min-w-0 truncate font-medium">{{ opt.label }}</span>
                <span
                  v-if="opt.hint"
                  class="max-w-[45%] shrink-0 truncate text-right text-[11px] font-normal text-[#848e9c]"
                >
                  {{ opt.hint }}
                </span>
              </span>
            </button>
          </li>
        </template>
        <li v-else class="px-3 py-8 text-center text-xs text-white/40">无匹配项</li>
      </ul>
    </div>

    <!-- 窄屏：底部抽屉 -->
    <Teleport to="body">
      <Transition name="front-sheet">
        <div
          v-if="showMobileSheet"
          class="fixed inset-0 z-[135] flex flex-col justify-end lg:hidden"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
        >
          <div :class="frontSheetBackdropClass" aria-hidden="true" @click="close" />
          <div
            :class="`front-sheet-panel relative mx-auto flex w-full max-w-md max-h-[min(72vh,520px)] flex-col sm:max-w-lg ${frontSheetPanelShellClass}`"
            :style="{
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
            }"
            @click.stop
          >
            <div
              class="shrink-0 pt-3"
              :style="{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }"
            >
              <div :class="frontSheetDragHandleClass" aria-hidden="true" />
            </div>
            <div
              class="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 pb-3 pt-2"
            >
              <div class="min-w-0">
                <h2 :id="titleId" class="text-base font-semibold leading-snug tracking-tight text-white">
                  {{ drawerTitle }}
                </h2>
                <p
                  v-if="panelHint"
                  class="mt-0.5 text-[11px] leading-snug text-[#848e9c]"
                >
                  {{ panelHint }}
                </p>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-lg p-1.5 text-[#848e9c] transition hover:bg-white/[0.08] hover:text-white"
                aria-label="关闭"
                @click="close"
              >
                <FrontStrokeIcon name="x" size-class="h-4 w-4" />
              </button>
            </div>
            <div v-if="searchable" class="shrink-0 px-3 pt-3">
              <input
                :id="searchInputIdSheet"
                v-model="search"
                type="search"
                autocomplete="off"
                :placeholder="searchPlaceholder"
                class="w-full rounded-lg border border-white/[0.1] bg-[#0b0c0e] px-2.5 py-2 text-sm text-[#eaecef] placeholder:text-white/35 focus:outline-none"
                @keydown.escape.stop="close"
              />
            </div>
            <ul
              :id="listboxIdSheet"
              class="scrollbar-thin trade-pair-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-2"
              role="listbox"
            >
              <template v-if="filteredOptions.length">
                <li v-for="opt in filteredOptions" :key="`sheet-${String(opt.value)}`" role="none">
                  <button
                    type="button"
                    role="option"
                    :class="optionBtnClass(model === opt.value)"
                    :aria-selected="model === opt.value"
                    @click="pick(opt.value)"
                  >
                    <slot name="option-leading" :option="opt" />
                    <span class="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span class="min-w-0 truncate font-medium">{{ opt.label }}</span>
                      <span
                        v-if="opt.hint"
                        class="max-w-[45%] shrink-0 truncate text-right text-[11px] font-normal text-[#848e9c]"
                      >
                        {{ opt.hint }}
                      </span>
                    </span>
                  </button>
                </li>
              </template>
              <li v-else class="px-3 py-8 text-center text-xs text-white/40">无匹配项</li>
            </ul>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.front-sheet-enter-active,
.front-sheet-leave-active {
  transition: opacity 0.24s ease-out;
}

.front-sheet-enter-active .front-sheet-panel,
.front-sheet-leave-active .front-sheet-panel {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.front-sheet-enter-from,
.front-sheet-leave-to {
  opacity: 0;
}

.front-sheet-enter-from .front-sheet-panel,
.front-sheet-leave-to .front-sheet-panel {
  transform: translateY(85%);
}

.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

@media (prefers-reduced-motion: reduce) {
  .front-sheet-enter-active,
  .front-sheet-leave-active,
  .front-sheet-enter-active .front-sheet-panel,
  .front-sheet-leave-active .front-sheet-panel {
    transition-duration: 0.01ms !important;
  }

  .front-sheet-enter-from .front-sheet-panel,
  .front-sheet-leave-to .front-sheet-panel {
    transform: none !important;
  }
}
</style>
