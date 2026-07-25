<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { getDescendants, getParentCandidates, getUserById, resetParent } from '../../repositories/userRelationshipRepository.js'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: null },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'saved'])
const dialogRef = ref(null)
const searchRef = ref(null)
const backRef = ref(null)
const errorRef = ref(null)
const phaseName = ref('form')
const submitting = ref(false)
const errorMessage = ref('')
const form = reactive({ search: '', parentId: '', reason: '' })
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const descendantsCount = computed(() => userId.value ? getDescendants(userId.value).length : 0)
const currentParent = computed(() => props.user?.parentId ? getUserById(props.user.parentId) : null)
const candidates = computed(() => {
  if (!userId.value) return []
  const search = form.search.trim().toLowerCase()
  return getParentCandidates(userId.value).filter((candidate) => (
    !search || [candidate.id, candidate.username, candidate.email]
      .some((value) => String(value ?? '').toLowerCase().includes(search))
  ))
})
const nextParent = computed(() => form.parentId ? getUserById(form.parentId) : null)

const resetForm = () => {
  phaseName.value = 'form'
  submitting.value = false
  errorMessage.value = ''
  form.search = ''
  form.parentId = props.user?.parentId || ''
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
  initialFocusRef: searchRef,
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
  if (String(props.user?.parentId ?? '') === String(form.parentId ?? '')) return showError('新上级不能与当前上级相同')
  phaseName.value = 'confirm'
  await nextTick()
  backRef.value?.focus?.()
}

const backToForm = async () => {
  phaseName.value = 'form'
  errorMessage.value = ''
  await nextTick()
  searchRef.value?.focus?.()
}

const confirmReset = async () => {
  if (phase.value !== 'open' || submitting.value) return
  submitting.value = true
  try {
    await Promise.resolve()
    const updated = resetParent({
      userId: userId.value,
      parentId: form.parentId || null,
      reason: form.reason
    })
    emit('saved', updated)
    submitting.value = false
    close()
  } catch (error) {
    submitting.value = false
    phaseName.value = 'form'
    await showError(error?.message || '重设上级失败，请稍后重试')
  }
}

watch(() => [props.visible, userId.value], ([visible]) => {
  if (visible) resetForm()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="parent-dialog" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div v-if="rendered" v-show="phase !== 'closing'" class="fixed inset-0 grid place-items-center bg-slate-950/50 p-4" :style="layerStyle" role="presentation">
        <section ref="dialogRef" class="parent-dialog-panel flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]" role="dialog" aria-modal="true" aria-labelledby="parent-reset-title" :aria-busy="submitting">
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div class="min-w-0 flex-1">
              <h2 id="parent-reset-title" class="text-lg font-semibold text-slate-900">重设上级</h2>
              <p class="mt-1 break-words text-sm text-slate-500">{{ user?.username || '未知用户' }} · UID {{ userId || '—' }}</p>
            </div>
            <button type="button" :disabled="submitting" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40" aria-label="关闭" @click="close">×</button>
          </header>

          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <p v-if="errorMessage" ref="errorRef" tabindex="-1" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 outline-none" role="alert">{{ errorMessage }}</p>

            <template v-if="phaseName === 'form'">
              <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p class="text-xs text-slate-500">当前上级</p>
                <p class="mt-1 text-sm font-medium text-slate-900">{{ currentParent?.username || '无上级' }}<span v-if="currentParent" class="ml-2 font-normal text-slate-500">UID {{ currentParent.id }}</span></p>
              </div>

              <label class="block">
                <span class="text-sm font-medium text-slate-800">搜索新上级</span>
                <input ref="searchRef" v-model="form.search" type="search" autocomplete="off" class="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="用户名、邮箱或 UID" />
              </label>

              <label class="block">
                <span class="text-sm font-medium text-slate-800">新上级 <span class="text-rose-500">*</span></span>
                <select v-model="form.parentId" class="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                  <option value="">设为无上级</option>
                  <option v-for="candidate in candidates" :key="candidate.id" :value="candidate.id">{{ candidate.username }} · UID {{ candidate.id }}</option>
                </select>
                <span class="mt-1 block text-xs text-slate-500">已排除本人、当前上级、自己的下级和封禁用户。</span>
              </label>

              <label class="block">
                <span class="text-sm font-medium text-slate-800">变更原因 <span class="text-rose-500">*</span></span>
                <textarea v-model="form.reason" rows="3" maxlength="200" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="请说明重设上级的原因" />
                <span class="mt-1 block text-right text-xs text-slate-500">{{ form.reason.length }}/200</span>
              </label>
            </template>

            <template v-else>
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <h3 class="font-semibold">确认重设上级</h3>
                <dl class="mt-3 grid grid-cols-[6rem_1fr] gap-y-2">
                  <dt class="text-amber-800">原上级</dt><dd>{{ currentParent?.username || '无上级' }}</dd>
                  <dt class="text-amber-800">新上级</dt><dd>{{ nextParent?.username || '无上级' }}</dd>
                  <dt class="text-amber-800">预计影响</dt><dd>当前用户及关系链中的 {{ descendantsCount }} 个下级</dd>
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
              <button type="button" :disabled="submitting" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50" @click="confirmReset">{{ submitting ? '提交中…' : '确认重设上级' }}</button>
            </template>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.parent-dialog-enter-active { transition: opacity 200ms ease-out; }
.parent-dialog-leave-active { transition: opacity 150ms ease-in; }
.parent-dialog-enter-active .parent-dialog-panel { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.parent-dialog-leave-active .parent-dialog-panel { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.parent-dialog-enter-from,
.parent-dialog-leave-to { opacity: 0; }
.parent-dialog-enter-from .parent-dialog-panel,
.parent-dialog-leave-to .parent-dialog-panel { opacity: 0; transform: scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .parent-dialog-enter-active,
  .parent-dialog-leave-active,
  .parent-dialog-enter-active .parent-dialog-panel,
  .parent-dialog-leave-active .parent-dialog-panel { transition-duration: 50ms; }
  .parent-dialog-enter-from .parent-dialog-panel,
  .parent-dialog-leave-to .parent-dialog-panel { transform: none; }
}
</style>
