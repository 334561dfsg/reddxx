<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue'
import { agentApi, normalizeAgentProductCommission } from '../../../admin/mock/agent.js'
import { AGENT_STATUS, AGENT_STATUS_OPTIONS, AGENT_ROLE_LABEL } from '../../../admin/constants/agent.js'
import { AGENT_PRODUCT_LINE_DEFS, AGENT_PRODUCT_GROUPS, normalizeAgentLineRate } from '../../../admin/constants/agentCommission.js'
import AgentDeliveryCard from '../../../admin/components/agent/AgentDeliveryCard.vue'
import AgentUpgradeDialog from '../../../admin/components/agent/AgentUpgradeDialog.vue'

const searchKeyword = ref('')
const statusFilter = ref('all')
const loading = ref(false)

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const totalPages = computed(() => Math.ceil(pagination.total / pagination.pageSize))

const showUpgradeModal = ref(false)
const showDetailModal = ref(false)
const showCommissionModal = ref(false)
const selectedAgent = ref(null)
const showAccountModal = ref(false)
const accountTarget = ref(null)
const accountForm = ref({
  loginAccount: '',
  resetPassword: false,
  resetMfa: false,
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
      alert(`「${line.title}」已开启记佣：比例须为 0～1 之间的小数。`)
      return false
    }
  }
  for (const line of AGENT_PRODUCT_LINE_DEFS) {
    if (d[line.enabledKey]) continue
    const raw = d[line.rateKey]
    if (raw != null && String(raw).trim() && !validateOne(raw)) {
      alert(`「${line.title}」比例格式有误，请修正后再保存。`)
      return false
    }
  }
  return true
}

const loadAgentList = async () => {
  loading.value = true
  try {
    const result = await agentApi.getAgentList({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      searchKeyword: searchKeyword.value,
      status: statusFilter.value
    })
    if (result.success) {
      agentList.value = result.data.list
      pagination.total = result.data.total
    }
  } catch (error) {
    console.error('Failed to load agent list:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.currentPage = 1
  loadAgentList()
}

const handleReset = () => {
  searchKeyword.value = ''
  statusFilter.value = 'all'
  pagination.currentPage = 1
  loadAgentList()
}

watch(() => pagination.currentPage, () => {
  loadAgentList()
})

onMounted(() => {
  loadAgentList()
})

const getStatusConfig = (status) => {
  const config = AGENT_STATUS_OPTIONS.find((s) => s.value === status)
  return {
    text: config?.label || status,
    color: config?.color || 'gray'
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
    resetMfa: false,
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
      resetMfa: accountForm.value.resetMfa,
      password: accountForm.value.password,
      passwordMode: accountForm.value.passwordMode
    })
    if (res.success) {
      accountDelivery.value = res.data.delivery
      const row = agentList.value.find((a) => a.uid === accountTarget.value.uid)
      if (row) row.loginAccount = res.data.credential.loginAccount
      loadAgentList()
    }
  } catch (error) {
    accountError.value = error.message || '保存失败'
  } finally {
    accountSaving.value = false
  }
}

