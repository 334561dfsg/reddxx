<script setup>
import { computed, ref } from 'vue'
import UserControlModal from '../../../admin/components/user-control/UserControlModal.vue'
import { usersList } from '../../../admin/mock/user.js'
import {
  cancelSingleModuleControl,
  setModuleUserControl,
  userControlState
} from '../../../admin/state/userControlState.js'
import {
  filterUserControlRows,
  USER_CONTROL_MODULES
} from '../../../features/user-control/userControl.js'
import { createDialogCloseAction, useDialogContentSnapshot, useDialogLifecycle } from '../../../admin/composables/useDialogLifecycle.js'

const props = defineProps({
  moduleKey: { type: String, required: true }
})

const query = ref('')
const valueFilter = ref('')
const statusFilter = ref('')
const sourceFilter = ref('')
const addOpen = ref(false)
const addUserId = ref('')
const addSearchAttempted = ref(false)
const addSearchResult = ref(null)
const addedUserIds = ref([])
const modalOpen = ref(false)
const cancelOpen = ref(false)
const selectedUser = ref(null)
const cancelNote = ref('')
const addDialogRef = ref(null)
const addInputRef = ref(null)
const moduleCancelDialogRef = ref(null)
const moduleCancelReturnRef = ref(null)

const moduleMeta = computed(() => USER_CONTROL_MODULES.find((item) => item.key === props.moduleKey) || {
  key: props.moduleKey,
  label: '未知模块',
  family: 'trade',
  actionLabel: '用户点控'
})

const {
  rendered: moduleCancelRendered,
  phase: moduleCancelPhase,
  layerStyle: moduleCancelLayerStyle,
  requestDialogClose: requestModuleCancelClose,
  onAfterEnter: onModuleCancelAfterEnter,
  onAfterLeave: onModuleCancelAfterLeave
} = useDialogLifecycle({
  open: cancelOpen,
  dialogRef: moduleCancelDialogRef,
  initialFocusRef: moduleCancelReturnRef,
  requestClose: () => { cancelOpen.value = false }
})

const moduleCancelDialogData = computed(() => ({
  user: selectedUser.value ? { ...selectedUser.value } : null,
  moduleLabel: moduleMeta.value.label
}))
const { content: displayedModuleCancelData, clear: clearModuleCancelSnapshot } = useDialogContentSnapshot({
  open: cancelOpen,
  phase: moduleCancelPhase,
  source: moduleCancelDialogData,
  clone: (data) => ({
    user: data.user ? { ...data.user } : null,
    moduleLabel: data.moduleLabel
  })
})

const valueOptions = computed(() => moduleMeta.value.family === 'finance'
  ? [{ value: 'highYield', label: '高收益' }, { value: 'lowYield', label: '低收益' }]
  : [{ value: 'profit', label: '盈利' }, { value: 'loss', label: '亏损' }])

const userIdOf = (user) => String(user?.userId ?? user?.id ?? '')
const currentRule = (user) => userControlState.value.rules[userIdOf(user)]?.[props.moduleKey] || null
const normalizedAddUserKeyword = computed(() => addUserId.value.trim().toLowerCase())
const userMatchesAddQuery = (user, keyword) => {
  const id = String(user?.id ?? '')
  const email = String(user?.email ?? '').toLowerCase()
  const phone = String(user?.phone ?? '')
  return id.toLowerCase() === keyword || id.replace(/^user_/, '').toLowerCase() === keyword || email === keyword || phone === keyword
}
const addUserEffectiveId = computed(() => userIdOf(addSearchResult.value))
const listedUserIds = computed(() => new Set([
  ...Object.keys(userControlState.value.rules),
  ...addedUserIds.value
]))
const addUserAlreadyListed = computed(() => addUserEffectiveId.value && listedUserIds.value.has(addUserEffectiveId.value))
const canConfirmAddUser = computed(() => addDialogPhase.value === 'open' && Boolean(normalizedAddUserKeyword.value))

const {
  rendered: addDialogRendered,
  phase: addDialogPhase,
  layerStyle: addDialogLayerStyle,
  requestDialogClose: requestAddDialogClose,
  onAfterEnter: onAddDialogAfterEnter,
  onAfterLeave: onAddDialogAfterLeave
} = useDialogLifecycle({
  open: addOpen,
  dialogRef: addDialogRef,
  initialFocusRef: addInputRef,
  requestClose: () => { addOpen.value = false }
})

