<script setup>
// 交易对管理 — Ant Design Pro list page (2026-11-28): query card with one input per field (the old combined
// name/ID/coin keyword box is split), table card with create toolbar and pagination, status as text Tags, link actions.
// The list loads once from the mock API and filters/pages on the client; deletion confirms in AdminModal instead of
// window.confirm, and all feedback is toast (Ant message) instead of alert().
import { computed, onMounted, reactive, ref } from 'vue'
import { Button, Space, Tag, TypographyText, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import { symbolApi } from '../../../admin/mock/spot'
import { createAssetsCoinsMock } from '../../../admin/mock/assets'

const loading = ref(false)
const symbols = ref([])
const page = ref(1)

const blank = () => ({ symbolName: '', symbolId: '', baseCoin: 'all', quoteCoin: 'all', isOpen: 'all', pairType: 'all', deleted: 'all' })
const filters = ref(blank())
const coinFilterOptions = (key, allLabel) => [{ value: 'all', label: allLabel }, ...[...new Set(symbols.value.map((row) => row[key]))].filter(Boolean).sort().map((value) => ({ value, label: value }))]
const fields = computed(() => [
  { key: 'symbolName', label: '交易对名称' },
  { key: 'symbolId', label: '交易对 ID' },
  { key: 'isOpen', label: '开启状态', options: [{ value: 'all', label: '全部状态' }, { value: '1', label: '开启' }, { value: '0', label: '关闭' }] },
  { key: 'pairType', label: '类型', options: [{ value: 'all', label: '全部类型' }, ...pairTypeOptions.map((o) => ({ value: String(o.value), label: o.label }))] },
  { key: 'baseCoin', label: '基础币', searchable: true, options: coinFilterOptions('base_coin_name', '全部基础币') },
  { key: 'quoteCoin', label: '计价币', searchable: true, options: coinFilterOptions('quote_coin_name', '全部计价币') },
  { key: 'deleted', label: '删除状态', options: [{ value: 'all', label: '不含已删除' }, { value: 'include', label: '包含已删除' }, { value: 'only', label: '仅已删除' }] }
])
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const rows = computed(() => symbols.value.filter((row) => {
  const f = filters.value
  const deleted = Boolean(Number(row.deleted_at))
  return has(row.symbol_name, f.symbolName) && has(row.symbol_id, f.symbolId) &&
    (f.baseCoin === 'all' || row.base_coin_name === f.baseCoin) &&
    (f.quoteCoin === 'all' || row.quote_coin_name === f.quoteCoin) &&
    (f.isOpen === 'all' || String(Number(row.is_open)) === f.isOpen) &&
    (f.pairType === 'all' || String(Number(row.pair_type)) === f.pairType) &&
    (f.deleted === 'include' || (f.deleted === 'only' ? deleted : !deleted))
}))
const columns = [
  { key: 'symbol', title: '交易对', width: 200, fixed: 'left' },
  { key: 'base', title: '基础币', width: 170 },
  { key: 'quote', title: '计价币', width: 170 },
  { key: 'type', title: '类型', width: 100 },
  { key: 'open', title: '开启状态', width: 100 },
  { key: 'market', title: '行情显示', width: 100 },
  { key: 'updated', title: '更新时间', width: 180 },
  { key: 'actions', title: '操作', width: 130, fixed: 'right' }
]
function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function resetFilters() { filters.value = blank(); page.value = 1 }

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
    const result = await symbolApi.getSymbolList({ page: 1, pageSize: 100000, includeDeleted: true })
    if (result.success) {
      symbols.value = result.data.list
    } else {
      message.error(result.message || '加载失败')
    }
  } catch (e) {
    message.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSymbols()
})

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

  if (!payload.symbol_name) return message.error('请输入交易对名称')
  if (!Number.isFinite(payload.symbol_id) || payload.symbol_id <= 0) return message.error('请输入有效的交易对ID')
  if (!payload.base_coin_name || !payload.quote_coin_name) return message.error('请输入基础币/计价币名称')
  if (!Number.isFinite(payload.base_coin_prec) || payload.base_coin_prec < 0 || payload.base_coin_prec > 18) return message.error('基础币精度需在 0-18')
  if (!Number.isFinite(payload.quote_coin_prec) || payload.quote_coin_prec < 0 || payload.quote_coin_prec > 18) return message.error('计价币精度需在 0-18')
  if (![1, 2, 3].includes(payload.pair_type)) return message.error('请选择有效的交易对类型')

  loading.value = true
  try {
    const result = isEditing.value
      ? await symbolApi.updateSymbol({ id: editingId.value, ...payload })
      : await symbolApi.createSymbol(payload)
    if (result.success) {
      showEditModal.value = false
      await loadSymbols()
      message.success(isEditing.value ? '交易对已更新' : '交易对已创建')
    } else {
      message.error(result.message || '保存失败')
    }
  } catch (e) {
    message.error(e?.message || '保存失败')
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
      message.error(result.message || '操作失败')
    }
  } catch (e) {
    message.error(e?.message || '操作失败')
  } finally {
    loading.value = false
  }
}

