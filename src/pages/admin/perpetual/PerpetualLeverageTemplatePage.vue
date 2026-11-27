<script setup>
// 杠杆模板管理 — Ant Design Pro list page (2026-11-28): status tabs and the name search became query-card fields with
// explicit 查询/重置, the template cards became a table card with a create toolbar, pagination, status Tags and a link
// action. The template editor dialog is unchanged.
import { Button, Space, Tag, TypographyText } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { computed, ref } from 'vue'
import { PERPETUAL_STATUS } from '../../../admin/constants/perpetual'
import {
  createPerpetualProductsMock,
  createPerpetualTemplatesMock,
  perpetualLeverageLevels,
  savePerpetualTemplatesMock
} from '../../../admin/mock/perpetual'

const blank = () => ({ name: '', status: 'all', contract: '' })
const filters = ref(blank())
const currentPage = ref(1)
const fields = [
  { key: 'name', label: '模板名称' },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, { value: PERPETUAL_STATUS.ENABLED, label: '已启用' }, { value: PERPETUAL_STATUS.DISABLED, label: '已禁用' }] },
  { key: 'contract', label: '使用合约' }
]
const columns = [
  { key: 'name', title: '模板', width: 240, fixed: 'left' },
  { key: 'levels', title: '可用杠杆档位', width: 320 },
  { key: 'contract', title: '合约模板', width: 300 },
  { key: 'contracts', title: '使用此模板的合约', width: 220 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 80, fixed: 'right' }
]
const applySearch = (values) => {
  filters.value = { ...blank(), ...values }
  currentPage.value = 1
}
const resetSearch = () => {
  filters.value = blank()
  currentPage.value = 1
}

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

