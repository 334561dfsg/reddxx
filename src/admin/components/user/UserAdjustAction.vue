<script setup>
import { computed, ref } from 'vue'
import { vipLevels } from '../../mock/vip'
import { getAllCreditScoreConfig } from '../../mock/creditScore'
import { CREDIT_SCORE_CONFIG_KEYS, CREDIT_SCORE_CHANGE_TYPE } from '../../constants/creditScore'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  user: { type: Object, required: true },
  showTrigger: { type: Boolean, default: true }
})

const emit = defineEmits(['submit'])

const config = computed(() => getAllCreditScoreConfig())
const minScore = computed(() => Number(config.value[CREDIT_SCORE_CONFIG_KEYS.MIN_SCORE] ?? 0))
const maxScore = computed(() => Number(config.value[CREDIT_SCORE_CONFIG_KEYS.MAX_SCORE] ?? 800))
const manualAuditEnabled = computed(() => Boolean(config.value[CREDIT_SCORE_CONFIG_KEYS.MANUAL_AUDIT_ENABLED]))
const manualAuditThreshold = computed(() => Number(config.value[CREDIT_SCORE_CONFIG_KEYS.MANUAL_AUDIT_THRESHOLD] ?? 10))
const manualAuditTypes = computed(() => config.value[CREDIT_SCORE_CONFIG_KEYS.MANUAL_AUDIT_TYPES] || [])

const activeVipOptions = computed(() => {
  return [...vipLevels]
    .filter((v) => v.status === 'enabled')
    .sort((a, b) => a.level - b.level)
    .map((v) => ({
      level: v.level,
      label: v.level === 0 ? '普通用户' : `VIP${v.level}（${v.displayName}）`
    }))
})

const currentVipLevel = computed(() => {
  const n = Number(props.user?.vipLevel ?? 0)
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
})

const showModal = ref(false)
const dialogRef = ref(null)
const titleRef = ref(null)
const returnFocusRef = ref(null)
const form = ref({
  vipTargetLevel: null,
  scoreDirection: 'increase', // increase | decrease
  scorePoints: '',
  remark: ''
})

const toast = ref({ visible: false, message: '' })
let toastTimer = null

const showToast = (message) => {
  toast.value.message = message
  toast.value.visible = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value.visible = false
  }, 2500)
}

const {
  rendered,
  phase,
  layerStyle,
  requestDialogClose,
  onAfterEnter,
  onAfterLeave
} = useDialogLifecycle({
  open: showModal,
  dialogRef,
  initialFocusRef: titleRef,
  returnFocusRef,
  requestClose: () => { showModal.value = false }
})

const open = (returnFocus = null) => {
  if (phase.value !== 'closed') return false
  form.value = {
    vipTargetLevel: currentVipLevel.value,
    scoreDirection: 'increase',
    scorePoints: '',
    remark: ''
  }
  returnFocusRef.value = returnFocus
  showModal.value = true
  return true
}

defineExpose({ open })

const close = createDialogCloseAction(requestDialogClose)

const parsedDelta = computed(() => {
  const raw = String(form.value.scorePoints ?? '').trim()
  if (!raw) return null
  if (!/^\d+$/.test(raw)) return null
  const s = Number(raw)
  if (!Number.isFinite(s)) return null
  if (s <= 0) return null
  return Math.floor(s)
})

const scoreBefore = computed(() => Number(props.user?.creditScore ?? 0))
const hasScoreInput = computed(() => String(form.value.scorePoints ?? '').trim() !== '')
const scoreDeltaSigned = computed(() => {
  const d = parsedDelta.value
  if (d === null) return null
  return form.value.scoreDirection === 'decrease' ? -d : d
})

const scoreAfter = computed(() => {
  const after = scoreBefore.value + (scoreDeltaSigned.value ?? 0)
  return Math.max(minScore.value, Math.min(maxScore.value, after))
})

const willChangeVip = computed(() => {
  const target = Number(form.value.vipTargetLevel)
  return Number.isFinite(target) && target !== currentVipLevel.value
})

