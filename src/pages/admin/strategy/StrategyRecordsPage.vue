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
import UserDetailDrawer from '../../../admin/components/user/UserDetailDrawer.vue'
import {getUserById} from '../../../admin/mock/user.js'
import {USER_KYC_STATUS, USER_ROLE, USER_STATUS} from '../../../admin/constants/user.js'
import {useStrategyFeed, strategyCommand, errorText, statusLabels, statusColors, endReasonLabels, actionLabels} from '../../../shared/strategy/client.js'
import {money} from '../../../shared/strategy/domain.js'
import {amount, signed, dateTime, percent} from './strategyFormat.js'

// One page for the strategy ledgers, chosen by route: user strategies, daily P&L, settlements, operation log.
const route = useRoute(), {state, error, busy, loaded, refresh} = useStrategyFeed()
const mode = computed(() => route.meta.strategySection)
const titles = {subscriptions: '用户策略', 'daily-pnl': '收益记录', settlements: '结算记录', logs: '操作日志'}
// One input per field (user decision, 2026-11-27): no combined keyword search.
const blankFilters = () => ({subscriptionId: '', userId: '', template: '', refId: '', operator: '', status: 'all', reason: 'all', action: 'all', period: null})
const filters = ref(blankFilters())
const page = ref(1)
watch(mode, () => { filters.value = blankFilters(); page.value = 1; closeDialog() })

