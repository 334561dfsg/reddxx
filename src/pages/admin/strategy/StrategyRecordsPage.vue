<script setup>
import {computed, ref, shallowRef, watch} from 'vue'
import {useRoute} from 'vue-router'
import {message, Button, Space, Tag, TypographyText} from 'ant-design-vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import StrategySubscriptionDetails from './StrategySubscriptionDetails.vue'
import StrategyRecordsDrawer from './StrategyRecordsDrawer.vue'
import {useStrategyFeed, strategyCommand, errorText, statusLabels, statusColors, endReasonLabels, actionLabels} from '../../../shared/strategy/client.js'
import {amount, signed, dateTime, percent} from './strategyFormat.js'

// One page for the strategy ledgers, chosen by route: user strategies, daily P&L, settlements, operation log.
const route = useRoute(), {state, error, busy, loaded, refresh} = useStrategyFeed()
const mode = computed(() => route.meta.strategySection)
const titles = {subscriptions: '用户策略', 'daily-pnl': '收益记录', settlements: '结算记录', logs: '操作日志'}
const blankFilters = () => ({q: '', status: 'all', reason: 'all'})
const filters = ref({...blankFilters(), q: String(route.query.q || '')})
const page = ref(1)
watch(mode, () => { filters.value = blankFilters(); page.value = 1; closeDialog() })

const fields = computed(() => ({
  subscriptions: [{key: 'q', label: '订单 / 用户'}, {key: 'status', label: '状态', options: [{value: 'all', label: '全部状态'}, ...Object.entries(statusLabels).map(([value, label]) => ({value, label}))]}],
  'daily-pnl': [{key: 'q', label: '订单 / 用户'}],
  settlements: [{key: 'q', label: '订单 / 用户'}, {key: 'reason', label: '结束原因', options: [{value: 'all', label: '全部原因'}, ...Object.entries(endReasonLabels).map(([value, label]) => ({value, label}))]}],
  logs: [{key: 'q', label: '关键词'}],
})[mode.value])
const match = (row, keys) => !filters.value.q || keys.some(k => String(row[k] ?? '').toLowerCase().includes(filters.value.q.toLowerCase()))
const subById = computed(() => Object.fromEntries(state.value.subscriptions.map(s => [s.subscriptionId, s])))
const rows = computed(() => {
  const f = filters.value, s = state.value
  if (mode.value === 'subscriptions') return s.subscriptions.filter(r => match({...r, name: r.templateSnapshot.name}, ['subscriptionId', 'userId', 'userName', 'name']) && (f.status === 'all' || r.status === f.status))
  if (mode.value === 'daily-pnl') return s.dailyPnl.filter(r => match({...r, name: subById.value[r.subscriptionId]?.templateSnapshot.name}, ['subscriptionId', 'userId', 'name']))
  if (mode.value === 'settlements') return s.settlements.filter(r => match(r, ['subscriptionId', 'userId', 'userName', 'templateName']) && (f.reason === 'all' || r.reason === f.reason))
  return s.logs.filter(r => match(r, ['refId', 'targetLabel', 'summary', 'operator', 'action']))
})
watch(() => rows.value.length, total => { page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 10))) })
const rowKey = r => r.subscriptionId && !r.settlementId && !r.date ? r.subscriptionId : r.settlementId || r.id
const columns = computed(() => ({
  subscriptions: [
    {key: 'subscriptionId', title: '订单 / 模板', width: 250, fixed: 'left'}, {key: 'user', title: '用户', width: 160},
    {key: 'capital', title: '本金（USDT）', width: 130, align: 'right'}, {key: 'pnl', title: '累计盈亏（USDT）', width: 170, align: 'right'},
    {key: 'terms', title: '周期 / 止盈 / 止损', width: 150}, {key: 'status', title: '状态', width: 150},
    {key: 'createdAt', title: '提交时间', width: 170}, {key: 'reviewer', title: '审核人', width: 140}, {key: 'actions', title: '操作', width: 200, fixed: 'right'},
  ],
  'daily-pnl': [
    {key: 'date', title: '日期', width: 120, fixed: 'left'}, {key: 'subscriptionId', title: '订单 / 模板', width: 250}, {key: 'userId', title: '用户', width: 120},
    {key: 'tradeCount', title: '成交笔数', width: 100, align: 'right'}, {key: 'pnl', title: '盈亏（USDT）', width: 140, align: 'right'},
  ],
  settlements: [
    {key: 'settledAt', title: '结算时间', width: 170, fixed: 'left'}, {key: 'subscriptionId', title: '订单 / 模板', width: 250}, {key: 'user', title: '用户', width: 160},
    {key: 'reason', title: '结束原因', width: 130}, {key: 'capital', title: '本金（USDT）', width: 130, align: 'right'}, {key: 'pnl', title: '盈亏（USDT）', width: 140, align: 'right'},
    {key: 'returned', title: '返还（USDT）', width: 140, align: 'right'}, {key: 'operator', title: '处理人', width: 150},
  ],
  logs: [
    {key: 'createdAt', title: '时间', width: 170, fixed: 'left'}, {key: 'action', title: '操作', width: 140}, {key: 'refId', title: '关联记录', width: 230},
    {key: 'summary', title: '说明', width: 280}, {key: 'operator', title: '操作人', width: 150},
  ],
})[mode.value])
function search(values) { filters.value = {...blankFilters(), ...values, q: (values.q || '').trim()}; page.value = 1 }
function reset() { filters.value = blankFilters(); page.value = 1 }
const tone = value => (value > 0 ? 'success' : value < 0 ? 'danger' : undefined)