const allUsers = computed(() => {
  const mockUserMap = new Map(usersList.map((user) => [String(user.id), user]))
  const userMap = new Map()

  const addUserToMap = (userId) => {
    if (userMap.has(userId)) return
    const mockUser = mockUserMap.get(userId)
    if (mockUser) {
      userMap.set(userId, mockUser)
      return
    }
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        id: userId,
        username: `demo_user_${userId}`,
        email: `demo_${userId}@example.com`
      })
    }
  }

  Object.keys(userControlState.value.rules).forEach(addUserToMap)
  addedUserIds.value.forEach(addUserToMap)

  return [...userMap.values()]
})

const rows = computed(() => allUsers.value.map((user) => ({
  ...user,
  userId: userIdOf(user),
  rule: currentRule(user)
})))

const filteredRows = computed(() => filterUserControlRows(rows.value, {
  query: query.value,
  value: valueFilter.value,
  status: statusFilter.value,
  source: sourceFilter.value
}))

const effectiveRules = computed(() => rows.value
  .map((row) => row.rule)
  .filter((rule) => rule?.status === 'active'))

const summaryCards = computed(() => [
  { label: '用户总数', value: rows.value.length, hint: '点控记录和手动添加' },
  { label: '当前有效', value: effectiveRules.value.length, hint: `${moduleMeta.value.actionLabel}规则` },
  { label: '单次待执行', value: effectiveRules.value.filter((rule) => rule.duration === 'once').length, hint: '每个模块各执行 1 次' },
  { label: '持续生效中', value: effectiveRules.value.filter((rule) => rule.duration === 'permanent').length, hint: '直到取消或覆盖' }
])

const valueLabel = (value) => ({
  profit: '盈利',
  loss: '亏损',
  highYield: '高收益',
  lowYield: '低收益'
})[value] || '未设置'

const durationLabel = (duration) => ({ once: '只生效一次', permanent: '持续生效' })[duration] || '—'

const statusMeta = (rule) => {
  if (!rule) return { label: '未设置', classes: 'bg-slate-100 text-slate-600' }
  if (rule.status === 'active' && rule.duration === 'once') return { label: '待执行', classes: 'bg-amber-100 text-amber-700' }
  if (rule.status === 'active') return { label: '生效中', classes: 'bg-emerald-100 text-emerald-700' }
  return ({
    consumed: { label: '已执行', classes: 'bg-slate-100 text-slate-600' },
    cancelled: { label: '已取消', classes: 'bg-rose-100 text-rose-700' },
    superseded: { label: '已覆盖', classes: 'bg-purple-100 text-purple-700' }
  })[rule.status] || { label: rule.status, classes: 'bg-slate-100 text-slate-600' }
}

const sourceMeta = (source) => source === 'global'
  ? { label: '用户点控设置', classes: 'bg-violet-100 text-violet-700' }
  : source === 'module'
    ? { label: '当前模块点控', classes: 'bg-blue-100 text-blue-700' }
    : { label: '—', classes: 'bg-slate-100 text-slate-500' }

const formatTime = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const nextSequence = () => String(userControlState.value.operationLogs.length + 1).padStart(4, '0')

const openAddUser = () => {
  if (addDialogPhase.value !== 'closed') return
  addUserId.value = ''
  addSearchAttempted.value = false
  addSearchResult.value = null
  addOpen.value = true
}

const closeAddUser = createDialogCloseAction(requestAddDialogClose)

const clearAddSearchResult = () => {
  addSearchAttempted.value = false
  addSearchResult.value = null
}

const confirmAddUser = () => {
  if (!canConfirmAddUser.value) return

  addSearchAttempted.value = true
  const matchedUser = usersList.find((user) => userMatchesAddQuery(user, normalizedAddUserKeyword.value)) || null
  addSearchResult.value = matchedUser
  if (!matchedUser) return

  const userId = addUserEffectiveId.value
  if (!addUserAlreadyListed.value) {
    addedUserIds.value = [userId, ...addedUserIds.value]
  }
  query.value = userId
  valueFilter.value = ''
  statusFilter.value = ''
  sourceFilter.value = ''
  closeAddUser()
}

