<script setup>
import { computed, ref, watch } from 'vue'
import { USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from '../../constants/user.js'
import { getDescendants, getDirectReferrals } from '../../repositories/userRelationshipRepository.js'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  mode: { type: String, default: 'direct' },
  returnFocus: { type: [Object, Function], default: null }
})

const emit = defineEmits(['close', 'closed'])
const drawerRef = ref(null)
const titleRef = ref(null)
const keyword = ref('')
const status = ref('all')
const role = ref('all')
const selectedMember = ref(null)

const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const isAllMode = computed(() => props.mode === 'all')
const title = computed(() => isAllMode.value ? '查看全部下级' : '查看直属下级')
const allMembers = computed(() => {
  if (!userId.value) return []
  if (isAllMode.value) return getDescendants(userId.value)
  return getDirectReferrals(userId.value).map((member) => ({
    ...member,
    depth: 1,
    path: [props.user, member].filter(Boolean)
  }))
})

const filteredMembers = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  return allMembers.value.filter((member) => {
    const matchesSearch = !search || [member.id, member.userId, member.username, member.email]
      .some((value) => String(value ?? '').toLowerCase().includes(search))
    const matchesStatus = status.value === 'all' || member.status === status.value
    const matchesRole = role.value === 'all' || member.role === role.value
    return matchesSearch && matchesStatus && matchesRole
  })
})

const hasFilters = computed(() => Boolean(keyword.value.trim()) || status.value !== 'all' || role.value !== 'all')
const statusLabel = (value) => USER_STATUS_OPTIONS.find((item) => item.value === value)?.label || value || '—'
const roleLabel = (value) => USER_ROLE_OPTIONS.find((item) => item.value === value)?.label || value || '—'
const formatMoney = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value || 0))
const formatTime = (value) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'
const pathLabel = (member) => (member.path || []).map((row) => row?.username || row?.id).filter(Boolean).join(' → ')

const {
  rendered,
  phase,
  layerStyle,
  requestDialogClose,
  onAfterEnter,
  onAfterLeave
} = useDialogLifecycle({
  open: computed(() => props.visible),
  dialogRef: drawerRef,
  initialFocusRef: titleRef,
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close')
})

const close = createDialogCloseAction(requestDialogClose)
const handleAfterLeave = () => {
  onAfterLeave()
  emit('closed')
}

watch(() => [props.visible, userId.value, props.mode], ([visible]) => {
  if (!visible) return
  keyword.value = ''
  status.value = 'all'
  role.value = 'all'
  selectedMember.value = null
})
</script>

<template>
  <Teleport to="body">
    <Transition name="relationship-overlay" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div
        v-if="rendered"
        v-show="phase !== 'closing'"
        class="fixed inset-0 flex justify-end bg-slate-950/50"
        :style="layerStyle"
        role="presentation"
      >
        <section
          ref="drawerRef"
          class="relationship-panel flex h-screen max-h-screen w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl supports-[height:100dvh]:h-dvh supports-[height:100dvh]:max-h-dvh"
          role="dialog"
          aria-modal="true"
          aria-labelledby="relationship-drawer-title"
        >
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
            <div class="min-w-0 flex-1">
              <h2 id="relationship-drawer-title" ref="titleRef" tabindex="-1" class="text-xl font-semibold text-slate-900 outline-none">
                {{ title }}
              </h2>
              <p class="mt-1 break-words text-sm text-slate-500">
                {{ user?.username || '未知用户' }} · UID {{ userId || '—' }} · 共 {{ allMembers.length }} 人
              </p>
            </div>
            <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="关闭" @click="close">×</button>
          </header>

          <div class="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_9rem]">
              <label>
                <span class="sr-only">搜索下级</span>
                <input v-model="keyword" type="search" class="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="搜索用户名、邮箱或 UID" />
              </label>
              <label>
                <span class="sr-only">账户状态</span>
                <select v-model="status" class="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-500">
                  <option value="all">全部状态</option>
                  <option v-for="item in USER_STATUS_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </label>
              <label>
                <span class="sr-only">用户角色</span>
                <select v-model="role" class="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-500">
                  <option value="all">全部角色</option>
                  <option v-for="item in USER_ROLE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </label>
            </div>
          </div>

          <div data-testid="relationship-drawer-body" class="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
            <div v-if="selectedMember" class="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              已选择 {{ selectedMember.username }} · UID {{ selectedMember.id || selectedMember.userId }} · {{ roleLabel(selectedMember.role) }}
            </div>

            <div v-if="filteredMembers.length" class="space-y-2">
              <button
                v-for="member in filteredMembers"
                :key="member.id || member.userId"
                type="button"
                class="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                @click="selectedMember = member"
              >
                <span class="flex flex-wrap items-start justify-between gap-2">
                  <span>
                    <span class="font-medium text-slate-900">{{ member.username }}</span>
                    <span class="ml-2 text-xs text-slate-500">UID {{ member.id || member.userId }}</span>
                  </span>
                  <span class="flex gap-1.5 text-xs">
                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{{ roleLabel(member.role) }}</span>
                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{{ statusLabel(member.status) }}</span>
                  </span>
                </span>
                <span class="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-3">
                  <span>层级：第 {{ member.depth || 1 }} 层</span>
                  <span>直属上级：{{ member.parentUsername || '无' }}</span>
                  <span>余额：{{ formatMoney(member.balance) }}</span>
                </span>
                <span v-if="isAllMode" class="mt-1.5 block break-words text-xs text-slate-500">关系路径：{{ pathLabel(member) }}</span>
                <span class="mt-1.5 block text-xs text-slate-500">注册时间：{{ formatTime(member.registerTime) }}</span>
              </button>
            </div>

            <div v-else class="grid min-h-52 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
              <div>
                <p class="font-medium text-slate-700">{{ hasFilters ? '筛选后没有结果' : '当前没有下级' }}</p>
                <p class="mt-1 text-sm text-slate-500">{{ hasFilters ? '请调整搜索关键词或筛选条件' : '该用户目前没有符合此范围的下级成员' }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.relationship-overlay-enter-active { transition: opacity 200ms ease-out; }
.relationship-overlay-leave-active { transition: opacity 150ms ease-in; }
.relationship-overlay-enter-active .relationship-panel { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.relationship-overlay-leave-active .relationship-panel { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.relationship-overlay-enter-from,
.relationship-overlay-leave-to { opacity: 0; }
.relationship-overlay-enter-from .relationship-panel,
.relationship-overlay-leave-to .relationship-panel { opacity: 0; transform: translateX(100%); }
@media (prefers-reduced-motion: reduce) {
  .relationship-overlay-enter-active,
  .relationship-overlay-leave-active,
  .relationship-overlay-enter-active .relationship-panel,
  .relationship-overlay-leave-active .relationship-panel { transition-duration: 50ms; }
  .relationship-overlay-enter-from .relationship-panel,
  .relationship-overlay-leave-to .relationship-panel { transform: none; }
}
</style>