const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const filteredTemplates = computed(() => {
  const f = filters.value
  return templates.value.filter((item) =>
    has(item.name, f.name) &&
    (f.status === 'all' || item.status === f.status) &&
    (!f.contract.trim() || (item.contracts || []).some((name) => has(name, f.contract)))
  )
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
    liquidationFeeRate: Number(templateLiquidationFeeRate.value) || 0
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
}
</script>

<template>
  <PageShell>
    <SearchForm name="perpetual-template-filters" :model="filters" :fields="fields" @search="applySearch" @reset="resetSearch" />
    <AdminTable title="杠杆模板" v-model:page="currentPage" :rows="filteredTemplates" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <Button type="primary" @click="openCreateTemplate"><template #icon><PlusOutlined /></template>新增模板</Button>
      </template>
      <template #cell="{ column, record: tpl }">
        <Space v-if="column.key === 'name'" direction="vertical" :size="0">
          <TypographyText strong>{{ tpl.name }}</TypographyText>
          <TypographyText type="secondary">杠杆范围 {{ tpl.leverageRange }} · {{ tpl.leverageCount }} 个档位</TypographyText>
        </Space>
        <span v-else-if="column.key === 'levels'"><Tag v-for="lv in tpl.levels" :key="lv">{{ lv }}</Tag></span>
        <Space v-else-if="column.key === 'contract'" direction="vertical" :size="0">
          <span>{{ tpl.orderMode === 'quantity' ? '按数量(张数=币价)下单' : '按成本(USDT)下单' }}</span>
          <TypographyText type="secondary">面值 {{ Number(tpl.contractFaceValueUsdt ?? 1000).toLocaleString() }} USDT · 维持保证金率 {{ Number(tpl.maintenanceMarginRate ?? 0.5) }}% · 强平手续费率 {{ Number(tpl.liquidationFeeRate ?? 0) }}%</TypographyText>
        </Space>
        <template v-else-if="column.key === 'contracts'">
          <span v-if="tpl.contracts.length"><Tag v-for="contract in tpl.contracts" :key="contract">{{ contract }}</Tag></span>
          <TypographyText v-else type="secondary">暂无</TypographyText>
        </template>
        <Tag v-else-if="column.key === 'status'" :color="tpl.status === PERPETUAL_STATUS.ENABLED ? 'green' : 'default'">{{ tpl.status === PERPETUAL_STATUS.ENABLED ? '已启用' : '已禁用' }}</Tag>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" @click="openEditTemplate(tpl)">编辑</Button>
        <template v-else>{{ tpl[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>

  <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showTemplateModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="768"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="showTemplateModal = false">
<template #title><template v-if="showTemplateModal"><header class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 class="text-2xl font-semibold text-slate-900">{{ editingTemplateId ? '编辑杠杆模板' : '新增杠杆模板' }}</h2>
        <a-button aria-label="关闭" type="text" html-type="button" class="text-2xl text-slate-400 hover:text-slate-700" @click="showTemplateModal = false">×</a-button>
      </header></template></template>
<template v-if="showTemplateModal">

      <div class="space-y-5 px-6 py-5">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-slate-700">模板名称 <span class="text-rose-500">*</span></span>
          <a-input
            v-model:value="newTemplateName"
            type="text"
            class="ant-input"
            placeholder="请输入模板名称"
          />
        </label>

        <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <a-button type="text"
            v-for="tab in [
              ['leverage', '杠杆档位'],
              ['contract', '合约模板']
            ]"
            :key="tab[0]"
            html-type="button"
            class="rounded-md px-4 py-2 text-sm font-medium transition"
            :class="activeTemplateTab === tab[0] ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
            @click="activeTemplateTab = tab[0]"
          >
            {{ tab[1] }}
          </a-button>
        </div>

        <div v-show="activeTemplateTab === 'leverage'" class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-slate-700">选择杠杆档位 <span class="text-rose-500">*</span></p>
            <p class="text-sm text-slate-500">已选择: <span class="font-semibold text-blue-600">{{ selectedLeverages.length }}</span> 个档位</p>
          </div>

          <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            <a-button type="text"
              v-for="lv in leverageLevels"
              :key="lv"
              html-type="button"
              class="rounded-lg border px-3 py-2 text-sm transition-all"
              :class="selectedLeverages.includes(lv) ? 'border-blue-300 bg-blue-50 font-medium text-blue-600 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
              "
              @click="toggleLeverage(lv)"
            >
              {{ lv }}x
            </a-button>
          </div>

          <div class="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label for="custom-leverage" class="block text-sm font-medium text-slate-700">手动添加倍数</label>
            <div class="flex gap-2">
              <div class="relative min-w-0 flex-1">
                <a-input
                  id="custom-leverage"
                  v-model:value="customLeverageInput"
                  type="number"
                  :min="1"
                  :max="1000"
                  :step="1"
                  class="ant-input pr-8"
                  :class="customLeverageError ? '!border-rose-400' : ''"
                  placeholder="请输入 1–1000"
                  @input="customLeverageError = ''"
                  @keyup.enter="addCustomLeverage"
                />
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">x</span>
              </div>
              <a-button type="primary" html-type="button" class="ant-btn ant-btn-primary shrink-0" @click="addCustomLeverage">添加</a-button>
            </div>
            <FeedbackToast v-if="customLeverageError" type="error" :source="() => (customLeverageError) ? (customLeverageError) : ''"></FeedbackToast>
          </div>

          <div class="flex flex-wrap gap-2">
            <a-button html-type="button" class="ant-btn !h-8 !px-3 !text-xs" @click="pickLeveragePack('all')">全选</a-button>
            <a-button html-type="button" class="ant-btn !h-8 !px-3 !text-xs" @click="pickLeveragePack('clear')">清空</a-button>
            <a-button html-type="button" class="ant-btn !h-8 !px-3 !text-xs" @click="pickLeveragePack('low')">低杠杆 (1-10x)</a-button>
            <a-button html-type="button" class="ant-btn !h-8 !px-3 !text-xs" @click="pickLeveragePack('mid')">中等杠杆 (10-50x)</a-button>
            <a-button html-type="button" class="ant-btn !h-8 !px-3 !text-xs" @click="pickLeveragePack('high')">高杠杆 (50-125x)</a-button>
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
                <a-button type="text"
                  html-type="button"
                  class="grid h-7 w-7 place-items-center border-l border-rose-100 bg-rose-50 text-rose-500 transition hover:bg-rose-100 hover:text-rose-700 focus:outline-none"
                  :aria-label="`删除 ${lv}x 杠杆档位`"
                  title="删除该档位"
                  @click="toggleLeverage(lv)"
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" aria-hidden="true" fill="none">
                    <path d="M4.5 6.5H15.5M8 3.5H12M6.5 6.5L7 16H13L13.5 6.5M8.5 9V13.5M11.5 9V13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </a-button>
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
                <a-radio :checked="templateOrderMode === &quot;cost&quot;" @change="templateOrderMode = &quot;cost&quot;" value="cost" class="" />
                <span>按成本(USDT)下单</span>
              </label>
              <label class="flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-3 text-sm transition" :class="templateOrderMode === 'quantity' ? 'border-blue-300 text-blue-600 shadow-sm' : 'border-slate-200 text-slate-700'">
                <a-radio :checked="templateOrderMode === &quot;quantity&quot;" @change="templateOrderMode = &quot;quantity&quot;" value="quantity" class="" />
                <span>按数量(张数=币价)下单</span>
              </label>
            </div>
          </div>

          <label class="block space-y-2">
            <span class="text-sm font-medium text-slate-700">合约面值 <span class="text-slate-400">USDT</span></span>
            <a-input
              v-model:value.number="templateContractFaceValueUsdt"
              type="number"
              :min="1"
              :step="1"
              class="ant-input"
              placeholder="默认 1000"
            />
          </label>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block space-y-2">
              <span class="text-sm font-medium text-slate-700">维持保证金率 <span class="text-slate-400">%</span></span>
              <a-input
                v-model:value.number="templateMaintenanceMarginRate"
                type="number"
                :min="0.01"
                :max="100"
                :step="0.01"
                class="ant-input"
                placeholder="默认 0.5"
              />
            </label>

            <label class="block space-y-2">
              <span class="text-sm font-medium text-slate-700">强平手续费率 <span class="text-slate-400">%</span></span>
              <a-input
                v-model:value.number="templateLiquidationFeeRate"
                type="number"
                :min="0"
                :max="100"
                :step="0.01"
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

      </div>

      </template>
<template #footer><template v-if="showTemplateModal"><footer class="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <a-button html-type="button" class="ant-btn" @click="showTemplateModal = false">取消</a-button>
        <a-button type="primary"
          html-type="button"
          class="ant-btn ant-btn-primary"
          :disabled="!newTemplateName.trim() || !selectedLeverages.length"
          @click="submitTemplate"
        >
          {{ editingTemplateId ? '保存模板' : '创建模板' }}
        </a-button>
      </footer></template></template>
</a-modal>
</template>
