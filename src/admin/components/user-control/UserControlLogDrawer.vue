<script setup>
import { computed, ref } from 'vue'
import UserControlLogContent from './UserControlLogContent.vue'
import { useDialogContentSnapshot, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})

const emit = defineEmits(['close', 'closed'])
const drawerRef = ref(null)
const titleRef = ref(null)

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

const { content: displayedUser, clear: clearUserSnapshot } = useDialogContentSnapshot({
  open: computed(() => props.visible),
  phase,
  source: computed(() => props.user),
  clone: (user) => user ? { ...user } : null
})
const userId = computed(() => String(displayedUser.value?.userId ?? displayedUser.value?.id ?? ''))

const handleAfterLeave = async () => {
  if (!await onAfterLeave()) return
  clearUserSnapshot()
  emit('closed')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="user-control-log-drawer" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div
        v-if="rendered"
        v-show="phase !== 'closing'"
        class="fixed inset-0 flex justify-end bg-slate-950/50"
        role="presentation"
        :style="layerStyle"
      >
        <aside
          ref="drawerRef"
          data-testid="user-control-log-drawer"
          class="user-control-log-drawer-panel flex h-[100vh] max-h-[100vh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-control-log-drawer-title"
        >
          <header
            class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6"
            style="padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right));"
          >
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-blue-600">用户管理</p>
              <h2 id="user-control-log-drawer-title" ref="titleRef" tabindex="-1" class="mt-1 break-words text-xl font-semibold text-slate-900 outline-none">
                用户点控日志
              </h2>
              <p class="mt-1 break-all text-sm text-slate-500">
                {{ displayedUser?.username || '未知用户' }} · UID {{ userId || '—' }}
              </p>
            </div>
            <button
              type="button"
              class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="关闭"
              @click="requestDialogClose"
            >
              ×
            </button>
          </header>

          <div
            data-testid="user-control-log-drawer-body"
            class="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
            style="padding-left: max(0.75rem, env(safe-area-inset-left)); padding-right: max(0.75rem, env(safe-area-inset-right));"
          >
            <UserControlLogContent :fixed-user-id="userId" :show-header="false" :show-user-filter="false" />
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.user-control-log-drawer-enter-active { transition: opacity 200ms ease-out; }
.user-control-log-drawer-leave-active { transition: opacity 150ms ease-in; }
.user-control-log-drawer-enter-active .user-control-log-drawer-panel { transition: transform 200ms ease-out; }
.user-control-log-drawer-leave-active .user-control-log-drawer-panel { transition: transform 150ms ease-in; }
.user-control-log-drawer-enter-from,
.user-control-log-drawer-leave-to { opacity: 0; }
.user-control-log-drawer-enter-from .user-control-log-drawer-panel,
.user-control-log-drawer-leave-to .user-control-log-drawer-panel { transform: translateX(100%); }

@media (prefers-reduced-motion: reduce) {
  .user-control-log-drawer-enter-active,
  .user-control-log-drawer-leave-active,
  .user-control-log-drawer-enter-active .user-control-log-drawer-panel,
  .user-control-log-drawer-leave-active .user-control-log-drawer-panel { transition-duration: 50ms; }
  .user-control-log-drawer-enter-from .user-control-log-drawer-panel,
  .user-control-log-drawer-leave-to .user-control-log-drawer-panel { transform: none; }
}
</style>
