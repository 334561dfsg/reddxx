<script setup>
import { message } from 'ant-design-vue'
import { AdminButton } from '../antd/controls.js'

import { computed, ref } from 'vue'
import { USER_STATUS } from '../../constants/user'
import AdminDialog from '../antd/AdminDialog.vue'

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
const returnFocusRef = ref(null)

// Operation feedback goes through Ant message (AGENTS.md toast rule): validation errors and submitted results.
const showError = (text) => { message.error(text) }
const showSuccess = (text) => { message.success(text) }

// Frame: AdminDialog (Ant Modal + useDialogLifecycle), dialog migration 2026-11-27.
const dialogFrame = ref(null)
const phase = computed(() => dialogFrame.value?.phase ?? 'closed')

const open = (returnFocus = null) => {
  if (phase.value !== 'closed') return false
  returnFocusRef.value = returnFocus
  showModal.value = true
  return true
}

defineExpose({ open })

const close = () => dialogFrame.value?.close()

const confirm = () => {
  emit('submit', { type: 'freeze', targetStatus: freezeDialog.value.targetStatus })
  showSuccess(`已提交${freezeDialog.value.confirmText}`)
  close()
}
</script>

<template>
  <AdminButton
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
  </AdminButton>

  <AdminDialog :open="showModal" title="确认操作" title-id="user-freeze-title" :return-focus="returnFocusRef" :width="448" plain ref="dialogFrame" @close="showModal = false">
    <template #eyebrow>操作</template>

          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div class="text-sm text-slate-700 leading-6">
              您确定要将账户
              <span class="font-semibold text-slate-900">{{ user.username }}</span>
              的状态更改为
              <span class="font-semibold text-slate-900">{{ freezeDialog.targetText }}</span>
              吗？
            </div>

            <div class="mt-5 flex justify-end gap-3">
              <AdminButton
                type="button"
                class="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                @click="close"
              >
                取消
              </AdminButton>
              <AdminButton
                type="button"
                class="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors"
                :class="freezeDialog.confirmButtonClass"
                @click="confirm"
              >
                {{ freezeDialog.confirmText }}
              </AdminButton>
            </div>
          </div>
  </AdminDialog>
</template>

