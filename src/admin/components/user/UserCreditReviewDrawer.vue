<script setup>
import { AdminButton } from '../antd/controls.js'
import AdminDrawer from '../antd/AdminDrawer.vue'
import { computed, ref, watch } from 'vue'

// Migrated to the Ant Drawer frame (AdminDrawer, pilot 2026-11-27); content and events are unchanged.
const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  reviews: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'select-review'])
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
const handleClosed = () => {
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
  <AdminDrawer :open="visible" title="信用分审核" :busy="busy" :return-focus="returnFocus" testid="user-credit-review-drawer" body-testid="user-credit-review-body" @close="emit('close')" @closed="handleClosed">
    <template #subtitle>{{ user?.username || '未知用户' }} · UID {{ userId || '—' }} · 待审核 {{ pendingCount }}</template>
    <template #toolbar>
      <nav class="flex gap-1" aria-label="审核状态筛选">
        <AdminButton v-for="item in [{ value: 'all', label: '全部' }, { value: 'pending', label: '待审核' }, { value: 'processed', label: '已处理' }]" :key="item.value" type="button" class="min-h-10 rounded-lg px-3 text-sm font-medium focus:outline-none" :class="filter === item.value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white'" :aria-pressed="filter === item.value" @click="filter = item.value">{{ item.label }}</AdminButton>
      </nav>
    </template>
    <div class="space-y-3">
      <article v-for="review in filteredReviews" :key="review.id" class="rounded-xl border p-3 sm:p-4" :class="review.status === 'pending' ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white'">
        <div class="flex flex-wrap items-start justify-between gap-2"><div><p class="text-sm font-semibold text-slate-900">{{ review.beforeScore }} → {{ review.proposedScore }} <span class="ml-1" :class="review.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ review.delta >= 0 ? '+' : '' }}{{ review.delta }}</span></p><p class="mt-1 text-xs text-slate-500">{{ review.applicantName }} · {{ formatTime(review.appliedAt) }}</p></div><span class="rounded-full px-2 py-1 text-xs font-medium" :class="statusClass(review.status)">{{ statusLabel(review.status) }}</span></div>
        <p class="mt-3 break-words text-sm text-slate-700">{{ review.reason }}</p>
        <p v-if="review.decisionNote" class="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">审核备注：{{ review.decisionNote }}</p>
        <div v-if="review.status === 'pending'" class="mt-3 flex justify-end"><AdminButton type="button" :disabled="busy" class="min-h-10 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40" @click="selectReview(review, $event)">处理审核</AdminButton></div>
      </article>
      <div v-if="!filteredReviews.length" class="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center"><p class="text-sm font-medium text-slate-700">暂无{{ filter === 'pending' ? '待审核' : filter === 'processed' ? '已处理' : '' }}信用分申请</p><p class="mt-1 text-xs text-slate-500">该用户当前没有符合筛选条件的记录。</p></div>
    </div>
  </AdminDrawer>
</template>
