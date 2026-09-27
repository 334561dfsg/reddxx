<script setup>
import { computed, reactive, ref } from 'vue'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import {
  FEE_TEMPLATE_TYPE
} from '../../../admin/constants/assets'
import { createFeeTemplatesMock } from '../../../admin/mock/assets'
import { getActiveVipLevels } from '../../../admin/mock/vip'

const statusTab = ref('all')
const search = ref('')
const showEditModal = ref(false)
const editingId = ref('')

// 分页相关
const currentPage = ref(1)
const pageSize = ref(5)

// MFA 验证相关
const showMfaModal = ref(false)
const pendingSaveData = ref(null)
const mfaLoading = ref(false)

const feeTemplates = ref(createFeeTemplatesMock())

// 费率模板表单
const templateForm = reactive({
  name: '',
  type: FEE_TEMPLATE_TYPE.STANDARD,
  description: '',
  baseMarkup: { buy: 0.005, sell: 0.005 },
  userLevelRates: {},
  enabled: true
})

const filteredTemplates = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return feeTemplates.value.filter((template) => {
    const hitStatus = statusTab.value === 'all' || 
      (statusTab.value === 'enabled' && template.enabled) || 
      (statusTab.value === 'disabled' && !template.enabled)
    const hitKeyword = !kw || `${template.name} ${template.description}`.toLowerCase().includes(kw)
    return hitStatus && hitKeyword
  })
})

const totalPages = computed(() => Math.ceil(filteredTemplates.value.length / pageSize.value))
const pagedTemplates = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredTemplates.value.slice(start, start + pageSize.value)
})

const goPrev = () => {
  if (currentPage.value > 1) currentPage.value--
}
const goNext = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

// 当搜索或筛选状态改变时，重置页码
const handleFilterChange = () => {
  currentPage.value = 1
}

const enabledTemplatesCount = computed(() => feeTemplates.value.filter((t) => t.enabled).length)
const activeVipLevels = computed(() => getActiveVipLevels().slice().sort((a, b) => a.level - b.level))

const templatePreviewLevelEntries = computed(() => {
  const rates = templateForm.userLevelRates || {}
  const byVip = activeVipLevels.value
    .map((vip) => {
      const key = `vip${vip.level}`
      return rates[key] ? [key, rates[key]] : null
    })
    .filter(Boolean)
  const has = new Set(byVip.map(([key]) => key))
  const rest = Object.entries(rates).filter(([key]) => !has.has(key))
  return [...byVip, ...rest]
})

const getTemplateLevelEntries = (template) => {
  const rates = template?.userLevelRates || {}
  const byVip = activeVipLevels.value
    .map((vip) => {
      const key = `vip${vip.level}`
      return rates[key] ? [key, rates[key]] : null
    })
    .filter(Boolean)
  const has = new Set(byVip.map(([key]) => key))
  const rest = Object.entries(rates).filter(([key]) => !has.has(key))
  return [...byVip, ...rest]
}

const TEMPLATE_LEVEL_PREVIEW_LIMIT = 5
const templateLevelsExpandedMap = ref({})
const templatePreviewExpanded = ref(false)

const isTemplateLevelsExpanded = (templateId) => Boolean(templateLevelsExpandedMap.value[templateId])

const toggleTemplateLevelsExpand = (templateId) => {
  templateLevelsExpandedMap.value = {
    ...templateLevelsExpandedMap.value,
    [templateId]: !templateLevelsExpandedMap.value[templateId]
  }
}

const getVisibleTemplateLevelEntries = (template) => {
  const entries = getTemplateLevelEntries(template)
  if (isTemplateLevelsExpanded(template.id)) return entries
  return entries.slice(0, TEMPLATE_LEVEL_PREVIEW_LIMIT)
}

const hasMoreTemplateLevels = (template) => getTemplateLevelEntries(template).length > TEMPLATE_LEVEL_PREVIEW_LIMIT

