<script setup>
import AdminDialog from '../../../admin/components/antd/AdminDialog.vue'
import { nativeControl } from '../../../admin/components/antd/controls.js'
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
import { createDialogCloseAction, useDialogLifecycle } from '../../../admin/composables/useDialogLifecycle.js'

const props = defineProps({
  moduleKey: { type: String, required: true }
})

const query = ref('')
const valueFilter = ref('')
const addOpen = ref(false)
const addUserId = ref('')
const addSearchAttempted = ref(false)
const addSearchResult = ref(null)
const addedUserIds = ref([])
const modalOpen = ref(false)
const selectedUser = ref(null)
const addDialogRef = ref(null)
const addInputRef = ref(null)

const moduleMeta = computed(() => USER_CONTROL_MODULES.find((item) => item.key === props.moduleKey) || {
  key: props.moduleKey,
  label: '未知模块',
  family: 'trade',
  actionLabel: '用户点控'
})

const valueOptions = computed(() => [{ value: 'profit', label: '盈利' }, { value: 'loss', label: '亏损' }])

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
  value: valueFilter.value
}))

const pointControlLabel = (rule) => {
  if (!['active', 'processing'].includes(rule?.status)) return '-'
  return rule.strategy === 'positive' || rule.value === 'profit'
    ? '永久盈利'
    : rule.strategy === 'negative' || rule.value === 'loss'
      ? '永久亏损'
      : '-'
}

const pointControlBadgeClass = (label) => ({
  永久盈利: 'bg-orange-100 text-orange-700 ring-orange-200',
  永久亏损: 'bg-emerald-100 text-emerald-700 ring-emerald-200'
}[label] || 'bg-slate-100 text-slate-500 ring-slate-200')

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
  if (payload.strategy === 'normal') {
    const rule = selectedUser.value ? currentRule(selectedUser.value) : null
    if (selectedUser.value && ['active', 'processing'].includes(rule?.status)) {
      cancelSingleModuleControl({
        userId: userIdOf(selectedUser.value),
        moduleKey: props.moduleKey,
        note: payload.note || '恢复正常',
        now: formatTime(),
        operationId: `demo-cancel-${props.moduleKey}-${sequence}`
      })
    }
    closeSetting()
    return
  }
  setModuleUserControl({
    ...payload,
    moduleKey: props.moduleKey,
    ruleId: `demo-rule-${props.moduleKey}-${sequence}`,
    now: formatTime()
  })
  closeSetting()
}

const resetFilters = () => {
  query.value = ''
  valueFilter.value = ''
}

// The shared Ant frames (AdminDialog) drive these page-owned lifecycles (dialog migration 2026-11-27). Defined last so
// every handler they reference is initialised.
const addDialogLifecycle = { rendered: addDialogRendered, phase: addDialogPhase, layerStyle: addDialogLayerStyle, requestDialogClose: requestAddDialogClose, onAfterEnter: onAddDialogAfterEnter, onAfterLeave: handleAddDialogAfterLeave, dialogRef: addDialogRef }
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

    <div v-if="moduleMeta.family === 'trade'" class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
      用户点控只作用于目标用户的到期结算，不改变全局行情、K线或实时盈亏。
      单笔订单或持仓控制优先于用户级控制。
    </div>

    <article class="rounded-xl border border-slate-200 bg-white p-5">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label class="relative xl:col-span-2">
          <span class="sr-only">搜索用户</span>
          <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <a-input v-model:value="query" type="search" placeholder="搜索 UID、用户名、邮箱或手机号" class="w-full pl-9 pr-3" />
        </label>
        <a-select v-model:value="valueFilter" class="">
          <a-select-option value="">全部控制内容</a-select-option>
          <a-select-option v-for="option in valueOptions" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
        </a-select>
      </div>
      <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>共 {{ filteredRows.length }} 位用户</span>
        <div class="flex items-center gap-4">
          <a-button html-type="button" class="font-medium text-blue-600 hover:text-blue-700" @click="resetFilters">重置筛选</a-button>
          <a-button html-type="button" class="bg-blue-600 text-sm font-medium text-white hover:bg-blue-700" @click="openAddUser" type="primary">添加用户</a-button>
        </div>
      </div>
    </article>

    <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <a-table  :data-source="filteredRows" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(row) => row.userId" :custom-row="(row, index) => ({ class: [&quot;hover:bg-slate-50&quot;] })">
