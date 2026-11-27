<script setup>
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
// 模拟账户配置 — Ant Design Pro config page (2026-11-28): PageShell title, grouped Cards with an Ant Form and a sticky
// bottom action bar (重置 restores the saved values, 保存配置 saves). Status text moved to toasts.
import { computed, onMounted, ref } from 'vue'
import { Button, Card, Col, Descriptions, DescriptionsItem, Form, FormItem, Input, Row, Skeleton, Space, TypographyText, message } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import {
  DEFAULT_SITE_CONFIG,
  normalizeFrontDemoAccountAssetConfig,
  siteConfigApi
} from '../../../admin/mock/siteConfig'

const loading = ref(true)
const isSaving = ref(false)
const savedConfig = ref(null)
const statusMessage = ref('')
const fieldErrors = ref({})
const draftText = ref({
  claimAmountUsd: '',
  monthlyClaimLimit: ''
})

const savedDemoConfig = computed(() => (
  normalizeFrontDemoAccountAssetConfig(savedConfig.value?.demoAccountAsset)
))

const draftConfig = computed(() => ({
  claimAmountUsd: parseMoneyDraft(draftText.value.claimAmountUsd),
  monthlyClaimLimit: parseCountDraft(draftText.value.monthlyClaimLimit),
  currency: 'USDT'
}))

const isDirty = computed(() => {
  const saved = savedDemoConfig.value
  return (
    normalizeAmountText(draftText.value.claimAmountUsd) !== String(saved.claimAmountUsd) ||
    normalizeCountText(draftText.value.monthlyClaimLimit) !== String(saved.monthlyClaimLimit)
  )
})

const demoAccountSettingsState = computed(() => ({
  settingsOwnerId: 'admin-platform-demo-account-config',
  settingsScope: 'platform-demo-account',
  applyMode: 'explicit-save',
  draftSettings: {
    claimAmountUsdText: draftText.value.claimAmountUsd,
    monthlyClaimLimitText: draftText.value.monthlyClaimLimit
  },
  savedSettings: savedDemoConfig.value,
  effectiveSettings: savedDemoConfig.value,
  defaultSettings: DEFAULT_SITE_CONFIG.demoAccountAsset,
  dirtyState: {
    dirty: isDirty.value,
    canSave: isDirty.value && !isSaving.value,
    canRestoreSaved: isDirty.value && !isSaving.value
  },
  resetPolicy: {
    restoreSaved: '重置按钮恢复为已保存配置',
    resetDefault: '当前页面不提供独立恢复默认入口'
  },
  permissionBoundary: '当前演示管理台默认允许平台配置管理员读写',
  resultReceipt: statusMessage.value,
  responsivePolicy: '窄屏单列展示金额与次数字段，不删除保存和恢复操作'
}))

function normalizeAmountText(value) {
  return String(value || '').replace(/,/g, '').trim()
}

function normalizeCountText(value) {
  return String(value || '').replace(/,/g, '').trim()
}

function parseMoneyDraft(value) {
  const normalized = normalizeAmountText(value)
  if (!normalized) return NaN
  return Number(normalized)
}

function parseCountDraft(value) {
  const normalized = normalizeCountText(value)
  if (!normalized) return NaN
  return Number(normalized)
}

function setDraftFromConfig(value) {
  const next = normalizeFrontDemoAccountAssetConfig(value)
  draftText.value = {
    claimAmountUsd: String(next.claimAmountUsd),
    monthlyClaimLimit: String(next.monthlyClaimLimit)
  }
  fieldErrors.value = {}
}