const fields = computed(() => ({
  subscriptions: [orderField, userField, {key: 'template', label: '策略模板'}, {key: 'period', label: '提交时间', range: true}, {key: 'status', label: '状态', options: [{value: 'all', label: '全部状态'}, ...Object.entries(statusLabels).map(([value, label]) => ({value, label}))]}],
  'daily-pnl': [orderField, userField, {key: 'period', label: '日期', range: true}],
  settlements: [orderField, userField, {key: 'period', label: '结算时间', range: true}, {key: 'reason', label: '结束原因', options: [{value: 'all', label: '全部原因'}, ...Object.entries(endReasonLabels).map(([value, label]) => ({value, label}))]}],
  logs: [{key: 'refId', label: '关联记录'}, {key: 'action', label: '操作', options: [{value: 'all', label: '全部操作'}, ...Object.entries(actionLabels).map(([value, label]) => ({value, label}))]}, {key: 'operator', label: '操作人'}],
})[mode.value])
const orderField = {key: 'subscriptionId', label: '订单号'}, userField = {key: 'userId', label: '用户 ID'}
// Each filled text field must match its own column (case-insensitive contains).
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const match = (row, f) => has(row.subscriptionId, f.subscriptionId) && has(row.userId, f.userId)
// Date range (inclusive, by the calendar day the table shows): timestamps use the browser's local day, P&L rows their own date.
const pad = n => String(n).padStart(2, '0')
const localDay = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const inPeriod = (day, period) => !period?.length || (day >= period[0] && day <= period[1])
const subById = computed(() => Object.fromEntries(state.value.subscriptions.map(s => [s.subscriptionId, s])))
const rows = computed(() => {
  const f = filters.value, s = state.value
  if (mode.value === 'subscriptions') return s.subscriptions.filter(r => match(r, f) && inPeriod(localDay(r.createdAt), f.period) && has(r.templateSnapshot.name, f.template) && (f.status === 'all' || r.status === f.status))
  if (mode.value === 'daily-pnl') return s.dailyPnl.filter(r => match(r, f) && inPeriod(r.date, f.period))
  if (mode.value === 'settlements') return s.settlements.filter(r => match(r, f) && inPeriod(localDay(r.settledAt), f.period) && (f.reason === 'all' || r.reason === f.reason))
  return s.logs.filter(r => has(r.refId, f.refId) && has(r.operator, f.operator) && (f.action === 'all' || r.action === f.action))
})
watch(() => rows.value.length, total => { page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 10))) })
const rowKey = r => r.subscriptionId && !r.settlementId && !r.date ? r.subscriptionId : r.settlementId || r.id
// One fact per column, single-line cells (no stacked order/template or name/id pairs).
const col = (key, title, width, extra = {}) => ({key, title, width, ...extra})
const right = {align: 'right'}
const orderCols = [col('subscriptionId', '订单号', 200), col('templateName', '策略模板', 210), col('userId', '用户 ID', 120)]
const columns = computed(() => ({
  subscriptions: [
    {...orderCols[0], fixed: 'left'}, ...orderCols.slice(1),
    col('capital', '本金（USDT）', 130, right), col('pnl', '累计盈亏（USDT）', 150, right), col('pnlRate', '收益率', 100, right),
    col('days', '运行周期', 100, right), col('status', '状态', 100), col('createdAt', '提交时间', 170), col('reviewer', '审核人', 140),
    col('actions', '操作', 220, {fixed: 'right'}),
  ],
  'daily-pnl': [
    col('date', '日期', 120, {fixed: 'left'}), ...orderCols, col('capital', '本金（USDT）', 130, right), col('tradeCount', '成交笔数', 100, right),
    col('pnl', '当日盈亏（USDT）', 150, right), col('pnlRate', '当日收益率', 110, right), col('cumulative', '累计盈亏（USDT）', 150, right),
  ],
  settlements: [
    col('settledAt', '结算时间', 170, {fixed: 'left'}), ...orderCols, col('reason', '结束原因', 120),
    col('capital', '本金（USDT）', 130, right), col('pnl', '盈亏（USDT）', 140, right), col('returned', '返还（USDT）', 140, right), col('operator', '处理人', 150),
  ],
  logs: [
    col('createdAt', '时间', 170, {fixed: 'left'}), col('action', '操作', 130), col('targetLabel', '对象', 210),
    col('refId', '关联记录', 220), col('summary', '说明', 420), col('operator', '操作人', 150),
  ],
})[mode.value])
// The subscription a ledger row belongs to (template, terms, user name live there).
const subOf = row => (mode.value === 'subscriptions' ? row : subById.value[row.subscriptionId]) || {}
// Cumulative P&L of each daily row: the order's running total up to and including that date.
const cumulative = computed(() => {
  const total = {}, out = {}
  for (const r of [...state.value.dailyPnl].sort((a, b) => a.date.localeCompare(b.date))) out[r.id] = total[r.subscriptionId] = money((total[r.subscriptionId] || 0) + r.pnl)
  return out
})
function search(values) { filters.value = {...blankFilters(), ...values}; page.value = 1 }
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
// User drawer, as in Earn/Lending: platform users open their own record; strategy mock users (USR-DEMO, USR-1002…)
// have no platform account, so their drawer is filled from the strategy profile and balance, marked as simulated.
const KYC = {none: USER_KYC_STATUS.NOT_VERIFIED, basic: USER_KYC_STATUS.PENDING, advanced: USER_KYC_STATUS.VERIFIED}
const userOpen = ref(false), detailUser = shallowRef(null), userReturnFocus = shallowRef(null)
function strategyUser(userId, userName) {
  const profile = state.value.profiles?.[userId] || {}
  return {id: userId, username: userName || profile.name || userId, email: '—', role: USER_ROLE.USER, status: USER_STATUS.ACTIVE,
    kycStatus: KYC[profile.verificationLevel] || USER_KYC_STATUS.NOT_VERIFIED, vipLevel: profile.vipLevel ?? 0, isVip: (profile.vipLevel ?? 0) > 0,
    balance: state.value.balances?.[userId]?.USDT ?? 0, frozenBalance: 0, remark: '策略模拟用户（非平台账户）'}
}
function showUser(row, event) {
  if (userOpen.value) return
  const name = row.userName || subById.value[row.subscriptionId]?.userName
  detailUser.value = getUserById(row.userId) || strategyUser(row.userId, name)
  userReturnFocus.value = event.currentTarget
  userOpen.value = true
}
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
    <TypographyText v-if="['subscriptionId', 'refId'].includes(column.key) && record[column.key]" copyable>{{ record[column.key] }}</TypographyText>
    <template v-else-if="column.key === 'templateName'">{{ subOf(record).templateSnapshot?.name || record.templateName || '—' }}</template>
    <Button v-else-if="column.key === 'userId'" type="link" class="strategy-user-link" :aria-label="'查看用户 ' + record.userId" @click.stop="showUser(record, $event)">{{ record.userId }}</Button>
    <template v-else-if="['capital', 'returned'].includes(column.key)">{{ amount(record[column.key] ?? subOf(record).capital) }}</template>
    <TypographyText v-else-if="column.key === 'pnl'" :type="tone(record.pnl)">{{ signed(record.pnl) }}</TypographyText>
    <TypographyText v-else-if="column.key === 'pnlRate'" :type="tone(record.pnl)">{{ percent(record.pnl, record.capital ?? subOf(record).capital) }}</TypographyText>
    <TypographyText v-else-if="column.key === 'cumulative'" :type="tone(cumulative[record.id])">{{ signed(cumulative[record.id]) }}</TypographyText>
    <template v-else-if="column.key === 'tradeCount'">{{ record.tradeCount ?? 0 }}</template>
    <template v-else-if="column.key === 'days'">{{ subOf(record).days }} 天</template>
    <Tag v-else-if="column.key === 'status'" :color="statusColors[record.status]">{{ statusLabels[record.status] }}</Tag>
    <template v-else-if="column.key === 'reason'">{{ endReasonLabels[record.reason] }}</template>
    <template v-else-if="column.key === 'action'">{{ actionLabels[record.action] || record.action }}</template>
    <template v-else-if="['createdAt', 'settledAt'].includes(column.key)">{{ dateTime(record[column.key]) }}</template>
    <template v-else-if="column.key === 'reviewer'">{{ record.reviewer || '' }}</template>
    <Space v-else-if="column.key === 'actions'" :size="8" class="strategy-row-actions">
     <Button v-if="record.status === 'pending_review'" type="link" @click="open(record, 'detail')">审核</Button>
     <Button v-else type="link" @click="open(record, 'detail')">详情</Button>
     <Button v-if="record.runningAt" type="link" @click="openRecords(record, 'daily', $event)">收益</Button>
     <Button v-if="record.status !== 'pending_review'" type="link" @click="openRecords(record, 'logs', $event)">记录</Button>
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

  <AdminModal :width="520" :open="dialog === 'forceStop'" :title="dialogTitle" :busy="busy" confirm-text="确认停止" danger @close="closeDialog" @confirm="run('forceStop', {}, '策略已停止并完成结算')">
   <div v-if="current"><TypographyText strong>{{ current.templateSnapshot.name }} · {{ current.userName }}</TypographyText>
    <p>将立即结束该策略，按 本金 {{ amount(current.capital) }} + 累计盈亏 {{ signed(current.pnl) }} = {{ amount(Math.max(0, current.capital + current.pnl)) }} USDT 返还给用户，结束原因记为「后台强制停止」。此操作不能撤销。</p></div>
  </AdminModal>

  <StrategyRecordsDrawer :open="drawerOpen" :kind="drawerKind" :sub="drawerSub" :daily="drawerDaily" :logs="drawerLogs" :return-focus="drawerReturnFocus" @close="drawerOpen = false" @closed="drawerId = ''; drawerReturnFocus = null"/>
  <UserDetailDrawer :visible="userOpen" :user="detailUser" :return-focus="userReturnFocus" @close="userOpen = false" @closed="detailUser = null; userReturnFocus = null"/>
 </PageShell>
</template>

<style scoped>
/* Two-character link actions: trim the library's 15px link padding so four actions fit without wide gaps. */
.strategy-row-actions :deep(.ant-btn-link){padding-inline:4px}
/* User id as an inline text link: no button box inside the table row. */
.strategy-user-link{height:auto;padding:0}
/* Ledger cells hold one fact each and stay on one line; the table scrolls horizontally instead. */
:deep(.ant-table-cell){white-space:nowrap}
</style>