const getVisibleTemplatePreviewLevelEntries = () => {
  if (templatePreviewExpanded.value) return templatePreviewLevelEntries.value
  return templatePreviewLevelEntries.value.slice(0, TEMPLATE_LEVEL_PREVIEW_LIMIT)
}

const hasMoreTemplatePreviewLevels = computed(() => templatePreviewLevelEntries.value.length > TEMPLATE_LEVEL_PREVIEW_LIMIT)

// ========== 通用方法 ==========
const getVipLevelNumber = (level) => {
  const match = String(level || '').toLowerCase().match(/^vip(\d+)$/)
  return match ? Number(match[1]) : null
}

const sortVipLevels = (levels) => {
  return [...levels].sort((a, b) => {
    const aNum = getVipLevelNumber(a)
    const bNum = getVipLevelNumber(b)
    if (aNum !== null && bNum !== null) return aNum - bNum
    if (aNum !== null) return -1
    if (bNum !== null) return 1
    return String(a).localeCompare(String(b))
  })
}

const defaultVipRateFactor = (index) => Math.max(0.2, 1 - index * 0.2)

const normalizeVipLevelRates = (levelRates, baseMarkup = templateForm.baseMarkup) => {
  const baseBuy = Number(baseMarkup.buy) || 0
  const baseSell = Number(baseMarkup.sell) || 0
  const entries = Object.entries(levelRates || {})

  if (!entries.length) {
    return {
      vip0: { buy: baseBuy, sell: baseSell }
    }
  }

  const normalized = {}
  let nextIndex = 0

  sortVipLevels(entries.map(([level]) => level)).forEach((level) => {
    const origin = levelRates[level] || {}
    const vipIndex = getVipLevelNumber(level) ?? nextIndex
    const key = `vip${vipIndex}`
    normalized[key] = {
      buy: Number(origin.buy) || 0,
      sell: Number(origin.sell) || 0
    }
    nextIndex = Math.max(nextIndex, vipIndex + 1)
  })

  return normalized
}

const syncVipLevelRatesWithModule = (levelRates = {}, baseMarkup = templateForm.baseMarkup) => {
  const normalized = normalizeVipLevelRates(levelRates, baseMarkup)
  const baseBuy = Number(baseMarkup.buy) || 0
  const baseSell = Number(baseMarkup.sell) || 0

  return activeVipLevels.value.reduce((acc, vip, index) => {
    const key = `vip${vip.level}`
    const fallbackByOrder = normalized[`vip${index}`] || normalized[`vip${index + 1}`]
    const fallback = normalized[key] || fallbackByOrder
    const factor = defaultVipRateFactor(index)
    acc[key] = {
      buy: Number((Number(fallback?.buy ?? baseBuy * factor) || 0).toFixed(6)),
      sell: Number((Number(fallback?.sell ?? baseSell * factor) || 0).toFixed(6))
    }
    return acc
  }, {})
}

const cloneTemplateToForm = (template) => {
  templateForm.name = template.name
  templateForm.type = template.type
  templateForm.description = template.description
  templateForm.baseMarkup = JSON.parse(JSON.stringify(template.baseMarkup))
  templateForm.userLevelRates = syncVipLevelRatesWithModule(JSON.parse(JSON.stringify(template.userLevelRates)), template.baseMarkup)
  templateForm.enabled = template.enabled
}

const initUserLevelRates = () => {
  templateForm.userLevelRates = syncVipLevelRatesWithModule({}, templateForm.baseMarkup)
}

const vipLevelLabel = (level) => {
  const number = getVipLevelNumber(level)
  const meta = activeVipLevels.value.find((vip) => vip.level === number)
  if (meta) {
    return meta.displayName ? `${meta.name}（${meta.displayName}）` : meta.name
  }
  return number !== null ? `VIP ${number}` : String(level || '').toUpperCase()
}

// ========== 费率模板操作 ==========
const openEditTemplate = (template) => {
  editingId.value = template.id
  cloneTemplateToForm(template)
  templatePreviewExpanded.value = false
  showEditModal.value = true
}

