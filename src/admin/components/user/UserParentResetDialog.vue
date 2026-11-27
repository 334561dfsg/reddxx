<script setup>
import AdminDialog from '../antd/AdminDialog.vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { AdminButton, AdminTextarea, nativeControl } from '../antd/controls.js'

import { computed, nextTick, reactive, ref, watch } from 'vue'
import PanelSingleSelect from '../form/PanelSingleSelect.vue'
import { getDescendants, getParentCandidates, getUserById, resetParent } from '../../repositories/userRelationshipRepository.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'saved'])
const parentSelectRef = ref(null)
const reasonRef = ref(null)
const backRef = ref(null)
const errorRef = ref(null)
const phaseName = ref('form')
const submitting = ref(false)
const errorMessage = ref('')
const form = reactive({ parentId: '', reason: '' })
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const descendantsCount = computed(() => userId.value ? getDescendants(userId.value).length : 0)
const currentParent = computed(() => props.user?.parentId ? getUserById(props.user.parentId) : null)
const parentOptions = computed(() => [
  { value: '', label: '设为无裂变上级', searchText: '无裂变上级', disabled: false },
  ...(userId.value ? getParentCandidates(userId.value) : []).map((candidate) => ({
    value: candidate.id,
    label: `${candidate.username} · UID ${candidate.id}`,
    searchText: [candidate.username, candidate.email, candidate.id].join(' '),
    disabled: Boolean(candidate.disabled)
  }))
])
const parentSelectionInvalid = computed(() => (
  form.parentId !== '' && !parentOptions.value.some((option) => (
    option.value === form.parentId && !option.disabled
  ))
))
const parentSelectionError = computed(() => (
  parentSelectionInvalid.value ? '所选新裂变上级不可用，请重新选择。' : ''
))
const nextParent = computed(() => form.parentId ? getUserById(form.parentId) : null)
const reasonPreview = computed(() => form.reason.trim() || '未填写')

const resetForm = () => {
  phaseName.value = 'form'
  submitting.value = false
  errorMessage.value = ''
  form.parentId = props.user?.parentId || ''
  form.reason = ''
}

// Frame: AdminDialog (Ant Modal + useDialogLifecycle), dialog migration 2026-11-27.
const dialogFrame = ref(null)
const phase = computed(() => dialogFrame.value?.phase ?? 'closed')
const initialFocus = computed(() => parentSelectRef.value)

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
  if (parentSelectionInvalid.value) return showError(parentSelectionError.value)
  if (String(props.user?.parentId ?? '') === String(form.parentId ?? '')) return showError('新裂变上级不能与当前裂变上级相同')
  phaseName.value = 'confirm'
  await nextTick()
  backRef.value?.focus?.()
}

const backToForm = async () => {
  phaseName.value = 'form'
  errorMessage.value = ''
  await nextTick()
  parentSelectRef.value?.focus?.()
}

const confirmReset = async () => {
  if (phase.value !== 'open' || submitting.value) return
  submitting.value = true
  try {
    await Promise.resolve()
    const updated = resetParent({
      userId: userId.value,
      parentId: form.parentId || null,
      reason: form.reason.trim()
    })
    emit('saved', updated)
    submitting.value = false
    close()
  } catch (error) {
    submitting.value = false
    phaseName.value = 'form'
    await showError(error?.message || '重设裂变上级失败，请稍后重试')
  }
}

watch(() => [props.visible, userId.value], ([visible]) => {
  if (visible) resetForm()
})
</script>

<template>
  <AdminDialog :open="visible" title="重设裂变上级" title-id="parent-reset-title" :busy="submitting" :return-focus="returnFocus" :width="512" plain ref="dialogFrame" :initial-focus="initialFocus" @close="emit('close')" @closed="handleClosed">
      <template #subtitle>{{ user?.username || '未知用户' }} · UID {{ userId || '—' }}</template>
      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <FeedbackToast v-if="errorMessage" ref="errorRef" type="error" :source="() => (errorMessage) ? (errorMessage) : ''"></FeedbackToast>

            <template v-if="phaseName === 'form'">
              <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p class="text-xs text-slate-500">当前裂变上级</p>
                <p class="mt-1 text-sm font-medium text-slate-900">{{ currentParent?.username || '无裂变上级' }}<span v-if="currentParent" class="ml-2 font-normal text-slate-500">UID {{ currentParent.id }}</span></p>
              </div>

              <div class="block">
                <FeedbackToast v-if="parentSelectionError" id="parent-reset-parent-error" data-testid="parent-reset-parent-error" type="error" :source="() => (parentSelectionError) ? (parentSelectionError) : ''"></FeedbackToast>
                <PanelSingleSelect
                  ref="parentSelectRef"
                  v-model="form.parentId"
                  :options="parentOptions"
                  label="新裂变上级"
                  placeholder="请选择新裂变上级"
                  search-label="搜索新裂变上级用户"
                  required
                  :invalid="parentSelectionInvalid"
                  error-id="parent-reset-parent-error"
                  id-base="parent-reset-parent"
                />
                <span class="mt-1 block text-xs text-slate-500">已排除本人、当前裂变上级、自己的裂变下级和封禁用户。</span>
              </div>

              <label class="block">
                <span class="text-sm font-medium text-slate-800">变更原因（可选）</span>
                <AdminTextarea :ref="element => { reasonRef = nativeControl(element) }" v-model="form.reason" rows="3" maxlength="200" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none" placeholder="可填写重设裂变上级的原因" />
                <span class="mt-1 block text-right text-xs text-slate-500">{{ form.reason.length }}/200</span>
              </label>
            </template>

            <template v-else>
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <h3 class="font-semibold">确认重设裂变上级</h3>
                <dl class="mt-3 grid grid-cols-[6rem_1fr] gap-y-2">
                  <dt class="text-amber-800">原裂变上级</dt><dd>{{ currentParent?.username || '无裂变上级' }}</dd>
                  <dt class="text-amber-800">新裂变上级</dt><dd>{{ nextParent?.username || '无裂变上级' }}</dd>
                  <dt class="text-amber-800">预计影响</dt><dd>当前用户及裂变关系链中的 {{ descendantsCount }} 个裂变下级</dd>
                  <dt class="text-amber-800">变更原因</dt><dd class="break-words">{{ reasonPreview }}</dd>
                </dl>
              </div>
            </template>
          </div>

          <footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
            <template v-if="phaseName === 'form'">
              <AdminButton type="button" @click="close">取消</AdminButton>
              <AdminButton type="button" variant="primary" @click="startConfirm">下一步</AdminButton>
            </template>
            <template v-else>
              <AdminButton :ref="element => { backRef = nativeControl(element) }" type="button" :disabled="submitting" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40" @click="backToForm">返回修改</AdminButton>
              <AdminButton type="button" :disabled="submitting" variant="primary" danger @click="confirmReset">{{ submitting ? '提交中…' : '确认重设裂变上级' }}</AdminButton>
            </template>
          </footer>
    </AdminDialog>
</template>

