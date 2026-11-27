<script setup>
// 代理管理 — Ant Design Pro list page (2026-11-28): query card with one field per filter (the combined
// UID/username/email box is split), table card with the 添加代理 button in its toolbar, link actions with the rest in a
// 更多 menu, text status Tags, toast feedback (Ant message) instead of alert(), and a guarded suspend/activate dialog
// instead of window.confirm. The list is loaded once from the mock and filtered/paginated by the shared table card.
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Button, Descriptions, DescriptionsItem, Dropdown, Menu, MenuItem, Space, Tag, TypographyText, message } from 'ant-design-vue'
import { DownOutlined, PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import { agentApi, normalizeAgentProductCommission } from '../../../admin/mock/agent.js'
import { AGENT_STATUS, AGENT_STATUS_OPTIONS, AGENT_ROLE_LABEL } from '../../../admin/constants/agent.js'
import { AGENT_PRODUCT_LINE_DEFS, AGENT_PRODUCT_GROUPS, normalizeAgentLineRate } from '../../../admin/constants/agentCommission.js'
import AgentDeliveryCard from '../../../admin/components/agent/AgentDeliveryCard.vue'
import AgentUpgradeDialog from '../../../admin/components/agent/AgentUpgradeDialog.vue'

const loading = ref(false)
const page = ref(1)
const blank = () => ({ uid: '', username: '', email: '', loginAccount: '', status: 'all', createdAt: null })
const filters = ref(blank())
const fields = [
  { key: 'uid', label: 'UID' },
  { key: 'username', label: '用户名' },
  { key: 'email', label: '邮箱' },
  { key: 'loginAccount', label: '登录账号' },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, ...AGENT_STATUS_OPTIONS.map((status) => ({ value: status.value, label: status.label }))] },
  { key: 'createdAt', label: '成为代理日期', range: true }
]
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const localDay = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const rows = computed(() => agentList.value.filter((agent) => {
  const f = filters.value
  const day = localDay(agent.createdAt)
  return has(agent.uid, f.uid) && has(agent.username, f.username) && has(agent.email, f.email) &&
    has(agent.loginAccount || agent.email, f.loginAccount) &&
    (f.status === 'all' || agent.status === f.status) &&
    (!f.createdAt || (day >= f.createdAt[0] && day <= f.createdAt[1]))
}))
const columns = [
  { key: 'uid', title: 'UID', width: 120, fixed: 'left' },
  { key: 'user', title: '用户信息', width: 260 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'totalReferrals', title: '推荐人数', width: 100, align: 'right' },
  { key: 'commission', title: '累计佣金（USDT）', width: 160, align: 'right' },
  { key: 'createdAt', title: '成为代理时间', width: 170 },
  { key: 'actions', title: '操作', width: 220, fixed: 'right' }
]

function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

const showUpgradeModal = ref(false)
const showDetailModal = ref(false)
const showCommissionModal = ref(false)
const selectedAgent = ref(null)
const showAccountModal = ref(false)
const accountTarget = ref(null)
const accountForm = ref({
  loginAccount: '',
  resetPassword: false,
  passwordMode: 'auto',
  password: '',
  confirmPassword: ''
})
const accountSaving = ref(false)
const accountError = ref('')
const accountDelivery = ref(null)

const commissionDraft = ref(null)
const commissionTargetUid = ref(null)
const commissionSaving = ref(false)
const commissionLoading = ref(false)

const agentList = ref([])

function lineByKey(key) {
  return AGENT_PRODUCT_LINE_DEFS.find((p) => p.key === key)
}

function linesInAgentGroup(group) {
  return group.lineKeys.map((k) => lineByKey(k)).filter(Boolean)
}

function rateNumForDraft(line) {
  if (!commissionDraft.value) return 0
  return parseFloat(normalizeAgentLineRate(commissionDraft.value[line.rateKey]))
}

function setDraftRate(line, raw) {
  if (!commissionDraft.value) return
  const v = raw == null ? '' : String(raw).trim()
  let n = parseFloat(v)
  if (v === '' || Number.isNaN(n)) n = 0
  commissionDraft.value[line.rateKey] = normalizeAgentLineRate(n)
}

function isLineEnabledDraft(line) {
  return commissionDraft.value && commissionDraft.value[line.enabledKey] === true
}

