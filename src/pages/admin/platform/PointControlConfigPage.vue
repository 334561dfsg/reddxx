<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  DEFAULT_POINT_CONTROL_RATIOS,
  normalizePointControlRatios,
  siteConfigApi
} from '../../../admin/mock/siteConfig'

const CONTROL_FIELDS = [
  {
    key: 'delivery',
    label: '交割点控输赢比例',
    help: '用于交割合约用户点控的默认输赢比例，按百分比 0-100 保存。'
  },
  {
    key: 'perpetual',
    label: '永续点控输赢比例',
    help: '用于永续合约用户点控的默认输赢比例，按百分比 0-100 保存。'
  },
  {
    key: 'spot',
    label: '现货点控输赢比例',
    help: '用于现货交易用户点控的默认输赢比例，按百分比 0-100 保存。'
  }
]

const loading = ref(true)
const isSaving = ref(false)
const savedConfig = ref(null)
const statusMessage = ref('')
const statusKind = ref('success')
const fieldErrors = ref({})
const draftText = ref({
  delivery: '',
  perpetual: '',
  spot: ''
})

const savedRatios = computed(() => normalizePointControlRatios(savedConfig.value?.pointControlRatios))
const hasFieldErrors = computed(() => Object.keys(fieldErrors.value).length > 0)

const draftRatios = computed(() => ({
  delivery: parsePercentDraft(draftText.value.delivery),
  perpetual: parsePercentDraft(draftText.value.perpetual),
  spot: parsePercentDraft(draftText.value.spot)
}))

const isDirty = computed(() => (
  CONTROL_FIELDS.some((field) => {
    const parsed = draftRatios.value[field.key]
    return !Number.isFinite(parsed) || parsed !== savedRatios.value[field.key]
  })
))

const numericInputState = computed(() => CONTROL_FIELDS.map((field) => ({
  numericOwnerId: `admin-platform-point-control-${field.key}-ratio`,
  fieldIdentity: `platform.pointControlRatios.${field.key}`,
  valueKind: 'percent',
  draftText: draftText.value[field.key],
  parsedValue: draftRatios.value[field.key],
  committedValue: savedRatios.value[field.key],
  displayFormat: '0-100 percent value with % suffix',
  unitBinding: 'percent; submitted value is the visible 0-100 number',
  precisionPolicy: 'up to 2 decimal places, rounded by configuration normalization',
  rangePolicy: 'hard range 0-100 inclusive',
  stepperPolicy: 'no stepper; mouse wheel does not change text input value',
  normalizationPolicy: 'strip commas, ASCII/full-width percent signs, and surrounding whitespace',
  validationBinding: 'fieldErrors blocks explicit save',
  submitSnapshotPolicy: 'save freezes parsed percent values for delivery, perpetual, and spot',
  permissionBoundary: 'current demo admin console allows platform configuration read/write',
  feedbackBinding: 'field error plus page status message',
  responsivePolicy: 'three-column desktop grid collapses to single-column without removing fields or actions',
  runtimeVerification: 'static tests and production build only; browser, screen reader, touch, IME, zoom, and permission switching unverified'
})))

const pointControlSettingsState = computed(() => ({
  settingsOwnerId: 'admin-platform-point-control-config',
  settingsScope: 'platform-point-control',
  applyMode: 'explicit-save',
  draftSettings: { ...draftText.value },
  savedSettings: savedRatios.value,
  effectiveSettings: savedRatios.value,
  defaultSettings: DEFAULT_POINT_CONTROL_RATIOS,
  dirtyState: {
    dirty: isDirty.value,
    canSave: isDirty.value && !loading.value && !isSaving.value,
    canRestoreSaved: isDirty.value && !isSaving.value
  },
  resetPolicy: {
    restoreSaved: '恢复到当前服务端确认的点控输赢比例',
    resetDefault: '当前页面不提供恢复默认入口'
  },
  permissionBoundary: '当前演示管理台默认允许平台配置管理员读写',
  resultReceipt: statusMessage.value,
  numericInputState: numericInputState.value,
  responsivePolicy: '宽屏三列，窄屏单列；保存、恢复、字段错误和单位说明保持可达'
}))

function normalizePercentText(value) {
  return String(value ?? '')
    .replace(/，/g, ',')
    .replace(/,/g, '')
    .replace(/[％%]/g, '')
    .trim()
}

function parsePercentDraft(value) {
  const normalized = normalizePercentText(value)
  if (!normalized) return NaN
  return Number(normalized)
}

function formatPercentValue(value) {
  return String(normalizePointControlRatios({ delivery: value }).delivery)
}

function fieldDescribedBy(field) {
  const ids = [`point-control-${field.key}-help`]
  if (fieldErrors.value[field.key]) ids.push(`point-control-${field.key}-error`)
  return ids.join(' ')
}

function setDraftFromRatios(value) {
  const next = normalizePointControlRatios(value)
  draftText.value = {
    delivery: String(next.delivery),
    perpetual: String(next.perpetual),
    spot: String(next.spot)
  }
  fieldErrors.value = {}
}