function validateDraft() {
  const nextErrors = {}
  const amount = parseMoneyDraft(draftText.value.claimAmountUsd)
  const limit = parseCountDraft(draftText.value.monthlyClaimLimit)

  if (!Number.isFinite(amount) || amount <= 0) {
    nextErrors.claimAmountUsd = '请输入大于 0 的每次获取金额。'
  } else if (Math.round(amount * 100) !== amount * 100) {
    nextErrors.claimAmountUsd = '每次获取金额最多支持 2 位小数。'
  }

  if (!Number.isFinite(limit) || limit < 0 || !Number.isInteger(limit)) {
    nextErrors.monthlyClaimLimit = '请输入不小于 0 的整数次数。'
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
        demoAccountAsset: normalizeFrontDemoAccountAssetConfig(result.data.demoAccountAsset)
      }
      setDraftFromConfig(savedConfig.value.demoAccountAsset)
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
  statusMessage.value = ''
  if (!validateDraft()) {
    statusMessage.value = '请修正表单错误后再保存。'
    message.error([fieldErrors.value.claimAmountUsd, fieldErrors.value.monthlyClaimLimit].filter(Boolean).join(' ') || statusMessage.value)
    return
  }

  isSaving.value = true
  try {
    const nextDemoConfig = normalizeFrontDemoAccountAssetConfig(draftConfig.value)
    const next = {
      ...savedConfig.value,
      demoAccountAsset: nextDemoConfig
    }
    const result = await siteConfigApi.updateSiteConfig(next)
    if (result.success) {
      savedConfig.value = {
        ...next,
        demoAccountAsset: nextDemoConfig
      }
      setDraftFromConfig(nextDemoConfig)
      statusMessage.value = '模拟账户配置已保存'
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
  if (isSaving.value) return
  setDraftFromConfig(savedDemoConfig.value)
  statusMessage.value = ''
}

onMounted(loadConfig)
</script>

<template>
  <PageShell title="模拟账户配置" class="demo-account-config" :style="{ paddingBottom: 0 }">
    <template #description>
      <TypographyText type="secondary">配置前台模拟账户获取资金的单次金额和月度次数限制。保存后，前台模拟账户点击“获取资产”会按这里的金额到账，并按自然月统计可获取次数。</TypographyText>
    </template>

    <Card v-if="loading" :bordered="false"><Skeleton active :paragraph="{ rows: 4 }" /></Card>

    <template v-else>
      <Card title="领取规则" :bordered="false">
        <Form layout="vertical" name="demo-account-config" :model="draftText" @finish="saveConfig">
          <Row :gutter="24" class="demo-account-fields">
            <Col :xs="24" :lg="12">
              <FormItem label="每次获取金额" :validate-status="fieldErrors.claimAmountUsd ? 'error' : undefined" extra="资金单位固定为 USDT，最多支持 2 位小数。">
                <Input id="demo-claim-amount" v-model:value="draftText.claimAmountUsd" inputmode="decimal" suffix="USDT" class="font-mono" :aria-invalid="Boolean(fieldErrors.claimAmountUsd)" aria-describedby="demo-claim-amount-error" placeholder="例如：500000" />
                <FeedbackToast v-if="fieldErrors.claimAmountUsd" id="demo-claim-amount-error" type="error" :source="() => (fieldErrors.claimAmountUsd) ? (fieldErrors.claimAmountUsd) : ''"></FeedbackToast>
              </FormItem>
            </Col>
            <Col :xs="24" :lg="12">
              <FormItem label="每月获取次数" :validate-status="fieldErrors.monthlyClaimLimit ? 'error' : undefined" extra="按用户和自然月统计；填 0 表示本月不可获取。">
                <Input id="demo-monthly-claim-limit" v-model:value="draftText.monthlyClaimLimit" inputmode="numeric" suffix="次" class="font-mono" :aria-invalid="Boolean(fieldErrors.monthlyClaimLimit)" aria-describedby="demo-monthly-claim-limit-error" placeholder="例如：3" />
                <FeedbackToast v-if="fieldErrors.monthlyClaimLimit" id="demo-monthly-claim-limit-error" type="error" :source="() => (fieldErrors.monthlyClaimLimit) ? (fieldErrors.monthlyClaimLimit) : ''"></FeedbackToast>
              </FormItem>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card title="当前生效配置" :bordered="false">
        <Descriptions :column="{ xs: 1, md: 3 }">
          <DescriptionsItem label="当前生效金额"><span class="font-mono">{{ savedDemoConfig.claimAmountUsd }} USDT</span></DescriptionsItem>
          <DescriptionsItem label="当前生效次数"><span class="font-mono">{{ savedDemoConfig.monthlyClaimLimit }} 次/月</span></DescriptionsItem>
          <DescriptionsItem label="生效方式">保存后前台刷新配置生效</DescriptionsItem>
        </Descriptions>
        <span class="sr-only">{{ JSON.stringify(demoAccountSettingsState) }}</span>
      </Card>

      <Card class="demo-account-footer" :bordered="false" :body-style="{ padding: '12px 24px' }">
        <div class="demo-account-actions">
          <Space :size="8" wrap>
            <Button :disabled="isSaving || !isDirty" @click="restoreSaved">重置</Button>
            <Button type="primary" :loading="isSaving" :disabled="!isDirty" @click="saveConfig">保存配置</Button>
          </Space>
        </div>
      </Card>
    </template>
  </PageShell>
</template>

<style scoped>
.demo-account-fields { max-width: 1100px; }
.demo-account-footer { position: sticky; bottom: 0; z-index: 10; }
.demo-account-actions { display: flex; justify-content: flex-end; padding-bottom: env(safe-area-inset-bottom); }
</style>
