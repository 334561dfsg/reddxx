<script setup>
// 公益 ledgers on one page, chosen by route: 捐赠记录 (read-only, user decision 2026-11-28: donations complete
// immediately on the public site, no review) and 操作日志. One input per search field, detail in a modal, user IDs
// open the shared user drawer.
import {computed, ref, shallowRef, watch} from 'vue'
import {useRoute} from 'vue-router'
import {Button, Descriptions, DescriptionsItem, Space, Tag, TypographyText} from 'ant-design-vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import UserDetailDrawer from '../../../admin/components/user/UserDetailDrawer.vue'
import {getUserById} from '../../../admin/mock/user.js'
import {USER_KYC_STATUS, USER_ROLE, USER_STATUS} from '../../../admin/constants/user.js'
import {useCharityFeed, errorText, donationStatusLabels, actionLabels, moduleLabels} from '../../../shared/charity/client.js'
import {projectTitle} from '../../../shared/charity/domain.js'
import {amount, dateTime} from '../strategy/strategyFormat.js'

const route = useRoute(), {state, error, loaded, refresh} = useCharityFeed()
const mode = computed(() => route.meta.charitySection)
const titles = {donations: '捐赠记录', logs: '操作日志'}
// One input per field (user decision, 2026-11-27): no combined keyword search.
const blankFilters = () => ({donationId: '', userId: '', project: '', date: null, refId: '', operator: '', action: 'all', module: 'all'})
const filters = ref(blankFilters())
const page = ref(1)
watch(mode, () => { filters.value = blankFilters(); page.value = 1; detail.value = null })

const options = (labels, all) => [{value: 'all', label: all}, ...Object.entries(labels).map(([value, label]) => ({value, label}))]
const fields = computed(() => ({
  donations: [{key: 'donationId', label: '捐赠单号'}, {key: 'userId', label: '用户 ID'}, {key: 'project', label: '项目名称'}, {key: 'date', label: '捐赠日期', range: true}],
  logs: [{key: 'refId', label: '关联记录'}, {key: 'module', label: '模块', options: options(moduleLabels, '全部模块')}, {key: 'action', label: '操作', options: options(actionLabels, '全部操作')}, {key: 'operator', label: '操作人'}],
})[mode.value])
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const projectById = computed(() => Object.fromEntries(state.value.projects.map(p => [p.projectId, p])))
// Current English name, falling back to the title recorded with the donation.
const projectName = row => projectTitle(projectById.value[row.projectId]) || row.projectTitle
const dayOf = ms => new Date(ms + 8 * 3600000).toISOString().slice(0, 10)
const inRange = (ms, range) => !range || ((!range[0] || dayOf(ms) >= range[0]) && (!range[1] || dayOf(ms) <= range[1]))
const rows = computed(() => {
  const f = filters.value, s = state.value
  if (mode.value === 'donations') return s.donations.filter(r => has(r.donationId, f.donationId) && has(r.userId, f.userId) && has(projectName(r), f.project) && inRange(r.createdAt, f.date))
  return s.logs.filter(r => has(r.refId, f.refId) && has(r.operator, f.operator) && (f.action === 'all' || r.action === f.action) && (f.module === 'all' || r.module === f.module))
})
watch(() => rows.value.length, total => { page.value = Math.min(page.value, Math.max(1, Math.ceil(total / 10))) })
const donationTotal = computed(() => (mode.value === 'donations' ? rows.value.reduce((t, r) => t + r.amount, 0) : 0))
const col = (key, title, width, extra = {}) => ({key, title, width, ...extra})
const columns = computed(() => ({
  donations: [
    col('createdAt', '捐赠时间', 180, {fixed: 'left'}), col('donationId', '捐赠单号', 150), col('project', '项目', 360), col('userName', '用户名', 130),
    col('userId', '用户 ID', 120), col('amount', '金额（USDT）', 140, {align: 'right'}), col('status', '状态', 90), col('actions', '操作', 80, {fixed: 'right'}),
  ],
  logs: [
    col('createdAt', '时间', 180, {fixed: 'left'}), col('module', '模块', 100), col('action', '操作', 120), col('targetLabel', '对象', 300),
    col('refId', '关联记录', 180), col('summary', '说明', 420), col('operator', '操作人', 150),
  ],
})[mode.value])
function search(values) { filters.value = {...blankFilters(), ...values}; page.value = 1 }
function reset() { filters.value = blankFilters(); page.value = 1 }

const detail = ref(null)

