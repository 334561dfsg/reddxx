<script setup>
import { computed, reactive, ref, watch } from 'vue'
import {
  PERPETUAL_COMMON_FILTER_ALL,
  PERPETUAL_STATUS
} from '../../../admin/constants/perpetual'
import {
  createPerpetualProductsMock,
  createPerpetualTemplatesMock,
  perpetualLeverageLevels,
  savePerpetualTemplatesMock
} from '../../../admin/mock/perpetual'

const statusTab = ref(PERPETUAL_COMMON_FILTER_ALL)
const search = ref('')

const pagination = reactive({
  currentPage: 1,
  pageSize: 5
})

const leverageLevels = perpetualLeverageLevels

const parseNumeric = (text) => String(text || '').replace(/[^0-9.]/g, '')

const templates = ref(createPerpetualTemplatesMock())
const products = ref(createPerpetualProductsMock())

const buildLeverageBadges = (levels = []) => {
  const visible = levels.slice(0, 6)
  const more = levels.length - visible.length
  return more > 0 ? [...visible, `+${more}`] : visible
}

const syncProductsWithTemplates = () => {
  products.value = products.value.map((item) => {
    const template = templates.value.find((tpl) => tpl.id === item.templateId) || templates.value.find((tpl) => tpl.name === item.templateName)
    if (!template) return item
    return {
      ...item,
      templateId: template.id,
      templateName: template.name,
      leverageRange: template.leverageRange,
      leverageBadges: buildLeverageBadges(template.levels)
    }
  })
}

const refreshTemplateUsage = () => {
  templates.value = templates.value.map((tpl) => {
    const linked = products.value.filter((item) => item.templateId === tpl.id)
    return {
      ...tpl,
      inUseCount: linked.length,
      contracts: linked.map((item) => item.name)
    }
  })
}

refreshTemplateUsage()

const filteredTemplates = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return templates.value.filter((item) => {
    const matchesStatus = statusTab.value === PERPETUAL_COMMON_FILTER_ALL || item.status === statusTab.value
    const matchesKeyword = !keyword || item.name.toLowerCase().includes(keyword)
    return matchesStatus && matchesKeyword
  })
})

const paginatedTemplates = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredTemplates.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredTemplates.value.length / pagination.pageSize))

watch([search, statusTab], () => {
  pagination.currentPage = 1
})

const showTemplateModal = ref(false)
const editingTemplateId = ref(null)
const newTemplateName = ref('')
const selectedLeverages = ref([])
const customLeverageInput = ref('')
const customLeverageError = ref('')
const activeTemplateTab = ref('leverage')
const templateOrderMode = ref('cost')
const templateContractFaceValueUsdt = ref(1000)
const templateMaintenanceMarginRate = ref(0.5)
const templateLiquidationFeeRate = ref(0)
const templateTradeLimitUnlimited = ref(false)

const toggleLeverage = (value) => {
  if (selectedLeverages.value.includes(value)) {
    selectedLeverages.value = selectedLeverages.value.filter((item) => item !== value)
    return
  }
  selectedLeverages.value = [...selectedLeverages.value, value].sort((a, b) => a - b)
}

const addCustomLeverage = () => {
  customLeverageError.value = ''
  if (String(customLeverageInput.value).trim() === '') {
    customLeverageError.value = '请输入杠杆倍数'
    return
  }

  const value = Number(customLeverageInput.value)
  if (!Number.isInteger(value) || value < 1 || value > 1000) {
    customLeverageError.value = '请输入 1–1000 的正整数'
    return
  }
  if (selectedLeverages.value.includes(value)) {
    customLeverageError.value = '该杠杆档位已存在'
    return
  }

  selectedLeverages.value = [...selectedLeverages.value, value].sort((a, b) => a - b)
  customLeverageInput.value = ''
}

const pickLeveragePack = (type) => {
  if (type === 'all') selectedLeverages.value = [...leverageLevels]
  if (type === 'clear') selectedLeverages.value = []
  if (type === 'low') selectedLeverages.value = leverageLevels.filter((item) => item <= 10)
  if (type === 'mid') selectedLeverages.value = leverageLevels.filter((item) => item >= 10 && item <= 50)
  if (type === 'high') selectedLeverages.value = leverageLevels.filter((item) => item >= 50)
}

