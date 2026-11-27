<script setup>
import AdminDialog from '../antd/AdminDialog.vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { AdminButton, AdminTextarea, nativeControl } from '../antd/controls.js'

import { computed, nextTick, reactive, ref, watch } from 'vue'
import PanelSingleSelect from '../form/PanelSingleSelect.vue'
import { getAgentParentCandidates, getUserById, setAgentParent } from '../../repositories/userRelationshipRepository.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'saved'])

const agentSelectRef = ref(null)
const reasonRef = ref(null)
const backRef = ref(null)
const errorRef = ref(null)
const phaseName = ref('form')
const submitting = ref(false)
const errorMessage = ref('')
const form = reactive({ agentParentId: '', reason: '' })

const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const currentAgentParent = computed(() => props.user?.agentParentId ? getUserById(props.user.agentParentId) : null)
const agentOptions = computed(() => [
  { value: '', label: '无上级代理', searchText: '无上级代理', disabled: false },
  ...(userId.value ? getAgentParentCandidates(userId.value) : []).map((candidate) => ({
    value: candidate.id,
    label: `${candidate.username} · UID ${candidate.id}`,
    searchText: [candidate.username, candidate.email, candidate.id].join(' '),
    disabled: Boolean(candidate.disabled)
  }))
])
const agentSelectionInvalid = computed(() => (
  form.agentParentId !== '' && !agentOptions.value.some((option) => (
    option.value === form.agentParentId && !option.disabled
  ))
))
const agentSelectionError = computed(() => (
  agentSelectionInvalid.value ? '所选上级代理不可用，请重新选择。' : ''
))
const nextAgentParent = computed(() => form.agentParentId ? getUserById(form.agentParentId) : null)
const reasonPreview = computed(() => form.reason.trim() || '未填写')

const resetForm = () => {
  phaseName.value = 'form'
  submitting.value = false
  errorMessage.value = ''
  form.agentParentId = props.user?.agentParentId || ''
  form.reason = ''
}

// Frame: AdminDialog (Ant Modal + useDialogLifecycle), dialog migration 2026-11-27.
const dialogFrame = ref(null)
const phase = computed(() => dialogFrame.value?.phase ?? 'closed')
const initialFocus = computed(() => agentSelectRef.value)

const close = () => dialogFrame.value?.close()

const handleClosed = () => {
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
  if (form.reason.trim().length > 200) return showError('变更原因不能超过 200 字')
  if (agentSelectionInvalid.value) return showError(agentSelectionError.value)
  if (String(props.user?.agentParentId ?? '') === String(form.agentParentId ?? '')) return showError('新上级代理不能与当前上级代理相同')
  phaseName.value = 'confirm'
  await nextTick()
  backRef.value?.focus?.()
}

const backToForm = async () => {
  phaseName.value = 'form'
  errorMessage.value = ''
  await nextTick()
  agentSelectRef.value?.focus?.()
}

const confirmSet = async () => {
  if (phase.value !== 'open' || submitting.value) return
  submitting.value = true
  try {
    const updated = setAgentParent({
      userId: userId.value,
      agentParentId: form.agentParentId || null,
      reason: form.reason.trim()
    })
    emit('saved', updated)
    submitting.value = false
    close()
  } catch (error) {
    submitting.value = false
    phaseName.value = 'form'
    await showError(error?.message || '设置上级代理失败，请稍后重试')
  }
}

watch(() => [props.visible, userId.value], ([visible]) => {
  if (visible) resetForm()
})
</script>

<template>
  <AdminDialog :open="visible" title="设置上级代理" title-id="agent-parent-title" :busy="submitting" :return-focus="returnFocus" :width="512" plain ref="dialogFrame" :initial-focus="initialFocus" @close="emit('close')" @closed="handleClosed">
      <template #subtitle>{{ user?.username || '未知用户' }} · UID {{ userId || '-' }}</template>
      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <FeedbackToast v-if="errorMessage" ref="errorRef" type="error" :source="() => (errorMessage) ? (errorMessage) : ''"></FeedbackToast>

            <template v-if="phaseName === 'form'">
              <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p class="text-xs text-slate-500">当前上级代理</p>
                <p class="mt-1 text-sm font-medium text-slate-900">{{ currentAgentParent?.username || '无上级代理' }}<span v-if="currentAgentParent" class="ml-2 font-normal text-slate-500">UID {{ currentAgentParent.id }}</span></p>
              </div>

              <div class="block">
                <FeedbackToast v-if="agentSelectionError" id="agent-parent-error" data-testid="agent-parent-error" type="error" :source="() => (agentSelectionError) ? (agentSelectionError) : ''"></FeedbackToast>
                <PanelSingleSelect
                  ref="agentSelectRef"
                  v-model="form.agentParentId"
                  :options="agentOptions"
                  label="新上级代理"
                  placeholder="请选择上级代理"
                  search-label="搜索代理用户"
                  required
                  :invalid="agentSelectionInvalid"
                  error-id="agent-parent-error"
                  id-base="agent-parent"
                />
                <span class="mt-1 block text-xs text-slate-500">仅可选择代理用户；不会调整邀请、团队或上下级关系。</span>
              </div>

              <label class="block">
                <span class="text-sm font-medium text-slate-800">变更原因（可选）</span>
                <AdminTextarea :ref="element => { reasonRef = nativeControl(element) }" v-model="form.reason" rows="3" maxlength="200" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none" placeholder="可填写设置上级代理的原因" />
                <span class="mt-1 block text-right text-xs text-slate-500">{{ form.reason.length }}/200</span>
              </label>
            </template>

            <template v-else>
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <h3 class="font-semibold">确认设置上级代理</h3>
                <dl class="mt-3 grid grid-cols-[6rem_1fr] gap-y-2">
                  <dt class="text-amber-800">原上级代理</dt><dd>{{ currentAgentParent?.username || '无上级代理' }}</dd>
                  <dt class="text-amber-800">新上级代理</dt><dd>{{ nextAgentParent?.username || '无上级代理' }}</dd>
                  <dt class="text-amber-800">变更原因</dt><dd class="break-words">{{ reasonPreview }}</dd>
                </dl>
              </div>
            </template>
          </div>

          <footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
            <template v-if="phaseName === 'form'">
              <AdminButton type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" @click="close">取消</AdminButton>
              <AdminButton type="button" class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700" @click="startConfirm">下一步</AdminButton>
            </template>
            <template v-else>
              <AdminButton :ref="element => { backRef = nativeControl(element) }" type="button" :disabled="submitting" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40" @click="backToForm">返回修改</AdminButton>
              <AdminButton type="button" :disabled="submitting" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50" @click="confirmSet">{{ submitting ? '提交中...' : '确认设置上级代理' }}</AdminButton>
            </template>
          </footer>
    </AdminDialog>
</template>