function toggleLineDraft(line) {
  if (!commissionDraft.value) return
  commissionDraft.value[line.enabledKey] = !commissionDraft.value[line.enabledKey]
}

function validateDraftCommission() {
  const d = commissionDraft.value
  if (!d) return false
  const validateOne = (rateStr) => {
    const n = parseFloat(normalizeAgentLineRate(rateStr))
    return !Number.isNaN(n) && n >= 0 && n <= 1
  }
  for (const line of AGENT_PRODUCT_LINE_DEFS) {
    if (!d[line.enabledKey]) continue
    d[line.rateKey] = normalizeAgentLineRate(d[line.rateKey])
    if (!validateOne(d[line.rateKey])) {
      message.error(`「${line.title}」已开启记佣：比例须为 0～1 之间的小数。`)
      return false
    }
  }
  for (const line of AGENT_PRODUCT_LINE_DEFS) {
    if (d[line.enabledKey]) continue
    const raw = d[line.rateKey]
    if (raw != null && String(raw).trim() && !validateOne(raw)) {
      message.error(`「${line.title}」比例格式有误，请修正后再保存。`)
      return false
    }
  }
  return true
}

const loadAgentList = async () => {
  loading.value = true
  try {
    // Load every agent once; the query card filters and the table card paginates them locally.
    const result = await agentApi.getAgentList({ page: 1, pageSize: Number.MAX_SAFE_INTEGER, searchKeyword: '', status: 'all' })
    if (result.success) {
      agentList.value = result.data.list
    }
  } catch (error) {
    message.error('代理列表加载失败：' + (error?.message || '请稍后重试'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAgentList()
})

const STATUS_TAG_COLOR = { green: 'green', gray: 'default', red: 'red' }
const getStatusConfig = (status) => {
  const config = AGENT_STATUS_OPTIONS.find((s) => s.value === status)
  return {
    text: config?.label || status,
    color: STATUS_TAG_COLOR[config?.color] || 'default'
  }
}

const openUpgradeModal = () => {
  showUpgradeModal.value = true
}

const closeUpgradeModal = () => {
  showUpgradeModal.value = false
}

const validateCredentialFields = ({ selectedUser, loginAccount, password, confirmPassword, requirePassword = true }) => {
  if (selectedUser === null) return '请选择要开通的用户'
  if (!String(loginAccount || '').trim()) return '登录账号必填'
  if (requirePassword) {
    if (!String(password || '').trim()) return '登录密码必填'
    if (String(password).length < 6) return '登录密码至少 6 位'
    if (password !== confirmPassword) return '两次输入的密码不一致'
  }
  return ''
}

const handleUpgradeSaved = () => {
  loadAgentList()
}

const openAccountSettings = (agent) => {
  accountTarget.value = agent
  accountForm.value = {
    loginAccount: agent.loginAccount || agent.email || '',
    resetPassword: false,
    passwordMode: 'auto',
    password: '',
    confirmPassword: ''
  }
  accountError.value = ''
  accountDelivery.value = null
  showAccountModal.value = true
}

const setAccountPasswordMode = (mode) => {
  accountForm.value.passwordMode = mode
  if (mode === 'auto') {
    const password = agentApi.generateAgentPassword()
    accountForm.value.password = password
    accountForm.value.confirmPassword = password
  } else {
    accountForm.value.password = ''
    accountForm.value.confirmPassword = ''
  }
}

const closeAccountModal = () => {
  if (accountSaving.value) return
  showAccountModal.value = false
}

const saveAccountSettings = async () => {
  const error = validateCredentialFields({
    selectedUser: accountTarget.value,
    loginAccount: accountForm.value.loginAccount,
    password: accountForm.value.password,
    confirmPassword: accountForm.value.confirmPassword,
    requirePassword: accountForm.value.resetPassword
  })
  if (error) {
    accountError.value = error
    return
  }
  accountSaving.value = true
  accountError.value = ''
  try {
    const res = await agentApi.updateAgentLoginCredential(accountTarget.value.uid, {
      loginAccount: accountForm.value.loginAccount,
      resetPassword: accountForm.value.resetPassword,
      password: accountForm.value.password,
      passwordMode: accountForm.value.passwordMode
    })
    if (res.success) {
      accountDelivery.value = res.data.delivery
      const row = agentList.value.find((a) => a.uid === accountTarget.value.uid)
      if (row) row.loginAccount = res.data.credential.loginAccount
      loadAgentList()
      message.success('账号设置已保存')
    }
  } catch (error) {
    accountError.value = error.message || '保存失败'
  } finally {
    accountSaving.value = false
  }
}

const statusTarget = ref(null)
const statusSaving = ref(false)
const updateStatus = (agent, newStatus) => {
  statusTarget.value = { agent, newStatus }
}
const confirmStatus = async () => {
  if (statusSaving.value || !statusTarget.value) return
  const { agent, newStatus } = statusTarget.value
  statusSaving.value = true
  try {
    const result = await agentApi.updateAgentStatus(agent.uid, newStatus)
    if (result.success) {
      agent.status = newStatus
      message.success(result.message || '状态已更新')
      statusTarget.value = null
    } else {
      message.error(result.message || '操作失败')
    }
  } catch (error) {
    message.error('操作失败：' + error.message)
  } finally {
    statusSaving.value = false
  }
}
function moreAction(agent, key) {
  if (key === 'account') openAccountSettings(agent)
  else if (key === 'status') updateStatus(agent, agent.status === AGENT_STATUS.ACTIVE ? AGENT_STATUS.SUSPENDED : AGENT_STATUS.ACTIVE)
}

const viewDetail = async (agent) => {
  selectedAgent.value = agent
  showDetailModal.value = true
  try {
    const res = await agentApi.getAgentDetail(agent.uid)
    if (res.success) {
      selectedAgent.value = res.data
    }
  } catch (e) {
    console.error(e)
  }
}

const openCommissionConfig = async (agent) => {
  commissionTargetUid.value = agent.uid
  commissionDraft.value = null
  commissionLoading.value = true
  showCommissionModal.value = true
  try {
    const res = await agentApi.getAgentDetail(agent.uid)
    if (res.success) {
      commissionDraft.value = normalizeAgentProductCommission(res.data.productCommission)
    } else {
      message.error('加载代理记佣失败')
    }
  } catch (e) {
    message.error('加载代理记佣失败')
  } finally {
    commissionLoading.value = false
  }
}

const closeCommissionModal = () => {
  showCommissionModal.value = false
  commissionDraft.value = null
  commissionTargetUid.value = null
}

let commissionEscOff = null
watch(showCommissionModal, (open) => {
  commissionEscOff?.()
  commissionEscOff = null
  if (!open) return
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeCommissionModal()
    }
  }
  document.addEventListener('keydown', onKey, true)
  commissionEscOff = () => document.removeEventListener('keydown', onKey, true)
})