<a-table-column key="column-0" ><template #title>用户</template><template #default="{ record: row, index: index }"><div class=" ">
                <p class="font-medium text-slate-900">{{ row.username }}</p>
                <p class="mt-0.5 text-xs text-slate-500">UID {{ row.userId }}</p>
              </div></template></a-table-column>
<a-table-column key="column-1" ><template #title>点控</template><template #default="{ record: row, index: index }"><div class="  whitespace-nowrap">
                <span
                  v-if="pointControlLabel(row.rule) !== '-'"
                  class="inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ring-1"
                  :class="pointControlBadgeClass(pointControlLabel(row.rule))"
                >
                  {{ pointControlLabel(row.rule) }}
                </span>
                <span v-else class="text-xs text-slate-400">-</span>
              </div></template></a-table-column>
<a-table-column key="column-2" ><template #title>更新时间</template><template #default="{ record: row, index: index }"><div class="  text-slate-500">{{ row.rule?.updatedAt || '—' }}</div></template></a-table-column>
<a-table-column key="column-3" align="right"><template #title>操作</template><template #default="{ record: row, index: index }"><div class=" ">
                <div class="flex items-center justify-end gap-3 whitespace-nowrap text-sm font-medium">
                  <a-button html-type="button" class="text-blue-600 hover:text-blue-800" @click="openSetting(row)">
                    {{ row.rule ? '修改' : '设置' }}
                  </a-button>
                  <RouterLink
                    :to="{ name: 'users-control-log', query: { userId: row.userId, module: moduleKey } }"
                    class="text-slate-600 hover:text-slate-900"
                  >
                    日志
                  </RouterLink>
                </div>
              </div></template></a-table-column>
</a-table>
      </div>
      <div v-if="filteredRows.length === 0" class="px-6 py-14 text-center">
        <p class="text-sm font-medium text-slate-700">没有符合筛选条件的用户</p>
        <a-button html-type="button" class="mt-2 text-sm font-medium text-blue-600" @click="resetFilters">清除筛选条件</a-button>
      </div>
    </article>

    <UserControlModal
      :open="modalOpen"
      scope="module"
      :module-key="moduleKey"
      :show-help-panel="false"
      :note-required="false"
      :user="selectedUser"
      :existing-rules="selectedUser ? (userControlState.rules[userIdOf(selectedUser)] || {}) : {}"
      @close="closeSetting"
      @submit="submitSetting"
    />

    <AdminDialog :open="addDialogRendered" :lifecycle="addDialogLifecycle" :title="`添加${moduleMeta.label}点控用户`" title-id="module-user-control-add-title" testid="module-user-control-add-dialog" :width="448" plain>
      <template #subtitle>按 UID、邮箱或手机号搜索并加入当前用户点控列表。</template>
      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <label class="block" for="module-user-control-add-user-id">
                  <span class="text-sm font-medium text-slate-800"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>用户 UID</span>
                  <a-input id="module-user-control-add-user-id" :ref="el => { addInputRef = nativeControl(el) }" :value="addUserId" @update:value="addUserId = $event.trim()" type="search" autocomplete="off" placeholder="输入 UID、邮箱或手机号" :aria-invalid="addSearchAttempted && normalizedAddUserKeyword && !addSearchResult ? 'true' : 'false'" aria-describedby="module-user-control-add-help" class="mt-2 w-full" @input="clearAddSearchResult" @keydown.enter.prevent="confirmAddUser" />
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
                    UID {{ addUserEffectiveId }}
                  </p>
                  <p v-if="addUserAlreadyListed" class="mt-2 text-xs text-amber-700">
                    该 UID 已在列表中，确认后将清空其他筛选并定位到该用户。
                  </p>
                </div>
              </div>
              <footer class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
                <a-button html-type="button" @click="closeAddUser">取消</a-button>
                <a-button html-type="button" :disabled="!canConfirmAddUser" @click="confirmAddUser" type="primary">
                  确定
                </a-button>
              </footer>
    </AdminDialog>
  </section>
</template>

