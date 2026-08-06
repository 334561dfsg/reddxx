<script setup>
import { computed, reactive, ref } from 'vue'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import { useDialogLifecycle } from '../../../admin/composables/useDialogLifecycle.js'
import {
  PUBLIC_DEPOSIT_COINS,
  PUBLIC_DEPOSIT_NETWORKS,
  createPublicDepositAddressRepository,
  publicDepositAddressLogMock,
  publicDepositAddressMock
} from '../../../admin/mock/publicDepositAddress'

const repository = createPublicDepositAddressRepository(publicDepositAddressMock, publicDepositAddressLogMock)
const rows = ref(repository.list())
const keyword = ref('')
const networkFilter = ref('all')
const statusFilter = ref('all')
const modalOpen = ref(false)
const showMfaModal = ref(false)
const mfaLoading = ref(false)
const pendingMutation = ref(null)
const editingAddress = ref('')
const formError = ref('')
const revealedIds = ref(new Set())
const copiedId = ref('')
const logDialogOpen = ref(false)
const logRow = ref(null)
const addressLogs = ref([])
const logPage = ref(1)
const addressDialogRef = ref(null)
const addressInitialFocusRef = ref(null)
const logDialogRef = ref(null)
const logInitialFocusRef = ref(null)
let copiedTimer = null

const LOG_PAGE_SIZE = 5

const LOG_FIELD_LABELS = {
  coin: '币种', network: '网络', address: '收款地址', enabled: '启用状态', sortOrder: '排序', remark: '备注'
}

const LOG_ACTION_LABELS = {
  create: '新增配置', edit: '编辑配置', enable: '启用地址', disable: '停用地址',
  replace: '更换地址（原地址）', 'replace-in': '更换地址（新地址）'
}

const logPageCount = computed(() => Math.max(1, Math.ceil(addressLogs.value.length / LOG_PAGE_SIZE)))
const paginatedAddressLogs = computed(() => {
  const start = (logPage.value - 1) * LOG_PAGE_SIZE
  return addressLogs.value.slice(start, start + LOG_PAGE_SIZE)
})

const emptyForm = () => ({
  id: '',
  coin: 'USDT',
  network: 'TRC20',
  address: '',
  enabled: true,
  sortOrder: 0,
  remark: ''
})

const form = reactive(emptyForm())

const filteredRows = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  return rows.value.filter((row) => {
    const matchesNetwork = networkFilter.value === 'all' || row.network === networkFilter.value
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'enabled' ? row.enabled : !row.enabled)
    const haystack = `${row.coin} ${row.network} ${row.address} ${row.remark || ''}`.toLowerCase()
    return matchesNetwork && matchesStatus && (!search || haystack.includes(search))
  })
})

const enabledCount = computed(() => rows.value.filter((row) => row.enabled).length)
const coveredNetworkCount = computed(
  () => new Set(rows.value.filter((row) => row.enabled).map((row) => row.network)).size
)
const coveredPairCount = computed(
  () => new Set(rows.value.filter((row) => row.enabled).map((row) => `${row.coin}:${row.network}`)).size
)

const {
  rendered: addressDialogRendered,
  phase: addressDialogPhase,
  layerStyle: addressDialogLayerStyle,
  requestDialogClose: requestAddressDialogClose,
  onAfterEnter: onAddressDialogAfterEnter,
  onAfterLeave: onAddressDialogAfterLeave
} = useDialogLifecycle({
  open: modalOpen,
  dialogRef: addressDialogRef,
  initialFocusRef: addressInitialFocusRef,
  requestClose: () => {
    modalOpen.value = false
    formError.value = ''
  }
})

