<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { symbolApi } from '../../../admin/mock/spot'
import { createAssetsCoinsMock } from '../../../admin/mock/assets'

const loading = ref(false)
const symbols = ref([])

const filters = reactive({
  keyword: '',
  isOpen: 'all',
  pairType: 'all',
  includeDeleted: false
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const totalPages = computed(() => Math.ceil(pagination.total / pagination.pageSize))

const showEditModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const form = reactive({
  symbol_name: '',
  symbol_id: 0,
  base_coin_name: '',
  base_coin_prec: 0,
  quote_coin_name: '',
  quote_coin_prec: 0,
  is_open: 1,
  pair_type: 1,
  is_show_market: 1
})

const pairTypeOptions = [
  { value: 1, label: '虚拟币' },
  { value: 2, label: '法币' },
  { value: 3, label: '贵金属' }
]

const pairTypeLabel = (val) => pairTypeOptions.find((o) => o.value === Number(val))?.label || String(val)

const badgeClass = (active) => (active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700')
const dangerBadgeClass = (active) => (active ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700')

const fmtTime = (unixSec) => {
  const n = Number(unixSec)
  if (!n) return '-'
  const d = new Date(n * 1000)
  const pad = (v) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const loadSymbols = async () => {
  loading.value = true
  try {
    const result = await symbolApi.getSymbolList({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      keyword: filters.keyword,
      is_open: filters.isOpen,
      pair_type: filters.pairType,
      includeDeleted: filters.includeDeleted
    })
    if (result.success) {
      symbols.value = result.data.list
      pagination.total = result.data.total
    } else {
      alert(result.message || '加载失败')
    }
  } catch (e) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => [filters.keyword, filters.isOpen, filters.pairType, filters.includeDeleted],
  () => {
    pagination.currentPage = 1
    loadSymbols()
  }
)

watch(
  () => [pagination.currentPage, pagination.pageSize],
  () => {
    loadSymbols()
  }
)

onMounted(() => {
  loadSymbols()
})

const resetFilters = () => {
  filters.keyword = ''
  filters.isOpen = 'all'
  filters.pairType = 'all'
  filters.includeDeleted = false
}

const openCreate = () => {
  isEditing.value = false
  editingId.value = null
  form.symbol_name = ''
  form.symbol_id = 0
  form.base_coin_name = ''
  form.base_coin_prec = 0
  form.quote_coin_name = ''
  form.quote_coin_prec = 0
  form.is_open = 1
  form.pair_type = 1
  showEditModal.value = true
}

const openEdit = (row) => {
  isEditing.value = true
  editingId.value = row.id
  form.symbol_name = row.symbol_name
  form.symbol_id = Number(row.symbol_id)
  form.base_coin_name = row.base_coin_name
  form.base_coin_prec = Number(row.base_coin_prec)
  form.quote_coin_name = row.quote_coin_name
  form.quote_coin_prec = Number(row.quote_coin_prec)
  form.is_open = Number(row.is_open)
  form.pair_type = Number(row.pair_type)
  form.is_show_market = Number(row.is_show_market ?? 1)
  showEditModal.value = true
}

const closeModal = () => {
  if (loading.value) return
  showEditModal.value = false
}

const assetCoins = ref(createAssetsCoinsMock())
const coinOptions = computed(() => assetCoins.value.map(c => ({ value: c.symbol, label: `${c.symbol} - ${c.name}` })))

const saveSymbol = async () => {
  const payload = {
    symbol_name: String(form.symbol_name || '').trim(),
    symbol_id: Number(form.symbol_id),
    base_coin_name: String(form.base_coin_name || '').trim().toUpperCase(),
    base_coin_prec: Number(form.base_coin_prec),
    quote_coin_name: String(form.quote_coin_name || '').trim().toUpperCase(),
    quote_coin_prec: Number(form.quote_coin_prec),
    is_open: Number(form.is_open) ? 1 : 0,
    pair_type: Number(form.pair_type),
    is_show_market: Number(form.is_show_market) ? 1 : 0
  }

  if (!payload.symbol_name) return alert('请输入交易对名称')
  if (!Number.isFinite(payload.symbol_id) || payload.symbol_id <= 0) return alert('请输入有效的交易对ID')
  if (!payload.base_coin_name || !payload.quote_coin_name) return alert('请输入基础币/计价币名称')
  if (!Number.isFinite(payload.base_coin_prec) || payload.base_coin_prec < 0 || payload.base_coin_prec > 18) return alert('基础币精度需在 0-18')
  if (!Number.isFinite(payload.quote_coin_prec) || payload.quote_coin_prec < 0 || payload.quote_coin_prec > 18) return alert('计价币精度需在 0-18')
  if (![1, 2, 3].includes(payload.pair_type)) return alert('请选择有效的交易对类型')

  loading.value = true
  try {
    const result = isEditing.value
      ? await symbolApi.updateSymbol({ id: editingId.value, ...payload })
      : await symbolApi.createSymbol(payload)
    if (result.success) {
      showEditModal.value = false
      await loadSymbols()
      alert(isEditing.value ? '交易对已更新' : '交易对已创建')
    } else {
      alert(result.message || '保存失败')
    }
  } catch (e) {
    alert(e?.message || '保存失败')
  } finally {
    loading.value = false
  }
}

const toggleOpen = async (row) => {
  const next = Number(row.is_open) ? 0 : 1
  loading.value = true
  try {
    const result = await symbolApi.updateSymbol({ id: row.id, is_open: next })
    if (result.success) {
      await loadSymbols()
    } else {
      alert(result.message || '操作失败')
    }
  } catch (e) {
    alert(e?.message || '操作失败')
  } finally {
    loading.value = false
  }
}

const removeSymbol = async (row) => {
  const ok = window.confirm(`确认删除交易对：${row.symbol_name}？`)
  if (!ok) return
  loading.value = true
  try {
    const result = await symbolApi.deleteSymbol({ id: row.id })
    if (result.success) {
      await loadSymbols()
      alert('已删除')
    } else {
      alert(result.message || '删除失败')
    }
  } catch (e) {
    alert(e?.message || '删除失败')
  } finally {
    loading.value = false
  }
}

const goPrev = () => {
  if (pagination.currentPage > 1) pagination.currentPage--
}

const goNext = () => {
  if (pagination.currentPage < totalPages.value) pagination.currentPage++
}
</script>

<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">交易对管理</h1>
        <p class="mt-1 text-sm text-slate-500">管理交易对基础信息与开关状态。</p>
      </div>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div class="flex flex-wrap items-center gap-2">
          <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="filters.isOpen" class="!w-28">
            <a-select-option value="all">全部状态</a-select-option>
            <a-select-option value="1">已开启</a-select-option>
            <a-select-option value="0">已关闭</a-select-option>
          </a-select>
          <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="filters.pairType" class="!w-28">
            <a-select-option value="all">全部类型</a-select-option>
            <a-select-option value="1">虚拟币</a-select-option>
            <a-select-option value="2">法币</a-select-option>
            <a-select-option value="3">贵金属</a-select-option>
          </a-select>
          <label class="inline-flex items-center gap-2 text-sm text-slate-600">
            <a-checkbox v-model:checked="filters.includeDeleted" class="" />
            <span>包含已删除</span>
          </label>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="relative w-80">
            <a-input v-model:value="filters.keyword" type="text" class="ant-input w-full pl-9" placeholder="搜索交易对名称/ID/币种..." />
            <svg viewBox="0 0 20 20" class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none">
              <circle cx="9" cy="9" r="5.8" stroke="currentColor" stroke-width="1.6" />
              <path d="M13.6 13.6L16.4 16.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </div>
          <a-button html-type="button" class="ant-btn" @click="resetFilters">重置</a-button>
          <a-button type="primary" html-type="button" class="ant-btn ant-btn-primary" @click="openCreate">+ 新增交易对</a-button>
        </div>
      </div>

      <div class="relative overflow-x-auto">
        <div v-if="loading" class="absolute inset-0 z-10 grid place-items-center bg-white/70 text-sm text-slate-500">加载中...</div>
        <a-table  size="small" :pagination="false" :data-source="symbols" :row-key="(row) => row.id" :scroll="{ x: 'max-content' }" :custom-row="(row, rowIndex) => ({ class: [&quot;hover:bg-slate-50/60&quot;] })">
<a-table-column key="column-0" :custom-cell="(row, rowIndex) => ({ class: [&quot;whitespace-nowrap px-4 py-3 font-mono text-slate-700&quot;] })">
<template #title>ID</template>
<template #default="{ record: row, index: rowIndex }">{{ row.id }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(row, rowIndex) => ({ class: [&quot;whitespace-nowrap px-4 py-3&quot;] })">
<template #title>交易对名称</template>
<template #default="{ record: row, index: rowIndex }">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-slate-900">{{ row.symbol_name }}</span>
                  <span v-if="Number(row.deleted_at)" class="rounded px-2 py-0.5 text-xs" :class="dangerBadgeClass(true)">已删除</span>
                </div>
              </template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(row, rowIndex) => ({ class: [&quot;whitespace-nowrap px-4 py-3 font-mono text-slate-700&quot;] })">
<template #title>交易对ID</template>
<template #default="{ record: row, index: rowIndex }">{{ row.symbol_id }}</template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(row, rowIndex) => ({ class: [&quot;whitespace-nowrap px-4 py-3&quot;] })">
<template #title>基础币</template>
<template #default="{ record: row, index: rowIndex }">
                <div class="text-slate-900 font-medium">{{ row.base_coin_name }}</div>
                <div class="text-xs text-slate-500 font-mono">ID: {{ row.base_coin_id }} | 精度: {{ row.base_coin_prec }}</div>
              </template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(row, rowIndex) => ({ class: [&quot;whitespace-nowrap px-4 py-3&quot;] })">
<template #title>计价币</template>
<template #default="{ record: row, index: rowIndex }">
                <div class="text-slate-900 font-medium">{{ row.quote_coin_name }}</div>
                <div class="text-xs text-slate-500 font-mono">ID: {{ row.quote_coin_id }} | 精度: {{ row.quote_coin_prec }}</div>
              </template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(row, rowIndex) => ({ class: [&quot;whitespace-nowrap px-4 py-3 text-slate-700&quot;] })">
<template #title>类型</template>
<template #default="{ record: row, index: rowIndex }">{{ pairTypeLabel(row.pair_type) }}</template>
</a-table-column>
<a-table-column key="column-6" :custom-cell="(row, rowIndex) => ({ class: [&quot;whitespace-nowrap px-4 py-3&quot;] })">
<template #title>开启</template>
<template #default="{ record: row, index: rowIndex }">
                <span class="rounded px-2 py-0.5 text-xs font-medium" :class="badgeClass(Number(row.is_open))">
                  {{ Number(row.is_open) ? '开启' : '关闭' }}
                </span>
              </template>
</a-table-column>
<a-table-column key="column-7" :custom-cell="(row, rowIndex) => ({ class: [&quot;whitespace-nowrap px-4 py-3&quot;] })">
<template #title>行情显示</template>
<template #default="{ record: row, index: rowIndex }">
                <span class="rounded px-2 py-0.5 text-xs font-medium" :class="badgeClass(Number(row.is_show_market))">
                  {{ Number(row.is_show_market) ? '显示' : '隐藏' }}
                </span>
              </template>
</a-table-column>
<a-table-column key="column-8" align="right" :custom-cell="(row, rowIndex) => ({ class: [&quot;whitespace-nowrap px-4 py-3 text-right&quot;] })">
<template #title>操作</template>
<template #default="{ record: row, index: rowIndex }">
                <div class="inline-flex items-center gap-2">
                  <a-button html-type="button" class="ant-btn ant-btn-sm" :disabled="Number(row.deleted_at)" @click="openEdit(row)">编辑</a-button>
                  <!-- <button type="button" class="ant-btn ant-btn-sm" :disabled="Number(row.deleted_at)" @click="toggleOpen(row)">{{ Number(row.is_open) ? '关闭' : '开启' }}</button>
                  <button type="button" class="ant-btn ant-btn-sm" :disabled="Number(row.deleted_at)" @click="toggleShowMarket(row)">{{ Number(row.is_show_market) ? '隐藏行情' : '显示行情' }}</button> -->
                  <a-button html-type="button" class="ant-btn ant-btn-sm !text-rose-600" :disabled="Number(row.deleted_at)" @click="removeSymbol(row)">删除</a-button>
                </div>
              </template>
</a-table-column>
</a-table>
        <p v-if="!loading && symbols.length === 0" class="p-8 text-center text-sm text-slate-500">暂无数据</p>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
        <div class="flex items-center gap-3 text-sm text-slate-500">
          <div>共 <span class="font-medium text-slate-900">{{ pagination.total }}</span> 条</div>
          <div class="flex items-center gap-2">
            <span>每页</span>
            <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value.number="pagination.pageSize" class="!w-20">
              <a-select-option :value="10">10</a-select-option>
              <a-select-option :value="20">20</a-select-option>
              <a-select-option :value="50">50</a-select-option>
            </a-select>
            <span>条</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <a-pagination size="small" :current="pagination.currentPage" :total="totalPages" :page-size="1" :show-size-changer="false" @change="pagination.currentPage = $event" />
        </div>
      </div>
    </article>

    <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showEditModal)" :mask-closable="false" :closable="false" :keyboard="false" :width="768"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="closeModal">
<template #title><template v-if="showEditModal"><header class="flex items-start justify-between gap-4 border-b border-black/[0.06] bg-white px-6 py-4">
          <div>
            <h2 class="text-lg font-semibold text-black/85">{{ isEditing ? '编辑交易对' : '新增交易对' }}</h2>
            <p class="mt-1 text-sm text-black/65">配置交易对的币种、精度与状态</p>
            <p v-if="isEditing" class="mt-1 text-xs text-black/45 font-mono">ID: {{ editingId }}</p>
          </div>
          <a-button aria-label="关闭" :disabled="loading" type="text" html-type="button" class="text-black/45 hover:text-black/85 transition-colors text-2xl leading-none" @click="closeModal">×</a-button>
        </header></template></template>
<template v-if="showEditModal">

        <div class="space-y-5 overflow-y-auto px-6 py-6 bg-[#f0f2f5]">
          <section class="space-y-4 rounded-lg border border-black/[0.06] bg-white p-6 shadow-sm">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-1.5 sm:col-span-2">
                <label class="text-sm text-black/85 font-medium">交易对名称 <span class="text-rose-500">*</span></label>
                <a-input v-model:value="form.symbol_name" type="text" class="ant-input" placeholder="如：BTC/USDT" />
              </div>

              <div class="space-y-1.5">
                <label class="text-sm text-black/85 font-medium">交易对ID <span class="text-rose-500">*</span></label>
                <a-input v-model:value.number="form.symbol_id" type="number" class="ant-input" placeholder="如：1001" />
              </div>
              <div class="space-y-1.5">
                <label class="text-sm text-black/85 font-medium">类型</label>
                <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value.number="form.pair_type" class="">
                  <a-select-option :value="1">虚拟币</a-select-option>
                  <a-select-option :value="2">法币</a-select-option>
                  <a-select-option :value="3">贵金属</a-select-option>
                </a-select>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-3 rounded-md border border-black/[0.06] bg-[#fafafa] p-4">
                <div class="text-xs font-medium text-black/65">基础币</div>
                <div class="space-y-1.5">
                  <label class="text-sm text-black/85 font-medium">基础币名称 <span class="text-rose-500">*</span></label>
                  <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="form.base_coin_name" class="">
                    <a-select-option v-for="opt in coinOptions" :key="`base-${opt.value}`" :value="opt.value">{{ opt.label }}</a-select-option>
                  </a-select>
                </div>
                <div class="space-y-1.5">
                  <label class="text-sm text-black/85 font-medium">基础币精度</label>
                  <a-input v-model:value.number="form.base_coin_prec" type="number" class="ant-input" placeholder="如：8" />
                </div>
              </div>

              <div class="space-y-3 rounded-md border border-black/[0.06] bg-[#fafafa] p-4">
                <div class="text-xs font-medium text-black/65">计价币</div>
                <div class="space-y-1.5">
                  <label class="text-sm text-black/85 font-medium">计价币名称 <span class="text-rose-500">*</span></label>
                  <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="form.quote_coin_name" class="">
                    <a-select-option v-for="opt in coinOptions" :key="`quote-${opt.value}`" :value="opt.value">{{ opt.label }}</a-select-option>
                  </a-select>
                </div>
                <div class="space-y-1.5">
                  <label class="text-sm text-black/85 font-medium">计价币精度</label>
                  <a-input v-model:value.number="form.quote_coin_prec" type="number" class="ant-input" placeholder="如：2" />
                </div>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-1.5">
                <label class="text-sm text-black/85 font-medium">是否开启</label>
                <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value.number="form.is_open" class="">
                  <a-select-option :value="1">开启</a-select-option>
                  <a-select-option :value="0">关闭</a-select-option>
                </a-select>
              </div>
              <div class="space-y-1.5">
                <label class="text-sm text-black/85 font-medium">行情中显示</label>
                <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value.number="form.is_show_market" class="">
                  <a-select-option :value="1">显示</a-select-option>
                  <a-select-option :value="0">隐藏</a-select-option>
                </a-select>
              </div>
            </div>
          </section>
        </div>

        </template>
<template #footer><template v-if="showEditModal"><footer class="flex items-center justify-end gap-3 border-t border-black/[0.06] bg-white px-6 py-4">
          <a-button html-type="button" class="ant-btn" :disabled="loading" @click="closeModal">取消</a-button>
          <a-button type="primary" html-type="button" class="ant-btn ant-btn-primary" :disabled="loading" @click="saveSymbol">{{ loading ? '处理中...' : '保存' }}</a-button>
        </footer></template></template>
</a-modal>
  </section>
</template>
