<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  DEFAULT_SITE_CONFIG,
  DEFAULT_VOICE_ALERT_EVENTS,
  normalizeVoiceAlerts,
  siteConfigApi
} from '../../../admin/mock/siteConfig'

const loading = ref(true)
const isSaving = ref(false)
const savedConfig = ref(null)
const draft = ref(normalizeVoiceAlerts())
const statusMessage = ref('')

const voiceAlertsState = computed(() => ({
  settingsOwnerId: 'admin-system-voice-alerts',
  settingsScope: 'platform-admin-notification-sound',
  applyMode: 'explicit-save',
  draftSettings: draft.value,
  savedSettings: savedConfig.value?.voiceAlerts || normalizeVoiceAlerts(),
  effectiveSettings: savedConfig.value?.voiceAlerts || normalizeVoiceAlerts(),
  defaultSettings: DEFAULT_SITE_CONFIG.voiceAlerts,
  dirtyState: {
    dirty: isDirty.value,
    canSave: isDirty.value && !isSaving.value,
    canRestoreSaved: isDirty.value && !isSaving.value
  },
  resetPolicy: {
    restoreSaved: '恢复到最近一次保存的语音提醒配置',
    resetDefault: '恢复为系统默认的全部开启配置'
  },
  permissionBoundary: '当前演示页默认允许系统配置管理员读写',
  resultReceipt: statusMessage.value,
  responsivePolicy: '窄屏单列展示全部开关，不删除任何声音事件'
}))

const isDirty = computed(() => {
  const saved = savedConfig.value?.voiceAlerts || normalizeVoiceAlerts()
  return JSON.stringify(draft.value) !== JSON.stringify(saved)
})

const enabledCount = computed(() =>
  DEFAULT_VOICE_ALERT_EVENTS.filter((item) => draft.value.events[item.key]).length
)

function cloneVoiceAlerts(value) {
  return normalizeVoiceAlerts(JSON.parse(JSON.stringify(value || {})))
}

async function loadConfig() {
  loading.value = true
  statusMessage.value = ''
  try {
    const result = await siteConfigApi.getSiteConfig()
    if (result.success) {
      savedConfig.value = {
        ...result.data,
        voiceAlerts: normalizeVoiceAlerts(result.data.voiceAlerts)
      }
      draft.value = cloneVoiceAlerts(savedConfig.value.voiceAlerts)
    }
  } catch (error) {
    statusMessage.value = `加载失败：${error?.message || '未知错误'}`
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  if (!savedConfig.value || isSaving.value) return
  isSaving.value = true
  statusMessage.value = ''
  try {
    const next = {
      ...savedConfig.value,
      voiceAlerts: cloneVoiceAlerts(draft.value)
    }
    const result = await siteConfigApi.updateSiteConfig(next)
    if (result.success) {
      savedConfig.value = {
        ...next,
        voiceAlerts: cloneVoiceAlerts(next.voiceAlerts)
      }
      draft.value = cloneVoiceAlerts(savedConfig.value.voiceAlerts)
      statusMessage.value = result.message || '语音提醒配置已保存'
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
    }
  } catch (error) {
    statusMessage.value = `保存失败：${error?.message || '未知错误'}`
  } finally {
    isSaving.value = false
  }
}

function restoreSaved() {
  draft.value = cloneVoiceAlerts(savedConfig.value?.voiceAlerts)
  statusMessage.value = '已恢复到最近一次保存的配置，请按需继续调整。'
}

function restoreDefault() {
  draft.value = cloneVoiceAlerts(DEFAULT_SITE_CONFIG.voiceAlerts)
  statusMessage.value = '已恢复默认配置，保存后生效。'
}

function toggleGlobal() {
  draft.value.enabled = !draft.value.enabled
}

function toggleEvent(key) {
  draft.value.events[key] = !draft.value.events[key]
}

onMounted(loadConfig)
</script>

<template>
  <main class="space-y-6" aria-labelledby="voice-alert-title">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h1 id="voice-alert-title" class="text-2xl font-bold text-slate-900">语音提醒</h1>
        <p class="mt-1 text-sm leading-6 text-slate-500">
          配置后台是否播放提示音，以及每类业务事件是否触发声音提醒。
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="ant-btn" :disabled="loading || isSaving || !isDirty" @click="restoreSaved">
          恢复已保存
        </button>
        <button type="button" class="ant-btn" :disabled="loading || isSaving" @click="restoreDefault">
          恢复默认
        </button>
        <button
          type="button"
          class="ant-btn ant-btn-primary"
          :disabled="loading || isSaving || !isDirty"
          @click="saveConfig"
        >
          {{ isSaving ? '保存中…' : '保存配置' }}
        </button>
      </div>
    </header>

    <section
      v-if="loading"
      class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
      aria-live="polite"
    >
      加载中…
    </section>

    <template v-else>
      <p
        v-if="statusMessage"
        class="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700"
        role="status"
      >
        {{ statusMessage }}
      </p>

      <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-200 p-5">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <h2 class="text-base font-semibold text-slate-900">是否播放声音</h2>
              <p class="mt-1 text-sm leading-6 text-slate-500">
                关闭后所有业务提示音停止播放；独立事件开关仍会保留，重新开启总开关后继续按事件配置生效。
              </p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="draft.enabled"
              :aria-label="draft.enabled ? '关闭所有语音提醒' : '开启所有语音提醒'"
              :class="draft.enabled ? 'bg-blue-600' : 'bg-slate-300'"
              class="relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              @click="toggleGlobal"
            >
              <span
                :class="draft.enabled ? 'translate-x-5' : 'translate-x-0'"
                class="pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transition-transform duration-200"
              />
            </button>
          </div>
        </div>

        <div class="space-y-4 p-5">
          <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 class="text-base font-semibold text-slate-900">声音事件</h2>
            <p class="text-sm text-slate-500">已开启 {{ enabledCount }} / {{ DEFAULT_VOICE_ALERT_EVENTS.length }} 项</p>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <div
              v-for="event in DEFAULT_VOICE_ALERT_EVENTS"
              :key="event.key"
              class="flex min-w-0 items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3"
            >
              <div class="min-w-0 flex-1">
                <p class="break-words text-sm font-medium text-slate-900">{{ event.label }}</p>
                <p class="mt-1 break-words font-mono text-[11px] text-slate-500">{{ event.key }}</p>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="draft.events[event.key]"
                :aria-label="`${draft.events[event.key] ? '关闭' : '开启'}${event.label}声音`"
                :class="draft.events[event.key] ? 'bg-blue-600' : 'bg-slate-300'"
                class="relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                @click="toggleEvent(event.key)"
              >
                <span
                  :class="draft.events[event.key] ? 'translate-x-5' : 'translate-x-0'"
                  class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                />
              </button>
            </div>
          </div>
        </div>
      </section>

    </template>
  </main>
</template>