const openCreateTemplate = () => {
  editingId.value = ''
  Object.assign(templateForm, {
    name: '',
    type: FEE_TEMPLATE_TYPE.STANDARD,
    description: '',
    baseMarkup: { buy: 0.005, sell: 0.005 },
    userLevelRates: {},
    enabled: true
  })
  initUserLevelRates()
  templatePreviewExpanded.value = false
  showEditModal.value = true
}

const updateBaseMarkup = () => {
  initUserLevelRates()
}

const saveTemplate = () => {
  const payload = {
    name: templateForm.name.trim(),
    type: templateForm.type,
    description: templateForm.description.trim(),
    baseMarkup: {
      buy: Number(templateForm.baseMarkup.buy),
      sell: Number(templateForm.baseMarkup.sell)
    },
    userLevelRates: templateForm.userLevelRates,
    enabled: Boolean(templateForm.enabled),
    updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
  }

  pendingSaveData.value = payload
  showMfaModal.value = true
}

// ========== MFA 验证处理 ==========
const handleMfaVerify = async (code) => {
  mfaLoading.value = true
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (pendingSaveData.value) {
      // 保存费率模板
      if (editingId.value) {
        const template = feeTemplates.value.find(t => t.id === editingId.value)
        Object.assign(template, {
          ...pendingSaveData.value,
          usageCount: template.usageCount
        })
      } else {
        feeTemplates.value.unshift({ 
          id: `template-${Date.now()}`, 
          ...pendingSaveData.value,
          usageCount: 0,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
        })
      }

      showEditModal.value = false
      pendingSaveData.value = null
      showMfaModal.value = false
      alert('费率模板保存成功！')
    }
  } catch (error) {
    alert('MFA 验证失败：' + (error.message || '请稍后重试'))
  } finally {
    mfaLoading.value = false
  }
}
</script>

