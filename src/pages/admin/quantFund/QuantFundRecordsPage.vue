<script setup>
// 量化基金 ledgers on one page, chosen by route: 申购订单, 赎回审核, 收益记录, 操作日志.
// Follows the strategy ledger conventions: one input per search field, one fact per single-line column,
// review/detail in a modal, payouts and logs per order in a drawer, user IDs open the shared user drawer.
import {computed, ref, shallowRef, watch} from 'vue'
import {useRoute} from 'vue-router'
import {message, Button, Space, Tag, TypographyText} from 'ant-design-vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import QuantFundOrderDetails from './QuantFundOrderDetails.vue'
import QuantFundRecordsDrawer from './QuantFundRecordsDrawer.vue'
import UserDetailDrawer from '../../../admin/components/user/UserDetailDrawer.vue'
import {getUserById} from '../../../admin/mock/user.js'
import {USER_KYC_STATUS, USER_ROLE, USER_STATUS} from '../../../admin/constants/user.js'
import {useQuantFundFeed, quantFundCommand, errorText, orderStatusLabels, orderStatusColors, redemptionStatusLabels, redemptionStatusColors, actionLabels, endReasonLabels, lockLabel} from '../../../shared/quantFund/client.js'
import {heldDays} from '../../../shared/quantFund/domain.js'
import {amount, dateTime} from '../strategy/strategyFormat.js'

const route = useRoute(), {state, error, busy, loaded, refresh} = useQuantFundFeed()
const mode = computed(() => route.meta.quantFundSection)
const titles = {orders: '申购订单', redemptions: '赎回审核', payouts: '收益记录', logs: '操作日志'}
// One input per field (user decision, 2026-11-27): no combined keyword search.
const blankFilters = () => ({orderId: '', redemptionId: '', userId: '', product: '', date: '', refId: '', operator: '', status: 'all', action: 'all'})
const filters = ref(blankFilters())
const page = ref(1)
watch(mode, () => { filters.value = blankFilters(); page.value = 1; closeDialog() })

const orderField = {key: 'orderId', label: '订单号'}, userField = {key: 'userId', label: '用户 ID'}
const options = (labels, all) => [{value: 'all', label: all}, ...Object.entries(labels).map(([value, label]) => ({value, label}))]
const fields = computed(() => ({
  orders: [orderField, userField, {key: 'product', label: '产品名称'}, {key: 'status', label: '状态', options: options(orderStatusLabels, '全部状态')}],
  redemptions: [{key: 'redemptionId', label: '赎回单号'}, orderField, userField, {key: 'status', label: '状态', options: options(redemptionStatusLabels, '全部状态')}],
  payouts: [orderField, userField, {key: 'date', label: '计息日期'}],
  logs: [{key: 'refId', label: '关联记录'}, {key: 'action', label: '操作', options: options(actionLabels, '全部操作')}, {key: 'operator', label: '操作人'}],
})[mode.value])
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const orderById = computed(() => Object.fromEntries(state.value.orders.map(o => [o.orderId, o])))
const orderOf = row => (mode.value === 'orders' ? row : orderById.value[row.orderId]) || {}
const rows = computed(() => {
  const f = filters.value, s = state.value
  const base = r => has(r.orderId, f.orderId) && has(r.userId, f.userId)
  if (mode.value === 'orders') return s.orders.filter(r => base(r) && has(r.productSnapshot.name, f.product) && (f.status === 'all' || r.status === f.status))
  if (mode.value === 'redemptions') return s.redemptions.filter(r => base(r) && has(r.redemptionId, f.redemptionId) && (f.status === 'all' || r.status === f.status))
  if (mode.value === 'payouts') return s.payouts.filter(r => base(r) && has(r.date, f.date))
  return s.logs.filter(r => has(r.refId, f.refId) && has(r.operator, f.operator) && (f.action === 'all' || r.action === f.action))
})
watch(() => rows.value.length, total => { page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 10))) })
const rowKey = r => r.redemptionId || (r.date ? r.id : r.orderId && !r.module ? r.orderId : r.id)
const col = (key, title, width, extra = {}) => ({key, title, width, ...extra})
const right = {align: 'right'}
const orderCols = [col('orderId', '订单号', 210), col('productName', '产品', 310), col('userName', '用户名', 120), col('userId', '用户 ID', 120)]
const columns = computed(() => ({
  orders: [
    {...orderCols[0], fixed: 'left'}, ...orderCols.slice(1), col('term', '锁定期', 90),
    col('principal', '本金（USDT）', 140, right), col('accruedInterest', '累计收益（USDT）', 150, right), col('accrualCount', '计息天数', 100, right),
    col('status', '状态', 110), col('endReason', '赎回方式', 100), col('returned', '实际返还（USDT）', 150, right),
    col('createdAt', '提交时间', 170), col('interestStartAt', '起息时间', 170), col('lockUntil', '锁定到期', 170),
    col('reviewer', '审核人', 120), col('actions', '操作', 170, {fixed: 'right'}),
  ],
  redemptions: [
    col('requestedAt', '申请时间', 170, {fixed: 'left'}), col('redemptionId', '赎回单号', 210), ...orderCols,
    col('kind', '类型', 100), col('principal', '本金（USDT）', 140, right), col('heldDays', '持有天数', 100, right),
    col('feeRate', '手续费率', 100, right), col('fee', '手续费（USDT）', 130, right), col('accruedInterest', '累计收益（USDT）', 150, right),
    col('returned', '实际返还（USDT）', 150, right), col('status', '状态', 100), col('reviewer', '审核人', 120), col('reviewedAt', '审核时间', 170), col('actions', '操作', 90, {fixed: 'right'}),
  ],
  payouts: [
    col('date', '计息日期', 120, {fixed: 'left'}), ...orderCols, col('principal', '本金（USDT）', 140, right),
    col('rate', '日收益率', 100, right), col('amount', '当日收益（USDT）', 140, right), col('createdAt', '计入时间', 170),
  ],
  logs: [
    col('createdAt', '时间', 170, {fixed: 'left'}), col('module', '模块', 90), col('action', '操作', 110), col('targetLabel', '对象', 280),
    col('refId', '关联记录', 220), col('summary', '说明', 380), col('operator', '操作人', 150),
  ],
})[mode.value])
const moduleLabels = {order: '申购订单', redemption: '赎回', product: '产品', system: '系统'}
function search(values) { filters.value = {...blankFilters(), ...values}; page.value = 1 }
function reset() { filters.value = blankFilters(); page.value = 1 }