const willChangeScore = computed(() => parsedDelta.value !== null)

const auditHint = computed(() => {
  if (!manualAuditEnabled.value) return null
  if (!willChangeScore.value) return null
  const absDelta = Math.abs(scoreDeltaSigned.value ?? 0)
  const needsByThreshold = absDelta >= manualAuditThreshold.value
  const allowedType = manualAuditTypes.value.includes(CREDIT_SCORE_CHANGE_TYPE.MANUAL_ADJUST)
  if (needsByThreshold && allowedType) return `提示：本次信用分变动绝对值为 ${absDelta}，达到审核阈值 ${manualAuditThreshold.value}，可能需要进入人工审核流程。`
  return null
})

const confirm = () => {
  if (hasScoreInput.value && parsedDelta.value === null) {
    showToast('请输入正整数信用分')
    return
  }

  if (!willChangeVip.value && !willChangeScore.value) {
    showToast('没有可提交的变更')
    return
  }

  const payload = {
    type: 'adjust',
    userId: props.user?.id,
    vip: willChangeVip.value
      ? { from: currentVipLevel.value, to: Number(form.value.vipTargetLevel) }
      : null,
    creditScore: willChangeScore.value
      ? {
          changeType: CREDIT_SCORE_CHANGE_TYPE.MANUAL_ADJUST,
          before: scoreBefore.value,
          delta: scoreDeltaSigned.value ?? 0,
          after: scoreAfter.value,
          rule: null
        }
      : null,
    remark: String(form.value.remark || '').trim()
  }

  emit('submit', payload)
  showToast('已提交调整')
  close()
}
</script>

