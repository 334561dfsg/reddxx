<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  frontSheetAdaptiveHybridPanelShellClass,
  frontSheetBackdropClass,
  frontSheetDragHandleClass,
  frontSheetPanelShellClass
} from '../../constants/frontBottomSheet'
import FrontStrokeIcon from './FrontStrokeIcon.vue'

/**
 * 窄屏：底部抽屉；lg+ 默认原生 select，可关闭改用与移动端一致的自定义选单（居中弹层）。
 */
const props = defineProps({
  label: { type: String, required: true },
  sheetTitle: { type: String, default: '' },
  options: { type: Array, required: true },
  ariaLabel: { type: String, default: '' },
  fieldKey: { type: String, default: '' },
  /** false 时桌面端也用自定义弹层，不渲染原生 select */
  nativeDesktop: { type: Boolean, default: true },
  /** 为 true 时不渲染内置标题（由外层 label 承接样式） */
  hideLabel: { type: Boolean, default: false },
  /** compact：默认；comfortable：与提币等大表单在 lg 上对齐高度 */
  size: { type: String, default: 'compact' },
  /**
   * 是否在打开/关闭选项抽屉时锁定 body（嵌套在其它已锁滚动的弹层内时请设为 false）
   */
  manageBodyScroll: { type: Boolean, default: true }
})

const model = defineModel({ type: String, default: '' })

const open = ref(false)

const titleText = computed(() => props.sheetTitle || props.label)

const titleId = computed(
  () => `front-adaptive-select-${props.fieldKey || props.label.replace(/\s+/g, '-')}`
)

const currentLabel = computed(() => {
  const hit = props.options.find((o) => o.value === model.value)
  return hit?.label ?? '请选择'
})

/** compact：列表/筛选；comfortable：与大表单输入统一 44px 行高（全断点一致，避免带前缀图标顶高） */
const triggerClassShared =
  'flex w-full items-center justify-between gap-2 border border-white/[0.08] bg-white/[0.04] text-left font-medium text-[#eaecef] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] [-webkit-tap-highlight-color:transparent] transition active:bg-white/[0.06] hover:border-white/[0.14] focus:outline-none'

const triggerClassCompact =
  `${triggerClassShared} min-h-9 rounded-lg px-2.5 py-1.5 text-sm leading-snug`

const triggerClassComfortable =
  `${triggerClassShared} h-[2.75rem] min-h-[2.75rem] shrink-0 rounded-xl px-3 py-0 text-base leading-none sm:px-4 sm:text-[15px] sm:leading-none lg:rounded-lg`

const triggerClass = computed(() =>
  props.size === 'comfortable' ? triggerClassComfortable : triggerClassCompact
)

const desktopSelectClass =
  'mt-1 w-full cursor-pointer appearance-none rounded-lg border border-white/[0.08] bg-white/[0.04] py-1.5 pl-2.5 pr-8 text-sm font-medium text-[#eaecef] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition focus:outline-none'

const triggerWrapClass = computed(() => {
  if (props.hideLabel) return ['mt-0', props.nativeDesktop ? 'lg:hidden' : ''].filter(Boolean).join(' ')
  return ['mt-1', props.nativeDesktop ? 'lg:hidden' : ''].filter(Boolean).join(' ')
})

const overlayClass = computed(() => {
  const z = 'fixed inset-0 z-[135] flex'
  if (props.nativeDesktop) return `${z} flex-col justify-end lg:hidden`
  return `${z} max-lg:flex-col max-lg:justify-end lg:items-center lg:justify-center lg:p-6`
})

const panelClass = computed(() => {
  const layout =
    'front-sheet-panel relative mx-auto flex w-full max-w-md max-h-[min(72vh,480px)] flex-col sm:max-w-lg'
  if (props.nativeDesktop) {
    return `${layout} ${frontSheetPanelShellClass}`
  }
  return `${layout} lg:max-h-[min(72vh,520px)] ${frontSheetAdaptiveHybridPanelShellClass} front-adaptive-select-desktop-modal`
})

const labelClass =
  'block text-[10px] font-medium uppercase tracking-[0.06em] text-[#848e9c]/85 sm:text-[11px] sm:tracking-wide sm:normal-case'