const updateStatus = async (agent, newStatus) => {
  if (!confirm(`确认${newStatus === AGENT_STATUS.SUSPENDED ? '暂停' : '激活'}该代理？`)) {
    return
  }

  try {
    const result = await agentApi.updateAgentStatus(agent.uid, newStatus)
    if (result.success) {
      agent.status = newStatus
      alert(result.message)
    }
  } catch (error) {
    alert('操作失败：' + error.message)
  }
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
      alert('加载失败')
    }
  } catch (e) {
    alert('加载代理记佣失败')
    console.error(e)
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
      alert(res.message)
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
    alert(e.message || '保存失败')
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
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">代理管理</h1>
        <p class="mt-1 text-sm text-slate-500">
          查看与管理后台代理：启用/暂停、各产品线一级记佣等。
        </p>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative min-h-[400px]">
      <div
        class="flex flex-wrap items-center gap-3 justify-between border-b border-slate-200 p-4 md:px-6 bg-slate-50/30"
      >
        <div class="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <h3 class="text-base font-semibold text-slate-900 shrink-0">代理列表</h3>
          <a-select v-model:value="statusFilter" class="!w-36" @change="handleSearch">
            <a-select-option value="all">全部状态</a-select-option>
            <a-select-option v-for="status in AGENT_STATUS_OPTIONS" :key="status.value" :value="status.value">
              {{ status.label }}
            </a-select-option>
          </a-select>

          <div class="relative min-w-[180px] max-w-xl flex-1 basis-[200px]">
            <a-input v-model:value="searchKeyword" type="text" placeholder="搜索 UID、用户名或邮箱…" class="pl-9" @keyup.enter="handleSearch" />
            <svg
              viewBox="0 0 20 20"
              class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
              fill="none"
            >
              <circle cx="9" cy="9" r="5.8" stroke="currentColor" stroke-width="1.6" />
              <path d="M13.6 13.6L16.4 16.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </div>

          <a-button html-type="button" class="shrink-0" @click="handleSearch" type="primary">搜索</a-button>
          <a-button html-type="button" class="shrink-0" @click="handleReset">重置</a-button>
        </div>
        <a-button html-type="button" class="shrink-0" @click="openUpgradeModal" type="primary">+ 添加代理</a-button>
      </div>

      <div class="overflow-x-auto">
        <div
          v-if="loading"
          class="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"
        >
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>

        <a-table  :data-source="agentList" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(agent) => agent.id" :custom-row="(agent, index) => ({ class: [&quot;hover:bg-gray-50&quot;] })">
<a-table-column key="column-0" ><template #title>UID</template><template #default="{ record: agent, index: index }"><div class="  whitespace-nowrap text-sm font-medium text-gray-900">
                {{ agent.uid }}
              </div></template></a-table-column>
<a-table-column key="column-1" ><template #title>用户信息</template><template #default="{ record: agent, index: index }"><div class="  whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ agent.username }}</div>
                <div class="text-sm text-gray-500">{{ agent.email }}</div>
                <div class="mt-0.5 text-xs text-slate-400">登录账号：{{ agent.loginAccount || agent.email }}</div>
              </div></template></a-table-column>
<a-table-column key="column-2" ><template #title>状态</template><template #default="{ record: agent, index: index }"><div class="  whitespace-nowrap">
                <span
                  :class="`px-2 py-1 text-xs font-semibold rounded-full bg-${getStatusConfig(agent.status).color}-100 text-${getStatusConfig(agent.status).color}-800`"
                >
                  {{ getStatusConfig(agent.status).text }}
                </span>
              </div></template></a-table-column>
<a-table-column key="column-3" ><template #title>推荐人数</template><template #default="{ record: agent, index: index }"><div class="  whitespace-nowrap text-sm text-gray-900">
                {{ agent.totalReferrals }}
              </div></template></a-table-column>
<a-table-column key="column-4" ><template #title>累计佣金</template><template #default="{ record: agent, index: index }"><div class="  whitespace-nowrap text-sm text-gray-900">
                <div class="font-semibold">${{ agent.totalCommission.toLocaleString() }}</div>
                <div class="text-xs text-gray-500">本月: ${{ agent.monthCommission.toLocaleString() }}</div>
              </div></template></a-table-column>
<a-table-column key="column-5" ><template #title>成为代理时间</template><template #default="{ record: agent, index: index }"><div class="  whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(agent.createdAt) }}
              </div></template></a-table-column>
<a-table-column key="column-6" align="right"><template #title>操作</template><template #default="{ record: agent, index: index }"><div class="  whitespace-nowrap text-right text-sm font-medium space-x-2">
                <a-button html-type="button" class="text-blue-600 hover:text-blue-900" @click="viewDetail(agent)">详情</a-button>
                <a-button html-type="button" class="text-emerald-600 hover:text-emerald-900" @click="openAccountSettings(agent)">账号设置</a-button>
                <a-button html-type="button" class="text-violet-600 hover:text-violet-900" @click="openCommissionConfig(agent)">
                  记佣配置
                </a-button>
                <a-button v-if="agent.status === AGENT_STATUS.ACTIVE" html-type="button" class="text-yellow-600 hover:text-yellow-900" @click="updateStatus(agent, AGENT_STATUS.SUSPENDED)">
                  暂停
                </a-button>
                <a-button v-else html-type="button" class="text-green-600 hover:text-green-900" @click="updateStatus(agent, AGENT_STATUS.ACTIVE)">
                  激活
                </a-button>
              </div></template></a-table-column><template #emptyText>暂无代理数据</template>
</a-table>
      </div>

      <div
        v-if="pagination.total > 0"
        class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between"
      >
        <div class="text-sm text-slate-700">
          共 <span class="font-medium">{{ pagination.total }}</span> 条记录， 每页显示
          <a-select v-model:value="pagination.pageSize" class="!w-16" @change="handleSearch">
            <a-select-option :value="10">10</a-select-option>
            <a-select-option :value="20">20</a-select-option>
            <a-select-option :value="50">50</a-select-option>
            <a-select-option :value="100">100</a-select-option>
          </a-select>
          条
        </div>
        <a-pagination  size="small" :current="pagination.currentPage" :page-size="pagination.pageSize" :total="pagination.total" :show-size-changer="false"  :disabled="loading" @change="pagination.currentPage = $event" />
      </div>
    </div>

    <AgentUpgradeDialog
      :visible="showUpgradeModal"
      @close="closeUpgradeModal"
      @saved="handleUpgradeSaved"
    />

    <!-- 代理登录账号设置 -->
    <Teleport to="body">
      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showAccountModal && accountTarget)" :mask-closable="false" :keyboard="false" :closable="false" :footer="null" width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeAccountModal"><template #title><template v-if="Boolean(showAccountModal && accountTarget)"><header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div class="min-w-0">
              <h3 id="agent-account-title" class="text-lg font-semibold text-slate-900">代理登录账号设置</h3>
              <p class="mt-1 break-words text-sm text-slate-500">{{ accountTarget.username }} · UID {{ accountTarget.uid }}</p>
            </div>
            <a-button aria-label="关闭" html-type="button" class="flex min-w-10 items-center justify-center text-2xl text-slate-400 hover:bg-slate-100"  @click="closeAccountModal">×</a-button>
          </header></template></template><template v-if="showAccountModal && accountTarget"><div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <p v-if="accountError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{{ accountError }}</p>

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

              <label class="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <a-checkbox v-model:checked="accountForm.resetMfa" class="mt-1" />
                <span>
                  <span class="block font-medium text-slate-900">重设 MFA</span>
                  <span class="mt-0.5 block text-xs text-slate-500">生成新的 MFA 密钥和二维码；代理需重新绑定安全验证。</span>
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
    </Teleport>

    <!-- 产品线记佣（紧凑行式布局；底栏固定，避免无法取消） -->
    <Teleport to="body">
    <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showCommissionModal)" :mask-closable="false" :keyboard="false" :closable="false" :footer="null" width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeCommissionModal"><template #title><template v-if="Boolean(showCommissionModal)"><div class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
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
                          <a-input :id="'ac-rate-' + line.key" type="number" min="0" max="1" step="0.001" class="w-[5.5rem] max-w-full text-right font-medium tabular-nums text-slate-800 [appearance:textfield] placeholder:text-slate-300 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" :value="rateNumForDraft(line)" @input="setDraftRate(line, $event.target.value)" />
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
    </Teleport>

    <!-- 详情 -->
    <Teleport to="body">
    <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showDetailModal && selectedAgent)" :mask-closable="false" :keyboard="false" :closable="false" :footer="null" width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="showDetailModal = false"><template #title><template v-if="Boolean(showDetailModal && selectedAgent)"><div class="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
          <h3 class="text-lg font-semibold text-slate-900">代理详情</h3>
          <a-button aria-label="关闭" html-type="button" class="text-slate-400 hover:text-slate-600 transition-colors" @click="showDetailModal = false">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a-button>
        </div></template></template><template v-if="showDetailModal && selectedAgent"><div class="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
          <div class="flex flex-col">
            <span class="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">UID</span>
            <p class="font-mono text-slate-900 font-semibold">{{ selectedAgent.uid }}</p>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">身份</span>
            <span class="inline-flex w-fit px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
              {{ AGENT_ROLE_LABEL }}
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">用户名</span>
            <p class="text-slate-900 font-semibold">{{ selectedAgent.username }}</p>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">邮箱</span>
            <p class="text-slate-900 font-semibold">{{ selectedAgent.email }}</p>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">手机</span>
            <p class="text-slate-900 font-semibold">{{ selectedAgent.phone }}</p>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">状态</span>
            <span
              :class="`inline-flex w-fit px-2.5 py-1 text-xs font-bold rounded-lg bg-${getStatusConfig(selectedAgent.status).color}-50 text-${getStatusConfig(selectedAgent.status).color}-700 border border-${getStatusConfig(selectedAgent.status).color}-100`"
            >
              {{ getStatusConfig(selectedAgent.status).text }}
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">推荐人数</span>
            <p class="text-slate-900 font-bold text-lg">{{ selectedAgent.totalReferrals }}</p>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">累计佣金</span>
            <p class="text-emerald-600 font-bold text-lg">${{ selectedAgent.totalCommission.toLocaleString() }}</p>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">本月佣金</span>
            <p class="text-emerald-600 font-bold text-lg">${{ selectedAgent.monthCommission.toLocaleString() }}</p>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">成为代理时间</span>
            <p class="text-slate-900 font-medium text-sm">{{ formatDate(selectedAgent.createdAt) }}</p>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">最后活跃</span>
            <p class="text-slate-900 font-medium text-sm">{{ formatDate(selectedAgent.lastActiveAt) }}</p>
          </div>
        </div>
<div class="mt-8 flex flex-col gap-2 sm:flex-row">
          <a-button html-type="button" class="flex-1" @click="
              showDetailModal = false;
              openCommissionConfig(selectedAgent);
            " type="primary">
            编辑产品线记佣
          </a-button>
          <a-button html-type="button" class="flex-1" @click="showDetailModal = false">关闭</a-button>
        </div></template></a-modal>
    </Teleport>
  </div>
</template>

<style scoped>
button:focus {
  outline: none;
}
</style>
