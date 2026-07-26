<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'
import CompactPagination from '../CompactPagination.vue'

const PAGE_SIZE = 10
const STATUS_LABELS = {
  active: '活跃',
  suspended: '暂停',
  banned: '禁用'
}

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  rows: { type: Array, default: () => [] },
  error: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'retry'])
const drawerRef = ref(null)
const titleRef = ref(null)
const errorRef = ref(null)
const query = ref('')
const status = ref('all')
const currentPage = ref(1)
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const filteredRows = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()
  return props.rows.filter((row) => (
    (status.value === 'all' || row.status === status.value) &&
    (!normalizedQuery || String(row.uid).toLowerCase().includes(normalizedQuery) || row.username.toLowerCase().includes(normalizedQuery))
  ))
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / PAGE_SIZE)))
const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredRows.value.slice(start, start + PAGE_SIZE)
})
const formatNumber = (value, digits = 0) => Number(value || 0).toLocaleString('zh-CN', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits
})
const formatMoney = (value) => `${formatNumber(value, 2)} USDT`

const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.visible),
  dialogRef: drawerRef,
  initialFocusRef: computed(() => props.error ? errorRef.value : titleRef.value),
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close')
})
const close = createDialogCloseAction(requestDialogClose)
const handleAfterLeave = async () => {
  if (!await onAfterLeave()) return
  emit('closed')
}

