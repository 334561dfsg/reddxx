<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  frontSheetBackdropPaintOnly,
  frontSheetCancelBtnClass,
  frontSheetDragHandleClass,
  frontSheetListItemBorderClass,
  frontSheetListRowBtnClass,
  frontSheetPanelShellClass
} from '../../../constants/frontBottomSheet'

const nickname = ref('交易用户 143')
const language = ref('zh-CN')
const timezone = ref('Asia/Shanghai')
const orderConfirm = ref(true)
const priceAlertSound = ref(false)

const languages = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
  { value: 'zh-TW', label: '繁體中文' }
]

const timezones = [
  { value: 'Asia/Shanghai', label: 'UTC+8 北京/新加坡' },
  { value: 'Asia/Tokyo', label: 'UTC+9 东京' },
  { value: 'UTC', label: 'UTC+0' }
]

const languageLabel = computed(
  () => languages.find((l) => l.value === language.value)?.label ?? language.value
)
const timezoneLabel = computed(
  () => timezones.find((t) => t.value === timezone.value)?.label ?? timezone.value
)

const prefsSheetOpen = ref(false)
const prefsSheetTitle = ref('')
const prefsSheetTarget = ref('')
const prefsSheetOptions = ref([])

function openPrefsSheet(target) {
  prefsSheetTarget.value = target
  prefsSheetTitle.value = target === 'language' ? '界面语言' : '默认时区'
  prefsSheetOptions.value = target === 'language' ? languages : timezones
  prefsSheetOpen.value = true
}

function closePrefsSheet() {
  prefsSheetOpen.value = false
}

function pickPref(value) {
  if (prefsSheetTarget.value === 'language') language.value = value
  else timezone.value = value
  closePrefsSheet()
}

function isPrefOptionSelected(value) {
  if (prefsSheetTarget.value === 'language') return language.value === value
  return timezone.value === value
}

function onPrefsKeydown(e) {
  if (e.key === 'Escape' && prefsSheetOpen.value) closePrefsSheet()
}

const savedHint = ref('')

function save() {
  savedHint.value = '已保存（前端示例，对接接口后写入服务端）'
  window.setTimeout(() => {
    savedHint.value = ''
  }, 2600)
}

onMounted(() => document.body.addEventListener('keydown', onPrefsKeydown))
onUnmounted(() => document.body.removeEventListener('keydown', onPrefsKeydown))
</script>