function validateDraft() {
  const nextErrors = {}
  for (const field of CONTROL_FIELDS) {
    const raw = normalizePercentText(draftText.value[field.key])
    const parsed = Number(raw)
    if (!raw || !Number.isFinite(parsed)) {
      nextErrors[field.key] = `请输入${field.label}。`
    } else if (parsed < 0 || parsed > 100) {
      nextErrors[field.key] = `${field.label}必须在 0 到 100 之间。`
    } else if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
      nextErrors[field.key] = `${field.label}最多支持 2 位小数。`
    }
  }
  fieldErrors.value = nextErrors
  return Object.keys(nextErrors).length === 0
}

async function loadConfig() {
  loading.value = true
  statusMessage.value = ''
  try {
    const result = await siteConfigApi.getSiteConfig()
    if (result.success) {
      savedConfig.value = {
        ...result.data,
        pointControlRatios: normalizePointControlRatios(result.data.pointControlRatios)
      }
      setDraftFromRatios(savedConfig.value.pointControlRatios)
    }
  } catch (error) {
    statusKind.value = 'error'
    statusMessage.value = `加载失败：${error?.message || '未知错误'}`
  } finally {
    loading.value = false
  }
}

function restoreSaved() {
  setDraftFromRatios(savedRatios.value)
  statusKind.value = 'success'
  statusMessage.value = '已恢复到当前保存值'
}

async function saveConfig() {
  if (!savedConfig.value || isSaving.value) return
  statusMessage.value = ''
  if (!validateDraft()) {
    statusKind.value = 'warning'
    statusMessage.value = '请修正表单错误后再保存。'
    return
  }

  isSaving.value = true
  try {
    const nextRatios = normalizePointControlRatios(draftRatios.value)
    const next = {
      ...savedConfig.value,
      pointControlRatios: nextRatios
    }
    const result = await siteConfigApi.updateSiteConfig(next)
    if (result.success) {
      savedConfig.value = next
      setDraftFromRatios(nextRatios)
      statusKind.value = 'success'
      statusMessage.value = '点控配置已保存'
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
    }
  } catch (error) {
    statusKind.value = 'error'
    statusMessage.value = `保存失败：${error?.message || '未知错误'}`
  } finally {
    isSaving.value = false
  }
}

onMounted(loadConfig)
</script>

<template>
  <main class="space-y-6" aria-labelledby="point-control-config-title">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h1 id="point-control-config-title" class="text-2xl font-bold text-slate-900">点控配置</h1>
        <p class="mt-1 text-sm leading-6 text-slate-500">
          配置交割、永续、现货点控的控制力度。当前值按输赢比例百分比保存。
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="ant-btn"
          :disabled="loading || isSaving || !isDirty"
          @click="restoreSaved"
        >
          恢复已保存
        </button>
        <button
          type="button"
          class="ant-btn ant-btn-primary"
          :disabled="loading || isSaving || !isDirty"
          :aria-busy="isSaving ? 'true' : 'false'"
          @click="saveConfig"
        >
          {{ isSaving ? '正在保存点控配置…' : '保存配置' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
      加载中…
    </div>

    <section v-else class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
        保存后，三个交易模块的用户点控将按各自比例读取配置；已打开的草稿需重新保存后才会使用新值。
      </div>

      <div
        v-if="statusMessage"
        class="mb-5 rounded-lg border px-4 py-3 text-sm"
        :class="{
          'border-emerald-200 bg-emerald-50 text-emerald-800': statusKind === 'success',
          'border-amber-200 bg-amber-50 text-amber-800': statusKind === 'warning',
          'border-rose-200 bg-rose-50 text-rose-800': statusKind === 'error'
        }"
        role="status"
      >
        {{ statusMessage }}
      </div>

      <form class="space-y-6" novalidate @submit.prevent="saveConfig">
        <div class="grid gap-5 lg:grid-cols-3">
          <div v-for="field in CONTROL_FIELDS" :key="field.key">
            <label :for="`point-control-${field.key}-ratio`" class="mb-2 block text-sm font-medium text-slate-700">
              {{ field.label }}
            </label>
            <div class="relative">
              <input
                :id="`point-control-${field.key}-ratio`"
                v-model="draftText[field.key]"
                type="text"
                inputmode="decimal"
                class="ant-input w-full pr-10 font-mono"
                :aria-invalid="fieldErrors[field.key] ? 'true' : 'false'"
                :aria-describedby="fieldDescribedBy(field)"
                placeholder="例如：50"
              />
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
            </div>
            <p :id="`point-control-${field.key}-help`" class="mt-1.5 text-xs leading-5 text-slate-500">
              {{ field.help }}
            </p>
            <p
              v-if="fieldErrors[field.key]"
              :id="`point-control-${field.key}-error`"
              class="mt-1.5 text-xs leading-5 text-rose-600"
            >
              {{ fieldErrors[field.key] }}
            </p>
          </div>
        </div>
      </form>

      <dl class="mt-6 grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div v-for="field in CONTROL_FIELDS" :key="`${field.key}-saved`">
          <dt class="text-xs text-slate-500">{{ field.label }}当前生效值</dt>
          <dd class="mt-1 font-mono text-slate-900">{{ formatPercentValue(savedRatios[field.key]) }}%</dd>
        </div>
      </dl>

      <span class="sr-only">{{ JSON.stringify(pointControlSettingsState) }}</span>
      <span class="sr-only">{{ JSON.stringify(numericInputState) }}</span>
      <span v-if="hasFieldErrors" class="sr-only">点控配置存在字段错误，请修正后保存。</span>
    </section>
  </main>
</template>
