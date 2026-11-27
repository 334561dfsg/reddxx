<script setup>
import { computed, ref } from 'vue'
import { USER_STATUS } from '../../constants/user'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  user: { type: Object, required: true },
  showTrigger: { type: Boolean, default: true }
})

const emit = defineEmits(['submit'])

const statusText = {
  [USER_STATUS.ACTIVE]: '正常',
  [USER_STATUS.INACTIVE]: '不活跃',
  [USER_STATUS.SUSPENDED]: '暂停',
  [USER_STATUS.BANNED]: '禁用'
}

const freezeDialog = computed(() => {
  const current = props.user?.status
  const isUnfreeze = [USER_STATUS.SUSPENDED, USER_STATUS.BANNED].includes(current)
  const targetStatus = isUnfreeze ? USER_STATUS.ACTIVE : USER_STATUS.SUSPENDED
  const targetText = statusText[targetStatus] || (isUnfreeze ? '正常' : '暂停')

  return {
    isUnfreeze,
    targetStatus,
    targetText,
    confirmText: isUnfreeze ? '确认解锁' : '确认封户',
    confirmButtonClass: isUnfreeze
      ? 'bg-emerald-600 hover:bg-emerald-700'
      : 'bg-rose-600 hover:bg-rose-700'
  }
})

const showModal = ref(false)
const dialogRef = ref(null)
const titleRef = ref(null)
const returnFocusRef = ref(null)

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
  returnFocusRef.value = returnFocus
  showModal.value = true
  return true
}

defineExpose({ open })

const close = createDialogCloseAction(requestDialogClose)

const confirm = () => {
  emit('submit', { type: 'freeze', targetStatus: freezeDialog.value.targetStatus })
  showToast(`已提交${freezeDialog.value.confirmText}`)
  close()
}
</script>

<template>
  <button
    v-if="showTrigger"
    type="button"
    class="inline-flex items-center justify-center gap-2 h-8 px-3 text-sm font-medium rounded-lg ring-1 bg-white transition-colors"
    :class="freezeDialog.isUnfreeze ? 'ring-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'ring-rose-200 text-rose-700 hover:bg-rose-50'"
    @click="open($event.currentTarget)"
  >
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    {{ freezeDialog.isUnfreeze ? '解封' : '封户' }}
  </button>

  <Teleport to="body">
    <Transition name="user-action-dialog" appear @after-enter="onAfterEnter" @after-leave="onAfterLeave">
      <div
        v-if="rendered"
        v-show="phase !== 'closing'"
        class="fixed inset-0 grid place-items-center bg-black/40 p-4"
        :style="layerStyle"
      >
        <section ref="dialogRef" class="user-action-dialog-panel flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]" role="dialog" aria-modal="true" aria-labelledby="user-freeze-title">
          <header class="px-5 py-3 border-b border-slate-100 bg-white">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-xs font-medium tracking-wide text-slate-500">操作</div>
                <div id="user-freeze-title" ref="titleRef" tabindex="-1" class="mt-1 text-base font-semibold text-slate-900 outline-none">确认操作</div>
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

          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div class="text-sm text-slate-700 leading-6">
              您确定要将账户
              <span class="font-semibold text-slate-900">{{ user.username }}</span>
              的状态更改为
              <span class="font-semibold text-slate-900">{{ freezeDialog.targetText }}</span>
              吗？
            </div>

            <div class="mt-5 flex justify-end gap-3">
              <button
                type="button"
                class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                @click="close"
              >
                取消
              </button>
              <button
                type="button"
                class="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors"
                :class="freezeDialog.confirmButtonClass"
                @click="confirm"
              >
                {{ freezeDialog.confirmText }}
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
