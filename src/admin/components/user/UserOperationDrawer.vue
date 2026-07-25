<script setup>
import { computed, ref, watch } from 'vue'
import { getUserOperationGroups } from '../../config/userOperations.js'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})

const emit = defineEmits(['close', 'closed', 'action'])
const drawerRef = ref(null)
const titleRef = ref(null)
const plannedMessage = ref('')

const operationGroups = computed(() => getUserOperationGroups(props.user))
const userId = computed(() => String(props.user?.userId ?? props.user?.id ?? ''))

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

const close = createDialogCloseAction(requestDialogClose)

const selectEntry = (entry) => {
  if (phase.value !== 'open') return
  if (entry.status === 'planned') {
    plannedMessage.value = `${entry.title}：该功能入口已预留，业务能力待接入`
    return
  }
  plannedMessage.value = ''
  emit('action', { id: entry.id, user: props.user })
}

const handleAfterLeave = () => {
  onAfterLeave()
  plannedMessage.value = ''
  emit('closed')
}

watch(() => [props.visible, userId.value], ([visible]) => {
  if (visible) plannedMessage.value = ''
})

const entryClasses = (entry) => ({
  'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50': entry.risk === 'normal',
  'border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50': entry.risk === 'sensitive',
  'border-rose-200 bg-rose-50/40 hover:border-rose-300 hover:bg-rose-50': entry.risk === 'danger'
})
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-overlay" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div
        v-if="rendered"
        v-show="phase !== 'closing'"
        class="fixed inset-0 flex justify-end bg-slate-950/50"
        role="presentation"
        :style="layerStyle"
      >
        <Transition name="drawer-panel" appear>
          <section
            v-show="phase !== 'closing'"
            ref="drawerRef"
            data-testid="user-operation-drawer"
            class="flex h-screen max-h-screen w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl supports-[height:100dvh]:h-dvh supports-[height:100dvh]:max-h-dvh"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-operation-drawer-title"
          >
            <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
              <div class="min-w-0 flex-1">
                <h2
                  id="user-operation-drawer-title"
                  ref="titleRef"
                  tabindex="-1"
                  class="break-words text-xl font-semibold text-slate-900 outline-none"
                >
                  用户操作
                </h2>
                <p class="mt-1 break-words text-sm text-slate-500">
                  {{ user?.username || '未知用户' }} · UID {{ userId || '—' }}
                </p>
              </div>
              <button
                type="button"
                class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="关闭"
                @click="close"
              >
                ×
              </button>
            </header>

            <div
              data-testid="user-operation-drawer-body"
              class="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5"
            >
              <p
                v-if="plannedMessage"
                class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
                aria-live="polite"
              >
                {{ plannedMessage }}
              </p>

              <section v-for="group in operationGroups" :key="group.id" :aria-labelledby="`operation-group-${group.id}`">
                <h3 :id="`operation-group-${group.id}`" class="mb-2 text-sm font-semibold text-slate-900">
                  {{ group.label }}
                </h3>
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    v-for="entry in group.entries"
                    :key="entry.id"
                    type="button"
                    class="min-h-20 rounded-lg border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    :class="entryClasses(entry)"
                    @click="selectEntry(entry)"
                  >
                    <span class="flex items-start justify-between gap-2">
                      <span class="font-medium text-slate-900">{{ entry.title }}</span>
                      <span v-if="entry.status === 'planned'" class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        待接入
                      </span>
                    </span>
                    <span class="mt-1.5 block text-xs leading-5 text-slate-500">{{ entry.description }}</span>
                  </button>
                </div>
              </section>
            </div>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-overlay-enter-active { transition: opacity 200ms ease-out; }
.drawer-overlay-leave-active { transition: opacity 150ms ease-in; }
.drawer-panel-enter-active { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.drawer-panel-leave-active { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.drawer-overlay-enter-from,
.drawer-overlay-leave-to,
.drawer-panel-enter-from,
.drawer-panel-leave-to { opacity: 0; }
.drawer-panel-enter-from,
.drawer-panel-leave-to { transform: translateX(100%); }

@media (prefers-reduced-motion: reduce) {
  .drawer-overlay-enter-active,
  .drawer-overlay-leave-active,
  .drawer-panel-enter-active,
  .drawer-panel-leave-active { transition-duration: 50ms; }
  .drawer-panel-enter-from,
  .drawer-panel-leave-to { transform: none; }
}
</style>