const handleAddDialogAfterLeave = async () => {
  if (!await onAddDialogAfterLeave()) return
  addUserId.value = ''
  addSearchAttempted.value = false
  addSearchResult.value = null
}

const openSetting = (user) => {
  selectedUser.value = user
  modalOpen.value = true
}

const closeSetting = () => {
  modalOpen.value = false
  selectedUser.value = null
}

const submitSetting = (payload) => {
  const sequence = nextSequence()
  setModuleUserControl({
    ...payload,
    moduleKey: props.moduleKey,
    ruleId: `demo-rule-${props.moduleKey}-${sequence}`,
    now: formatTime()
  })
  closeSetting()
}

const openCancel = (user) => {
  if (moduleCancelPhase.value !== 'closed') return
  selectedUser.value = user
  cancelNote.value = ''
  cancelOpen.value = true
}

const closeCancel = createDialogCloseAction(requestModuleCancelClose)

const confirmCancel = () => {
  if (moduleCancelPhase.value !== 'open' || !selectedUser.value || !cancelNote.value.trim()) return
  const sequence = nextSequence()
  cancelSingleModuleControl({
    userId: userIdOf(selectedUser.value),
    moduleKey: props.moduleKey,
    note: cancelNote.value.trim(),
    now: formatTime(),
    operationId: `demo-cancel-${props.moduleKey}-${sequence}`
  })
  closeCancel()
}

const handleModuleCancelAfterLeave = async () => {
  if (!await onModuleCancelAfterLeave()) return
  cancelNote.value = ''
  selectedUser.value = null
  clearModuleCancelSnapshot()
}

const resetFilters = () => {
  query.value = ''
  valueFilter.value = ''
  statusFilter.value = ''
  sourceFilter.value = ''
}
</script>