// ----- dialogs: detail / review / force stop -----
const dialog = ref(''), selectedId = ref(''), rejecting = ref(false)
const current = computed(() => subById.value[selectedId.value] || null)
const currentSettlement = computed(() => state.value.settlements.find(r => r.subscriptionId === selectedId.value) || null)
function open(row, kind) { selectedId.value = row.subscriptionId; rejecting.value = false; dialog.value = kind }
function closeDialog() { dialog.value = '' }
// Records drawer: its own selection so it never fights the detail/force-stop dialogs.
const drawerOpen = ref(false), drawerId = ref(''), drawerKind = ref('daily'), drawerReturnFocus = shallowRef(null)
const drawerSub = computed(() => subById.value[drawerId.value] || null)
const drawerDaily = computed(() => state.value.dailyPnl.filter(r => r.subscriptionId === drawerId.value))
const drawerLogs = computed(() => state.value.logs.filter(r => r.refId === drawerId.value))
function openRecords(row, kind, event) { if (drawerOpen.value) return; drawerId.value = row.subscriptionId; drawerKind.value = kind; drawerReturnFocus.value = event.currentTarget; drawerOpen.value = true }
const dialogTitle = computed(() => ({detail: current.value?.status === 'pending_review' ? '审核策略订阅' : '策略详情', forceStop: '强制停止策略'})[dialog.value] || '')
async function run(action, args, success) {
  if (busy.value) return
  try { await strategyCommand(action, {subscriptionId: selectedId.value, ...args}); message.success(success); closeDialog() } catch (e) { message.error(errorText(e)) }
}
</script>

