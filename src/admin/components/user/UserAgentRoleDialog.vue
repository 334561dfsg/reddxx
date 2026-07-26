<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import PanelSingleSelect from '../form/PanelSingleSelect.vue'
import { USER_ROLE } from '../../constants/user.js'
import { getDirectReferrals, getParentCandidates, getUserById, updateAgentRole } from '../../repositories/userRelationshipRepository.js'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'saved'])
const dialogRef = ref(null)
const reasonRef = ref(null)
const backRef = ref(null)
const errorRef = ref(null)
const phaseName = ref('form')
const submitting = ref(false)
const errorMessage = ref('')
const form = reactive({ successorParentId: null, reason: '' })
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const isAgent = computed(() => props.user?.role === USER_ROLE.AGENT)
const directChildren = computed(() => userId.value ? getDirectReferrals(userId.value) : [])
const needsSuccessor = computed(() => isAgent.value && directChildren.value.length > 0)
const successorOptions = computed(() => [
  { value: '', label: '全部设为无裂变上级', searchText: '无裂变上级', disabled: false },
  ...(userId.value ? getParentCandidates(userId.value) : []).map((candidate) => ({
    value: candidate.id,
    label: `${candidate.username} · UID ${candidate.id}`,
    searchText: [candidate.username, candidate.email, candidate.id].join(' '),
    disabled: Boolean(candidate.disabled)
  }))
])
const successorSelectionInvalid = computed(() => needsSuccessor.value && (
  form.successorParentId === null || !successorOptions.value.some((option) => (
    option.value === form.successorParentId && !option.disabled
  ))
))
const successorSelectionError = computed(() => {
  if (!successorSelectionInvalid.value) return ''
  return form.successorParentId === null
    ? '请选择承接裂变上级。'
    : '所选承接裂变上级不可用，请重新选择。'
})
const successor = computed(() => form.successorParentId
  ? getUserById(form.successorParentId)
  : null)
const targetRole = computed(() => isAgent.value ? USER_ROLE.USER : USER_ROLE.AGENT)
const actionTitle = computed(() => isAgent.value ? '取消代理身份' : '设置为代理')

const resetForm = () => {
  phaseName.value = 'form'
  submitting.value = false
  errorMessage.value = ''
  form.successorParentId = needsSuccessor.value ? null : ''
  form.reason = ''
}

const {
  rendered,
  phase,
  layerStyle,
  requestDialogClose,
  onAfterEnter,
  onAfterLeave
} = useDialogLifecycle({
  open: computed(() => props.visible),
  dialogRef,
  initialFocusRef: reasonRef,
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close'),
  closeDisabled: submitting
})
const close = createDialogCloseAction(requestDialogClose)
const handleAfterLeave = () => {
  onAfterLeave()
  resetForm()
  emit('closed')
}
const showError = async (message) => {
  errorMessage.value = message
  await nextTick()
  errorRef.value?.focus?.()
}

const startConfirm = async () => {
  errorMessage.value = ''
  if (!form.reason.trim()) return showError('变更原因必填')
  if (form.reason.trim().length > 200) return showError('变更原因不能超过 200 字')
  if (successorSelectionInvalid.value) return showError(successorSelectionError.value)
  phaseName.value = 'confirm'
  await nextTick()
  backRef.value?.focus?.()
}

const backToForm = async () => {
  phaseName.value = 'form'
  errorMessage.value = ''
  await nextTick()
  reasonRef.value?.focus?.()
}

const confirmChange = async () => {
  if (phase.value !== 'open' || submitting.value) return
  submitting.value = true
  try {
    await Promise.resolve()
    const payload = {
      userId: userId.value,
      role: targetRole.value,
      reason: form.reason
    }
    if (needsSuccessor.value) payload.successorParentId = form.successorParentId || null
    const updated = updateAgentRole(payload)
    emit('saved', { user: updated, affectedUserIds: [userId.value, ...directChildren.value.map((row) => row.id)] })
    submitting.value = false
    close()
  } catch (error) {
    submitting.value = false
    phaseName.value = 'form'
    await showError(error?.message || '代理身份变更失败，请稍后重试')
  }
}

