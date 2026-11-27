<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

/**
 * 区号选择：交互与顶栏「语言」一致（按钮 + 下拉列表、选中高亮与勾选），面板 Teleport 到 body 避免被 overflow 裁剪。
 */
const props = defineProps({
  /** 与 options[].value 对应的区号，如 '+86' */
  modelValue: { type: String, default: '' },
  options: {
    type: Array,
    required: true,
    /** @type {{ value: string, label: string, icon?: string }[]} */
  },
  /** 用于 aria / 内部 id 唯一前缀 */
  fieldKey: { type: String, default: 'dial' },
  /** 无障碍名称 */
  ariaLabel: { type: String, default: '国家或地区区号' },
})

const emit = defineEmits(['update:modelValue'])

const rootRef = ref(null)
const panelRef = ref(null)
const open = ref(false)
const panelStyle = ref({ top: '0px', left: '0px', width: '240px' })

const listboxId = computed(() => `front-dial-panel-${props.fieldKey}`)

const currentLabel = computed(() => {
  const hit = props.options.find((o) => o.value === props.modelValue)
  return hit?.label ?? props.options[0]?.label ?? '请选择'
})

const currentIcon = computed(() => {
  const hit = props.options.find((o) => o.value === props.modelValue)
  return hit?.icon ?? props.options[0]?.icon ?? ''
})

function isImageIcon(icon) {
  const s = String(icon || '').trim()
  return /^(https?:\/\/|data:image\/|\/)/i.test(s) || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(s)
}

function positionPanel() {
  const el = rootRef.value
  if (!el || typeof window === 'undefined') return
  const r = el.getBoundingClientRect()
  const vw = window.innerWidth
  const margin = 8
  let width = Math.max(r.width, 220)
  let left = r.left
  if (left + width > vw - margin) {
    left = Math.max(margin, vw - margin - width)
  }
  if (left < margin) left = margin
  panelStyle.value = {
    top: `${r.bottom + 6}px`,
    left: `${left}px`,
    width: `${width}px`,
  }
}

let removeScrollListeners = () => {}
let removeDocPointer = () => {}

function bindScrollClose() {
  removeScrollListeners()
  const handler = () => {
    open.value = false
  }
  window.addEventListener('scroll', handler, true)
  window.addEventListener('resize', handler)
  removeScrollListeners = () => {
    window.removeEventListener('scroll', handler, true)
    window.removeEventListener('resize', handler)
    removeScrollListeners = () => {}
  }
}

function unbindScrollClose() {
  removeScrollListeners()
}

function onDocPointerDown(ev) {
  const t = ev.target
  if (rootRef.value?.contains(t)) return
  if (panelRef.value?.contains(t)) return
  close()
}

function bindDocClose() {
  removeDocPointer()
  document.addEventListener('pointerdown', onDocPointerDown, true)
  removeDocPointer = () => {
    document.removeEventListener('pointerdown', onDocPointerDown, true)
    removeDocPointer = () => {}
  }
}

function unbindDocClose() {
  removeDocPointer()
}

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function pick(value) {
  emit('update:modelValue', value)
  close()
}

function onEscape(ev) {
  if (ev.key === 'Escape') close()
}

watch(open, (v) => {
  if (v) {
    nextTick(() => {
      positionPanel()
      bindScrollClose()
      bindDocClose()
    })
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', onEscape)
    }
  } else {
    unbindScrollClose()
    unbindDocClose()
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', onEscape)
    }
  }
})

onUnmounted(() => {
  unbindScrollClose()
  unbindDocClose()
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onEscape)
  }
})
</script>

<template>
  <div ref="rootRef" class="relative min-w-0">
    <button
      type="button"
      class="flex h-[2.75rem] w-full min-h-[2.75rem] items-center justify-between gap-2 rounded-lg border border-white/[0.12] bg-black/40 px-3 text-left text-sm font-medium text-white/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition [-webkit-tap-highlight-color:transparent] hover:border-white/[0.18] focus:outline-none"
      :class="open ? 'border-lime-400/35 text-lime-200' : ''"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-controls="listboxId"
      :aria-label="ariaLabel"
      @click="toggle"
    >
      <span class="min-w-0 flex flex-1 items-center gap-1.5 truncate">
        <span v-if="currentIcon" class="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full">
          <img
            v-if="isImageIcon(currentIcon)"
            :src="currentIcon"
            alt=""
            class="h-full w-full object-cover"
          />
          <span v-else>{{ currentIcon }}</span>
        </span>
        <span class="min-w-0 truncate">{{ currentLabel }}</span>
      </span>
      <svg
        class="h-3 w-3 shrink-0 text-white/45 transition-transform duration-200"
        :class="open ? 'rotate-180' : ''"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 4.5 6 7.5 9 4.5"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        :id="listboxId"
        ref="panelRef"
        class="fixed z-[130] max-h-[min(45vh,18rem)] overflow-y-auto rounded-md border border-[#1f2429] bg-[#1e2329] py-1 shadow-xl shadow-black/50"
        :style="panelStyle"
        role="listbox"
        :aria-label="ariaLabel"
      >
          <button
            v-for="opt in options"
            :id="`front-dial-${fieldKey}-${opt.value}`"
            :key="opt.value === '' ? '__empty' : opt.value"
            type="button"
            role="option"
            class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition lg:text-[0.9375rem]"
            :class="
              modelValue === opt.value
                ? 'bg-lime-400/12 text-lime-300'
                : 'text-[#eaecef] hover:bg-white/[0.06]'
            "
            :aria-selected="modelValue === opt.value"
            @click="pick(opt.value)"
          >
            <span class="min-w-0 flex items-center gap-1.5">
              <span v-if="opt.icon" class="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full">
                <img
                  v-if="isImageIcon(opt.icon)"
                  :src="opt.icon"
                  :alt="opt.label"
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ opt.icon }}</span>
              </span>
              <span class="min-w-0 truncate">{{ opt.label }}</span>
            </span>
            <svg
              v-if="modelValue === opt.value"
              class="h-4 w-4 shrink-0 text-lime-400/90"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M20 6 9 17l-5-5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
      </div>
    </Teleport>
  </div>
</template>
