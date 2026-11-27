<script setup>
import AdminDrawer from '../antd/AdminDrawer.vue'
import { AdminButton } from '../antd/controls.js'

import { computed, ref } from 'vue'
import UserControlLogContent from './UserControlLogContent.vue'
import { useDialogContentSnapshot } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})

const emit = defineEmits(['close', 'closed'])

// Frame: AdminDrawer (Ant Drawer + useDialogLifecycle), drawer migration 2026-11-27.
const drawerFrame = ref(null)
const phase = computed(() => drawerFrame.value?.phase ?? 'closed')

const { content: displayedUser, clear: clearUserSnapshot } = useDialogContentSnapshot({
  open: computed(() => props.visible),
  phase,
  source: computed(() => props.user),
  clone: (user) => user ? { ...user } : null
})
const userId = computed(() => String(displayedUser.value?.userId ?? displayedUser.value?.id ?? ''))

const handleClosed = () => {
  clearUserSnapshot()
  emit('closed')
}
</script>

<template>
  <AdminDrawer :open="visible" title="用户点控日志" title-id="user-control-log-drawer-title" :return-focus="returnFocus" testid="user-control-log-drawer" :width="1152" plain ref="drawerFrame" @close="emit('close')" @closed="handleClosed">
      <template #subtitle>
                {{ displayedUser?.username || '未知用户' }} · UID {{ userId || '—' }}
              </template>
      <div
            data-testid="user-control-log-drawer-body"
            class="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
            style="padding-left: max(0.75rem, env(safe-area-inset-left)); padding-right: max(0.75rem, env(safe-area-inset-right));"
          >
            <UserControlLogContent :fixed-user-id="userId" :show-header="false" :show-user-filter="false" />
          </div>
    </AdminDrawer>
</template>

