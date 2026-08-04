<script setup>
import { computed, ref } from 'vue'
import { useDialogLifecycle } from '../composables/useDialogLifecycle.js'

const CHROME_SOUND_SETTINGS_URL = 'chrome://settings/content/sound'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  returnFocus: {
    type: [Object, Function],
    default: null
  }
})

const emit = defineEmits(['update:open'])

const dialogRef = ref(null)
const titleRef = ref(null)
const copyReceipt = ref('')

const siteDomain = computed(() => {
  if (typeof window === 'undefined') return '当前后台域名'
  return window.location.host || '当前后台域名'
})

const requestClose = () => {
  emit('update:open', false)
}

const {
  rendered,
  phase,
  layerStyle,
  requestDialogClose,
  onAfterEnter,
  onAfterLeave
} = useDialogLifecycle({
  open: computed(() => props.open),
  dialogRef,
  initialFocusRef: titleRef,
  returnFocusRef: computed(() => props.returnFocus),
  requestClose
})

const copyText = async (value, label) => {
  try {
    if (!navigator?.clipboard?.writeText) throw new Error('clipboard-unavailable')
    await navigator.clipboard.writeText(value)
    copyReceipt.value = `已复制${label}`
  } catch {
    copyReceipt.value = `复制${label}失败，请手动选中文本复制`
  }
}

const copySettingUrl = () => copyText(CHROME_SOUND_SETTINGS_URL, 'Chrome 声音设置地址')
const copyDomain = () => copyText(siteDomain.value, '当前后台域名')
const close = () => requestDialogClose()
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-overlay" appear @after-enter="onAfterEnter" @after-leave="onAfterLeave">
      <div
        v-if="rendered"
        v-show="phase !== 'closing'"
        class="fixed inset-0 flex min-h-[100vh] w-full items-center justify-center bg-black/50 p-4 supports-[height:100dvh]:min-h-[100dvh] sm:p-6"
        role="presentation"
        :style="layerStyle"
      >
        <Transition name="dialog-panel" appear>
          <section
            v-show="phase !== 'closing'"
            ref="dialogRef"
            class="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-sound-guide-title"
          >
            <header class="shrink-0 border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <h2
                    id="admin-sound-guide-title"
                    ref="titleRef"
                    tabindex="-1"
                    class="break-words text-xl font-semibold text-slate-900 focus:outline-none"
                  >
                    开启 Chrome 始终允许播放声音
                  </h2>
                  <p class="mt-1 break-words text-xs text-slate-500">
                    刷新页面后如果新消息提示音没有播放，请把当前后台域名加入 Chrome 声音允许列表。
                  </p>
                </div>
                <button
                  type="button"
                  class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-2xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-antd-primary/30"
                  aria-label="关闭"
                  title="关闭"
                  @click="close"
                >
                  ×
                </button>
              </div>
            </header>

            <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <p class="text-sm leading-6 text-slate-600">
                受 Chrome 浏览器安全策略限制，页面刷新后可能需要手动允许当前站点播放声音。
              </p>

              <ol class="mt-4 space-y-4 text-sm text-slate-700">
                <li class="rounded-lg border border-slate-200 bg-white p-3">
                  <div class="font-medium text-slate-900">1. 复制设置地址</div>
                  <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code class="min-w-0 flex-1 break-all rounded-md bg-slate-100 px-2 py-1.5 text-xs text-slate-700">
                      {{ CHROME_SOUND_SETTINGS_URL }}
                    </code>
                    <button
                      type="button"
                      class="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-antd-primary/30"
                      aria-label="复制 Chrome 声音设置地址"
                      @click="copySettingUrl"
                    >
                      复制地址
                    </button>
                  </div>
                </li>
                <li class="rounded-lg border border-slate-200 bg-white p-3">
                  <div class="font-medium text-slate-900">2. 在 Chrome 新标签页粘贴并访问该地址</div>
                </li>
                <li class="rounded-lg border border-slate-200 bg-white p-3">
                  <div class="font-medium text-slate-900">3. 找到“允许播放声音”区域，点击“添加”</div>
                </li>
                <li class="rounded-lg border border-slate-200 bg-white p-3">
                  <div class="font-medium text-slate-900">4. 复制并填写当前后台域名</div>
                  <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code class="min-w-0 flex-1 break-all rounded-md bg-slate-100 px-2 py-1.5 text-xs text-slate-700">
                      {{ siteDomain }}
                    </code>
                    <button
                      type="button"
                      class="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-antd-primary/30"
                      aria-label="复制当前后台域名"
                      @click="copyDomain"
                    >
                      复制域名
                    </button>
                  </div>
                </li>
              </ol>

              <div class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-800">
                添加完成后，刷新页面或收到新消息时，提示音会更稳定地正常播放。
              </div>

              <p
                class="mt-3 min-h-5 text-sm text-slate-600"
                role="status"
                aria-live="polite"
              >
                {{ copyReceipt }}
              </p>
            </div>

            <footer class="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                @click="close"
              >
                我知道了
              </button>
            </footer>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