<template>
  <section class="space-y-6">
    <header>
      <div>
        <p class="text-sm font-medium text-blue-600">{{ moduleMeta.label }}</p>
        <h1 class="mt-1 text-3xl font-semibold text-slate-900">{{ moduleMeta.actionLabel }}</h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          {{ moduleMeta.family === 'trade'
            ? '针对单个用户设置最终结算盈亏方向，不改变其他用户的自然结果。'
            : '针对单个用户设置实际入账或最终结算的收益档位，不直接输入金额或收益率。' }}
        </p>
      </div>
    </header>

    <div v-if="moduleKey === 'perpetual'" class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
      用户点控不改变K线、标记价格和实时浮盈亏，只在目标用户最终平仓结算时决定盈亏方向。
      优先级：单笔/持仓控制 &gt; 用户级控制 &gt; 全局场控 &gt; 自然结果。
    </div>
    <div v-else-if="moduleMeta.family === 'trade'" class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
      用户点控只作用于目标用户的最终结算，不改变全局行情、K线或实时浮盈亏。
      单笔订单或持仓控制优先于用户级控制。
    </div>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article v-for="card in summaryCards" :key="card.label" class="rounded-xl border border-slate-200 bg-white p-5">
        <p class="text-sm text-slate-500">{{ card.label }}</p>
        <p class="mt-2 text-2xl font-semibold text-slate-900">{{ card.value }}</p>
        <p class="mt-1 text-xs text-slate-400">{{ card.hint }}</p>
      </article>
    </div>

    <article class="rounded-xl border border-slate-200 bg-white p-5">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label class="relative xl:col-span-2">
          <span class="sr-only">搜索用户</span>
          <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input v-model="query" type="search" placeholder="搜索 UID、用户名、邮箱或手机号" class="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </label>
        <select v-model="valueFilter" class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
          <option value="">全部控制内容</option>
          <option v-for="option in valueOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <select v-model="statusFilter" class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
          <option value="">全部状态</option>
          <option value="active">当前有效</option>
          <option value="consumed">已执行</option>
          <option value="cancelled">已取消</option>
        </select>
        <select v-model="sourceFilter" class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
          <option value="">全部规则来源</option>
          <option value="global">用户点控设置</option>
          <option value="module">当前模块点控</option>
        </select>
      </div>
      <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>共 {{ filteredRows.length }} 位用户</span>
        <div class="flex items-center gap-4">
          <button type="button" class="font-medium text-blue-600 hover:text-blue-700" @click="resetFilters">重置筛选</button>
          <button type="button" class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" @click="openAddUser">添加用户</button>
        </div>
      </div>
    </article>

    <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1120px] text-left text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th class="px-4 py-3">用户</th>
              <th class="px-4 py-3">当前控制</th>
              <th class="px-4 py-3">生效方式</th>
              <th class="px-4 py-3">当前状态</th>
              <th class="px-4 py-3">规则来源</th>
              <th class="px-4 py-3">更新时间</th>
              <th class="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in filteredRows" :key="row.userId" class="hover:bg-slate-50">
              <td class="px-4 py-4">
                <p class="font-medium text-slate-900">{{ row.username }}</p>
                <p class="mt-0.5 text-xs text-slate-500">UID {{ row.userId }} · {{ row.email }} · {{ row.phone || '未留手机号' }}</p>
              </td>
              <td class="px-4 py-4 font-medium" :class="row.rule ? 'text-slate-900' : 'text-slate-400'">{{ valueLabel(row.rule?.value) }}</td>
              <td class="px-4 py-4 text-slate-600">{{ durationLabel(row.rule?.duration) }}</td>
              <td class="px-4 py-4">
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" :class="statusMeta(row.rule).classes">
                  {{ statusMeta(row.rule).label }}
                </span>
              </td>
              <td class="px-4 py-4">
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" :class="sourceMeta(row.rule?.source).classes">
                  {{ sourceMeta(row.rule?.source).label }}
                </span>
              </td>
              <td class="px-4 py-4 text-slate-500">{{ row.rule?.updatedAt || '—' }}</td>
              <td class="px-4 py-4">
                <div class="flex items-center justify-end gap-3 whitespace-nowrap text-sm font-medium">
                  <button type="button" class="text-blue-600 hover:text-blue-800" @click="openSetting(row)">
                    {{ row.rule ? '修改' : '设置' }}
                  </button>
                  <button
                    type="button"
                    :disabled="row.rule?.status !== 'active'"
                    class="text-rose-600 hover:text-rose-800 disabled:cursor-not-allowed disabled:text-slate-300"
                    @click="openCancel(row)"
                  >
                    取消
                  </button>
                  <RouterLink
                    :to="{ name: 'users-control-log', query: { userId: row.userId, module: moduleKey } }"
                    class="text-slate-600 hover:text-slate-900"
                  >
                    日志
                  </RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="filteredRows.length === 0" class="px-6 py-14 text-center">
        <p class="text-sm font-medium text-slate-700">没有符合筛选条件的用户</p>
        <button type="button" class="mt-2 text-sm font-medium text-blue-600" @click="resetFilters">清除筛选条件</button>
      </div>
    </article>

    <UserControlModal
      :open="modalOpen"
      scope="module"
      :module-key="moduleKey"
      :user="selectedUser"
      :existing-rules="selectedUser ? (userControlState.rules[userIdOf(selectedUser)] || {}) : {}"
      @close="closeSetting"
      @submit="submitSetting"
    />

    <Teleport to="body">
      <Transition name="dialog-overlay" appear @after-enter="onAddDialogAfterEnter" @after-leave="handleAddDialogAfterLeave">
        <div v-if="addDialogRendered" v-show="addDialogPhase !== 'closing'" class="fixed inset-0 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" :style="addDialogLayerStyle">
          <Transition name="dialog-panel" appear>
            <section v-show="addDialogPhase !== 'closing'" ref="addDialogRef" data-testid="module-user-control-add-dialog" class="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]" role="dialog" aria-modal="true" aria-labelledby="module-user-control-add-title">
              <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div class="min-w-0 flex-1">
                  <h2 id="module-user-control-add-title" class="break-words text-lg font-semibold text-slate-900">添加{{ moduleMeta.label }}点控用户</h2>
                  <p class="mt-1 break-words text-sm text-slate-500">按 UID、邮箱或手机号搜索并加入当前用户点控列表。</p>
                </div>
                <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="关闭" @click="closeAddUser">×</button>
              </header>
              <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <label class="block" for="module-user-control-add-user-id">
                  <span class="text-sm font-medium text-slate-800">用户 UID <span class="text-rose-500">*</span></span>
                  <input
                    id="module-user-control-add-user-id"
                    ref="addInputRef"
                    v-model.trim="addUserId"
                    type="search"
                    autocomplete="off"
                    placeholder="输入 UID、邮箱或手机号"
                    :aria-invalid="addSearchAttempted && normalizedAddUserKeyword && !addSearchResult ? 'true' : 'false'"
                    aria-describedby="module-user-control-add-help"
                    class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    @input="clearAddSearchResult"
                    @keydown.enter.prevent="confirmAddUser"
                  />
                </label>
                <p id="module-user-control-add-help" class="text-xs leading-5 text-slate-500">
                  命中用户后点击确定会把用户加入当前列表并定位到该行，不会创建点控规则。
                </p>
                <p v-if="addSearchAttempted && normalizedAddUserKeyword && !addSearchResult" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  没有搜索到匹配用户，请检查输入内容。
                </p>
                <div v-else-if="addSearchResult" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <p class="text-sm font-medium text-slate-900">
                    {{ addSearchResult.username }}
                  </p>
                  <p class="mt-1 break-words text-xs text-slate-500">
                    UID {{ addUserEffectiveId }} · {{ addSearchResult.email }} · {{ addSearchResult.phone }}
                  </p>
                  <p v-if="addUserAlreadyListed" class="mt-2 text-xs text-amber-700">
                    该 UID 已在列表中，确认后将清空其他筛选并定位到该用户。
                  </p>
                </div>
              </div>
              <footer class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
                <button type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" @click="closeAddUser">取消</button>
                <button type="button" :disabled="!canConfirmAddUser" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" @click="confirmAddUser">
                  确定
                </button>
              </footer>
            </section>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="dialog-overlay" appear @after-enter="onModuleCancelAfterEnter" @after-leave="handleModuleCancelAfterLeave">
        <div v-if="moduleCancelRendered" v-show="moduleCancelPhase !== 'closing'" class="fixed inset-0 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" :style="moduleCancelLayerStyle">
          <Transition name="dialog-panel" appear>
            <section v-show="moduleCancelPhase !== 'closing'" ref="moduleCancelDialogRef" data-testid="module-user-control-cancel-dialog" class="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]" role="dialog" aria-modal="true" aria-labelledby="module-user-control-cancel-title">
              <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div class="min-w-0 flex-1">
                  <h2 id="module-user-control-cancel-title" class="break-words text-lg font-semibold text-slate-900">取消{{ displayedModuleCancelData.moduleLabel }}用户规则</h2>
                  <p class="mt-1 break-words text-sm text-slate-500">{{ displayedModuleCancelData.user?.username }} · UID {{ userIdOf(displayedModuleCancelData.user) }}</p>
                </div>
                <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="关闭" @click="closeCancel">×</button>
              </header>
              <div data-testid="module-user-control-cancel-body" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
                <p class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  本次操作只影响当前模块，其他模块规则继续生效。
                </p>
                <label class="block">
                  <span class="text-sm font-medium text-slate-800">取消点控备注 <span class="text-rose-500">*</span></span>
                  <textarea v-model="cancelNote" rows="2" maxlength="200" placeholder="请填写取消点控原因，便于后续审计" class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
              </div>
              <footer class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
                <button ref="moduleCancelReturnRef" type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" @click="closeCancel">返回</button>
                <button type="button" :disabled="moduleCancelPhase !== 'open' || !cancelNote.trim()" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50" @click="confirmCancel">
                  确认取消
                </button>
              </footer>
            </section>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.dialog-overlay-enter-active { transition: opacity 200ms ease-out; }
.dialog-overlay-leave-active { transition: opacity 150ms ease-in; }
.dialog-panel-enter-active { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.dialog-panel-leave-active { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.dialog-overlay-enter-from,
.dialog-overlay-leave-to,
.dialog-panel-enter-from,
.dialog-panel-leave-to { opacity: 0; }
.dialog-panel-enter-from,
.dialog-panel-leave-to { transform: scale(0.96); }

@media (prefers-reduced-motion: reduce) {
  .dialog-overlay-enter-active,
  .dialog-overlay-leave-active,
  .dialog-panel-enter-active,
  .dialog-panel-leave-active { transition-duration: 50ms; }
  .dialog-panel-enter-from,
  .dialog-panel-leave-to { transform: none; }
}
</style>
