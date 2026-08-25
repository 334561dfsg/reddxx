<script setup>
import { computed, onMounted, ref } from 'vue'
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
    restoreSaved: '当前页面不提供独立恢复入口',
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
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  if (!savedConfig.value || isSaving.value) return
  statusMessage.value = ''
  if (!validateDraft()) {
    statusMessage.value = '请修正表单错误后再保存。'
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
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
    }
  } catch (error) {
    statusMessage.value = `保存失败：${error?.message || '未知错误'}`
  } finally {
    isSaving.value = false
  }
}

onMounted(loadConfig)
</script>

<template>
  <main class="space-y-6" aria-labelledby="demo-account-config-title">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h1 id="demo-account-config-title" class="text-2xl font-bold text-slate-900">模拟账户配置</h1>
        <p class="mt-1 text-sm text-slate-500">
          配置前台模拟账户获取资金的单次金额和月度次数限制。
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
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

    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
      加载中…
    </div>

    <section v-else class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
        保存后，前台模拟账户点击“获取资产”会按这里的金额到账，并按自然月统计可获取次数。
      </div>

      <div
        v-if="statusMessage"
        class="mb-5 rounded-lg border px-4 py-3 text-sm"
        :class="Object.keys(fieldErrors).length ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'"
        role="status"
      >
        {{ statusMessage }}
      </div>

      <div class="grid gap-5 md:grid-cols-2">
        <div>
          <label for="demo-claim-amount" class="mb-2 block text-sm font-medium text-slate-700">
            每次获取金额
          </label>
          <div class="relative max-w-xl">
            <input
              id="demo-claim-amount"
              v-model="draftText.claimAmountUsd"
              type="text"
              inputmode="decimal"
              class="ant-input w-full pr-16 font-mono"
              :aria-invalid="Boolean(fieldErrors.claimAmountUsd)"
              aria-describedby="demo-claim-amount-help demo-claim-amount-error"
              placeholder="例如：500000"
            />
            <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">USDT</span>
          </div>
          <p id="demo-claim-amount-help" class="mt-1.5 text-xs text-slate-500">
            资金单位固定为 USDT，最多支持 2 位小数。
          </p>
          <p v-if="fieldErrors.claimAmountUsd" id="demo-claim-amount-error" class="mt-1.5 text-xs text-rose-600">
            {{ fieldErrors.claimAmountUsd }}
          </p>
        </div>

        <div>
          <label for="demo-monthly-claim-limit" class="mb-2 block text-sm font-medium text-slate-700">
            每月获取次数
          </label>
          <div class="relative max-w-xl">
            <input
              id="demo-monthly-claim-limit"
              v-model="draftText.monthlyClaimLimit"
              type="text"
              inputmode="numeric"
              class="ant-input w-full pr-12 font-mono"
              :aria-invalid="Boolean(fieldErrors.monthlyClaimLimit)"
              aria-describedby="demo-monthly-claim-limit-help demo-monthly-claim-limit-error"
              placeholder="例如：3"
            />
            <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">次</span>
          </div>
          <p id="demo-monthly-claim-limit-help" class="mt-1.5 text-xs text-slate-500">
            按用户和自然月统计；填 0 表示本月不可获取。
          </p>
          <p v-if="fieldErrors.monthlyClaimLimit" id="demo-monthly-claim-limit-error" class="mt-1.5 text-xs text-rose-600">
            {{ fieldErrors.monthlyClaimLimit }}
          </p>
        </div>
      </div>

      <dl class="mt-6 grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt class="text-xs text-slate-500">当前生效金额</dt>
          <dd class="mt-1 font-mono text-slate-900">{{ savedDemoConfig.claimAmountUsd }} USDT</dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500">当前生效次数</dt>
          <dd class="mt-1 font-mono text-slate-900">{{ savedDemoConfig.monthlyClaimLimit }} 次/月</dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500">生效方式</dt>
          <dd class="mt-1 text-slate-900">保存后前台刷新配置生效</dd>
        </div>
      </dl>

      <span class="sr-only">{{ JSON.stringify(demoAccountSettingsState) }}</span>
    </section>
  </main>
</template>
