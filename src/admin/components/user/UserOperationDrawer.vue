<script setup>
import { computed, ref, watch } from 'vue'
import { getUserOperationGroups } from '../../config/userOperations.js'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const QUICK_ENTRY_IDS = new Set(['assets', 'deposit', 'freeze-account', 'direct-referrals'])

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
const quickOperationEntries = computed(() => operationGroups.value.flatMap((group) => (
  group.entries.filter((entry) => QUICK_ENTRY_IDS.has(entry.id))
)))
const dangerOperationEntries = computed(() => operationGroups.value.flatMap((group) => (
  group.entries.filter((entry) => entry.risk === 'danger' && !QUICK_ENTRY_IDS.has(entry.id))
)))
const normalOperationGroups = computed(() => operationGroups.value
  .map((group) => ({
    ...group,
    entries: group.entries.filter((entry) => entry.risk !== 'danger' && !QUICK_ENTRY_IDS.has(entry.id))
  }))
  .filter((group) => group.entries.length))
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

const selectEntry = (entry, event) => {
  if (phase.value !== 'open') return
  if (entry.status === 'planned') {
    plannedMessage.value = `${entry.title}：该功能入口已预留，业务能力待接入`
    return
  }
  plannedMessage.value = ''
  emit('action', { id: entry.id, user: props.user, trigger: event?.currentTarget || null })
}

const handleAfterLeave = async () => {
  if (!await onAfterLeave()) return
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

const entryDotClasses = (entry) => ({
  'bg-blue-500': entry.risk === 'normal',
  'bg-amber-500': entry.risk === 'sensitive',
  'bg-rose-500': entry.risk === 'danger'
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
            <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5" style="padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right));">
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
              class="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4"
              style="padding-left: max(0.75rem, env(safe-area-inset-left)); padding-right: max(0.75rem, env(safe-area-inset-right));"
            >
              <p
                v-if="plannedMessage"
                class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800"
                aria-live="polite"
              >
                {{ plannedMessage }}
              </p>

              <section v-if="quickOperationEntries.length" aria-labelledby="operation-quick-title">
                <h3 id="operation-quick-title" class="mb-2 text-xs font-semibold tracking-wide text-slate-600">
                  常用操作
                </h3>
                <div data-testid="user-operation-quick-actions" class="grid grid-cols-2 gap-2">
                  <button
                    v-for="entry in quickOperationEntries"
                    :key="entry.id"
                    type="button"
                    class="min-h-14 rounded-lg border p-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    :class="entryClasses(entry)"
                    @click="selectEntry(entry, $event)"
                  >
                    <span class="flex items-start justify-between gap-2">
                      <span class="text-sm font-medium text-slate-900">{{ entry.title }}</span>
                      <span v-if="entry.status === 'planned'" class="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium leading-4 text-slate-600">
                        待接入
                      </span>
                    </span>
                    <span class="mt-1 block text-xs leading-4 text-slate-500">{{ entry.description }}</span>
                  </button>
                </div>
              </section>

              <div data-testid="user-operation-normal-actions" class="space-y-4">
                <section v-for="group in normalOperationGroups" :key="group.id" :aria-labelledby="`operation-group-${group.id}`">
                  <h3 :id="`operation-group-${group.id}`" class="mb-2 text-xs font-semibold tracking-wide text-slate-600">
                    {{ group.label }}
                  </h3>
                  <div class="space-y-1.5">
                    <button
                      v-for="entry in group.entries"
                      :key="entry.id"
                      type="button"
                      class="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      @click="selectEntry(entry, $event)"
                    >
                      <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="entryDotClasses(entry)" aria-hidden="true"></span>
                      <span class="min-w-0 flex-1">
                        <span class="block text-sm font-medium text-slate-900">{{ entry.title }}</span>
                        <span class="mt-0.5 block truncate text-xs leading-4 text-slate-500">{{ entry.description }}</span>
                      </span>
                      <span v-if="entry.status === 'planned'" class="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium leading-4 text-slate-600">
                        待接入
                      </span>
                      <span class="shrink-0 text-lg leading-none text-slate-300" aria-hidden="true">
                        ›
                      </span>
                    </button>
                  </div>
                </section>
              </div>

              <section v-if="dangerOperationEntries.length" aria-labelledby="operation-danger-title" aria-label="高风险操作">
                <h3 id="operation-danger-title" class="mb-2 text-xs font-semibold tracking-wide text-rose-700">
                  高风险操作
                </h3>
                <div data-testid="user-operation-danger-actions" class="space-y-1.5 rounded-xl border border-rose-100 bg-rose-50/40 p-2">
                  <button
                    v-for="entry in dangerOperationEntries"
                    :key="entry.id"
                    type="button"
                    class="flex w-full items-center gap-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-left transition-colors hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                    @click="selectEntry(entry, $event)"
                  >
                    <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" aria-hidden="true"></span>
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm font-medium text-slate-900">{{ entry.title }}</span>
                      <span class="mt-0.5 block truncate text-xs leading-4 text-slate-500">{{ entry.description }}</span>
                    </span>
                    <span class="shrink-0 text-lg leading-none text-rose-300" aria-hidden="true">
                      ›
                    </span>
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
