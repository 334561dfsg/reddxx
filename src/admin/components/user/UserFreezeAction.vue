<script setup>
import { computed, ref } from 'vue'
import { USER_STATUS } from '../../constants/user'

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

const open = () => {
  showModal.value = true
}

defineExpose({ open })

const close = () => {
  showModal.value = false
}

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
    @click="open"
  >
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    {{ freezeDialog.isUnfreeze ? '解封' : '封户' }}
  </button>

  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showModal"
        class="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4"
      >
        <section class="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <header class="px-5 py-3 border-b border-slate-100 bg-white">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-xs font-medium tracking-wide text-slate-500">操作</div>
                <div class="mt-1 text-base font-semibold text-slate-900">确认操作</div>
              </div>
              <button
                type="button"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                @click="close"
                aria-label="关闭弹窗"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div class="px-5 py-4">
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
      class="fixed top-4 right-4 z-[70] bg-white border border-blue-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3"
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