function optionRowClass(selected) {
  return [
    'flex w-full min-h-10 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-sm font-medium leading-snug transition [-webkit-tap-highlight-color:transparent] focus:outline-none',
    selected
      ? 'border-lime-400/35 bg-lime-400/[0.06] text-[#eaecef]'
      : 'border-transparent text-[#eaecef] active:bg-white/[0.06]'
  ]
}

function pick(value) {
  model.value = value
  open.value = false
}

function close() {
  open.value = false
}

watch(open, (v) => {
  if (!props.manageBodyScroll || typeof document === 'undefined') return
  document.body.style.overflow = v ? 'hidden' : ''
})

onUnmounted(() => {
  if (!props.manageBodyScroll || typeof document === 'undefined') return
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="min-w-0">
    <span v-if="!hideLabel" :class="labelClass">
      {{ label }}
    </span>

    <div :class="triggerWrapClass">
      <button
        type="button"
        :class="triggerClass"
        :aria-label="ariaLabel || label"
        :aria-expanded="open"
        aria-haspopup="listbox"
        @click="open = true"
      >
        <span class="flex min-w-0 flex-1 items-center gap-2">
          <slot name="triggerLeading" />
          <span class="min-w-0 truncate">{{ currentLabel }}</span>
        </span>
        <span class="shrink-0 text-[#848e9c]" aria-hidden="true">
          <svg
            :class="size === 'comfortable' ? 'h-4 w-4' : 'h-3.5 w-3.5'"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m7 10 5 5 5-5"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>
    </div>

    <div v-if="nativeDesktop" class="relative mt-1 hidden lg:block">
      <select
        v-model="model"
        :class="desktopSelectClass"
        :aria-label="ariaLabel || label"
      >
        <option
          v-for="opt in options"
          :key="opt.value === '' ? '__empty' : opt.value"
          :value="opt.value"
          class="bg-[#141414] text-[#eaecef]"
        >
          {{ opt.label }}
        </option>
      </select>
      <span
        class="pointer-events-none absolute right-2 top-1/2 mt-px -translate-y-1/2 text-[#848e9c]"
        aria-hidden="true"
      >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none">
          <path
            d="m7 10 5 5 5-5"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </div>

    <Teleport to="body">
      <Transition name="front-sheet">
        <div
          v-if="open"
          :class="overlayClass"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
        >
          <div :class="frontSheetBackdropClass" aria-hidden="true" @click="close" />
          <div
            :class="panelClass"
            :style="{
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
            }"
            @click.stop
          >
            <div
              class="shrink-0 pt-3 max-lg:block lg:hidden"
              :style="{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }"
            >
              <div :class="frontSheetDragHandleClass" aria-hidden="true" />
            </div>
            <div
              class="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 pb-3 pt-2 lg:rounded-t-2xl lg:pt-4"
            >
              <h2 :id="titleId" class="text-base font-semibold leading-snug tracking-tight text-white">
                {{ titleText }}
              </h2>
              <button
                type="button"
                class="rounded-lg p-1.5 text-[#848e9c] transition hover:bg-white/[0.08] hover:text-white"
                aria-label="关闭"
                @click="close"
              >
                <FrontStrokeIcon name="x" size-class="h-4 w-4" />
              </button>
            </div>
            <ul
              class="scrollbar-thin min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-2"
              role="listbox"
            >
              <li v-for="opt in options" :key="opt.value === '' ? '__empty' : opt.value">
                <button
                  type="button"
                  role="option"
                  :aria-selected="model === opt.value"
                  :class="optionRowClass(model === opt.value)"
                  @click="pick(opt.value)"
                >
                  {{ opt.label }}
                  <FrontStrokeIcon
                    v-if="model === opt.value"
                    name="check"
                    size-class="h-4 w-4 shrink-0 text-lime-400/90"
                  />
                </button>
              </li>
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

@media (min-width: 1024px) {
  .front-sheet-enter-from .front-adaptive-select-desktop-modal,
  .front-sheet-leave-to .front-adaptive-select-desktop-modal {
    transform: translateY(0.5rem) scale(0.97);
  }
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
