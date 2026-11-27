<script setup>
import AdminDrawer from '../antd/AdminDrawer.vue'
import { AdminButton } from '../antd/controls.js'

import { computed, ref, watch } from 'vue'
import { getUserOperationGroups } from '../../config/userOperations.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})

const emit = defineEmits(['close', 'closed', 'action'])
const plannedMessage = ref('')

const operationGroups = computed(() => getUserOperationGroups(props.user))
const userId = computed(() => String(props.user?.userId ?? props.user?.id ?? ''))

// Frame: AdminDrawer (Ant Drawer + useDialogLifecycle), drawer migration 2026-11-27.
const drawerFrame = ref(null)
const phase = computed(() => drawerFrame.value?.phase ?? 'closed')


const selectEntry = (entry, event) => {
  if (phase.value !== 'open') return
  if (entry.status === 'planned') {
    plannedMessage.value = `${entry.title}：该功能入口已预留，业务能力待接入`
    return
  }
  plannedMessage.value = ''
  emit('action', { id: entry.id, user: props.user, trigger: event?.currentTarget || null })
}

const handleClosed = () => {
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

const riskBadgeLabel = (entry) => {
  if (entry.risk === 'danger') return '高风险'
  if (entry.risk === 'sensitive') return '敏感'
  return ''
}

const riskBadgeClasses = (entry) => ({
  'border-amber-200 bg-amber-100 text-amber-700': entry.risk === 'sensitive',
  'border-rose-200 bg-rose-100 text-rose-700': entry.risk === 'danger'
})
</script>

<template>
  <AdminDrawer :open="visible" title="用户操作" title-id="user-operation-drawer-title" :return-focus="returnFocus" testid="user-operation-drawer" :width="576" plain ref="drawerFrame" @close="emit('close')" @closed="handleClosed">
      <template #subtitle>
                  {{ user?.username || '未知用户' }} · UID {{ userId || '—' }}
                </template>
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

              <section v-for="group in operationGroups" :key="group.id" class="rounded-xl border border-slate-100 bg-slate-50/50 p-2" :aria-labelledby="`operation-group-${group.id}`">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <h3 :id="`operation-group-${group.id}`" class="text-xs font-semibold tracking-wide text-slate-700">
                    {{ group.label }}
                  </h3>
                  <span class="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                    {{ group.entries.length }} 项
                  </span>
                </div>
                <div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  <AdminButton
                    v-for="entry in group.entries"
                    :key="entry.id"
                    type="button"
                    class="min-h-16 rounded-lg border p-2.5 text-left transition-colors focus:outline-none"
                    :class="entryClasses(entry)"
                    @click="selectEntry(entry, $event)"
                  >
                    <span class="flex items-start justify-between gap-2">
                      <span class="text-sm font-medium text-slate-900">{{ entry.title }}</span>
                      <span v-if="riskBadgeLabel(entry)" class="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-4" :class="riskBadgeClasses(entry)">
                        {{ riskBadgeLabel(entry) }}
                      </span>
                      <span v-if="entry.status === 'planned'" class="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium leading-4 text-slate-600">
                        待接入
                      </span>
                    </span>
                    <span class="mt-1 block text-xs leading-4 text-slate-500">{{ entry.description }}</span>
                  </AdminButton>
                </div>
              </section>
            </div>
    </AdminDrawer>
</template>