<template>
  <button
    v-if="showTrigger"
    type="button"
    class="inline-flex items-center justify-center gap-2 h-8 px-3 text-sm font-medium rounded-lg ring-1 ring-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
    @click="open($event.currentTarget)"
  >
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 16v-2M6 12H4m16 0h-2" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M7.757 7.757L6.343 6.343m11.314 11.314l-1.414-1.414" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M16.243 7.757l1.414-1.414M6.343 17.657l1.414-1.414" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
    调整
  </button>

  <Teleport to="body">
    <Transition name="user-action-dialog" appear @after-enter="onAfterEnter" @after-leave="onAfterLeave">
      <div
        v-if="rendered"
        v-show="phase !== 'closing'"
        class="fixed inset-0 grid place-items-center bg-black/40 p-4"
        :style="layerStyle"
      >
        <section ref="dialogRef" class="user-action-dialog-panel flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]" role="dialog" aria-modal="true" aria-labelledby="user-adjust-title">
          <header class="px-5 py-4 bg-white">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-xs font-medium tracking-wide text-slate-500">操作</div>
                <div id="user-adjust-title" ref="titleRef" tabindex="-1" class="mt-1 text-lg font-semibold text-slate-900 outline-none">手动调整</div>
              </div>
              <button
                type="button"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                @click="close"
                aria-label="关闭"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5">
            <section class="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div class="text-sm font-semibold text-slate-900">VIP 等级调整</div>
              <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div class="rounded-lg bg-white border border-slate-200 px-3 py-2">
                  <div class="text-xs text-slate-500">当前等级</div>
                  <div class="mt-1 text-sm font-semibold text-slate-900">
                    {{ currentVipLevel === 0 ? '普通用户' : `VIP${currentVipLevel}` }}
                  </div>
                </div>
                <fieldset class="min-w-0">
                  <legend class="mb-2 text-sm font-medium text-slate-700">调整为</legend>
                  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label
                      v-for="o in activeVipOptions"
                      :key="o.level"
                      class="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500"
                    >
                      <input
                        v-model="form.vipTargetLevel"
                        type="radio"
                        name="vip-target-level"
                        :value="o.level"
                        class="h-4 w-4 shrink-0"
                      />
                      <span class="min-w-0 break-words">{{ o.label }}</span>
                    </label>
                  </div>
                </fieldset>
              </div>
              <div v-if="willChangeVip" class="mt-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                将从 {{ currentVipLevel === 0 ? '普通用户' : `VIP${currentVipLevel}` }} 调整为 {{ form.vipTargetLevel === 0 ? '普通用户' : `VIP${form.vipTargetLevel}` }}
              </div>
            </section>

            <section class="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div class="text-sm font-semibold text-slate-900">信用分调整</div>
              <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div class="rounded-lg bg-white border border-slate-200 px-3 py-2">
                  <div class="text-xs text-slate-500">当前信用分</div>
                  <div class="mt-1 text-sm font-semibold text-slate-900">
                    {{ scoreBefore }}
                  </div>
                  <div class="mt-1 text-[11px] text-slate-500">
                    范围：{{ minScore }} ~ {{ maxScore }}
                  </div>
                </div>

                <fieldset class="min-w-0">
                  <legend class="mb-2 text-sm font-medium text-slate-700">类型</legend>
                  <div class="flex flex-wrap items-center gap-2">
                    <label class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm cursor-pointer">
                      <input v-model="form.scoreDirection" type="radio" name="credit-score-direction" value="increase" />
                      增加
                    </label>
                    <label class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm cursor-pointer">
                      <input v-model="form.scoreDirection" type="radio" name="credit-score-direction" value="decrease" />
                      扣减
                    </label>
                  </div>
                </fieldset>

                <label class="min-w-0">
                  <span class="mb-2 block text-sm font-medium text-slate-700">调整分数</span>
                  <input
                    v-model="form.scorePoints"
                    data-testid="user-adjust-score-points"
                    type="text"
                    inputmode="numeric"
                    autocomplete="off"
                    class="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="请输入分数"
                  />
                </label>
              </div>

              <div class="mt-3 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <template v-if="scoreDeltaSigned === null">
                  预览：请输入分数
                </template>
                <template v-else>
                  预览：{{ scoreBefore }} {{ scoreDeltaSigned >= 0 ? '+' : '' }}{{ scoreDeltaSigned }} = <span class="font-semibold text-slate-900">{{ scoreAfter }}</span>
                </template>
              </div>

              <div v-if="auditHint" class="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {{ auditHint }}
              </div>
            </section>

            <div>
              <div class="text-sm font-medium text-slate-700 mb-2">备注（可选）</div>
              <textarea
                v-model="form.remark"
                rows="3"
                class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="请输入本次调整原因/说明…"
              />
            </div>

            <div class="flex justify-end gap-3 pt-1">
              <button
                type="button"
                class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                @click="close"
              >
                取消
              </button>
              <button
                type="button"
                class="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                @click="confirm"
              >
                确认调整
              </button>
            </div>
          </div>
        </section>
      </div>
    </Transition>

    <div
      v-if="toast.visible"
      class="fixed right-4 top-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-white px-4 py-3 shadow-lg"
      :style="{ zIndex: Number(layerStyle.zIndex || 1000) + 1 }"
    >
      <div class="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <span class="text-sm font-medium text-slate-900">{{ toast.message }}</span>
    </div>
  </Teleport>
</template>

<style scoped>
.user-action-dialog-enter-active { transition: opacity 200ms ease-out; }
.user-action-dialog-leave-active { transition: opacity 150ms ease-in; }
.user-action-dialog-enter-active .user-action-dialog-panel { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.user-action-dialog-leave-active .user-action-dialog-panel { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.user-action-dialog-enter-from,
.user-action-dialog-leave-to { opacity: 0; }
.user-action-dialog-enter-from .user-action-dialog-panel,
.user-action-dialog-leave-to .user-action-dialog-panel { opacity: 0; transform: scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .user-action-dialog-enter-active,
  .user-action-dialog-leave-active,
  .user-action-dialog-enter-active .user-action-dialog-panel,
  .user-action-dialog-leave-active .user-action-dialog-panel { transition-duration: 50ms; }
  .user-action-dialog-enter-from .user-action-dialog-panel,
  .user-action-dialog-leave-to .user-action-dialog-panel { transform: none; }
}
</style>
