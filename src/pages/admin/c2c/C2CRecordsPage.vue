<script setup>
// C2C 交易 → 订单审核 / 操作日志, chosen by route. Quant Fund ledger conventions: one input per search field, one
// fact per single-line column, review and detail in a modal (two-step reject, no reason input), user IDs open the
// shared user drawer. Pending orders have the primary 审核 action; finished ones a read-only 详情.
import {computed, ref, shallowRef, watch} from 'vue'
import {useRoute} from 'vue-router'
import {message, Button, Descriptions, DescriptionsItem, Space, Tag, TypographyText} from 'ant-design-vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import UserDetailDrawer from '../../../admin/components/user/UserDetailDrawer.vue'
import {getUserById} from '../../../admin/mock/user.js'
import {USER_KYC_STATUS, USER_ROLE, USER_STATUS} from '../../../admin/constants/user.js'
import {useC2CFeed, c2cCommand, errorText, sideLabels, sideColors, orderStatusLabels, orderStatusColors, actionLabels, moduleLabels} from '../../../shared/c2c/client.js'
import {ASSETS} from '../../../shared/c2c/domain.js'
import {dateTime} from '../strategy/strategyFormat.js'

const number = value => value == null ? '—' : Number(value).toLocaleString('en-US', {maximumFractionDigits: 8})
const route = useRoute(), {state, error, busy, loaded, refresh} = useC2CFeed()
const mode = computed(() => route.meta.c2cSection)
const titles = {orders: 'C2C 订单', logs: '操作日志'}
const blankFilters = () => ({orderId: '', userId: '', refId: '', operator: '', symbol: 'all', side: 'all', status: 'all', action: 'all'})
const filters = ref(blankFilters())
const page = ref(1)
watch(mode, () => { filters.value = blankFilters(); page.value = 1; closeDialog() })
const options = (labels, all) => [{value: 'all', label: all}, ...Object.entries(labels).map(([value, label]) => ({value, label}))]
const fields = computed(() => ({
  orders: [{key: 'orderId', label: '订单号'}, {key: 'userId', label: '用户 ID'},
    {key: 'side', label: '方向', options: options(sideLabels, '全部方向')},
    {key: 'symbol', label: '币种', options: [{value: 'all', label: '全部币种'}, ...ASSETS.map(value => ({value, label: value}))]},
    {key: 'status', label: '状态', options: options(orderStatusLabels, '全部状态')}],
  logs: [{key: 'refId', label: '关联记录'}, {key: 'action', label: '操作', options: options(actionLabels, '全部操作')}, {key: 'operator', label: '操作人'}],
})[mode.value])
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const rows = computed(() => {
  const f = filters.value, s = state.value
  if (mode.value === 'orders') return s.orders.filter(o => has(o.orderId, f.orderId) && has(o.userId, f.userId) &&
    (f.side === 'all' || o.side === f.side) && (f.symbol === 'all' || o.symbol === f.symbol) && (f.status === 'all' || o.status === f.status))
  return s.logs.filter(l => has(l.refId, f.refId) && has(l.operator, f.operator) && (f.action === 'all' || l.action === f.action))
})
watch(() => rows.value.length, total => { page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 10))) })
const col = (key, title, width, extra = {}) => ({key, title, width, ...extra})
const right = {align: 'right'}
const columns = computed(() => ({
  orders: [
    col('orderId', '订单号', 210, {fixed: 'left'}), col('userName', '用户名', 120), col('userId', '用户 ID', 120), col('side', '方向', 96),
    col('symbol', '币种', 80), col('quantity', '数量', 140, right), col('price', '单价（USDT）', 140, right), col('amount', '金额（USDT）', 160, right),
    col('status', '状态', 90), col('createdAt', '提交时间', 170), col('reviewer', '审核人', 120), col('reviewedAt', '审核时间', 170),
    col('actions', '操作', 90, {fixed: 'right'}),
  ],
  logs: [
    col('createdAt', '时间', 170, {fixed: 'left'}), col('module', '模块', 80), col('action', '操作', 100), col('targetLabel', '对象', 220),
    col('refId', '关联记录', 220), col('summary', '说明', 420), col('operator', '操作人', 150),
  ],
})[mode.value])
const rowKey = r => r.orderId && !r.module ? r.orderId : r.id
function search(values) { filters.value = {...blankFilters(), ...values}; page.value = 1 }
function reset() { filters.value = blankFilters(); page.value = 1 }