<template>
  <div>
    <header class="mb-5 hidden md:mb-6 md:block">
      <h1 class="text-2xl font-bold tracking-tight text-white md:text-3xl">账户设置</h1>
      <p class="mt-1 text-sm text-white/55">
        昵称与显示偏好；敏感变更仍需在安全中心完成验证。
      </p>
    </header>

    <div class="flex flex-col gap-5 md:gap-6">
    <p
      v-if="savedHint"
      class="rounded-xl border border-lime-400/30 bg-lime-400/10 px-4 py-2 text-sm text-lime-100/95"
      role="status"
    >
      {{ savedHint }}
    </p>

    <section class="flex flex-col gap-5 md:gap-6">
      <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-5">
        <h2 class="text-sm font-semibold text-white/90">基本资料</h2>
        <label class="mt-4 block">
          <span class="text-xs text-white/50">昵称（前台展示）</span>
          <input
            v-model="nickname"
            type="text"
            class="mt-1.5 w-full max-w-md rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-sm text-white focus:outline-none"
          />
        </label>
      </div>

      <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-5">
        <h2 class="text-sm font-semibold text-white/90">语言与时区</h2>
        <div class="mt-4 grid gap-4 sm:max-w-xl sm:grid-cols-2">
          <div class="block">
            <span class="text-xs text-white/50">界面语言</span>
            <button
              type="button"
              class="mt-1.5 flex w-full items-center justify-between rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-left text-sm text-white md:hidden"
              @click="openPrefsSheet('language')"
            >
              <span class="truncate">{{ languageLabel }}</span>
              <svg
                class="ml-2 h-4 w-4 shrink-0 text-white/40"
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
            <label class="mt-1.5 hidden md:block">
              <select
                v-model="language"
                class="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-sm text-white focus:outline-none"
              >
                <option v-for="o in languages" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </label>
          </div>
          <div class="block">
            <span class="text-xs text-white/50">默认时区</span>
            <button
              type="button"
              class="mt-1.5 flex w-full items-center justify-between rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-left text-sm text-white md:hidden"
              @click="openPrefsSheet('timezone')"
            >
              <span class="min-w-0 flex-1 truncate">{{ timezoneLabel }}</span>
              <svg
                class="ml-2 h-4 w-4 shrink-0 text-white/40"
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
            <label class="mt-1.5 hidden md:block">
              <select
                v-model="timezone"
                class="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-sm text-white focus:outline-none"
              >
                <option v-for="o in timezones" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-5">
        <h2 class="text-sm font-semibold text-white/90">交易体验</h2>
        <label class="mt-4 flex cursor-pointer items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <span class="text-sm text-white/75">下单前二次确认</span>
          <input
            v-model="orderConfirm"
            type="checkbox"
            class="h-4 w-4 rounded border-white/25 bg-black/40 text-lime-400"
          />
        </label>
        <label class="mt-4 flex cursor-pointer items-center justify-between gap-3">
          <span class="text-sm text-white/75">价格波动提示音</span>
          <input
            v-model="priceAlertSound"
            type="checkbox"
            class="h-4 w-4 rounded border-white/25 bg-black/40 text-lime-400"
          />
        </label>
      </div>
    </section>

      <button
        type="button"
        class="w-full rounded-lg bg-lime-400 px-6 py-3 text-sm font-semibold text-black hover:bg-lime-300 md:w-max md:flex-none md:self-start"
        @click="save"
      >
        保存设置
      </button>
    </div>

    <Teleport to="body">
      <Transition name="pref-fade">
        <div
          v-if="prefsSheetOpen"
          :class="['fixed inset-0 z-[60] md:hidden', frontSheetBackdropPaintOnly]"
          aria-hidden="true"
          @click="closePrefsSheet"
        />
      </Transition>
      <Transition name="pref-slide">
        <div
          v-if="prefsSheetOpen"
          :class="`fixed bottom-0 left-0 right-0 z-[61] max-h-[min(70vh,28rem)] flex flex-col pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2 md:hidden ${frontSheetPanelShellClass}`"
          role="dialog"
          :aria-label="prefsSheetTitle"
        >
          <div :class="['mb-2', frontSheetDragHandleClass]" />
          <p class="shrink-0 px-4 pb-2 text-center text-sm font-semibold text-white">
            {{ prefsSheetTitle }}
          </p>
          <ul class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
            <li
              v-for="opt in prefsSheetOptions"
              :key="opt.value"
              :class="frontSheetListItemBorderClass"
            >
              <button type="button" :class="frontSheetListRowBtnClass" @click="pickPref(opt.value)">
                <span class="min-w-0 flex-1 pr-2 leading-snug">{{ opt.label }}</span>
                <svg
                  v-if="isPrefOptionSelected(opt.value)"
                  class="h-5 w-5 shrink-0 text-lime-400"
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
            </li>
          </ul>
          <button type="button" :class="frontSheetCancelBtnClass" @click="closePrefsSheet">
            取消
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.pref-fade-enter-active,
.pref-fade-leave-active {
  transition: opacity 0.2s ease;
}
.pref-fade-enter-from,
.pref-fade-leave-to {
  opacity: 0;
}
.pref-slide-enter-active,
.pref-slide-leave-active {
  transition: transform 0.24s ease;
}
.pref-slide-enter-from,
.pref-slide-leave-to {
  transform: translateY(100%);
}
</style>