onUnmounted(() => {
  commissionEscOff?.()
})

const saveCommissionConfig = async () => {
  const uid = commissionTargetUid.value
  if (!uid || !commissionDraft.value) return
  if (!validateDraftCommission()) return
  commissionSaving.value = true
  try {
    const payload = normalizeAgentProductCommission({ ...commissionDraft.value })
    const res = await agentApi.updateAgentProductCommission(uid, payload)
    if (res.success) {
      message.success(res.message || '记佣配置已保存')
      const row = agentList.value.find((a) => a.uid === uid)
      if (row && res.data?.productCommission) {
        row.productCommission = res.data.productCommission
      }
      if (selectedAgent.value?.uid === uid && res.data?.productCommission) {
        selectedAgent.value.productCommission = res.data.productCommission
      }
      closeCommissionModal()
      loadAgentList()
    }
  } catch (e) {
    message.error(e.message || '保存失败')
  } finally {
    commissionSaving.value = false
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <PageShell>
    <SearchForm name="agent-management-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="代理列表" v-model:page="page" :rows="rows" :columns="columns" row-key="uid" :loading="loading" desktop-only>
      <template #toolbar>
        <Space :size="8">
          <Button :loading="loading" @click="loadAgentList">刷新</Button>
          <Button type="primary" @click="openUpgradeModal"><template #icon><PlusOutlined /></template>添加代理</Button>
        </Space>
      </template>
      <template #cell="{ column, record: agent }">
        <span v-if="column.key === 'uid'" class="font-mono">{{ agent.uid }}</span>
        <Space v-else-if="column.key === 'user'" direction="vertical" :size="0">
          <TypographyText strong>{{ agent.username }}</TypographyText>
          <TypographyText type="secondary">{{ agent.email }}</TypographyText>
          <TypographyText type="secondary">登录账号：{{ agent.loginAccount || agent.email }}</TypographyText>
        </Space>
        <Tag v-else-if="column.key === 'status'" :color="getStatusConfig(agent.status).color">{{ getStatusConfig(agent.status).text }}</Tag>
        <Space v-else-if="column.key === 'commission'" direction="vertical" :size="0" align="end">
          <TypographyText strong>{{ Number(agent.totalCommission || 0).toLocaleString() }}</TypographyText>
          <TypographyText type="secondary">本月 {{ Number(agent.monthCommission || 0).toLocaleString() }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'createdAt'">{{ formatDate(agent.createdAt) }}</template>
        <Space v-else-if="column.key === 'actions'" :size="8">
          <Button type="link" class="px-0" @click="viewDetail(agent)">详情</Button>
          <Button type="link" class="px-0" @click="openCommissionConfig(agent)">记佣配置</Button>
          <Dropdown :trigger="['click']">
            <Button type="link" class="px-0">更多 <DownOutlined /></Button>
            <template #overlay>
              <Menu @click="({ key }) => moreAction(agent, key)">
                <MenuItem key="account">账号设置</MenuItem>
                <MenuItem key="status" :danger="agent.status === AGENT_STATUS.ACTIVE">{{ agent.status === AGENT_STATUS.ACTIVE ? '暂停' : '激活' }}</MenuItem>
              </Menu>
            </template>
          </Dropdown>
        </Space>
        <template v-else>{{ agent[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <AdminModal
      :open="!!statusTarget"
      :title="statusTarget?.newStatus === AGENT_STATUS.SUSPENDED ? '暂停代理' : '激活代理'"
      :confirm-text="statusTarget?.newStatus === AGENT_STATUS.SUSPENDED ? '确认暂停' : '确认激活'"
      :danger="statusTarget?.newStatus === AGENT_STATUS.SUSPENDED"
      :busy="statusSaving"
      :width="480"
      @close="statusTarget = null"
      @confirm="confirmStatus"
    >
      <TypographyText>确认{{ statusTarget?.newStatus === AGENT_STATUS.SUSPENDED ? '暂停' : '激活' }}该代理？</TypographyText>
      <TypographyText type="secondary">{{ statusTarget?.agent.username }} · UID {{ statusTarget?.agent.uid }}</TypographyText>
    </AdminModal>

    <AgentUpgradeDialog
      :visible="showUpgradeModal"
      @close="closeUpgradeModal"
      @saved="handleUpgradeSaved"
    />

    <!-- 代理登录账号设置 -->
      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showAccountModal && accountTarget)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeAccountModal"><template #title><template v-if="Boolean(showAccountModal && accountTarget)"><header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div class="min-w-0">
              <h3 id="agent-account-title" class="text-lg font-semibold text-slate-900">代理登录账号设置</h3>
              <p class="mt-1 break-words text-sm text-slate-500">{{ accountTarget.username }} · UID {{ accountTarget.uid }}</p>
            </div>
            <a-button aria-label="关闭" html-type="button" class="flex min-w-10 items-center justify-center text-2xl text-slate-400 hover:bg-slate-100"  @click="closeAccountModal">×</a-button>
          </header></template></template><template v-if="showAccountModal && accountTarget"><div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <FeedbackToast v-if="accountError" type="error" :source="() => (accountError) ? (accountError) : ''"></FeedbackToast>

            <AgentDeliveryCard
              v-if="accountDelivery"
              :delivery="accountDelivery"
              title="账号设置已保存，以下信息可发送给代理"
            />

            <template v-else>
              <label class="block">
                <span class="text-sm font-medium text-slate-700">登录账号 <span class="text-rose-500">*</span></span>
                <a-input v-model:value="accountForm.loginAccount" type="text" autocomplete="off" class="mt-1.5" />
              </label>

              <label class="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <a-checkbox v-model:checked="accountForm.resetPassword" class="mt-1" @change="accountForm.resetPassword && setAccountPasswordMode('auto')" />
                <span>
                  <span class="block font-medium text-slate-900">重置登录密码</span>
                  <span class="mt-0.5 block text-xs text-slate-500">不会展示旧密码；重置后只在本次结果中展示新密码。</span>
                </span>
              </label>



              <div v-if="accountForm.resetPassword" class="grid gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2 flex flex-wrap gap-2">
                  <a-button html-type="button" class="" :class="accountForm.passwordMode === 'auto' ? 'ant-btn-primary' : ''" @click="setAccountPasswordMode('auto')">自动生成</a-button>
                  <a-button html-type="button" class="" :class="accountForm.passwordMode === 'manual' ? 'ant-btn-primary' : ''" @click="setAccountPasswordMode('manual')">手动输入</a-button>
                </div>
                <label class="block">
                  <span class="text-sm font-medium text-slate-700">新密码</span>
                  <a-input v-model:value="accountForm.password" type="password" autocomplete="new-password" class="mt-1.5" />
                </label>
                <label class="block">
                  <span class="text-sm font-medium text-slate-700">确认新密码</span>
                  <a-input v-model:value="accountForm.confirmPassword" type="password" autocomplete="new-password" class="mt-1.5" />
                </label>
              </div>
            </template>
          </div></template><template #footer><template v-if="Boolean(showAccountModal && accountTarget)"><footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
            <a-button html-type="button" class="" @click="closeAccountModal">{{ accountDelivery ? '关闭' : '取消' }}</a-button>
            <a-button v-if="!accountDelivery" html-type="button" class="" :disabled="accountSaving" @click="saveAccountSettings" type="primary">
              {{ accountSaving ? '保存中…' : '保存设置' }}
            </a-button>
          </footer></template></template></a-modal>
    

    <!-- 产品线记佣（紧凑行式布局；底栏固定，避免无法取消） -->
    <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showCommissionModal)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeCommissionModal"><template #title><template v-if="Boolean(showCommissionModal)"><div class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div class="min-w-0">
            <h3 id="commission-modal-title" class="text-base font-semibold text-slate-900">代理产品线记佣</h3>
            <p class="mt-0.5 font-mono text-xs text-slate-500">UID {{ commissionTargetUid }}</p>
          </div>
          <a-button aria-label="关闭" html-type="button" class="shrink-0 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"  @click="closeCommissionModal">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a-button>
        </div></template></template><template v-if="showCommissionModal"><div v-if="commissionLoading" class="flex min-h-[12rem] flex-1 flex-col items-center justify-center px-4 py-10">
          <div class="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600"></div>
          <p class="mt-3 text-xs text-slate-500">加载中…</p>
        </div>
<div v-else-if="commissionDraft" class="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          <div class="space-y-3">
            <div v-for="group in AGENT_PRODUCT_GROUPS" :key="group.id" class="overflow-hidden rounded-lg border border-slate-200">
              <div
                class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-slate-100 bg-slate-50/90 px-3 py-2"
              >
                <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-700">{{ group.name }}</h4>
                <p class="text-[11px] leading-snug text-slate-500">{{ group.blurb }}</p>
              </div>
              <ul class="divide-y divide-slate-100 bg-white">
                <li
                  v-for="line in linesInAgentGroup(group)"
                  :key="line.key"
                  class="flex flex-col gap-2.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2"
                  :class="isLineEnabledDraft(line) ? 'bg-slate-50/60' : ''"
                >
                  <p class="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900">
                    {{ line.title }}
                  </p>

                  <div
                    class="flex flex-wrap items-center gap-x-3 gap-y-2 sm:min-w-0 sm:flex-nowrap sm:justify-end sm:pl-2"
                  >
                    <!-- 开关单独一区，与比例输入用竖线隔开，避免视觉上「开关跑进输入框」 -->
                    <div class="flex shrink-0 items-center gap-2">
                      <span class="w-7 shrink-0 text-right text-[11px] text-slate-400">记佣</span>
                      <a-switch :checked="isLineEnabledDraft(line)" @change="toggleLineDraft(line)" @click="(_checked, event) => event.stopPropagation()" :aria-label="line.title || line.label || line.key" />
                    </div>

                    <div
                      class="flex min-h-8 min-w-0 flex-1 items-center gap-2 sm:min-w-[12.5rem] sm:flex-initial sm:border-l sm:border-slate-200 sm:pl-3"
                    >
                      <template v-if="isLineEnabledDraft(line)">
                        <label class="sr-only" :for="'ac-rate-' + line.key">比例 r（0～1）</label>
                        <div
                          class="inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 shadow-sm"
                        >
                          <span class="select-none text-[11px] font-medium text-slate-400">r</span>
                          <a-input :id="'ac-rate-' + line.key" type="number" :min="0" :max="1" :step="0.001" class="w-[5.5rem] max-w-full text-right font-medium tabular-nums text-slate-800 [appearance:textfield] placeholder:text-slate-300 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" :value="rateNumForDraft(line)" @input="setDraftRate(line, $event.target.value)" />
                        </div>
                        <span class="shrink-0 text-xs tabular-nums text-slate-500" title="折算百分比">
                          ≈ {{ (rateNumForDraft(line) * 100).toFixed(2) }}%
                        </span>
                      </template>
                      <span v-else class="w-full text-right text-xs text-slate-400 sm:min-w-[8rem]">
                        未参与记佣
                      </span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
<div v-else class="flex min-h-[8rem] flex-1 flex-col items-center justify-center px-4 py-8 text-center">
          <p class="text-sm text-slate-500">未能加载记佣数据，请关闭后重试。</p>
        </div></template><template #footer><template v-if="Boolean(showCommissionModal)"><div class="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
          <a-button html-type="button" class="" @click="closeCommissionModal">取消</a-button>
          <a-button v-if="commissionDraft" html-type="button" class="min-w-[5.5rem]" :disabled="commissionSaving || commissionLoading" @click="saveCommissionConfig" type="primary">
            {{ commissionSaving ? '保存中…' : '保存' }}
          </a-button>
        </div></template></template></a-modal>
    

    <!-- 详情 -->
    <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showDetailModal && selectedAgent)" :mask-closable="false" :keyboard="false" :closable="false" :footer="null" width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="showDetailModal = false"><template #title><template v-if="Boolean(showDetailModal && selectedAgent)"><div class="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
          <h3 class="text-lg font-semibold text-slate-900">代理详情</h3>
          <a-button aria-label="关闭" html-type="button" class="text-slate-400 hover:text-slate-600 transition-colors" @click="showDetailModal = false">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a-button>
        </div></template></template><template v-if="showDetailModal && selectedAgent"><Descriptions :column="2" size="small" bordered>
          <DescriptionsItem label="UID"><span class="font-mono">{{ selectedAgent.uid }}</span></DescriptionsItem>
          <DescriptionsItem label="身份"><Tag>{{ AGENT_ROLE_LABEL }}</Tag></DescriptionsItem>
          <DescriptionsItem label="用户名">{{ selectedAgent.username }}</DescriptionsItem>
          <DescriptionsItem label="邮箱">{{ selectedAgent.email }}</DescriptionsItem>
          <DescriptionsItem label="手机">{{ selectedAgent.phone || '—' }}</DescriptionsItem>
          <DescriptionsItem label="状态"><Tag :color="getStatusConfig(selectedAgent.status).color">{{ getStatusConfig(selectedAgent.status).text }}</Tag></DescriptionsItem>
          <DescriptionsItem label="推荐人数">{{ selectedAgent.totalReferrals }}</DescriptionsItem>
          <DescriptionsItem label="累计佣金（USDT）">{{ Number(selectedAgent.totalCommission || 0).toLocaleString() }}</DescriptionsItem>
          <DescriptionsItem label="本月佣金（USDT）">{{ Number(selectedAgent.monthCommission || 0).toLocaleString() }}</DescriptionsItem>
          <DescriptionsItem label="成为代理时间">{{ formatDate(selectedAgent.createdAt) }}</DescriptionsItem>
          <DescriptionsItem label="最后活跃">{{ selectedAgent.lastActiveAt ? formatDate(selectedAgent.lastActiveAt) : '—' }}</DescriptionsItem>
        </Descriptions>
<div class="agent-detail-actions">
          <a-button html-type="button" @click="showDetailModal = false">关闭</a-button>
          <a-button html-type="button" type="primary" @click="
              showDetailModal = false;
              openCommissionConfig(selectedAgent);
            ">
            编辑产品线记佣
          </a-button>
        </div></template></a-modal>

  </PageShell>
</template>

<style scoped>
.agent-detail-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
button:focus {
  outline: none;
}
</style>