// ----- review / detail -----
const dialog = ref(false), selectedId = ref(''), rejecting = ref(false)
const current = computed(() => state.value.orders.find(o => o.orderId === selectedId.value) || null)
const wallet = computed(() => current.value ? {available: state.value.balances[current.value.userId]?.[current.value.symbol] ?? 0, locked: state.value.locked[current.value.userId]?.[current.value.symbol] ?? 0} : null)
function open(row) { selectedId.value = row.orderId; rejecting.value = false; dialog.value = true }
function closeDialog() { dialog.value = false }
const effect = computed(() => {
  const o = current.value
  if (!o) return {approve: '', reject: ''}
  return o.side === 'buy'
    ? {approve: `通过后为用户入账 ${number(o.quantity)} ${o.symbol}（确认已线下收到 ${number(o.amount)} USDT）。`, reject: '拒绝后订单保留记录，不入账。'}
    : {approve: `通过后扣除冻结的 ${number(o.quantity)} ${o.symbol}，平台线下向用户打款 ${number(o.amount)} USDT。`, reject: `拒绝后解冻 ${number(o.quantity)} ${o.symbol}，退回用户可用余额。`}
})
async function run(action, success) {
  if (busy.value || !current.value) return
  try { await c2cCommand(action, {orderId: current.value.orderId}); message.success(success); closeDialog() } catch (e) { message.error(errorText(e)) }
}

// ----- user drawer: platform users open their own record; mock users are filled from the C2C profile -----
const userOpen = ref(false), detailUser = shallowRef(null), userReturnFocus = shallowRef(null)
function mockUser(userId, userName) {
  return {id: userId, username: userName || state.value.profiles?.[userId]?.name || userId, email: '—', role: USER_ROLE.USER, status: USER_STATUS.ACTIVE,
    kycStatus: USER_KYC_STATUS.NOT_VERIFIED, vipLevel: 0, isVip: false, balance: state.value.balances?.[userId]?.USDT ?? 0, frozenBalance: state.value.locked?.[userId]?.USDT ?? 0}
}
function showUser(row, event) {
  if (userOpen.value) return
  detailUser.value = getUserById(row.userId) || mockUser(row.userId, row.userName)
  userReturnFocus.value = event.currentTarget
  userOpen.value = true
}
</script>