<template>
 <PageShell>
  <FeedbackToast v-if="error" type="error" :source="() => (error ? errorText(error) : '')"><Button @click="refresh">重试</Button></FeedbackToast>
  <SearchForm :key="mode" :name="'strategy-' + mode + '-filters'" :model="filters" :fields="fields" @search="search" @reset="reset"/>
  <AdminTable :title="titles[mode]" v-model:page="page" :rows="rows" :columns="columns" :row-key="rowKey" :loading="!loaded && !error" desktop-only>
   <template #toolbar><Button @click="refresh">刷新</Button></template>
   <template #cell="{column, record}">
    <Space v-if="column.key === 'subscriptionId'" direction="vertical" :size="0"><TypographyText copyable>{{ record.subscriptionId }}</TypographyText><TypographyText type="secondary">{{ record.templateSnapshot?.name || record.templateName || subById[record.subscriptionId]?.templateSnapshot.name }}</TypographyText></Space>
    <Space v-else-if="column.key === 'user'" direction="vertical" :size="0"><span>{{ record.userName }}</span><TypographyText type="secondary">{{ record.userId }}</TypographyText></Space>
    <template v-else-if="['capital', 'returned'].includes(column.key)">{{ amount(record[column.key]) }}</template>
    <Space v-else-if="column.key === 'pnl'" direction="vertical" :size="0" align="end"><TypographyText :type="tone(record.pnl)">{{ signed(record.pnl) }}</TypographyText><TypographyText v-if="mode === 'subscriptions'" type="secondary">{{ percent(record.pnl, record.capital) }}</TypographyText></Space>
    <template v-else-if="column.key === 'terms'">{{ record.days }} 天 / {{ record.takeProfit }}% / {{ record.stopLoss }}%</template>
    <Space v-else-if="column.key === 'status'" :size="4" wrap><Tag :color="statusColors[record.status]">{{ statusLabels[record.status] }}</Tag><TypographyText v-if="record.endReason" type="secondary">{{ endReasonLabels[record.endReason] }}</TypographyText></Space>
    <template v-else-if="column.key === 'reason'">{{ endReasonLabels[record.reason] }}</template>
    <template v-else-if="column.key === 'action'">{{ actionLabels[record.action] || record.action }}</template>
    <template v-else-if="['createdAt', 'settledAt'].includes(column.key)">{{ dateTime(record[column.key]) }}</template>
    <template v-else-if="column.key === 'reviewer'">{{ record.reviewer || '' }}</template>
    <Space v-else-if="column.key === 'actions'" :size="8" class="strategy-row-actions">
     <Button v-if="record.status === 'pending_review'" type="link" @click="open(record, 'detail')">审核</Button>
     <Button v-else type="link" @click="open(record, 'detail')">详情</Button>
     <Button v-if="record.runningAt" type="link" @click="openRecords(record, 'daily', $event)">收益</Button>
     <Button type="link" @click="openRecords(record, 'logs', $event)">记录</Button>
     <Button v-if="['initializing', 'running', 'paused'].includes(record.status)" type="link" danger @click="open(record, 'forceStop')">停止</Button>
    </Space>
    <template v-else>{{ record[column.key] ?? '—' }}</template>
   </template>
  </AdminTable>

  <AdminModal :open="dialog === 'detail'" :width="1000" :title="dialogTitle" :busy="busy" @close="closeDialog">
   <StrategySubscriptionDetails v-if="current" :key="current.subscriptionId" :sub="current" :settlement="currentSettlement" :balance="state.balances[current.userId]?.USDT ?? null"/>
   <template #actions><template v-if="current?.status === 'pending_review'">
    <template v-if="rejecting"><TypographyText type="secondary">拒绝后退回 {{ amount(current.capital) }} USDT 本金，订单保留记录。</TypographyText><Button :disabled="busy" @click="rejecting = false">返回审核</Button><Button danger type="primary" :loading="busy" @click="run('reject', {}, '已拒绝，本金已退回')">确认拒绝</Button></template>
    <template v-else><Button danger :disabled="busy" @click="rejecting = true">拒绝</Button><Button type="primary" :loading="busy" @click="run('approve', {}, '审核通过，策略开始初始化')">通过</Button></template>
   </template></template>
  </AdminModal>

  <AdminModal :open="dialog === 'forceStop'" :title="dialogTitle" :busy="busy" confirm-text="确认停止" danger @close="closeDialog" @confirm="run('forceStop', {}, '策略已停止并完成结算')">
   <div v-if="current"><TypographyText strong>{{ current.templateSnapshot.name }} · {{ current.userName }}</TypographyText>
    <p>将立即结束该策略，按 本金 {{ amount(current.capital) }} + 累计盈亏 {{ signed(current.pnl) }} = {{ amount(Math.max(0, current.capital + current.pnl)) }} USDT 返还给用户，结束原因记为「后台强制停止」。此操作不能撤销。</p></div>
  </AdminModal>

  <StrategyRecordsDrawer :open="drawerOpen" :kind="drawerKind" :sub="drawerSub" :daily="drawerDaily" :logs="drawerLogs" :return-focus="drawerReturnFocus" @close="drawerOpen = false" @closed="drawerId = ''; drawerReturnFocus = null"/>
 </PageShell>
</template>

<style scoped>
/* Two-character link actions: trim the library's 15px link padding so four actions fit without wide gaps. */
.strategy-row-actions :deep(.ant-btn-link){padding-inline:4px}
</style>
