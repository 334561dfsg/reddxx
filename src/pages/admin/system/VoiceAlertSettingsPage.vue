<script setup>
// 平台配置 → 语音提醒: Ant Design Pro config page (2026-11-28) — PageShell header, grouped Cards, bottom action bar,
// toast feedback (Ant message) instead of the persistent status paragraph.
import { computed, onMounted, ref } from 'vue'
import { Button, Card, Col, Row, Space, Spin, TypographyText, message } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
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
    message.error(statusMessage.value)
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
      message.success(statusMessage.value)
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
    }
  } catch (error) {
    statusMessage.value = `保存失败：${error?.message || '未知错误'}`
    message.error(statusMessage.value)
  } finally {
    isSaving.value = false
  }
}

function restoreSaved() {
  draft.value = cloneVoiceAlerts(savedConfig.value?.voiceAlerts)
  statusMessage.value = '已恢复到最近一次保存的配置，请按需继续调整。'
  message.info(statusMessage.value)
}

function restoreDefault() {
  draft.value = cloneVoiceAlerts(DEFAULT_SITE_CONFIG.voiceAlerts)
  statusMessage.value = '已恢复默认配置，保存后生效。'
  message.info(statusMessage.value)
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
  <PageShell title="语音提醒">
    <template #description>
      <TypographyText type="secondary">配置后台是否播放提示音，以及每类业务事件是否触发声音提醒。</TypographyText>
    </template>
    <Card v-if="loading" :bordered="false"><Spin tip="加载中…" class="voice-alert-loading" /></Card>

    <template v-else>
      <Card title="是否播放声音" :bordered="false">
        <div class="voice-alert-row">
          <TypographyText type="secondary">关闭后所有业务提示音停止播放；独立事件开关仍会保留，重新开启总开关后继续按事件配置生效。</TypographyText>
          <a-switch :checked="draft.enabled" :aria-label="draft.enabled ? '关闭所有语音提醒' : '开启所有语音提醒'" @click="toggleGlobal" />
        </div>
      </Card>

      <Card title="声音事件" :bordered="false">
        <template #extra><TypographyText type="secondary">已开启 {{ enabledCount }} / {{ DEFAULT_VOICE_ALERT_EVENTS.length }} 项</TypographyText></template>
        <Row :gutter="[24, 16]">
          <Col v-for="event in DEFAULT_VOICE_ALERT_EVENTS" :key="event.key" :xs="24" :md="12" :xl="8">
            <div class="voice-alert-row">
              <Space direction="vertical" :size="0" class="voice-alert-label">
                <TypographyText>{{ event.label }}</TypographyText>
                <TypographyText type="secondary" class="font-mono">{{ event.key }}</TypographyText>
              </Space>
              <a-switch :checked="draft.events[event.key]" :aria-label="`${draft.events[event.key] ? '关闭' : '开启'}${event.label}声音`" @click="toggleEvent(event.key)" />
            </div>
          </Col>
        </Row>
      </Card>

      <Card class="voice-alert-footer" :bordered="false" :body-style="{ padding: '12px 24px' }">
        <div class="voice-alert-actions">
          <Space :size="8" wrap>
            <Button :disabled="isSaving" @click="restoreDefault">恢复默认</Button>
            <Button :disabled="isSaving || !isDirty" @click="restoreSaved">恢复已保存</Button>
            <Button type="primary" :loading="isSaving" :disabled="!isDirty" @click="saveConfig">保存配置</Button>
          </Space>
        </div>
      </Card>
    </template>
  </PageShell>
</template>

<style scoped>
.voice-alert-loading{display:block;padding:32px 0}
.voice-alert-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;min-width:0}
.voice-alert-label{min-width:0;overflow-wrap:anywhere}
.voice-alert-footer{position:sticky;bottom:0;z-index:10}
.voice-alert-actions{display:flex;justify-content:flex-end}
</style>