const {
  rendered: logDialogRendered,
  phase: logDialogPhase,
  layerStyle: logDialogLayerStyle,
  requestDialogClose: requestLogDialogClose,
  onAfterEnter: onLogDialogAfterEnter,
  onAfterLeave: onLogDialogAfterLeave
} = useDialogLifecycle({
  open: logDialogOpen,
  dialogRef: logDialogRef,
  initialFocusRef: logInitialFocusRef,
  requestClose: () => {
    logDialogOpen.value = false
    logRow.value = null
    addressLogs.value = []
    logPage.value = 1
  }
})

function refreshRows() {
  rows.value = repository.list()
}

function normalizeSortOrder(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.trunc(parsed))
}

function nowText() {
  return new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-')
}

function openCreate() {
  Object.assign(form, emptyForm())
  editingAddress.value = ''
  formError.value = ''
  modalOpen.value = true
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    coin: row.coin,
    network: row.network,
    address: row.address,
    enabled: row.enabled,
    sortOrder: row.sortOrder ?? 0,
    remark: row.remark || ''
  })
  editingAddress.value = row.address
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  requestAddressDialogClose()
}

function openLogDialog(row) {
  logRow.value = row
  addressLogs.value = repository.listLogs(row.id)
  logPage.value = 1
  logDialogOpen.value = true
}

function closeLogDialog() {
  requestLogDialogClose()
}

function changedLogFields(log) {
  return Object.keys(LOG_FIELD_LABELS).filter((field) => {
    if (!log.before || !log.after) return true
    return log.before[field] !== log.after[field]
  })
}

function formatLogValue(field, value) {
  if (value === undefined || value === null || value === '') return '—'
  if (field === 'enabled') return value ? '已启用' : '已停用'
  return value
}

function requestMfa(mutation) {
  pendingMutation.value = mutation
  showMfaModal.value = true
}

function cancelMfa() {
  pendingMutation.value = null
  mfaLoading.value = false
}

async function handleMfaVerify() {
  if (!pendingMutation.value) return
  mfaLoading.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 600))
    repository.save(pendingMutation.value.payload)
    refreshRows()
    if (pendingMutation.value.type === 'save') {
      modalOpen.value = false
      formError.value = ''
    }
    pendingMutation.value = null
    showMfaModal.value = false
  } finally {
    mfaLoading.value = false
  }
}

function saveAddress() {
  const address = form.address.trim()
  const sortOrder = normalizeSortOrder(form.sortOrder)
  if (!form.coin || !form.network || !address) {
    formError.value = '请完整填写币种、网络和收款地址。'
    return
  }
  if (sortOrder === null) {
    formError.value = '排序必须填写数字，数值越大展示越靠前。'
    return
  }

  requestMfa({
    type: 'save',
    payload: {
      id: form.id || undefined,
      coin: form.coin,
      network: form.network,
      address,
      enabled: form.enabled,
      sortOrder,
      remark: form.remark.trim(),
      operator: 'admin_current',
      updatedAt: nowText()
    }
  })
}

function toggleStatus(row) {
  const verb = row.enabled ? '停用' : '启用'
  if (!window.confirm(`确认${verb}该收款地址？停用后仍保留历史记录。`)) return
  requestMfa({
    type: 'status',
    payload: { ...row, enabled: !row.enabled, operator: 'admin_current', updatedAt: nowText() }
  })
}

function maskedAddress(row) {
  if (revealedIds.value.has(row.id) || row.address.length <= 18) return row.address
  return `${row.address.slice(0, 9)}••••••${row.address.slice(-7)}`
}

function toggleReveal(id) {
  const next = new Set(revealedIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  revealedIds.value = next
}

async function copyAddress(row) {
  try {
    await navigator.clipboard.writeText(row.address)
    copiedId.value = row.id
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copiedId.value = '' }, 1600)
  } catch {
    copiedId.value = ''
  }
}
</script>

