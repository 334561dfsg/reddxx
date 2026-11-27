<script setup>
import AdminDialog from '../antd/AdminDialog.vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { AdminButton, AdminTextarea, nativeControl } from '../antd/controls.js'

import { computed, nextTick, reactive, ref, watch } from 'vue'
import PanelSingleSelect from '../form/PanelSingleSelect.vue'
import { USER_ROLE } from '../../constants/user.js'
import { getDirectReferrals, getParentCandidates, getUserById, updateAgentRole } from '../../repositories/userRelationshipRepository.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'saved'])
const reasonRef = ref(null)
const backRef = ref(null)
const errorRef = ref(null)
const phaseName = ref('form')
const submitting = ref(false)
const errorMessage = ref('')
const form = reactive({
  successorParentId: null,
  reason: ''
})
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const isAgent = computed(() => props.user?.role === USER_ROLE.AGENT)
const directChildren = computed(() => userId.value ? getDirectReferrals(userId.value) : [])
const needsSuccessor = computed(() => isAgent.value && directChildren.value.length > 0)
const successorOptions = computed(() => [
  { value: '', label: '全部设为无上级', searchText: '无上级', disabled: false },
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
    ? '请选择承接上级。'
    : '所选承接上级不可用，请重新选择。'
})
const successor = computed(() => form.successorParentId
  ? getUserById(form.successorParentId)
  : null)
const actionTitle = '取消代理身份'
const reasonPreview = computed(() => form.reason.trim() || '未填写')

const resetForm = () => {
  phaseName.value = 'form'
  submitting.value = false
  errorMessage.value = ''
  form.successorParentId = needsSuccessor.value ? null : ''
  form.reason = ''
}

// Frame: AdminDialog (Ant Modal + useDialogLifecycle), dialog migration 2026-11-27.
const dialogFrame = ref(null)
const phase = computed(() => dialogFrame.value?.phase ?? 'closed')
const initialFocus = computed(() => reasonRef.value)

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
  if (!isAgent.value) return showError('设置代理请使用添加代理流程。')
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
    let updated
    const affectedUserIds = [userId.value, ...directChildren.value.map((row) => row.id)]
    const payload = {
      userId: userId.value,
      role: USER_ROLE.USER,
      reason: form.reason.trim()
    }
    if (needsSuccessor.value) payload.successorParentId = form.successorParentId || null
    updated = updateAgentRole(payload)
    emit('saved', { user: updated, affectedUserIds })
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
  <AdminDialog :open="visible" :title="actionTitle" title-id="agent-role-title" :busy="submitting" :return-focus="returnFocus" :width="512" plain ref="dialogFrame" :initial-focus="initialFocus" @close="emit('close')" @closed="handleClosed">
      <template #subtitle>{{ user?.username || '未知用户' }} · UID {{ userId || '—' }}</template>
      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <FeedbackToast v-if="errorMessage" ref="errorRef" type="error" :source="() => (errorMessage) ? (errorMessage) : ''"></FeedbackToast>

            <template v-if="phaseName === 'form'">
              <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                <div class="flex justify-between gap-3"><span class="text-slate-500">当前身份</span><span class="font-medium text-slate-900">{{ isAgent ? '代理' : '普通用户' }}</span></div>
                <div class="mt-2 flex justify-between gap-3"><span class="text-slate-500">目标身份</span><span class="font-medium text-rose-700">普通用户</span></div>
                <div class="mt-2 flex justify-between gap-3"><span class="text-slate-500">直属下级</span><span class="font-medium text-slate-900">{{ directChildren.length }} 人</span></div>
              </div>

              <div v-if="needsSuccessor" class="block">
                <FeedbackToast v-if="successorSelectionError" id="agent-role-successor-parent-error" data-testid="agent-role-successor-parent-error" type="error" :source="() => (successorSelectionError) ? (successorSelectionError) : ''"></FeedbackToast>
                <PanelSingleSelect
                  v-model="form.successorParentId"
                  :options="successorOptions"
                  label="承接上级"
                  placeholder="请选择承接上级"
                  search-label="搜索承接上级用户"
                  required
                  :invalid="successorSelectionInvalid"
                  error-id="agent-role-successor-parent-error"
                  id-base="agent-role-successor-parent"
                />
                <span class="mt-1 block text-xs text-slate-500">取消代理后，{{ directChildren.length }} 个直属下级将统一转移到此上级。</span>
              </div>

              <label class="block">
                <span class="text-sm font-medium text-slate-800">变更原因（可选）</span>
                <AdminTextarea :ref="element => { reasonRef = nativeControl(element) }" v-model="form.reason" rows="3" maxlength="200" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none" placeholder="可填写取消代理身份的原因" />
                <span class="mt-1 block text-right text-xs text-slate-500">{{ form.reason.length }}/200</span>
              </label>
            </template>

            <template v-else>
              <div v-if="phaseName === 'confirm'" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <h3 class="font-semibold">确认{{ actionTitle }}</h3>
                <dl class="mt-3 grid grid-cols-[6rem_1fr] gap-y-2">
                  <dt class="text-amber-800">身份变化</dt><dd>代理 → 普通用户</dd>
                  <template v-if="needsSuccessor">
                    <dt class="text-amber-800">影响成员</dt><dd>{{ directChildren.length }} 个直属下级</dd>
                    <dt class="text-amber-800">承接上级</dt><dd>{{ successor?.username || '无上级' }}</dd>
                  </template>
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
              <AdminButton type="button" :disabled="submitting" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50" @click="confirmChange">{{ submitting ? '提交中…' : `确认${actionTitle}` }}</AdminButton>
            </template>
          </footer>
    </AdminDialog>
</template>

