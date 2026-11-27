<script setup>
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
// 点控配置 — Ant Design Pro config page (2026-11-28): PageShell title, a grouped Card with an Ant Form and a sticky
// bottom action bar (恢复已保存 / 保存配置). Status text moved to toasts; field errors keep aria-invalid + described-by.
import { computed, onMounted, ref } from 'vue'
import { Button, Card, Col, Descriptions, DescriptionsItem, Form, FormItem, Input, Row, Skeleton, Space, TypographyText, message } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
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
  }
]

const loading = ref(true)
const isSaving = ref(false)
const savedConfig = ref(null)
const statusMessage = ref('')
const statusKind = ref('success')
const fieldErrors = ref({})
const draftText = ref({
  delivery: ''
})

const savedRatios = computed(() => normalizePointControlRatios(savedConfig.value?.pointControlRatios))
const hasFieldErrors = computed(() => Object.keys(fieldErrors.value).length > 0)

const draftRatios = computed(() => ({
  delivery: parsePercentDraft(draftText.value.delivery)
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
  submitSnapshotPolicy: 'save freezes parsed percent value for delivery',
  permissionBoundary: 'current demo admin console allows platform configuration read/write',
  feedbackBinding: 'field error toast plus aria-invalid/aria-describedby; save/load results as toast',
  responsivePolicy: 'single-column setting remains reachable without removing fields or actions',
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
    delivery: String(next.delivery)
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
    message.error(statusMessage.value)
  } finally {
    loading.value = false
  }
}

function restoreSaved() {
  setDraftFromRatios(savedRatios.value)
  statusKind.value = 'success'
  statusMessage.value = '已恢复到当前保存值'
  message.success(statusMessage.value)
}

async function saveConfig() {
  if (!savedConfig.value || isSaving.value) return
  statusMessage.value = ''
  if (!validateDraft()) {
    statusKind.value = 'warning'
    statusMessage.value = '请修正表单错误后再保存。'
    message.error(Object.values(fieldErrors.value).join(' ') || statusMessage.value)
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
      message.success(statusMessage.value)
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
    }
  } catch (error) {
    statusKind.value = 'error'
    statusMessage.value = `保存失败：${error?.message || '未知错误'}`
    message.error(statusMessage.value)
  } finally {
    isSaving.value = false
  }
}

onMounted(loadConfig)
</script>

<template>
  <PageShell title="点控配置" class="point-control-config" :style="{ paddingBottom: 0 }">
    <template #description>
      <TypographyText type="secondary">配置交割点控的控制力度，当前值按输赢比例百分比保存。保存后，交割合约用户点控将按当前比例读取配置；已打开的草稿需重新保存后才会使用新值。</TypographyText>
    </template>

    <Card v-if="loading" :bordered="false"><Skeleton active :paragraph="{ rows: 3 }" /></Card>

    <template v-else>
      <Card title="输赢比例" :bordered="false">
        <Form layout="vertical" name="point-control-config" :model="draftText" @finish="saveConfig">
          <Row :gutter="24">
            <Col v-for="field in CONTROL_FIELDS" :key="field.key" :xs="24" :lg="8">
              <FormItem :label="field.label" :validate-status="fieldErrors[field.key] ? 'error' : undefined">
                <Input :id="`point-control-${field.key}-ratio`" v-model:value="draftText[field.key]" inputmode="decimal" suffix="%" class="font-mono" :aria-invalid="fieldErrors[field.key] ? 'true' : 'false'" :aria-describedby="fieldDescribedBy(field)" placeholder="例如：50" />
                <template #extra><span :id="`point-control-${field.key}-help`">{{ field.help }}</span></template>
                <FeedbackToast v-if="fieldErrors[field.key]" :id="`point-control-${field.key}-error`" type="error" :source="() => (fieldErrors[field.key]) ? (fieldErrors[field.key]) : ''"></FeedbackToast>
              </FormItem>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card title="当前生效配置" :bordered="false">
        <Descriptions :column="{ xs: 1, md: 3 }">
          <DescriptionsItem v-for="field in CONTROL_FIELDS" :key="`${field.key}-saved`" :label="`${field.label}当前生效值`">
            <span class="font-mono">{{ formatPercentValue(savedRatios[field.key]) }}%</span>
          </DescriptionsItem>
        </Descriptions>
        <span class="sr-only">{{ JSON.stringify(pointControlSettingsState) }}</span>
        <span class="sr-only">{{ JSON.stringify(numericInputState) }}</span>
        <span v-if="hasFieldErrors" class="sr-only">点控配置存在字段错误，请修正后保存。</span>
      </Card>

      <Card class="point-control-footer" :bordered="false" :body-style="{ padding: '12px 24px' }">
        <div class="point-control-actions">
          <Space :size="8" wrap>
            <Button :disabled="isSaving || !isDirty" @click="restoreSaved">恢复已保存</Button>
            <Button type="primary" :loading="isSaving" :disabled="!isDirty" :aria-busy="isSaving ? 'true' : 'false'" @click="saveConfig">保存配置</Button>
          </Space>
        </div>
      </Card>
    </template>
  </PageShell>
</template>

<style scoped>
.point-control-footer { position: sticky; bottom: 0; z-index: 10; }
.point-control-actions { display: flex; justify-content: flex-end; padding-bottom: env(safe-area-inset-bottom); }
</style>