<template>
  <main class="space-y-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500">资产管理</p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900">公共收款地址</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          按币种与网络维护用户充值时展示的平台地址。同一币种和网络只能启用一个地址，未配置地址的充值入口应暂停展示。
        </p>
      </div>
      <button
        type="button"
        class="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        @click="openCreate"
      >
        <span class="mr-1.5 text-lg leading-none">＋</span>新增地址
      </button>
    </header>

    <section class="grid gap-4 sm:grid-cols-3">
      <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">当前启用</p>
        <p class="mt-2 text-2xl font-bold text-slate-900">{{ enabledCount }}</p>
        <p class="mt-1 text-xs text-emerald-600">可用于前台充值展示</p>
      </article>
      <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">已覆盖币种网络</p>
        <p class="mt-2 text-2xl font-bold text-slate-900">{{ coveredPairCount }}</p>
        <p class="mt-1 text-xs text-slate-500">按币种与网络精确匹配</p>
      </article>
      <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">已覆盖网络</p>
        <p class="mt-2 text-2xl font-bold text-slate-900">{{ coveredNetworkCount }}</p>
        <p class="mt-1 text-xs text-slate-500">至少一个启用地址的网络</p>
      </article>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
        <div class="relative min-w-0 flex-1 lg:max-w-md">
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索币种、网络、地址或备注"
            class="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
          />
        </div>
        <select v-model="networkFilter" class="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400">
          <option value="all">全部网络</option>
          <option v-for="network in PUBLIC_DEPOSIT_NETWORKS" :key="network" :value="network">{{ network }}</option>
        </select>
        <select v-model="statusFilter" class="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400">
          <option value="all">全部状态</option>
          <option value="enabled">已启用</option>
          <option value="disabled">已停用</option>
        </select>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-[980px] w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-5 py-3">币种 / 网络</th>
              <th class="px-5 py-3">收款地址</th>
              <th class="px-5 py-3">状态</th>
              <th class="px-5 py-3">排序</th>
              <th class="px-5 py-3">更新信息</th>
              <th class="px-5 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in filteredRows" :key="row.id" class="transition hover:bg-slate-50/70">
              <td class="px-5 py-4">
                <p class="font-semibold text-slate-900">{{ row.coin }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ row.network }}</p>
              </td>
              <td class="max-w-md px-5 py-4">
                <p class="break-all font-mono text-xs text-slate-700" :title="row.address">{{ maskedAddress(row) }}</p>
                <div class="mt-2 flex gap-3 text-xs font-medium">
                  <button type="button" class="text-slate-500 hover:text-slate-900" @click="toggleReveal(row.id)">
                    {{ revealedIds.has(row.id) ? '隐藏' : '查看完整地址' }}
                  </button>
                  <button type="button" class="text-blue-600 hover:text-blue-700" @click="copyAddress(row)">
                    {{ copiedId === row.id ? '已复制' : '复制' }}
                  </button>
                </div>
              </td>
              <td class="px-5 py-4">
                <span class="inline-flex items-center gap-1.5 text-xs font-semibold" :class="row.enabled ? 'text-emerald-700' : 'text-slate-400'">
                  <span class="h-2 w-2 rounded-full" :class="row.enabled ? 'bg-emerald-500' : 'bg-slate-300'" />
                  {{ row.enabled ? '已启用' : '已停用' }}
                </span>
              </td>
              <td class="px-5 py-4 text-sm font-semibold text-slate-700">
                {{ row.sortOrder ?? 0 }}
              </td>
              <td class="px-5 py-4 text-xs text-slate-500">
                <p>{{ row.updatedAt || '—' }}</p>
                <p class="mt-1">{{ row.operator || '—' }}</p>
              </td>
              <td class="px-5 py-4 text-right">
                <div class="flex justify-end gap-3 text-xs font-semibold">
                  <button type="button" class="text-blue-600 hover:text-blue-800" @click="openEdit(row)">编辑</button>
                  <button type="button" class="text-violet-600 hover:text-violet-800" @click="openLogDialog(row)">修改日志</button>
                  <button type="button" :class="row.enabled ? 'text-rose-600 hover:text-rose-800' : 'text-emerald-600 hover:text-emerald-800'" @click="toggleStatus(row)">
                    {{ row.enabled ? '停用' : '启用' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredRows.length === 0">
              <td colspan="6" class="px-5 py-14 text-center text-sm text-slate-400">没有匹配的地址配置</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        共 {{ filteredRows.length }} 条记录 · 地址停用后仍保留历史记录，不支持物理删除
      </div>
    </section>

    <Teleport to="body">
      <Transition name="dialog-overlay" appear @after-enter="onAddressDialogAfterEnter" @after-leave="onAddressDialogAfterLeave">
        <div
          v-if="addressDialogRendered"
          v-show="addressDialogPhase !== 'closing'"
          class="fixed inset-0 z-50 flex min-h-[100vh] w-full items-center justify-center bg-slate-950/45 p-4 supports-[height:100dvh]:min-h-[100dvh]"
          role="presentation"
          :style="addressDialogLayerStyle"
        >
      <Transition name="dialog-panel" appear>
      <section
        v-show="addressDialogPhase !== 'closing'"
        ref="addressDialogRef"
        class="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-deposit-address-dialog-title"
      >
        <header class="shrink-0 border-b border-slate-200 px-6 py-5">
          <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="public-deposit-address-dialog-title" class="text-lg font-bold text-slate-900">{{ form.id ? '编辑收款地址' : '新增收款地址' }}</h2>
            <p class="mt-1 text-xs text-slate-500">更换地址会生成新记录，原地址自动停用并保留。</p>
          </div>
          <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="关闭" @click="closeModal">×</button>
          </div>
        </header>

        <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="saveAddress">
          <div class="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2 text-sm font-medium text-slate-700">
              <span>币种</span>
              <select ref="addressInitialFocusRef" v-model="form.coin" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-slate-400">
                <option v-for="coin in PUBLIC_DEPOSIT_COINS" :key="coin" :value="coin">{{ coin }}</option>
              </select>
            </label>
            <label class="space-y-2 text-sm font-medium text-slate-700">
              <span>网络</span>
              <select v-model="form.network" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-slate-400">
                <option v-for="network in PUBLIC_DEPOSIT_NETWORKS" :key="network" :value="network">{{ network }}</option>
              </select>
            </label>
          </div>

          <label class="block space-y-2 text-sm font-medium text-slate-700">
            <span>收款地址</span>
            <input v-model="form.address" type="text" spellcheck="false" placeholder="请输入完整链上地址" class="h-11 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
            <span v-if="form.id && editingAddress !== form.address" class="block text-xs font-normal text-amber-600">检测到地址变更：保存后将新建记录并停用原地址。</span>
          </label>

          <label class="block space-y-2 text-sm font-medium text-slate-700">
            <span>排序</span>
            <input
              v-model="form.sortOrder"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              placeholder="数值越大展示越靠前"
              class="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
            <span class="block text-xs font-normal text-slate-500">列表按排序值从大到小展示，相同排序按更新时间降序。</span>
          </label>

          <label class="block space-y-2 text-sm font-medium text-slate-700">
            <span>备注</span>
            <textarea v-model="form.remark" rows="3" placeholder="填写地址用途或更换原因" class="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400" />
          </label>

          <label class="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span>
              <span class="block text-sm font-semibold text-slate-800">启用状态</span>
              <span class="mt-0.5 block text-xs text-slate-500">启用后可参与前台充值地址匹配</span>
            </span>
            <input v-model="form.enabled" type="checkbox" class="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-500" />
          </label>

          <p v-if="formError" class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ formError }}</p>
          </div>

          <footer class="shrink-0 flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button type="button" class="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50" @click="closeModal">取消</button>
            <button type="submit" class="h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800">保存配置</button>
          </footer>
        </form>
      </section>
      </Transition>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="dialog-overlay" appear @after-enter="onLogDialogAfterEnter" @after-leave="onLogDialogAfterLeave">
        <div
          v-if="logDialogRendered"
          v-show="logDialogPhase !== 'closing'"
          class="fixed inset-0 z-50 flex min-h-[100vh] w-full items-center justify-center bg-slate-950/45 p-4 supports-[height:100dvh]:min-h-[100dvh]"
          role="presentation"
          :style="logDialogLayerStyle"
        >
      <Transition name="dialog-panel" appear>
      <section
        v-show="logDialogPhase !== 'closing'"
        ref="logDialogRef"
        class="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-deposit-address-log-title"
      >
        <header class="shrink-0 border-b border-slate-200 px-6 py-5">
          <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="public-deposit-address-log-title" ref="logInitialFocusRef" tabindex="-1" class="text-lg font-bold text-slate-900">修改日志</h2>
            <p v-if="logRow" class="mt-1 text-xs text-slate-500">
              {{ logRow.coin }} · {{ logRow.network }} · {{ logRow.id }}
            </p>
          </div>
          <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="关闭" @click="closeLogDialog">×</button>
          </div>
        </header>

        <div class="overflow-y-auto p-6">
          <div class="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p class="text-xs leading-5 text-blue-700">
              系统会在新增、编辑、启用、停用或更换公共收款地址成功后自动生成日志，记录操作类型、操作人、操作时间以及变更前后内容。日志按地址独立归档，仅用于审计追溯，不支持修改或删除。
            </p>
          </div>

          <div v-if="addressLogs.length" class="space-y-4">
            <article v-for="log in paginatedAddressLogs" :key="log.id" class="overflow-hidden rounded-xl border border-slate-200">
              <div class="flex flex-col gap-2 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                    {{ LOG_ACTION_LABELS[log.action] || log.action }}
                  </span>
                  <span class="text-xs text-slate-500">{{ log.occurredAt }}</span>
                </div>
                <span class="text-xs text-slate-500">操作人：{{ log.operator }}</span>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full min-w-[650px] text-left text-xs">
                  <thead class="border-b border-slate-100 text-slate-400">
                    <tr>
                      <th class="w-32 px-4 py-2.5 font-medium">变更字段</th>
                      <th class="px-4 py-2.5 font-medium">变更前</th>
                      <th class="px-4 py-2.5 font-medium">变更后</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="field in changedLogFields(log)" :key="field">
                      <td class="px-4 py-3 font-semibold text-slate-600">{{ LOG_FIELD_LABELS[field] }}</td>
                      <td class="max-w-xs break-all px-4 py-3 text-slate-500" :class="field === 'address' ? 'font-mono' : ''">
                        {{ formatLogValue(field, log.before?.[field]) }}
                      </td>
                      <td class="max-w-xs break-all bg-emerald-50/40 px-4 py-3 text-slate-800" :class="field === 'address' ? 'font-mono' : ''">
                        {{ formatLogValue(field, log.after?.[field]) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>

            <footer class="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-xs text-slate-500">
                共 {{ addressLogs.length }} 条 · 第 {{ logPage }} / {{ logPageCount }} 页
              </p>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="logPage <= 1"
                  @click="logPage -= 1"
                >上一页</button>
                <button
                  type="button"
                  class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="logPage >= logPageCount"
                  @click="logPage += 1"
                >下一页</button>
              </div>
            </footer>
          </div>
          <div v-else class="py-14 text-center">
            <p class="text-sm font-medium text-slate-500">暂无修改日志</p>
            <p class="mt-1 text-xs text-slate-400">该地址尚未发生配置变更</p>
          </div>
        </div>
      </section>
      </Transition>
        </div>
      </Transition>
    </Teleport>

    <MfaVerificationModal
      v-model:open="showMfaModal"
      :loading="mfaLoading"
      title="安全验证"
      description="公共收款地址属于敏感资金配置，请输入 MFA 验证码"
      @verify="handleMfaVerify"
      @cancel="cancelMfa"
    />
  </main>
</template>