const deleteTarget = ref(null)
const deleting = ref(false)
const removeSymbol = (row) => { deleteTarget.value = row }
const confirmRemoveSymbol = async () => {
  const row = deleteTarget.value
  if (!row || deleting.value) return
  deleting.value = true
  loading.value = true
  try {
    const result = await symbolApi.deleteSymbol({ id: row.id })
    if (result.success) {
      deleteTarget.value = null
      await loadSymbols()
      message.success('已删除')
    } else {
      message.error(result.message || '删除失败')
    }
  } catch (e) {
    message.error(e?.message || '删除失败')
  } finally {
    loading.value = false
    deleting.value = false
  }
}
</script>

<template>
  <PageShell>
    <SearchForm name="spot-symbol-filters" :model="filters" :fields="fields" @search="search" @reset="resetFilters" />
    <AdminTable title="交易对列表" v-model:page="page" :rows="rows" :columns="columns" row-key="id" :loading="loading" desktop-only>
      <template #toolbar>
        <Button type="primary" @click="openCreate"><template #icon><PlusOutlined /></template>新增交易对</Button>
      </template>
      <template #cell="{ column, record: row }">
        <Space v-if="column.key === 'symbol'" direction="vertical" :size="0">
          <span><TypographyText strong>{{ row.symbol_name }}</TypographyText> <Tag v-if="Number(row.deleted_at)" color="red">已删除</Tag></span>
          <TypographyText type="secondary" class="font-mono">ID {{ row.id }} · 交易对 ID {{ row.symbol_id }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'base'" direction="vertical" :size="0">
          <span>{{ row.base_coin_name }}</span>
          <TypographyText type="secondary" class="font-mono">ID {{ row.base_coin_id }} · 精度 {{ row.base_coin_prec }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'quote'" direction="vertical" :size="0">
          <span>{{ row.quote_coin_name }}</span>
          <TypographyText type="secondary" class="font-mono">ID {{ row.quote_coin_id }} · 精度 {{ row.quote_coin_prec }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'type'">{{ pairTypeLabel(row.pair_type) }}</template>
        <Tag v-else-if="column.key === 'open'" :color="Number(row.is_open) ? 'green' : 'default'">{{ Number(row.is_open) ? '开启' : '关闭' }}</Tag>
        <Tag v-else-if="column.key === 'market'" :color="Number(row.is_show_market) ? 'blue' : 'default'">{{ Number(row.is_show_market) ? '显示' : '隐藏' }}</Tag>
        <TypographyText v-else-if="column.key === 'updated'" type="secondary">{{ fmtTime(row.updated_at) }}</TypographyText>
        <Space v-else-if="column.key === 'actions'" :size="8">
          <Button type="link" class="px-0" :disabled="Boolean(Number(row.deleted_at))" @click="openEdit(row)">编辑</Button>
          <Button type="link" danger class="px-0" :disabled="Boolean(Number(row.deleted_at))" @click="removeSymbol(row)">删除</Button>
        </Space>
        <template v-else>{{ row[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <AdminModal :open="!!deleteTarget" title="删除交易对" :width="480" :busy="deleting" confirm-text="确认删除" danger @close="deleteTarget = null" @confirm="confirmRemoveSymbol">
      <p v-if="deleteTarget">确认删除交易对 <TypographyText strong>{{ deleteTarget.symbol_name }}</TypographyText>？删除后该交易对不可再编辑。</p>
    </AdminModal>

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
                  <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="form.base_coin_name" :options="coinOptions" show-search option-filter-prop="label" not-found-content="无匹配项" />
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
                  <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="form.quote_coin_name" :options="coinOptions" show-search option-filter-prop="label" not-found-content="无匹配项" />
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
  </PageShell>
</template>
