<script setup>
import { computed, ref, watch } from 'vue'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  summary: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed'])
const drawerRef = ref(null)
const titleRef = ref(null)
const displaySummary = ref(null)
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatTime = (value) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'
const captureSummary = () => { displaySummary.value = props.summary ? JSON.parse(JSON.stringify(props.summary)) : null }

const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.visible),
  dialogRef: drawerRef,
  initialFocusRef: titleRef,
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close')
})
const close = createDialogCloseAction(requestDialogClose)
const handleAfterLeave = async () => {
  if (!await onAfterLeave()) return
  displaySummary.value = null
  emit('closed')
}
watch(() => [props.visible, props.summary], ([visible]) => { if (visible) captureSummary() }, { immediate: true, deep: true })
</script>

<template>
  <Teleport to="body">
    <Transition name="recharge-drawer" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div v-if="rendered" v-show="phase !== 'closing'" class="fixed inset-0 flex justify-end bg-slate-950/50" :style="layerStyle" role="presentation">
        <aside
          ref="drawerRef"
          data-testid="user-recharge-summary-drawer"
          class="recharge-drawer-panel flex h-[100vh] max-h-[100vh] w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-recharge-summary-title"
        >
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4" style="padding-right: max(1rem, env(safe-area-inset-right)); padding-top: max(0.75rem, env(safe-area-inset-top));">
            <div class="min-w-0 flex-1">
              <h2 id="user-recharge-summary-title" ref="titleRef" tabindex="-1" class="text-lg font-semibold text-slate-900 outline-none">会员累计充值</h2>
              <p class="mt-0.5 break-words text-sm text-slate-500">{{ user?.username || '未知用户' }} · UID {{ userId || '—' }} · VIP{{ displaySummary?.currentVipLevel ?? user?.vipLevel ?? 0 }}</p>
            </div>
            <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="关闭" @click="close">×</button>
          </header>

          <div data-testid="user-recharge-summary-body" class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5" style="padding-bottom: max(1rem, env(safe-area-inset-bottom)); padding-right: max(1rem, env(safe-area-inset-right));">
            <section class="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="累计充值概况">
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-xs text-slate-500">累计充值</p>
                <p class="mt-1 text-xl font-semibold text-slate-900">{{ money(displaySummary?.cumulativeRecharge) }} <span class="text-xs font-normal text-slate-500">USDT</span></p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-xs text-slate-500">计入会员等级</p>
                <p class="mt-1 text-xl font-semibold text-slate-900">{{ money(displaySummary?.qualifyingRecharge) }} <span class="text-xs font-normal text-slate-500">USDT</span></p>
              </div>
            </section>

            <section v-if="displaySummary?.nextLevel" class="rounded-xl border border-blue-200 bg-blue-50 p-4" aria-labelledby="next-vip-progress-title">
              <div class="flex items-start justify-between gap-3">
                <div><h3 id="next-vip-progress-title" class="text-sm font-semibold text-blue-950">距离 {{ displaySummary.nextLevel.name }} · {{ displaySummary.nextLevel.displayName }}</h3><p class="mt-1 text-xs text-blue-700">还需 {{ money(displaySummary.nextLevel.remainingRecharge) }} USDT</p></div>
                <span class="shrink-0 text-sm font-semibold text-blue-800">{{ displaySummary.nextLevel.progressPercent }}%</span>
              </div>
              <div class="mt-3 h-2 overflow-hidden rounded-full bg-blue-100" role="progressbar" :aria-valuenow="displaySummary.nextLevel.progressPercent" aria-valuemin="0" aria-valuemax="100" :aria-label="`升级 ${displaySummary.nextLevel.name} 进度`">
                <div class="h-full rounded-full bg-blue-600" :style="{ width: `${displaySummary.nextLevel.progressPercent}%` }" />
              </div>
              <p class="mt-2 text-xs text-blue-700">目标累计计入金额 {{ money(displaySummary.nextLevel.targetRecharge) }} USDT</p>
            </section>
            <p v-else class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">当前计入金额已达到最高启用会员等级门槛。</p>

            <section aria-labelledby="recharge-records-title">
              <div class="flex items-center justify-between"><h3 id="recharge-records-title" class="text-sm font-semibold text-slate-900">充值记录</h3><span class="text-xs text-slate-500">共 {{ displaySummary?.records?.length || 0 }} 笔</span></div>
              <div v-if="displaySummary?.records?.length" class="mt-2 space-y-2">
                <article v-for="record in displaySummary.records" :key="record.id" class="rounded-xl border border-slate-200 p-3 text-sm">
                  <div class="flex flex-wrap items-start justify-between gap-2"><div><p class="font-semibold text-slate-900">{{ money(record.amount) }} USDT</p><p class="mt-0.5 text-xs text-slate-500">计入等级 {{ money(record.qualifyingAmount) }} USDT</p></div><span class="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{{ record.source }}</span></div>
                  <dl class="mt-3 grid grid-cols-[4.5rem_1fr] gap-y-1 text-xs"><dt class="text-slate-500">流水号</dt><dd class="break-all text-slate-700">{{ record.transactionId }}</dd><dt class="text-slate-500">充值时间</dt><dd class="text-slate-700">{{ formatTime(record.createdAt) }}</dd></dl>
                </article>
              </div>
              <p v-else class="mt-2 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">暂无计入会员等级的充值记录</p>
            </section>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.recharge-drawer-enter-active { transition: opacity 200ms ease-out; }
.recharge-drawer-leave-active { transition: opacity 150ms ease-in; }
.recharge-drawer-enter-active .recharge-drawer-panel { transition: transform 200ms ease-out; }
.recharge-drawer-leave-active .recharge-drawer-panel { transition: transform 150ms ease-in; }
.recharge-drawer-enter-from,
.recharge-drawer-leave-to { opacity: 0; }
.recharge-drawer-enter-from .recharge-drawer-panel,
.recharge-drawer-leave-to .recharge-drawer-panel { transform: translateX(100%); }
@media (prefers-reduced-motion: reduce) {
  .recharge-drawer-enter-active,
  .recharge-drawer-leave-active,
  .recharge-drawer-enter-active .recharge-drawer-panel,
  .recharge-drawer-leave-active .recharge-drawer-panel { transition-duration: 50ms; }
  .recharge-drawer-enter-from .recharge-drawer-panel,
  .recharge-drawer-leave-to .recharge-drawer-panel { transform: none; }
}
</style>