// User drawer: platform users open their own record; mock donors are filled from the charity profile.
const userOpen = ref(false), detailUser = shallowRef(null), userReturnFocus = shallowRef(null)
function charityUser(userId, userName) {
  return {id: userId, username: userName || state.value.profiles?.[userId]?.name || userId, email: '—', role: USER_ROLE.USER, status: USER_STATUS.ACTIVE,
    kycStatus: USER_KYC_STATUS.NOT_VERIFIED, vipLevel: 0, isVip: false, balance: 0, frozenBalance: 0}
}
function showUser(row, event) {
  if (userOpen.value) return
  detailUser.value = getUserById(row.userId) || charityUser(row.userId, row.userName)
  userReturnFocus.value = event.currentTarget
  userOpen.value = true
}
</script>

<template>
 <PageShell>
  <FeedbackToast v-if="error" type="error" :source="() => (error ? errorText(error) : '')"><Button @click="refresh">重试</Button></FeedbackToast>
  <SearchForm :key="mode" :name="'charity-' + mode + '-filters'" :model="filters" :fields="fields" @search="search" @reset="reset"/>
  <AdminTable :title="titles[mode]" v-model:page="page" :rows="rows" :columns="columns" :row-key="mode === 'donations' ? 'donationId' : 'id'" :loading="!loaded && !error" desktop-only>
   <template #toolbar><Space :size="8"><TypographyText v-if="mode === 'donations'" type="secondary">筛选结果合计 {{ amount(donationTotal) }} USDT</TypographyText><Button @click="refresh">刷新</Button></Space></template>
   <template #cell="{column, record}">
    <TypographyText v-if="['donationId', 'refId'].includes(column.key) && record[column.key]" copyable>{{ record[column.key] }}</TypographyText>
    <template v-else-if="column.key === 'project'">{{ projectName(record) }}</template>
    <Button v-else-if="column.key === 'userId'" type="link" class="charity-user-link" :aria-label="'查看用户 ' + record.userId" @click.stop="showUser(record, $event)">{{ record.userId }}</Button>
    <template v-else-if="column.key === 'amount'">{{ amount(record.amount) }}</template>
    <Tag v-else-if="column.key === 'status'" color="green">{{ donationStatusLabels[record.status] || record.status }}</Tag>
    <template v-else-if="column.key === 'module'">{{ moduleLabels[record.module] || record.module || '—' }}</template>
    <template v-else-if="column.key === 'action'">{{ actionLabels[record.action] || record.action }}</template>
    <template v-else-if="column.key === 'createdAt'">{{ dateTime(record.createdAt) }}</template>
    <Button v-else-if="column.key === 'actions'" type="link" class="charity-detail-link" @click="detail = record">详情</Button>
    <template v-else>{{ record[column.key] || '—' }}</template>
   </template>
  </AdminTable>

  <AdminModal :open="!!detail" :width="760" title="捐赠详情" @close="detail = null">
   <Descriptions v-if="detail" bordered size="small" :column="1">
    <DescriptionsItem label="捐赠单号">{{ detail.donationId }}</DescriptionsItem>
    <DescriptionsItem label="状态"><Tag color="green">{{ donationStatusLabels[detail.status] || detail.status }}</Tag></DescriptionsItem>
    <DescriptionsItem label="项目">{{ projectName(detail) }}（{{ detail.projectId }}）</DescriptionsItem>
    <DescriptionsItem label="捐赠时项目名称">{{ detail.projectTitle }}</DescriptionsItem>
    <DescriptionsItem label="用户">{{ detail.userName }}（{{ detail.userId }}）</DescriptionsItem>
    <DescriptionsItem label="金额">{{ amount(detail.amount) }} {{ detail.asset }}</DescriptionsItem>
    <DescriptionsItem label="扣款来源">资金账户余额</DescriptionsItem>
    <DescriptionsItem label="捐赠时间">{{ dateTime(detail.createdAt) }}</DescriptionsItem>
   </Descriptions>
  </AdminModal>
  <UserDetailDrawer :visible="userOpen" :user="detailUser" :return-focus="userReturnFocus" @close="userOpen = false" @closed="detailUser = null; userReturnFocus = null"/>
 </PageShell>
</template>

<style scoped>
.charity-user-link,.charity-detail-link{height:auto;padding:0}
/* Ledger cells hold one fact each and stay on one line; the table scrolls horizontally instead. */
:deep(.ant-table-cell){white-space:nowrap}
</style>
