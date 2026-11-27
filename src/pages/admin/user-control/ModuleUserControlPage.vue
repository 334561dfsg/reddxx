<script setup>
// 模块用户点控 — Ant Design Pro list (2026-11-28): query card with one field per filter (UID / 用户名 / 邮箱 / 手机号 /
// 点控内容, replacing the combined keyword box), table card with text Tags and link actions. The add-user AdminDialog
// and its page-owned lifecycle are unchanged.
import AdminDialog from '../../../admin/components/antd/AdminDialog.vue'
import { Alert, Button, Space, Tag, TypographyText } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
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

const blankFilters = () => ({ userId: '', username: '', email: '', phone: '', value: 'all' })
const filters = ref(blankFilters())
const page = ref(1)
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

const queryFields = computed(() => [
  { key: 'userId', label: 'UID' },
  { key: 'username', label: '用户名' },
  { key: 'email', label: '邮箱' },
  { key: 'phone', label: '手机号' },
  { key: 'value', label: '点控内容', options: [{ value: 'all', label: '全部控制内容' }, ...valueOptions.value] }
])

// Email and phone stay searchable but are never displayed in the list.
const fieldHit = (value, keyword) => !keyword.trim() || String(value ?? '').toLowerCase().includes(keyword.trim().toLowerCase())
const valueFilter = computed(() => (filters.value.value === 'all' ? '' : filters.value.value))
const filteredRows = computed(() => filterUserControlRows(rows.value, {
  value: valueFilter.value
}).filter((user) => fieldHit(user.userId, filters.value.userId) && fieldHit(user.username, filters.value.username) &&
  fieldHit(user.email, filters.value.email) && fieldHit(user.phone, filters.value.phone)))

const columns = [
  { key: 'user', title: '用户', width: 220 },
  { key: 'pointControl', title: '点控', width: 120 },
  { key: 'updatedAt', title: '更新时间', width: 180 },
  { key: 'actions', title: '操作', width: 140, fixed: 'right' }
]

function search(values) { filters.value = { ...blankFilters(), ...values }; page.value = 1 }

const pointControlLabel = (rule) => {
  if (!['active', 'processing'].includes(rule?.status)) return '-'
  return rule.strategy === 'positive' || rule.value === 'profit'
    ? '永久盈利'
    : rule.strategy === 'negative' || rule.value === 'loss'
      ? '永久亏损'
      : '-'
}

// Same colours as the user list badge, as text Tags (no ring borders).
const pointControlTagColor = (label) => ({
  永久盈利: 'orange',
  永久亏损: 'green'
}[label] || 'default')

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
  // Clear the other filters and locate the added user.
  filters.value = { ...blankFilters(), userId }
  page.value = 1
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
  filters.value = blankFilters()
  page.value = 1
}

// The shared Ant frames (AdminDialog) drive these page-owned lifecycles (dialog migration 2026-11-27). Defined last so
// every handler they reference is initialised.
const addDialogLifecycle = { rendered: addDialogRendered, phase: addDialogPhase, layerStyle: addDialogLayerStyle, requestDialogClose: requestAddDialogClose, onAfterEnter: onAddDialogAfterEnter, onAfterLeave: handleAddDialogAfterLeave, dialogRef: addDialogRef }
</script>

<template>
  <PageShell>
    <SearchForm name="module-user-control-filters" :model="filters" :fields="queryFields" @search="search" @reset="resetFilters" />

    <Alert v-if="moduleMeta.family === 'trade'" type="info" show-icon message="用户点控只作用于目标用户的到期结算，不改变全局行情、K线或实时盈亏。单笔订单或持仓控制优先于用户级控制。" />

    <AdminTable :title="`${moduleMeta.label}${moduleMeta.actionLabel}`" v-model:page="page" :rows="filteredRows" :columns="columns" row-key="userId" desktop-only>
      <template #toolbar>
        <Button type="primary" @click="openAddUser"><template #icon><PlusOutlined /></template>添加用户</Button>
      </template>
      <template #cell="{ column, record: row }">
        <Space v-if="column.key === 'user'" direction="vertical" :size="0">
          <span>{{ row.username }}</span>
          <TypographyText type="secondary" class="font-mono">UID {{ row.userId }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'pointControl'">
          <Tag v-if="pointControlLabel(row.rule) !== '-'" :color="pointControlTagColor(pointControlLabel(row.rule))">{{ pointControlLabel(row.rule) }}</Tag>
          <TypographyText v-else type="secondary">-</TypographyText>
        </template>
        <TypographyText v-else-if="column.key === 'updatedAt'" type="secondary">{{ row.rule?.updatedAt || '—' }}</TypographyText>
        <Space v-else-if="column.key === 'actions'" :size="8">
          <Button type="link" class="px-0" @click="openSetting(row)">{{ row.rule ? '修改' : '设置' }}</Button>
          <RouterLink v-slot="{ href, navigate }" :to="{ name: 'users-control-log', query: { userId: row.userId, module: moduleKey } }" custom>
            <Button type="link" class="px-0" :href="href" @click="navigate">日志</Button>
          </RouterLink>
        </Space>
        <template v-else>{{ row[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

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
  </PageShell>
</template>

