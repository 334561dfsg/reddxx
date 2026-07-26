<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { updateProfile, validateProfile } from '../../repositories/userRelationshipRepository.js'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})

const emit = defineEmits(['close', 'closed', 'saved'])
const dialogRef = ref(null)
const firstFieldRef = ref(null)
const errorRef = ref(null)
const submitting = ref(false)
const submitError = ref('')
const errors = reactive({})
const form = reactive({ username: '', email: '', phone: '', remark: '' })
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))

const resetForm = () => {
  form.username = props.user?.username || ''
  form.email = props.user?.email || ''
  form.phone = props.user?.phone || ''
  form.remark = props.user?.remark || ''
  for (const key of Object.keys(errors)) delete errors[key]
  submitError.value = ''
  submitting.value = false
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
  initialFocusRef: firstFieldRef,
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close'),
  closeDisabled: submitting
})

const close = createDialogCloseAction(requestDialogClose)
const handleAfterLeave = async () => {
  if (!await onAfterLeave()) return
  resetForm()
  emit('closed')
}

const focusError = async () => {
  await nextTick()
  errorRef.value?.focus?.()
}

const submit = async () => {
  if (phase.value !== 'open' || submitting.value) return
  for (const key of Object.keys(errors)) delete errors[key]
  submitError.value = ''
  Object.assign(errors, validateProfile(form, userId.value))
  if (Object.keys(errors).length) {
    submitError.value = '请检查并修正表单中的错误'
    await focusError()
    return
  }

  submitting.value = true
  try {
    await Promise.resolve()
    const updated = updateProfile(userId.value, form)
    emit('saved', updated)
    submitting.value = false
    close()
  } catch (error) {
    if (error?.fields) Object.assign(errors, error.fields)
    submitError.value = error?.message || '保存失败，请稍后重试'
    submitting.value = false
    await focusError()
  }
}

watch(() => [props.visible, userId.value], ([visible]) => {
  if (visible) resetForm()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="profile-dialog" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div v-if="rendered" v-show="phase !== 'closing'" class="fixed inset-0 grid place-items-center bg-slate-950/50 p-4" :style="layerStyle" role="presentation">
        <section ref="dialogRef" class="profile-dialog-panel flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" :aria-busy="submitting">
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div class="min-w-0 flex-1">
              <h2 id="profile-edit-title" class="text-lg font-semibold text-slate-900">编辑用户资料</h2>
              <p class="mt-1 break-words text-sm text-slate-500">{{ user?.username || '未知用户' }} · UID {{ userId || '—' }}</p>
            </div>
            <button type="button" :disabled="submitting" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40" aria-label="关闭" @click="close">×</button>
          </header>

          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <p v-if="submitError" ref="errorRef" tabindex="-1" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 outline-none" role="alert">{{ submitError }}</p>

            <label class="block">
              <span class="text-sm font-medium text-slate-800">用户名 <span class="text-rose-500">*</span></span>
              <input ref="firstFieldRef" v-model="form.username" :disabled="submitting" type="text" autocomplete="off" class="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
              <span v-if="errors.username" class="mt-1 block text-xs text-rose-600">{{ errors.username }}</span>
            </label>

            <label class="block">
              <span class="text-sm font-medium text-slate-800">邮箱 <span class="text-rose-500">*</span></span>
              <input v-model="form.email" :disabled="submitting" type="email" autocomplete="off" class="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
              <span v-if="errors.email" class="mt-1 block text-xs text-rose-600">{{ errors.email }}</span>
            </label>

            <label class="block">
              <span class="text-sm font-medium text-slate-800">手机号</span>
              <input v-model="form.phone" :disabled="submitting" type="tel" autocomplete="off" class="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
              <span v-if="errors.phone" class="mt-1 block text-xs text-rose-600">{{ errors.phone }}</span>
            </label>

            <label class="block">
              <span class="text-sm font-medium text-slate-800">备注</span>
              <textarea v-model="form.remark" :disabled="submitting" rows="3" maxlength="200" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
              <span class="mt-1 flex justify-between gap-3 text-xs"><span class="text-rose-600">{{ errors.remark || '' }}</span><span class="text-slate-500">{{ form.remark.length }}/200</span></span>
            </label>
          </div>

          <footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
            <button type="button" :disabled="submitting" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40" @click="close">取消</button>
            <button type="button" :disabled="submitting || phase !== 'open'" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" @click="submit">{{ submitting ? '保存中…' : '保存资料' }}</button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.profile-dialog-enter-active { transition: opacity 200ms ease-out; }
.profile-dialog-leave-active { transition: opacity 150ms ease-in; }
.profile-dialog-enter-active .profile-dialog-panel { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.profile-dialog-leave-active .profile-dialog-panel { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.profile-dialog-enter-from,
.profile-dialog-leave-to { opacity: 0; }
.profile-dialog-enter-from .profile-dialog-panel,
.profile-dialog-leave-to .profile-dialog-panel { opacity: 0; transform: scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .profile-dialog-enter-active,
  .profile-dialog-leave-active,
  .profile-dialog-enter-active .profile-dialog-panel,
  .profile-dialog-leave-active .profile-dialog-panel { transition-duration: 50ms; }
  .profile-dialog-enter-from .profile-dialog-panel,
  .profile-dialog-leave-to .profile-dialog-panel { transform: none; }
}
</style>