watch([query, status], () => {
  currentPage.value = 1
})
watch(totalPages, (nextTotalPages) => {
  currentPage.value = Math.min(Math.max(1, currentPage.value), nextTotalPages)
})
watch(() => [props.visible, userId.value], ([visible]) => {
  if (!visible) return
  query.value = ''
  status.value = 'all'
  currentPage.value = 1
})
watch(() => props.error, async (error) => {
  if (!props.visible || !error) return
  await nextTick()
  errorRef.value?.focus()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="agent-subordinate-drawer" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div v-if="rendered" v-show="phase !== 'closing'" class="fixed inset-0 flex justify-end bg-slate-950/50" :style="layerStyle" role="presentation">
        <aside
          ref="drawerRef"
          data-testid="user-agent-subordinate-drawer"
          class="agent-subordinate-drawer-panel flex h-[100vh] max-h-[100vh] w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-agent-subordinate-title"
        >
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4" style="padding-right: max(1rem, env(safe-area-inset-right)); padding-left: max(1rem, env(safe-area-inset-left)); padding-top: max(0.75rem, env(safe-area-inset-top));">
            <div class="min-w-0 flex-1">
              <h2 id="user-agent-subordinate-title" ref="titleRef" tabindex="-1" class="break-words text-lg font-semibold text-slate-900 outline-none">代理下级用户</h2>
              <p class="mt-0.5 break-words text-sm text-slate-500">{{ user?.username || '未知代理' }} · UID {{ userId || '—' }}</p>
            </div>
            <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="关闭" @click="close">×</button>
          </header>

          <div data-testid="user-agent-subordinate-body" class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5" style="padding-right: max(1rem, env(safe-area-inset-right)); padding-bottom: max(1rem, env(safe-area-inset-bottom)); padding-left: max(1rem, env(safe-area-inset-left));">
            <div class="grid grid-cols-1 gap-3 min-[520px]:grid-cols-[minmax(0,1fr)_10rem]">
              <label class="block min-w-0 text-xs font-medium text-slate-600">
                搜索下级用户
                <input v-model="query" type="search" aria-label="搜索下级用户" placeholder="搜索 UID 或用户名" class="ant-input mt-1 w-full" />
              </label>
              <label class="block text-xs font-medium text-slate-600">
                用户状态
                <select v-model="status" aria-label="用户状态" class="ant-select mt-1 w-full">
                  <option value="all">全部</option>
                  <option value="active">活跃</option>
                  <option value="suspended">暂停</option>
                  <option value="banned">禁用</option>
                </select>
              </label>
            </div>

            <p v-if="error" ref="errorRef" data-testid="agent-subordinate-error" tabindex="-1" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 outline-none" role="alert">
              <span class="font-semibold">代理下级用户加载失败</span>
              <span class="mt-1 block break-words">{{ error }}</span>
              <button data-testid="agent-subordinate-retry" type="button" class="ant-btn mt-3" :disabled="loading" @click="emit('retry')">{{ loading ? '重试中…' : '重试' }}</button>
            </p>

            <div v-if="loading && !error" class="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50" role="status">
              <p class="text-sm text-slate-600">正在加载代理下级用户…</p>
            </div>

            <template v-else-if="rows.length">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="text-sm font-semibold text-slate-900">直属客户</h3>
                <span class="text-xs text-slate-500">共 {{ filteredRows.length }} 人</span>
              </div>
              <div v-if="pagedRows.length" class="space-y-2">
                <article v-for="row in pagedRows" :key="row.id" data-testid="agent-subordinate-row" class="rounded-xl border border-slate-200 p-3 sm:p-4">
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div class="min-w-0">
                      <h4 class="break-words font-medium text-slate-900">{{ row.username }}</h4>
                      <p class="mt-0.5 break-all font-mono text-xs text-slate-500">UID {{ row.uid }}</p>
                    </div>
                    <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{{ STATUS_LABELS[row.status] || row.status }}</span>
                  </div>
                  <dl class="mt-3 grid grid-cols-1 gap-3 text-sm min-[420px]:grid-cols-3">
                    <div><dt class="text-xs text-slate-500">注册时间</dt><dd class="mt-0.5 break-words font-medium text-slate-800">{{ row.registeredAt }}</dd></div>
                    <div><dt class="text-xs text-slate-500">累计业务量</dt><dd class="mt-0.5 break-words font-medium text-slate-800">{{ formatMoney(row.totalVolume) }}</dd></div>
                    <div><dt class="text-xs text-slate-500">佣金贡献</dt><dd class="mt-0.5 break-words font-medium text-slate-800">{{ formatMoney(row.commissionContribution) }}</dd></div>
                  </dl>
                </article>
                <CompactPagination v-model:current-page="currentPage" :total-count="filteredRows.length" :page-size="PAGE_SIZE" />
              </div>
              <p v-else class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">没有符合当前条件的下级用户</p>
            </template>

            <div v-else-if="!error" class="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
              <div><p class="font-medium text-slate-700">该代理暂无下级用户</p><p class="mt-1 text-sm text-slate-500">当前没有归属于该代理的直属客户。</p></div>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.agent-subordinate-drawer-enter-active { transition: opacity 200ms ease-out; }
.agent-subordinate-drawer-leave-active { transition: opacity 150ms ease-in; }
.agent-subordinate-drawer-enter-active .agent-subordinate-drawer-panel { transition: transform 200ms ease-out; }
.agent-subordinate-drawer-leave-active .agent-subordinate-drawer-panel { transition: transform 150ms ease-in; }
.agent-subordinate-drawer-enter-from,
.agent-subordinate-drawer-leave-to { opacity: 0; }
.agent-subordinate-drawer-enter-from .agent-subordinate-drawer-panel,
.agent-subordinate-drawer-leave-to .agent-subordinate-drawer-panel { transform: translateX(100%); }
@media (prefers-reduced-motion: reduce) {
  .agent-subordinate-drawer-enter-active,
  .agent-subordinate-drawer-leave-active,
  .agent-subordinate-drawer-enter-active .agent-subordinate-drawer-panel,
  .agent-subordinate-drawer-leave-active .agent-subordinate-drawer-panel { transition-duration: 50ms; }
  .agent-subordinate-drawer-enter-from .agent-subordinate-drawer-panel,
  .agent-subordinate-drawer-leave-to .agent-subordinate-drawer-panel { transform: none; }
}
</style>
