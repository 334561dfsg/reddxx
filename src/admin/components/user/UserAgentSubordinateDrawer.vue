<script setup>
import AdminDrawer from '../antd/AdminDrawer.vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { AdminButton, AdminInput, AdminSelect, nativeControl } from '../antd/controls.js'

import { computed, nextTick, ref, watch } from 'vue'
import CompactPagination from '../CompactPagination.vue'

const PAGE_SIZE = 10

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  rows: { type: Array, default: () => [] },
  error: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'retry'])
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

// Frame: AdminDrawer (Ant Drawer + useDialogLifecycle), drawer migration 2026-11-27.
const drawerFrame = ref(null)
const initialFocus = computed(() => props.error ? errorRef.value : null)

const handleClosed = () => emit('closed')

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
  <AdminDrawer :open="visible" title="代理下级用户" title-id="user-agent-subordinate-title" :return-focus="returnFocus" testid="user-agent-subordinate-drawer" :width="768" plain ref="drawerFrame" :initial-focus="initialFocus" @close="emit('close')" @closed="handleClosed">
      <template #subtitle>{{ user?.username || '未知代理' }} · UID {{ userId || '—' }}</template>
      <div data-testid="user-agent-subordinate-body" class="min-h-0 flex flex-1 flex-col overflow-hidden" style="padding-right: max(1rem, env(safe-area-inset-right)); padding-left: max(1rem, env(safe-area-inset-left));">
            <div data-testid="agent-subordinate-controls" class="shrink-0 space-y-3 px-4 pt-4 sm:px-5">
              <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 min-[520px]:grid-cols-[minmax(0,1fr)_10rem]">
                <label class="block min-w-0 text-xs font-medium text-slate-600">
                  搜索下级用户
                  <AdminInput v-model="query" type="search" aria-label="搜索下级用户" placeholder="搜索 UID 或用户名" class="ant-input mt-1 w-full" />
                </label>
                <label class="block text-xs font-medium text-slate-600">
                  用户状态
                  <AdminSelect v-model="status" aria-label="用户状态" class="ant-select mt-1 w-full">
                    <option value="all">全部</option>
                    <option value="active">活跃</option>
                    <option value="suspended">暂停</option>
                    <option value="banned">禁用</option>
                  </AdminSelect>
                </label>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="text-sm font-semibold text-slate-900">直属客户</h3>
                <span v-if="rows.length && !error" class="text-xs text-slate-500">共 {{ filteredRows.length }} 人</span>
              </div>
            </div>

            <div data-testid="agent-subordinate-list-scroll" class="min-h-20 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 outline-none sm:px-5" role="region" aria-label="代理直属客户列表" tabindex="0">
              <FeedbackToast v-if="error" ref="errorRef" data-testid="agent-subordinate-error" type="error" :source="() => (error) ? (([[&quot;代理下级用户加载失败&quot;].join(''),[String((error) ?? '')].join(''),''].join(''))) : ''"><AdminButton data-testid="agent-subordinate-retry" type="button" class="ant-btn mt-3" :disabled="loading" @click="emit('retry')">{{ loading ? '重试中…' : '重试' }}</AdminButton></FeedbackToast>

              <div v-else-if="loading" class="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50" role="status">
                <p class="text-sm text-slate-600">正在加载代理下级用户…</p>
              </div>

              <template v-else-if="rows.length">
                <div v-if="pagedRows.length" class="space-y-2">
                  <article v-for="row in pagedRows" :key="row.id" data-testid="agent-subordinate-row" class="rounded-xl border border-slate-200 p-3 sm:p-4">
                    <div class="flex flex-wrap items-start gap-2">
                      <div class="min-w-0">
                        <h4 class="break-words font-medium text-slate-900">{{ row.username }}</h4>
                        <p class="mt-0.5 break-all font-mono text-xs text-slate-500">UID {{ row.uid }}</p>
                      </div>
                    </div>
                    <dl class="mt-3 grid grid-cols-1 gap-3 text-sm min-[420px]:grid-cols-3">
                      <div><dt class="text-xs text-slate-500">注册时间</dt><dd class="mt-0.5 break-words font-medium text-slate-800">{{ row.registeredAt }}</dd></div>
                      <div><dt class="text-xs text-slate-500">累计业务量</dt><dd class="mt-0.5 break-words font-medium text-slate-800">{{ formatMoney(row.totalVolume) }}</dd></div>
                      <div><dt class="text-xs text-slate-500">佣金贡献</dt><dd class="mt-0.5 break-words font-medium text-slate-800">{{ formatMoney(row.commissionContribution) }}</dd></div>
                    </dl>
                  </article>
                </div>
                <p v-else class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">没有符合当前条件的下级用户</p>
              </template>

              <div v-else class="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
                <div><p class="font-medium text-slate-700">该代理暂无下级用户</p><p class="mt-1 text-sm text-slate-500">当前没有归属于该代理的直属客户。</p></div>
              </div>
            </div>

            <footer v-if="!error && rows.length && filteredRows.length" data-testid="agent-subordinate-pagination" class="shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
              <CompactPagination v-model:current-page="currentPage" :total-count="filteredRows.length" :page-size="PAGE_SIZE" />
            </footer>
          </div>
    </AdminDrawer>
</template>