// ----- dialogs: order review/detail, redemption review -----
const dialog = ref(''), selectedId = ref(''), rejecting = ref(false)
const current = computed(() => orderById.value[selectedId.value] || null)
const currentRedemption = computed(() => state.value.redemptions.find(r => r.orderId === selectedId.value) || null)
function open(row, kind) { selectedId.value = row.orderId; rejecting.value = false; dialog.value = kind }
function closeDialog() { dialog.value = '' }
const dialogTitle = computed(() => ({
  detail: current.value?.status === 'pending_review' ? '审核申购订单' : '订单详情',
  redemption: currentRedemption.value?.status === 'pending_review' ? '审核赎回申请' : '赎回详情',
})[dialog.value] || '')
async function run(action, args, success) {
  if (busy.value) return
  try { await quantFundCommand(action, args); message.success(success); closeDialog() } catch (e) { message.error(errorText(e)) }
}

// Per-order drawer: daily payouts or operation log.
const drawerOpen = ref(false), drawerId = ref(''), drawerKind = ref('daily'), drawerReturnFocus = shallowRef(null)
const drawerOrder = computed(() => orderById.value[drawerId.value] || null)
const drawerPayouts = computed(() => state.value.payouts.filter(r => r.orderId === drawerId.value))
const drawerLogs = computed(() => state.value.logs.filter(r => r.refId === drawerId.value))
function openRecords(row, kind, event) { if (drawerOpen.value) return; drawerId.value = row.orderId; drawerKind.value = kind; drawerReturnFocus.value = event.currentTarget; drawerOpen.value = true }