<template>
 <PageShell>
  <FeedbackToast v-if="error" type="error" :source="() => (error ? errorText(error) : '')"><Button @click="refresh">重试</Button></FeedbackToast>
  <SearchForm :key="mode" :name="'c2c-' + mode + '-filters'" :model="filters" :fields="fields" @search="search" @reset="reset"/>
  <AdminTable :title="titles[mode]" v-model:page="page" :rows="rows" :columns="columns" :row-key="rowKey" :loading="!loaded && !error" desktop-only>
   <template #toolbar><Button @click="refresh">刷新</Button></template>
   <template #cell="{column, record}">
    <TypographyText v-if="['orderId', 'refId'].includes(column.key) && record[column.key]" copyable>{{ record[column.key] }}</TypographyText>
    <Button v-else-if="column.key === 'userId'" type="link" class="c2c-user-link" :aria-label="'查看用户 ' + record.userId" @click.stop="showUser(record, $event)">{{ record.userId }}</Button>
    <Tag v-else-if="column.key === 'side'" :color="sideColors[record.side]">{{ sideLabels[record.side] }}</Tag>
    <template v-else-if="['quantity', 'price', 'amount'].includes(column.key)">{{ number(record[column.key]) }}</template>
    <Tag v-else-if="column.key === 'status'" :color="orderStatusColors[record.status]">{{ orderStatusLabels[record.status] }}</Tag>
    <template v-else-if="['createdAt', 'reviewedAt'].includes(column.key)">{{ record[column.key] ? dateTime(record[column.key]) : '' }}</template>
    <template v-else-if="column.key === 'reviewer'">{{ record.reviewer || '' }}</template>
    <template v-else-if="column.key === 'module'">{{ moduleLabels[record.module] || record.module }}</template>
    <template v-else-if="column.key === 'action'">{{ actionLabels[record.action] || record.action }}</template>
    <Space v-else-if="column.key === 'actions'" :size="8" class="c2c-row-actions"><Button type="link" @click="open(record)">{{ record.status === 'pending_review' ? '审核' : '详情' }}</Button></Space>
    <template v-else>{{ record[column.key] ?? '—' }}</template>
   </template>
  </AdminTable>

  <AdminModal :open="dialog" :width="860" :title="current?.status === 'pending_review' ? '审核 C2C 订单' : 'C2C 订单详情'" :busy="busy" @close="closeDialog">
   <Descriptions v-if="current" bordered size="small" :column="2">
    <DescriptionsItem label="订单号"><TypographyText copyable>{{ current.orderId }}</TypographyText></DescriptionsItem>
    <DescriptionsItem label="状态"><Tag :color="orderStatusColors[current.status]">{{ orderStatusLabels[current.status] }}</Tag></DescriptionsItem>
    <DescriptionsItem label="用户">{{ current.userName }}（{{ current.userId }}）</DescriptionsItem>
    <DescriptionsItem label="方向"><Tag :color="sideColors[current.side]">{{ sideLabels[current.side] }}</Tag></DescriptionsItem>
    <DescriptionsItem label="数量">{{ number(current.quantity) }} {{ current.symbol }}</DescriptionsItem>
    <DescriptionsItem label="单价（下单时报价）">{{ number(current.price) }} USDT</DescriptionsItem>
    <DescriptionsItem label="金额">{{ number(current.amount) }} USDT</DescriptionsItem>
    <DescriptionsItem label="报价限额（下单时）">{{ number(current.quoteSnapshot.min) }} ~ {{ number(current.quoteSnapshot.max) }} {{ current.symbol }}</DescriptionsItem>
    <DescriptionsItem :label="`用户当前 ${current.symbol} 可用`">{{ number(wallet.available) }}</DescriptionsItem>
    <DescriptionsItem :label="`用户当前 ${current.symbol} 冻结`">{{ number(wallet.locked) }}</DescriptionsItem>
    <DescriptionsItem label="提交时间">{{ dateTime(current.createdAt) }}</DescriptionsItem>
    <DescriptionsItem label="审核人 / 时间">{{ current.reviewer || '—' }}<template v-if="current.reviewedAt"> · {{ dateTime(current.reviewedAt) }}</template><template v-else-if="current.cancelledAt"> · 用户于 {{ dateTime(current.cancelledAt) }} 取消</template></DescriptionsItem>
   </Descriptions>
   <template #actions><template v-if="current?.status === 'pending_review'">
    <template v-if="rejecting"><TypographyText type="secondary">{{ effect.reject }}</TypographyText><Button :disabled="busy" @click="rejecting = false">返回审核</Button><Button danger type="primary" :loading="busy" @click="run('reject', current.side === 'sell' ? '已拒绝，冻结资产已退回' : '已拒绝')">确认拒绝</Button></template>
    <template v-else><TypographyText type="secondary">{{ effect.approve }}</TypographyText><Button danger :disabled="busy" @click="rejecting = true">拒绝</Button><Button type="primary" :loading="busy" @click="run('approve', current.side === 'buy' ? '审核通过，已为用户入账' : '审核通过，冻结资产已扣除')">通过</Button></template>
   </template></template>
  </AdminModal>

  <UserDetailDrawer :visible="userOpen" :user="detailUser" :return-focus="userReturnFocus" @close="userOpen = false" @closed="detailUser = null; userReturnFocus = null"/>
 </PageShell>
</template>

<style scoped>
.c2c-row-actions :deep(.ant-btn-link){padding-inline:4px}
.c2c-user-link{height:auto;padding:0}
:deep(.ant-table-cell){white-space:nowrap}
</style>
