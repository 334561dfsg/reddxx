<script setup>
import { computed, ref, watch } from 'vue'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  reviews: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'select-review'])
const drawerRef = ref(null)
const titleRef = ref(null)
const filter = ref('all')
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const pendingCount = computed(() => props.reviews.filter((review) => review.status === 'pending').length)
const filteredReviews = computed(() => [...props.reviews]
  .filter((review) => filter.value === 'all' || (filter.value === 'pending' ? review.status === 'pending' : review.status !== 'pending'))
  .sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return new Date(b.appliedAt) - new Date(a.appliedAt)
  }))
const statusLabel = (status) => ({ pending: '待审核', approved: '已通过', rejected: '已拒绝' }[status] || status)
const statusClass = (status) => ({ pending: 'bg-amber-100 text-amber-800', approved: 'bg-emerald-100 text-emerald-800', rejected: 'bg-rose-100 text-rose-800' }[status] || 'bg-slate-100 text-slate-700')
const formatTime = (value) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'
const closeDisabled = computed(() => props.busy)
const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.visible), dialogRef: drawerRef, initialFocusRef: titleRef,
  returnFocusRef: computed(() => props.returnFocus), requestClose: () => emit('close'), closeDisabled
})
const close = createDialogCloseAction(requestDialogClose)
const handleAfterLeave = () => {
  if (!onAfterLeave()) return
  filter.value = 'all'
  emit('closed')
}
const selectReview = (review, event) => {
  if (props.busy || review.status !== 'pending') return
  emit('select-review', { review, returnFocus: event.currentTarget })
}
watch(() => props.visible, (visible) => { if (visible) filter.value = 'all' })
</script>

<template>
  <Teleport to="body">
    <Transition name="credit-review-drawer" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div v-if="rendered" v-show="phase !== 'closing'" class="fixed inset-0 flex justify-end bg-slate-950/50" :style="layerStyle" role="presentation">
        <aside ref="drawerRef" data-testid="user-credit-review-drawer" class="credit-review-drawer-panel flex h-[100vh] max-h-[100vh] w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]" role="dialog" aria-modal="true" aria-labelledby="user-credit-review-title" :aria-busy="busy">
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4" style="padding-right: max(1rem, env(safe-area-inset-right)); padding-top: max(0.75rem, env(safe-area-inset-top));">
            <div class="min-w-0 flex-1"><h2 id="user-credit-review-title" ref="titleRef" tabindex="-1" class="text-lg font-semibold text-slate-900 outline-none">信用分审核</h2><p class="mt-0.5 break-words text-sm text-slate-500">{{ user?.username || '未知用户' }} · UID {{ userId || '—' }} · 待审核 {{ pendingCount }}</p></div>
            <button type="button" :disabled="busy" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40" aria-label="关闭" @click="close">×</button>
          </header>

          <nav class="flex shrink-0 gap-1 border-b border-slate-200 bg-slate-50 px-4 py-2 sm:px-5" aria-label="审核状态筛选">
            <button v-for="item in [{ value: 'all', label: '全部' }, { value: 'pending', label: '待审核' }, { value: 'processed', label: '已处理' }]" :key="item.value" type="button" class="min-h-10 rounded-lg px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" :class="filter === item.value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white'" :aria-pressed="filter === item.value" @click="filter = item.value">{{ item.label }}</button>
          </nav>

          <div data-testid="user-credit-review-body" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5" style="padding-bottom: max(1rem, env(safe-area-inset-bottom)); padding-right: max(1rem, env(safe-area-inset-right));">
            <article v-for="review in filteredReviews" :key="review.id" class="rounded-xl border p-3 sm:p-4" :class="review.status === 'pending' ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white'">
              <div class="flex flex-wrap items-start justify-between gap-2"><div><p class="text-sm font-semibold text-slate-900">{{ review.beforeScore }} → {{ review.proposedScore }} <span class="ml-1" :class="review.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ review.delta >= 0 ? '+' : '' }}{{ review.delta }}</span></p><p class="mt-1 text-xs text-slate-500">{{ review.applicantName }} · {{ formatTime(review.appliedAt) }}</p></div><span class="rounded-full px-2 py-1 text-xs font-medium" :class="statusClass(review.status)">{{ statusLabel(review.status) }}</span></div>
              <p class="mt-3 break-words text-sm text-slate-700">{{ review.reason }}</p>
              <p v-if="review.decisionNote" class="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">审核备注：{{ review.decisionNote }}</p>
              <div v-if="review.status === 'pending'" class="mt-3 flex justify-end"><button type="button" :disabled="busy" class="min-h-10 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40" @click="selectReview(review, $event)">处理审核</button></div>
            </article>
            <div v-if="!filteredReviews.length" class="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center"><p class="text-sm font-medium text-slate-700">暂无{{ filter === 'pending' ? '待审核' : filter === 'processed' ? '已处理' : '' }}信用分申请</p><p class="mt-1 text-xs text-slate-500">该用户当前没有符合筛选条件的记录。</p></div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.credit-review-drawer-enter-active { transition: opacity 200ms ease-out; }
.credit-review-drawer-leave-active { transition: opacity 150ms ease-in; }
.credit-review-drawer-enter-active .credit-review-drawer-panel { transition: transform 200ms ease-out; }
.credit-review-drawer-leave-active .credit-review-drawer-panel { transition: transform 150ms ease-in; }
.credit-review-drawer-enter-from, .credit-review-drawer-leave-to { opacity: 0; }
.credit-review-drawer-enter-from .credit-review-drawer-panel, .credit-review-drawer-leave-to .credit-review-drawer-panel { transform: translateX(100%); }
@media (prefers-reduced-motion: reduce) {
  .credit-review-drawer-enter-active, .credit-review-drawer-leave-active,
  .credit-review-drawer-enter-active .credit-review-drawer-panel, .credit-review-drawer-leave-active .credit-review-drawer-panel { transition-duration: 50ms; }
  .credit-review-drawer-enter-from .credit-review-drawer-panel, .credit-review-drawer-leave-to .credit-review-drawer-panel { transform: none; }
}
</style>
