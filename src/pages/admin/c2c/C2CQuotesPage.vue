<script setup>
// C2C 交易 → 报价管理. Earn/Quant Fund list conventions: query card with one input per field, shared table card,
// guarded enable/disable confirmation in the operation column. Sort weights: larger first.
import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {message, Button, Space, Tag, TypographyText} from 'ant-design-vue'
import {PlusOutlined} from '@ant-design/icons-vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {useC2CFeed, c2cCommand, errorText, sideLabels, sideColors} from '../../../shared/c2c/client.js'
import {ASSETS, quoteLabel} from '../../../shared/c2c/domain.js'
import {dateTime} from '../strategy/strategyFormat.js'

const number = value => Number(value || 0).toLocaleString('en-US', {maximumFractionDigits: 8})
const route = useRoute(), router = useRouter(), {state, error, busy, loaded, refresh} = useC2CFeed()
const blank = () => ({symbol: 'all', side: 'all', status: 'all'})
const filters = ref({...blank(), ...Object.fromEntries(Object.keys(blank()).filter(k => route.query[k] != null).map(k => [k, String(route.query[k])]))})
const page = ref(Math.max(1, Number(route.query.page) || 1))
const options = (labels, all) => [{value: 'all', label: all}, ...Object.entries(labels).map(([value, label]) => ({value, label}))]
const fields = [
  {key: 'symbol', label: '币种', searchable: true, options: [{value: 'all', label: '全部币种'}, ...ASSETS.map(value => ({value, label: value}))]},
  {key: 'side', label: '方向', options: options(sideLabels, '全部方向')},
  {key: 'status', label: '状态', options: options({enabled: '已启用', disabled: '已停用'}, '全部状态')},
]
const rows = computed(() => [...state.value.quotes].sort((a, b) => b.sortWeight - a.sortWeight || a.quoteId.localeCompare(b.quoteId)).filter(q => {
  const f = filters.value
  return (f.symbol === 'all' || q.symbol === f.symbol) && (f.side === 'all' || q.side === f.side) && (f.status === 'all' || (f.status === 'enabled') === q.enabled)
}))
watch(() => rows.value.length, total => { page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 10))) })
const pending = computed(() => Object.fromEntries(state.value.quotes.map(q => [q.quoteId, state.value.orders.filter(o => o.quoteSnapshot.quoteId === q.quoteId && o.status === 'pending_review').length])))
const columns = [
  {key: 'pair', title: '交易对', width: 150, fixed: 'left'},
  {key: 'side', title: '方向', width: 96},
  {key: 'price', title: '价格（USDT）', width: 140, align: 'right'},
  {key: 'limits', title: '单笔限额', width: 220, align: 'right'},
  {key: 'ttlSeconds', title: '报价有效期', width: 110, align: 'right'},
  {key: 'note', title: '备注', width: 280},
  {key: 'pending', title: '待审核订单', width: 100, align: 'right'},
  {key: 'status', title: '状态', width: 80},
  {key: 'sortWeight', title: '排序权重', width: 90, align: 'right'},
  {key: 'updatedAt', title: '更新时间', width: 170},
  {key: 'actions', title: '操作', width: 120, fixed: 'right'},
]
function search(values) { filters.value = {...blank(), ...values}; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }
function edit(quote) {
  router.push({path: quote ? `/admin/c2c/quotes/${encodeURIComponent(quote.quoteId)}/edit` : '/admin/c2c/quotes/new', query: {...filters.value, page: page.value}})
}

const target = ref(null)
async function toggle() {
  if (busy.value || !target.value) return
  try {
    await c2cCommand('setQuoteStatus', {quoteId: target.value.quoteId, expectedEnabled: target.value.enabled})
    message.success(target.value.enabled ? '报价已停用' : '报价已启用')
    target.value = null
  } catch (e) { message.error(errorText(e)) }
}
</script>

<template>
 <PageShell>
  <FeedbackToast v-if="error" type="error" :source="() => (error ? errorText(error) : '')"><Button @click="refresh">重试</Button></FeedbackToast>
  <SearchForm name="c2c-quote-filters" :model="filters" :fields="fields" @search="search" @reset="reset"/>
  <AdminTable title="C2C 报价" v-model:page="page" :rows="rows" :columns="columns" row-key="quoteId" :loading="!loaded && !error" desktop-only>
   <template #toolbar><Space :size="8"><Button @click="refresh">刷新</Button><Button type="primary" @click="edit()"><template #icon><PlusOutlined/></template>新增报价</Button></Space></template>
   <template #cell="{column, record}">
    <span v-if="column.key === 'pair'"><TypographyText strong>{{ record.symbol }}</TypographyText><TypographyText type="secondary"> / USDT</TypographyText></span>
    <Tag v-else-if="column.key === 'side'" :color="sideColors[record.side]">{{ sideLabels[record.side] }}</Tag>
    <template v-else-if="column.key === 'price'">{{ number(record.price) }}</template>
    <template v-else-if="column.key === 'limits'">{{ number(record.min) }} ~ {{ number(record.max) }} {{ record.symbol }}</template>
    <template v-else-if="column.key === 'ttlSeconds'">{{ record.ttlSeconds }} 秒</template>
    <TypographyText v-else-if="column.key === 'note'" :ellipsis="{tooltip: record.note}" :content="record.note || '—'" class="c2c-note"/>
    <template v-else-if="column.key === 'pending'">{{ pending[record.quoteId] || 0 }} 笔</template>
    <Tag v-else-if="column.key === 'status'" :color="record.enabled ? 'green' : 'default'">{{ record.enabled ? '已启用' : '已停用' }}</Tag>
    <template v-else-if="column.key === 'updatedAt'">{{ dateTime(record.updatedAt) }}</template>
    <Space v-else-if="column.key === 'actions'" :size="8" class="c2c-row-actions"><Button type="link" @click="edit(record)">编辑</Button><Button type="link" :danger="record.enabled" @click="target = {...record}">{{ record.enabled ? '停用' : '启用' }}</Button></Space>
    <template v-else>{{ record[column.key] ?? '—' }}</template>
   </template>
  </AdminTable>
  <AdminModal :open="!!target" :title="target?.enabled ? '停用 C2C 报价' : '启用 C2C 报价'" :busy="busy" :confirm-text="target?.enabled ? '确认停用' : '确认启用'" :danger="target?.enabled" @close="target = null" @confirm="toggle">
   <div v-if="target"><TypographyText strong>{{ quoteLabel(target) }}</TypographyText><p>{{ target.enabled ? '停用后用户不能再按此报价下单；已提交的待审核订单不受影响，仍按下单时的价格审核。' : '启用后用户可按当前价格和限额下单。' }}</p></div>
  </AdminModal>
 </PageShell>
</template>

<style scoped>
.c2c-row-actions :deep(.ant-btn-link){padding-inline:4px}
.c2c-note{max-width:260px}
</style>