<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">费率模板管理</h1>
        <p class="mt-1 text-sm text-slate-500">管理用于闪兑汇率的可复用手续费和 VIP 分级费率模板</p>
      </div>
      <a-button html-type="button" class="inline-flex items-center gap-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700" @click="openCreateTemplate()" type="primary">
        <span class="text-base">+</span>
        <span>新增模板</span>
      </a-button>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4">
        <div class="flex flex-wrap items-center gap-4">
          <!-- Status Filter -->
          <div class="inline-flex items-center gap-2 text-sm">
            <a-button html-type="button" class="font-medium" :class="statusTab === 'all' ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = 'all'; handleFilterChange()">全部</a-button>
            <a-button html-type="button" class="font-medium" :class="statusTab === 'enabled' ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = 'enabled'; handleFilterChange()">已启用</a-button>
            <a-button html-type="button" class="font-medium" :class="statusTab === 'disabled' ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = 'disabled'; handleFilterChange()">已禁用</a-button>
          </div>
        </div>

        <!-- Search -->
        <div class="flex w-full max-w-2xl flex-wrap items-center justify-end gap-2">
          <div class="relative w-full max-w-sm">
            <a-input v-model:value="search" type="text" class="w-full pl-9 pr-3" placeholder="搜索模板名称..." @input="handleFilterChange" />
            <svg viewBox="0 0 20 20" class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none">
              <circle cx="9" cy="9" r="5.8" stroke="currentColor" stroke-width="1.6" />
              <path d="M13.6 13.6L16.4 16.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 费率模板内容 -->
      <div class="space-y-4 p-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200">
          <p class="text-sm text-slate-600">
            启用模板：<span class="font-semibold text-blue-600">{{ enabledTemplatesCount }}</span> / {{ feeTemplates.length }}
          </p>
        </div>

        <article
          v-for="template in pagedTemplates"
          :key="template.id"
          class="rounded-xl border border-slate-200 bg-white p-4 transition-colors"
          :class="template.enabled ? 'hover:border-emerald-200 hover:bg-emerald-50/30' : 'hover:border-slate-300 hover:bg-slate-50'"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-xl font-semibold leading-none text-slate-900">{{ template.name }}</h3>
                <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="template.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'">{{ template.enabled ? '已启用' : '已禁用' }}</span>
              </div>
              <p class="text-sm text-slate-600">{{ template.description || '—' }}</p>
              <p class="text-xs text-slate-400">最后更新：{{ template.updatedAt }}</p>
            </div>
            <a-button html-type="button" class="shrink-0 border border-slate-200 text-sm text-slate-700 hover:bg-slate-50" @click="openEditTemplate(template)">编辑</a-button>
          </div>

          <div class="mt-4 grid gap-3 lg:grid-cols-2">
            <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p class="text-xs font-semibold text-emerald-900">基础费率设置</p>
              <div class="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div class="rounded border border-emerald-100 bg-white px-2.5 py-2">
                  <p class="text-slate-500">回兑费率 (目标币 → 基础币, Q→B)</p>
                  <p class="mt-1 font-semibold text-emerald-600">{{ ((Number(template.baseMarkup.buy) || 0) * 100).toFixed(2) }}%</p>
                </div>
                <div class="rounded border border-emerald-100 bg-white px-2.5 py-2">
                  <p class="text-slate-500">兑换费率 (基础币 → 目标币, B→Q)</p>
                  <p class="mt-1 font-semibold text-rose-600">{{ ((Number(template.baseMarkup.sell) || 0) * 100).toFixed(2) }}%</p>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-violet-200 bg-violet-50 p-3">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold text-violet-900">VIP 分级费率设置</p>
                <span class="text-xs text-violet-700">共 {{ getTemplateLevelEntries(template).length }} 级</span>
              </div>
              <div class="mt-2 space-y-1.5">
                <div v-if="getTemplateLevelEntries(template).length === 0" class="rounded border border-dashed border-violet-200 bg-white px-2.5 py-2 text-xs text-slate-500">
                  暂无分级费率
                </div>
                <div v-for="([level, rates]) in getVisibleTemplateLevelEntries(template)" :key="`${template.id}-${level}`" class="flex items-center justify-between rounded border border-violet-100 bg-white px-2.5 py-2 text-xs">
                  <span class="font-medium text-slate-700">{{ vipLevelLabel(level) }}</span>
                  <span class="text-slate-500">回兑 {{ ((Number(rates.buy) || 0) * 100).toFixed(2) }}% / 兑换 {{ ((Number(rates.sell) || 0) * 100).toFixed(2) }}%</span>
                </div>
                <a-button v-if="hasMoreTemplateLevels(template)" html-type="button" class="w-full border border-violet-200 bg-white text-xs font-medium text-violet-700 transition hover:bg-violet-100" @click="toggleTemplateLevelsExpand(template.id)">
                  {{ isTemplateLevelsExpanded(template.id) ? '收起' : `展开剩余 ${getTemplateLevelEntries(template).length - TEMPLATE_LEVEL_PREVIEW_LIMIT} 级` }}
                </a-button>
              </div>
            </div>
          </div>
        </article>

        <div v-if="filteredTemplates.length === 0" class="p-12 text-center text-slate-500">
          未找到匹配的费率模板
        </div>
      </div>

      <!-- 分页栏 -->
      <footer v-if="totalPages > 1" class="flex items-center justify-between border-t border-slate-200 px-6 py-4 text-sm">
        <p class="text-slate-500">共 {{ filteredTemplates.length }} 个模板</p>
        <a-pagination  size="small" :current="currentPage" :page-size="pageSize" :total="filteredTemplates.length" :show-size-changer="false"  @change="currentPage = $event" />
      </footer>
    </article>
  </section>

  <!-- 编辑/新增弹窗 -->
  <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showEditModal)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="showEditModal = false"><template #title><template v-if="showEditModal"><header class="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-violet-50 to-blue-50 px-6 py-4">
          <div>
            <h2 class="text-xl font-semibold text-slate-900">{{ editingId ? '编辑费率模板' : '新增费率模板' }}</h2>
            <p class="mt-0.5 text-xs text-slate-500">左侧配置模板参数，右侧实时预览效果</p>
          </div>
          <a-button aria-label="关闭" html-type="button" class="text-2xl text-slate-400 transition-colors hover:text-slate-600" @click="showEditModal = false">×</a-button>
        </header></template></template><template v-if="showEditModal"><div class="grid gap-4 lg:grid-cols-[3fr_2fr]"><div class="min-w-0"><div class="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-base font-semibold text-slate-900">基本信息</h3>
            </div>

            <div class="grid gap-3.5 md:grid-cols-2">
              <label class="space-y-1.5 md:col-span-2">
                <span class="text-sm font-medium text-slate-700">模板名称</span>
                <a-input v-model:value="templateForm.name" type="text" placeholder="如：标准费率模板" class="w-full transition" />
              </label>
              <label class="space-y-1.5 md:col-span-2">
                <span class="text-sm font-medium text-slate-700">描述说明</span>
                <a-input v-model:value="templateForm.description" type="text" placeholder="模板适用场景说明" class="w-full transition" />
              </label>
              <label class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm md:col-span-2">
                <span class="text-slate-700">启用该模板</span>
                <a-checkbox v-model:checked="templateForm.enabled" class="w-4" />
              </label>
            </div>
          </section>

          <section class="space-y-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-sm">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4V9m3 8V7M4 19h16" />
                </svg>
              </div>
              <h3 class="text-base font-semibold text-slate-900">基础费率设置</h3>
            </div>

            <div class="grid gap-3.5 md:grid-cols-2 rounded-lg bg-white p-4">
              <label class="space-y-1.5">
                  <span class="text-sm font-medium text-slate-700">回兑费率加成 (目标币 → 基础币, %)</span>
                  <a-input type="number" step="0.001" @input="updateBaseMarkup" class="w-full transition" :value="templateForm.baseMarkup.buy" @update:value="templateForm.baseMarkup.buy = $event === '' ? '' : Number($event)" />
                </label>
                <label class="space-y-1.5">
                  <span class="text-sm font-medium text-slate-700">兑换费率加成 (基础币 → 目标币, %)</span>
                  <a-input type="number" step="0.001" @input="updateBaseMarkup" class="w-full transition" :value="templateForm.baseMarkup.sell" @update:value="templateForm.baseMarkup.sell = $event === '' ? '' : Number($event)" />
                </label>
            </div>
          </section>

          <section class="space-y-4 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
                  <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001-1.51h.01a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                </div>
                <h3 class="text-base font-semibold text-slate-900">VIP 分级费率设置</h3>
              </div>
              <a-button html-type="button" class="border border-violet-200 bg-white text-xs text-violet-700 hover:bg-violet-50" @click="initUserLevelRates">按VIP模块重置</a-button>
            </div>

            <div v-if="activeVipLevels.length === 0" class="rounded-md border border-dashed border-violet-200 bg-white p-3 text-xs text-slate-500">
              VIP 模块暂无可用等级，请先在 VIP 配置中启用等级
            </div>
            <div v-else class="space-y-3">
              <div v-for="vip in activeVipLevels" :key="vip.id" class="rounded-lg border border-violet-100 bg-white p-4">
                <div class="mb-3 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">VIP {{ vip.level }}</span>
                    <span class="text-sm font-medium text-slate-700">{{ vip.displayName ? `${vip.name}（${vip.displayName}）` : vip.name }}</span>
                  </div>
                </div>
                <div class="grid gap-3 md:grid-cols-2">
                  <label class="space-y-1.5">
                    <span class="text-xs text-slate-600">回兑费率 (%)</span>
                    <a-input type="number" step="0.001" class="w-full transition" :value="templateForm.userLevelRates[`vip${vip.level}`].buy" @update:value="templateForm.userLevelRates[`vip${vip.level}`].buy = $event === '' ? '' : Number($event)" />
                  </label>
                  <label class="space-y-1.5">
                    <span class="text-xs text-slate-600">兑换费率 (%)</span>
                    <a-input type="number" step="0.001" class="w-full transition" :value="templateForm.userLevelRates[`vip${vip.level}`].sell" @update:value="templateForm.userLevelRates[`vip${vip.level}`].sell = $event === '' ? '' : Number($event)" />
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div></div><div class="flex min-w-0 flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <header class="border-b border-slate-200 px-5 py-4">
          <h3 class="text-lg font-semibold text-slate-900">实时预览</h3>
          <p class="mt-0.5 text-xs text-slate-500">调整左侧配置后即时更新模板效果</p>
        </header>

        <div class="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-slate-900">模板概览</h4>
              <span class="rounded-md px-2 py-1 text-xs font-medium" :class="templateForm.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'">
                {{ templateForm.enabled ? '已启用' : '已禁用' }}
              </span>
            </div>
            <div class="mt-3 space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-slate-500">模板名称</span>
                <span class="font-medium text-slate-900">{{ templateForm.name || '未命名模板' }}</span>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h4 class="text-sm font-semibold text-emerald-900">基础费率预览</h4>
            <div class="mt-3 rounded-md border border-emerald-100 bg-white p-3 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-slate-500">回兑费率 (Q→B)</span>
                <span class="font-semibold text-emerald-600">{{ ((Number(templateForm.baseMarkup.buy) || 0) * 100).toFixed(2) }}%</span>
              </div>
              <div class="mt-2 flex items-center justify-between">
                <span class="text-slate-500">兑换费率 (B→Q)</span>
                <span class="font-semibold text-rose-600">{{ ((Number(templateForm.baseMarkup.sell) || 0) * 100).toFixed(2) }}%</span>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-violet-200 bg-violet-50 p-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-violet-900">VIP 分级费率预览</h4>
              <span class="text-xs text-violet-700">共 {{ templatePreviewLevelEntries.length }} 级</span>
            </div>
            <div class="mt-3 space-y-2">
              <div v-if="templatePreviewLevelEntries.length === 0" class="rounded-md border border-dashed border-violet-200 bg-white p-3 text-xs text-slate-500">
                暂无分级费率数据
              </div>
              <div v-for="([level, rates]) in getVisibleTemplatePreviewLevelEntries()" :key="level" class="rounded-md border border-violet-100 bg-white p-3 text-xs">
                  <div class="flex items-center justify-between">
                    <span class="font-semibold text-slate-700">{{ vipLevelLabel(level) }}</span>
                    <span class="text-slate-500">回兑 {{ ((Number(rates.buy) || 0) * 100).toFixed(2) }}% / 兑换 {{ ((Number(rates.sell) || 0) * 100).toFixed(2) }}%</span>
                  </div>
                </div>
              <a-button v-if="hasMoreTemplatePreviewLevels" html-type="button" class="w-full border border-violet-200 bg-white text-xs font-medium text-violet-700 transition hover:bg-violet-100" @click="templatePreviewExpanded = !templatePreviewExpanded">
                {{ templatePreviewExpanded ? '收起' : `展开剩余 ${templatePreviewLevelEntries.length - TEMPLATE_LEVEL_PREVIEW_LIMIT} 级` }}
              </a-button>
            </div>
          </div>
        </div>
      </div></div></template><template #footer><template v-if="showEditModal"><footer class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <a-button html-type="button" class="border border-slate-300 text-sm font-medium text-slate-700 transition hover:bg-white" @click="showEditModal = false">取消</a-button>
          <a-button html-type="button" class="bg-violet-600 text-sm font-medium text-white transition hover:bg-violet-700" @click="saveTemplate()" type="primary">保存模板</a-button>
        </footer></template></template></a-modal>

  <!-- MFA 验证弹窗 -->
  <MfaVerificationModal
    v-model:open="showMfaModal"
    :loading="mfaLoading"
    title="安全验证"
    description="编辑费率模板属于敏感操作，请输入 MFA 验证码"
    @verify="handleMfaVerify"
    @cancel="pendingSaveData = null"
  />
</template>