const openCreateTemplate = () => {
  editingTemplateId.value = null
  newTemplateName.value = ''
  selectedLeverages.value = []
  customLeverageInput.value = ''
  customLeverageError.value = ''
  activeTemplateTab.value = 'leverage'
  templateOrderMode.value = 'cost'
  templateContractFaceValueUsdt.value = 1000
  templateMaintenanceMarginRate.value = 0.5
  templateLiquidationFeeRate.value = 0
  templateTradeLimitUnlimited.value = false
  showTemplateModal.value = true
}

const openEditTemplate = (template) => {
  editingTemplateId.value = template.id
  newTemplateName.value = template.name
  selectedLeverages.value = template.levels.map((item) => Number(parseNumeric(item))).filter((item) => Number.isFinite(item))
  customLeverageInput.value = ''
  customLeverageError.value = ''
  activeTemplateTab.value = 'leverage'
  templateOrderMode.value = template.orderMode ?? 'cost'
  templateContractFaceValueUsdt.value = Number(template.contractFaceValueUsdt ?? 1000)
  templateMaintenanceMarginRate.value = Number(template.maintenanceMarginRate ?? 0.5)
  templateLiquidationFeeRate.value = Number(template.liquidationFeeRate ?? 0)
  templateTradeLimitUnlimited.value = template.tradeLimitUnlimited === true
  showTemplateModal.value = true
}

const submitTemplate = () => {
  if (!newTemplateName.value.trim() || selectedLeverages.value.length === 0) return
  const payload = {
    name: newTemplateName.value.trim(),
    status: PERPETUAL_STATUS.ENABLED,
    leverageRange: `${Math.min(...selectedLeverages.value)}x - ${Math.max(...selectedLeverages.value)}x`,
    leverageCount: selectedLeverages.value.length,
    levels: selectedLeverages.value.map((item) => `${item}x`),
    orderMode: templateOrderMode.value,
    contractFaceValueUsdt: Number(templateContractFaceValueUsdt.value) || 1000,
    maintenanceMarginRate: Number(templateMaintenanceMarginRate.value) || 0.5,
    liquidationFeeRate: Number(templateLiquidationFeeRate.value) || 0,
    tradeLimitUnlimited: templateTradeLimitUnlimited.value === true
  }
  if (editingTemplateId.value) {
    templates.value = templates.value.map((item) => (item.id === editingTemplateId.value ? { ...item, ...payload } : item))
  } else {
    templates.value.unshift({
      id: `tpl-${Date.now()}`,
      ...payload,
      inUseCount: 0,
      contracts: []
    })
  }
  templates.value = savePerpetualTemplatesMock(templates.value)
  syncProductsWithTemplates()
  refreshTemplateUsage()
  showTemplateModal.value = false
  editingTemplateId.value = null
  newTemplateName.value = ''
  selectedLeverages.value = []
  customLeverageInput.value = ''
  customLeverageError.value = ''
  activeTemplateTab.value = 'leverage'
  templateOrderMode.value = 'cost'
  templateContractFaceValueUsdt.value = 1000
  templateMaintenanceMarginRate.value = 0.5
  templateLiquidationFeeRate.value = 0
  templateTradeLimitUnlimited.value = false
}
</script>