// User drawer: platform users open their own record; mock users are filled from the fund profile and balance.
const KYC = {none: USER_KYC_STATUS.NOT_VERIFIED, basic: USER_KYC_STATUS.PENDING, advanced: USER_KYC_STATUS.VERIFIED}
const userOpen = ref(false), detailUser = shallowRef(null), userReturnFocus = shallowRef(null)
function fundUser(userId, userName) {
  const profile = state.value.profiles?.[userId] || {}
  return {id: userId, username: userName || profile.name || userId, email: '—', role: USER_ROLE.USER, status: USER_STATUS.ACTIVE,
    kycStatus: KYC[profile.verificationLevel] || USER_KYC_STATUS.NOT_VERIFIED, vipLevel: profile.vipLevel ?? 0, isVip: (profile.vipLevel ?? 0) > 0,
    balance: state.value.balances?.[userId]?.USDT ?? 0, frozenBalance: 0}
}
function showUser(row, event) {
  if (userOpen.value) return
  detailUser.value = getUserById(row.userId) || fundUser(row.userId, row.userName || orderOf(row).userName)
  userReturnFocus.value = event.currentTarget
  userOpen.value = true
}
</script>

<template>
 <PageShell>
  <FeedbackToast v-if="error" type="error" :source="() => (error ? errorText(error) : '')"><Button @click="refresh">重试</Button></FeedbackToast>
  <SearchForm :key="mode" :name="'quant-fund-' + mode + '-filters'" :model="filters" :fields="fields" @search="search" @reset="reset"/>
  <AdminTable :title="titles[mode]" v-model:page="page" :rows="rows" :columns="columns" :row-key="rowKey" :loading="!loaded && !error" desktop-only>
   <template #toolbar><Button @click="refresh">刷新</Button></template>
   <template #cell="{column, record}">
    <TypographyText v-if="['orderId', 'redemptionId', 'refId'].includes(column.key) && record[column.key]" copyable>{{ record[column.key] }}</TypographyText>
    <template v-else-if="column.key === 'productName'">{{ orderOf(record).productSnapshot?.name || record.productName || '—' }}</template>
    <template v-else-if="column.key === 'term'">{{ lockLabel(record.productSnapshot.lockDays) }}</template>
    <template v-else-if="column.key === 'userName'">{{ record.userName || orderOf(record).userName || '—' }}</template>
    <Button v-else-if="column.key === 'userId'" type="link" class="qf-user-link" :aria-label="'查看用户 ' + record.userId" @click.stop="showUser(record, $event)">{{ record.userId }}</Button>
    <template v-else-if="column.key === 'principal'">{{ amount(record.principal ?? orderOf(record).principal) }}</template>
    <!-- Redemptions show the interest settled at approval; while pending, the order's running total. -->
    <TypographyText v-else-if="column.key === 'accruedInterest'" :type="(record.interest ?? orderOf(record).accruedInterest) ? 'success' : undefined">{{ amount(record.interest ?? orderOf(record).accruedInterest) }}</TypographyText>
    <template v-else-if="column.key === 'accrualCount'">{{ record.accrualCount }} 天</template>
    <template v-else-if="column.key === 'endReason'">{{ endReasonLabels[record.endReason] || '—' }}</template>
    <template v-else-if="column.key === 'returned'">{{ record.returned == null ? '—' : amount(record.returned) }}</template>
    <Tag v-else-if="column.key === 'kind'" :color="record.early ? 'orange' : 'default'">{{ record.early ? '提前赎回' : '正常赎回' }}</Tag>
    <template v-else-if="column.key === 'feeRate'">{{ record.early ? record.feeRate + '%' : '—' }}</template>
    <template v-else-if="column.key === 'fee'">{{ record.fee ? amount(record.fee) : '—' }}</template>
    <TypographyText v-else-if="column.key === 'amount'" type="success">+{{ amount(record.amount) }}</TypographyText>
    <template v-else-if="column.key === 'rate'">{{ record.rate }}%</template>
    <template v-else-if="column.key === 'heldDays'">{{ heldDays(orderOf(record), record.reviewedAt || Date.now()) }} 天</template>
    <Tag v-else-if="column.key === 'status' && mode === 'redemptions'" :color="redemptionStatusColors[record.status]">{{ redemptionStatusLabels[record.status] }}</Tag>
    <Tag v-else-if="column.key === 'status'" :color="orderStatusColors[record.status]">{{ orderStatusLabels[record.status] }}</Tag>
    <template v-else-if="column.key === 'module'">{{ moduleLabels[record.module] || record.module || '—' }}</template>
    <template v-else-if="column.key === 'action'">{{ actionLabels[record.action] || record.action }}</template>
    <template v-else-if="['createdAt', 'interestStartAt', 'requestedAt', 'reviewedAt'].includes(column.key)">{{ dateTime(record[column.key]) }}</template>
    <template v-else-if="column.key === 'lockUntil'">{{ record.productSnapshot.lockDays == null ? '无锁定期' : dateTime(record.lockUntil) }}</template>
    <template v-else-if="column.key === 'reviewer'">{{ record.reviewer || '' }}</template>
    <Space v-else-if="column.key === 'actions' && mode === 'redemptions'" :size="8" class="qf-row-actions">
     <Button type="link" @click="open(record, 'redemption')">{{ record.status === 'pending_review' ? '审核' : '详情' }}</Button>
    </Space>
    <Space v-else-if="column.key === 'actions'" :size="8" class="qf-row-actions">
     <Button type="link" @click="open(record, 'detail')">{{ record.status === 'pending_review' ? '审核' : '详情' }}</Button>
     <Button v-if="record.interestStartAt" type="link" @click="openRecords(record, 'daily', $event)">收益</Button>
     <Button v-if="record.status !== 'pending_review'" type="link" @click="openRecords(record, 'logs', $event)">记录</Button>
    </Space>
    <template v-else>{{ record[column.key] ?? '—' }}</template>
   </template>
  </AdminTable>

  <AdminModal :open="dialog === 'detail'" :width="1000" :title="dialogTitle" :busy="busy" @close="closeDialog">
   <QuantFundOrderDetails v-if="current" :key="current.orderId" :order="current" :redemption="currentRedemption" :balance="state.balances[current.userId]?.USDT ?? null"/>
   <template #actions><template v-if="current?.status === 'pending_review'">
    <template v-if="rejecting"><TypographyText type="secondary">拒绝后退回 {{ amount(current.principal) }} USDT 本金，订单保留记录。</TypographyText><Button :disabled="busy" @click="rejecting = false">返回审核</Button><Button danger type="primary" :loading="busy" @click="run('reject', {orderId: current.orderId}, '已拒绝，本金已退回')">确认拒绝</Button></template>
    <template v-else><Button danger :disabled="busy" @click="rejecting = true">拒绝</Button><Button type="primary" :loading="busy" @click="run('approve', {orderId: current.orderId}, '审核通过，订单开始计息')">通过</Button></template>
   </template></template>
  </AdminModal>

  <AdminModal :open="dialog === 'redemption'" :width="1000" :title="dialogTitle" :busy="busy" @close="closeDialog">
   <QuantFundOrderDetails v-if="current" :key="current.orderId" :order="current" :redemption="currentRedemption" :balance="state.balances[current.userId]?.USDT ?? null"/>
   <template #actions><template v-if="currentRedemption?.status === 'pending_review'">
    <template v-if="rejecting"><TypographyText type="secondary">拒绝后订单恢复持有中，继续每日计息。</TypographyText><Button :disabled="busy" @click="rejecting = false">返回审核</Button><Button danger type="primary" :loading="busy" @click="run('rejectRedeem', {redemptionId: currentRedemption.redemptionId}, '已拒绝，订单恢复持有')">确认拒绝</Button></template>
    <template v-else><TypographyText type="secondary">通过后返还 本金 {{ amount(currentRedemption.principal) }} + 累计收益 {{ amount(current.accruedInterest) }}<template v-if="currentRedemption.fee"> − 手续费 {{ amount(currentRedemption.fee) }}</template> USDT。</TypographyText><Button danger :disabled="busy" @click="rejecting = true">拒绝</Button><Button type="primary" :loading="busy" @click="run('approveRedeem', {redemptionId: currentRedemption.redemptionId}, '赎回已通过，本金与收益已返还')">通过</Button></template>
   </template></template>
  </AdminModal>

  <QuantFundRecordsDrawer :open="drawerOpen" :kind="drawerKind" :order="drawerOrder" :daily="drawerPayouts" :logs="drawerLogs" :return-focus="drawerReturnFocus" @close="drawerOpen = false" @closed="drawerId = ''; drawerReturnFocus = null"/>
  <UserDetailDrawer :visible="userOpen" :user="detailUser" :return-focus="userReturnFocus" @close="userOpen = false" @closed="detailUser = null; userReturnFocus = null"/>
 </PageShell>
</template>

<style scoped>
.qf-row-actions :deep(.ant-btn-link){padding-inline:4px}
.qf-user-link{height:auto;padding:0}
/* Ledger cells hold one fact each and stay on one line; the table scrolls horizontally instead. */
:deep(.ant-table-cell){white-space:nowrap}
</style>