watch(() => [props.visible, userId.value, props.user?.role], ([visible]) => {
  if (visible) resetForm()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="agent-dialog" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div v-if="rendered" v-show="phase !== 'closing'" class="fixed inset-0 grid place-items-center bg-slate-950/50 p-4" :style="layerStyle" role="presentation">
        <section ref="dialogRef" class="agent-dialog-panel flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]" role="dialog" aria-modal="true" aria-labelledby="agent-role-title" :aria-busy="submitting">
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div class="min-w-0 flex-1">
              <h2 id="agent-role-title" class="text-lg font-semibold text-slate-900">{{ actionTitle }}</h2>
              <p class="mt-1 break-words text-sm text-slate-500">{{ user?.username || '未知用户' }} · UID {{ userId || '—' }}</p>
            </div>
            <button type="button" :disabled="submitting" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40" aria-label="关闭" @click="close">×</button>
          </header>

          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <p v-if="errorMessage" ref="errorRef" tabindex="-1" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 outline-none" role="alert">{{ errorMessage }}</p>

            <template v-if="phaseName === 'form'">
              <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                <div class="flex justify-between gap-3"><span class="text-slate-500">当前身份</span><span class="font-medium text-slate-900">{{ isAgent ? '代理' : '普通用户' }}</span></div>
                <div class="mt-2 flex justify-between gap-3"><span class="text-slate-500">目标身份</span><span class="font-medium" :class="isAgent ? 'text-rose-700' : 'text-blue-700'">{{ isAgent ? '普通用户' : '代理' }}</span></div>
                <div class="mt-2 flex justify-between gap-3"><span class="text-slate-500">直属裂变下级</span><span class="font-medium text-slate-900">{{ directChildren.length }} 人</span></div>
              </div>

              <div v-if="needsSuccessor" class="block">
                <p
                  v-if="successorSelectionError"
                  id="agent-role-successor-parent-error"
                  data-testid="agent-role-successor-parent-error"
                  role="alert"
                  class="mb-1 text-sm text-rose-700"
                >{{ successorSelectionError }}</p>
                <PanelSingleSelect
                  v-model="form.successorParentId"
                  :options="successorOptions"
                  label="承接裂变上级"
                  placeholder="请选择承接裂变上级"
                  search-label="搜索承接裂变上级用户"
                  required
                  :invalid="successorSelectionInvalid"
                  error-id="agent-role-successor-parent-error"
                  id-base="agent-role-successor-parent"
                />
                <span class="mt-1 block text-xs text-slate-500">取消代理后，{{ directChildren.length }} 个直属裂变下级将统一转移到此裂变上级。</span>
              </div>

              <label class="block">
                <span class="text-sm font-medium text-slate-800">变更原因 <span class="text-rose-500">*</span></span>
                <textarea ref="reasonRef" v-model="form.reason" rows="3" maxlength="200" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" :placeholder="isAgent ? '请说明取消代理身份的原因' : '请说明设置为代理的原因'" />
                <span class="mt-1 block text-right text-xs text-slate-500">{{ form.reason.length }}/200</span>
              </label>
            </template>

            <template v-else>
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <h3 class="font-semibold">确认{{ actionTitle }}</h3>
                <dl class="mt-3 grid grid-cols-[6rem_1fr] gap-y-2">
                  <dt class="text-amber-800">身份变化</dt><dd>{{ isAgent ? '代理 → 普通用户' : '普通用户 → 代理' }}</dd>
                  <template v-if="needsSuccessor">
                    <dt class="text-amber-800">影响成员</dt><dd>{{ directChildren.length }} 个直属裂变下级</dd>
                    <dt class="text-amber-800">承接裂变上级</dt><dd>{{ successor?.username || '无裂变上级' }}</dd>
                  </template>
                  <dt class="text-amber-800">变更原因</dt><dd class="break-words">{{ form.reason.trim() }}</dd>
                </dl>
              </div>
            </template>
          </div>

          <footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
            <template v-if="phaseName === 'form'">
              <button type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" @click="close">取消</button>
              <button type="button" class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700" @click="startConfirm">下一步</button>
            </template>
            <template v-else>
              <button ref="backRef" type="button" :disabled="submitting" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40" @click="backToForm">返回修改</button>
              <button type="button" :disabled="submitting" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50" @click="confirmChange">{{ submitting ? '提交中…' : `确认${actionTitle}` }}</button>
            </template>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.agent-dialog-enter-active { transition: opacity 200ms ease-out; }
.agent-dialog-leave-active { transition: opacity 150ms ease-in; }
.agent-dialog-enter-active .agent-dialog-panel { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.agent-dialog-leave-active .agent-dialog-panel { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.agent-dialog-enter-from,
.agent-dialog-leave-to { opacity: 0; }
.agent-dialog-enter-from .agent-dialog-panel,
.agent-dialog-leave-to .agent-dialog-panel { opacity: 0; transform: scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .agent-dialog-enter-active,
  .agent-dialog-leave-active,
  .agent-dialog-enter-active .agent-dialog-panel,
  .agent-dialog-leave-active .agent-dialog-panel { transition-duration: 50ms; }
  .agent-dialog-enter-from .agent-dialog-panel,
  .agent-dialog-leave-to .agent-dialog-panel { transform: none; }
}
</style>