<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">杠杆模板管理</h1>
        <p class="mt-1 text-sm text-slate-500">管理永续合约可用的杠杆倍数档位模板</p>
      </div>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4">
        <div class="flex flex-wrap items-center gap-4">
          <div class="inline-flex items-center gap-2 text-sm">
            <button type="button" class="font-medium" :class="statusTab === PERPETUAL_COMMON_FILTER_ALL ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = PERPETUAL_COMMON_FILTER_ALL">全部</button>
            <button
              type="button"
              class="font-medium"
              :class="statusTab === PERPETUAL_STATUS.ENABLED ? 'text-blue-600' : 'text-slate-500'"
              @click="statusTab = PERPETUAL_STATUS.ENABLED"
            >
              已启用
            </button>
            <button
              type="button"
              class="font-medium"
              :class="statusTab === PERPETUAL_STATUS.DISABLED ? 'text-blue-600' : 'text-slate-500'"
              @click="statusTab = PERPETUAL_STATUS.DISABLED"
            >
              已禁用
            </button>
          </div>
        </div>

        <div class="flex w-full max-w-2xl flex-wrap items-center justify-end gap-2">
          <div class="relative w-full max-w-sm">
            <input
              v-model="search"
              type="text"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
              placeholder="搜索模板名称..."
            />
            <svg viewBox="0 0 20 20" class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none">
              <circle cx="9" cy="9" r="5.8" stroke="currentColor" stroke-width="1.6" />
              <path d="M13.6 13.6L16.4 16.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </div>
          <button
            type="button"
            class="ant-btn ant-btn-primary"
            @click="openCreateTemplate"
          >
            <span>+ 新增模板</span>
          </button>
        </div>
      </div>

      <div class="space-y-4 p-4">
        <article v-for="tpl in paginatedTemplates" :key="tpl.id" class="rounded-xl border border-slate-200 p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-semibold text-slate-900">{{ tpl.name }}</h3>
                <span class="rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{{ tpl.leverageCount }} 个档位</span>
                <span class="rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">{{ tpl.inUseCount }} 个合约使用中</span>
              </div>
              <p class="mt-3 text-sm text-slate-600">杠杆范围: <span class="font-medium text-slate-900">{{ tpl.leverageRange }}</span></p>
            </div>
            <button type="button" class="ant-btn !h-8 !px-3 " @click="openEditTemplate(tpl)">编辑模板</button>
          </div>

          <div class="mt-4">
            <p class="text-sm text-slate-500">可用杠杆档位:</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span v-for="lv in tpl.levels" :key="lv" class="rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">{{ lv }}</span>
            </div>
          </div>

          <div class="mt-4">
            <p class="text-sm text-slate-500">使用此模板的合约:</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span
                v-for="contract in tpl.contracts"
                :key="contract"
                class="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700"
              >
                {{ contract }}
              </span>
              <span v-if="tpl.contracts.length === 0" class="text-sm text-slate-400">暂无</span>
            </div>
          </div>
        </article>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <div class="text-sm text-slate-500">
            共 <span class="font-medium">{{ filteredTemplates.length }}</span> 个模板，第 <span class="font-medium">{{ pagination.currentPage }}</span> / <span class="font-medium">{{ totalPages }}</span> 页
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="ant-btn !h-8 !px-3 !text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              :disabled="pagination.currentPage === 1"
              @click="pagination.currentPage--"
            >
              上一页
            </button>
            <button
              type="button"
              class="ant-btn !h-8 !px-3 !text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              :disabled="pagination.currentPage === totalPages"
              @click="pagination.currentPage++"
            >
              下一页
            </button>
          </div>
        </div>

        <p v-if="filteredTemplates.length === 0" class="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">没有匹配的杠杆模板</p>
      </div>
    </article>
  </section>

  <div v-if="showTemplateModal" class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
    <section class="w-full max-w-3xl rounded-xl bg-white">
      <header class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 class="text-2xl font-semibold text-slate-900">{{ editingTemplateId ? '编辑杠杆模板' : '新增杠杆模板' }}</h2>
        <button type="button" class="text-2xl text-slate-400 hover:text-slate-700" @click="showTemplateModal = false">×</button>
      </header>

      <div class="space-y-5 px-6 py-5">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-slate-700">模板名称 <span class="text-rose-500">*</span></span>
          <input
            v-model="newTemplateName"
            type="text"
            class="ant-input"
            placeholder="请输入模板名称"
          />
        </label>

        <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            v-for="tab in [
              ['leverage', '杠杆档位'],
              ['contract', '合约模板'],
              ['trade', '交易']
            ]"
            :key="tab[0]"
            type="button"
            class="rounded-md px-4 py-2 text-sm font-medium transition"
            :class="activeTemplateTab === tab[0] ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
            @click="activeTemplateTab = tab[0]"
          >
            {{ tab[1] }}
          </button>
        </div>

        <div v-show="activeTemplateTab === 'leverage'" class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-slate-700">选择杠杆档位 <span class="text-rose-500">*</span></p>
            <p class="text-sm text-slate-500">已选择: <span class="font-semibold text-blue-600">{{ selectedLeverages.length }}</span> 个档位</p>
          </div>

          <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            <button
              v-for="lv in leverageLevels"
              :key="lv"
              type="button"
              class="rounded-lg border px-3 py-2 text-sm transition-all"
              :class="selectedLeverages.includes(lv) ? 'border-blue-300 bg-blue-50 font-medium text-blue-600 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
              "
              @click="toggleLeverage(lv)"
            >
              {{ lv }}x
            </button>
          </div>

          <div class="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label for="custom-leverage" class="block text-sm font-medium text-slate-700">手动添加倍数</label>
            <div class="flex gap-2">
              <div class="relative min-w-0 flex-1">
                <input
                  id="custom-leverage"
                  v-model="customLeverageInput"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  class="ant-input pr-8"
                  :class="customLeverageError ? '!border-rose-400' : ''"
                  placeholder="请输入 1–1000"
                  @input="customLeverageError = ''"
                  @keyup.enter="addCustomLeverage"
                />
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">x</span>
              </div>
              <button type="button" class="ant-btn ant-btn-primary shrink-0" @click="addCustomLeverage">添加</button>
            </div>
            <p v-if="customLeverageError" class="text-sm text-rose-500">{{ customLeverageError }}</p>
          </div>

          <div class="flex flex-wrap gap-2">
            <button type="button" class="ant-btn !h-8 !px-3 !text-xs" @click="pickLeveragePack('all')">全选</button>
            <button type="button" class="ant-btn !h-8 !px-3 !text-xs" @click="pickLeveragePack('clear')">清空</button>
            <button type="button" class="ant-btn !h-8 !px-3 !text-xs" @click="pickLeveragePack('low')">低杠杆 (1-10x)</button>
            <button type="button" class="ant-btn !h-8 !px-3 !text-xs" @click="pickLeveragePack('mid')">中等杠杆 (10-50x)</button>
            <button type="button" class="ant-btn !h-8 !px-3 !text-xs" @click="pickLeveragePack('high')">高杠杆 (50-125x)</button>
          </div>

          <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p class="font-medium text-slate-800">当前选择的杠杆档位</p>
            <div v-if="selectedLeverages.length" class="mt-2 flex flex-wrap gap-2">
              <div
                v-for="lv in selectedLeverages"
                :key="`picked-${lv}`"
                class="inline-flex items-center overflow-hidden rounded-md border border-blue-100 bg-white text-sm shadow-sm"
              >
                <span class="px-2 py-1 font-medium text-blue-600">{{ lv }}x</span>
                <button
                  type="button"
                  class="grid h-7 w-7 place-items-center border-l border-rose-100 bg-rose-50 text-rose-500 transition hover:bg-rose-100 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-300"
                  :aria-label="`删除 ${lv}x 杠杆档位`"
                  title="删除该档位"
                  @click="toggleLeverage(lv)"
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" aria-hidden="true" fill="none">
                    <path d="M4.5 6.5H15.5M8 3.5H12M6.5 6.5L7 16H13L13.5 6.5M8.5 9V13.5M11.5 9V13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            <p v-else class="mt-2 text-sm text-slate-500">暂无选择任何档位</p>
          </div>

          <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p class="font-medium">杠杆档位说明:</p>
            <p class="mt-2">- 1-10x: 低风险，适合稳健投资者</p>
            <p>- 10-50x: 中等风险，需要一定的风险承受能力</p>
            <p>- 50-125x: 高风险，仅适合专业交易者</p>
            <p class="mt-2 font-medium text-rose-500">杠杆越高，强制平仓风险越大</p>
          </div>
        </div>

        <div v-show="activeTemplateTab === 'contract'" class="space-y-4">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p class="text-sm font-medium text-slate-700">下单模式</p>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <label class="flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-3 text-sm transition" :class="templateOrderMode === 'cost' ? 'border-blue-300 text-blue-600 shadow-sm' : 'border-slate-200 text-slate-700'">
                <input v-model="templateOrderMode" type="radio" value="cost" class="h-4 w-4" />
                <span>按成本(USDT)下单</span>
              </label>
              <label class="flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-3 text-sm transition" :class="templateOrderMode === 'quantity' ? 'border-blue-300 text-blue-600 shadow-sm' : 'border-slate-200 text-slate-700'">
                <input v-model="templateOrderMode" type="radio" value="quantity" class="h-4 w-4" />
                <span>按数量(张数=币价)下单</span>
              </label>
            </div>
          </div>

          <label class="block space-y-2">
            <span class="text-sm font-medium text-slate-700">合约面值 <span class="text-slate-400">USDT</span></span>
            <input
              v-model.number="templateContractFaceValueUsdt"
              type="number"
              min="1"
              step="1"
              class="ant-input"
              placeholder="默认 1000"
            />
          </label>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block space-y-2">
              <span class="text-sm font-medium text-slate-700">维持保证金率 <span class="text-slate-400">%</span></span>
              <input
                v-model.number="templateMaintenanceMarginRate"
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                class="ant-input"
                placeholder="默认 0.5"
              />
            </label>

            <label class="block space-y-2">
              <span class="text-sm font-medium text-slate-700">强平手续费率 <span class="text-slate-400">%</span></span>
              <input
                v-model.number="templateLiquidationFeeRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                class="ant-input"
                placeholder="默认 0"
              />
            </label>
          </div>

          <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p class="font-medium text-slate-800">模式影响</p>
            <p class="mt-2">- 按成本(USDT)下单：用户输入的是保证金成本，系统按当前杠杆反推可开的合约数量。</p>
            <p>- 按数量(张数=币价)下单：用户输入的是张数，1 张的名义价值等于当前币种价格，系统按当前价格和杠杆计算需要占用的保证金。</p>
            <p class="mt-3 font-medium text-slate-800">保证金计算规则</p>
            <p class="mt-2">- 按成本模式：保证金 = 用户输入的 USDT 数量 × 合约面值(配置)。</p>
            <p>- 按数量下单模式：保证金 = 用户输入的张数 × 合约面值(币价)。</p>
            <p class="mt-3 font-medium text-slate-800">爆仓与强平配置</p>
            <p class="mt-2">- 维持保证金率用于计算爆仓安全线，维持保证金 = 仓位价值 × 维持保证金率。</p>
            <p>- 强平手续费率用于爆仓强平时扣除费用。</p>
            <p>- 二者不影响下单保证金。</p>
          </div>
        </div>

        <div v-show="activeTemplateTab === 'trade'" class="space-y-4">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <p class="text-sm font-medium text-slate-800">不限交易额度</p>
                <p class="mt-1 text-sm leading-6 text-slate-500">
                  开启后，使用此杠杆模板的永续合约在产品编辑的交易限制中不再展示最低买入量、最大买入量和最大持仓量配置。
                </p>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="templateTradeLimitUnlimited"
                :aria-label="`不限交易额度：${templateTradeLimitUnlimited ? '已开启' : '已关闭'}`"
                class="relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                :class="templateTradeLimitUnlimited ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-slate-200'"
                @click="templateTradeLimitUnlimited = !templateTradeLimitUnlimited"
              >
                <span
                  class="pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-slate-900/10 transition-transform duration-200 ease-out"
                  :class="templateTradeLimitUnlimited ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>
          </div>

          <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
            <p class="font-medium text-slate-800">交易额度说明</p>
            <p class="mt-2">- 关闭时：永续合约产品编辑中继续配置最低买入量、最大买入量和最大持仓量。</p>
            <p>- 开启时：上述交易限额由模板统一声明为不限额，产品编辑页仅展示覆盖提示。</p>
            <p>- 该开关不影响杠杆档位、下单模式、手续费、维持保证金率和强平手续费率。</p>
          </div>
        </div>
      </div>

      <footer class="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button type="button" class="ant-btn" @click="showTemplateModal = false">取消</button>
        <button
          type="button"
          class="ant-btn ant-btn-primary"
          :disabled="!newTemplateName.trim() || !selectedLeverages.length"
          @click="submitTemplate"
        >
          {{ editingTemplateId ? '保存模板' : '创建模板' }}
        </button>
      </footer>
    </section>
  </div>
</template>
