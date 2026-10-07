<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import MfaVerificationModal from '../MfaVerificationModal.vue'
import { nativeControl } from '../antd/controls.js'
import { useDialogLifecycle } from '../../composables/useDialogLifecycle.js'
import { minimumDepositRepository as repository } from '../../repositories/minimumDepositRepository.js'
import { normalizeMinimumUsdt } from '../../../features/minimum-deposit/model.js'

const props = defineProps({ open: Boolean, returnFocus: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const dialogRef = ref(null)
const inputRef = ref(null)
const errorRef = ref(null)
const discardRef = ref(null)
const submitRef = ref(null)
const mfaOpen = ref(false)
const mfaError = ref('')
const mfaErrorAttempt = ref(0)
const session = repository.createSession()
const saved = ref(null)
const draft = ref('')
const loadError = ref('')
const attempted = ref(false)
const touched = ref(false)
const composing = ref(false)
const discard = ref(false)
const saving = ref(false)
const succeeded = ref(false)
let disposed = false
let discardAuthorized = false
const parsed = computed(() => {
  try { return { value: normalizeMinimumUsdt(draft.value), error: '' } }
  catch (error) { return { value: null, error: error.message } }
})
const dirty = computed(() => !!saved.value && (parsed.value.value ?? draft.value) !== saved.value.amountUsdt)
const fieldError = computed(() => (attempted.value || touched.value) && !composing.value ? parsed.value.error : '')


function load() {
  session.cancel(); mfaOpen.value = false; mfaError.value = ''; mfaErrorAttempt.value = 0
  loadError.value = ''; saved.value = null; draft.value = ''
  attempted.value = false; touched.value = false; discard.value = false; succeeded.value = false
  try { saved.value = repository.read(); draft.value = saved.value.amountUsdt }
  catch (error) { loadError.value = error.message }
}
async function retryLoad() {
  load()
  await nextTick()
  if (!disposed) (loadError.value ? errorRef.value : inputRef.value)?.focus()
}
watch(() => props.open, open => { if (open) load() }, { immediate: true })
watch(draft, () => { discard.value = false })
const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.open), dialogRef,
  returnFocusRef: computed(() => props.returnFocus),
  initialFocusRef: computed(() => loadError.value ? errorRef.value : inputRef.value),
  closeDisabled: computed(() => saving.value || mfaOpen.value),
  requestClose: () => {
    if (dirty.value && !discardAuthorized) {
      discard.value = true
      nextTick(() => { if (!disposed) discardRef.value?.focus() })
      return false
    }
    emit('close')
  }
})
function discardChanges() {
  discardAuthorized = true
  requestDialogClose()
  discardAuthorized = false
}
function save() {
  if (phase.value !== 'open' || saving.value || mfaOpen.value || succeeded.value || composing.value || !saved.value) return
  attempted.value = true
  if (parsed.value.error) { inputRef.value?.focus(); return }
  session.prepare(parsed.value.value, saved.value)
  mfaError.value = ''; mfaErrorAttempt.value = 0
  mfaOpen.value = true
}
function cancelVerification() {
  if (saving.value) return
  session.cancel()
  mfaOpen.value = false
  mfaError.value = ''
}
async function verifyAndSave(code) {
  if (saving.value || !mfaOpen.value || succeeded.value) return
  saving.value = true
  try {
    const result = await session.confirm(code)
    if (disposed || !result) return
    saved.value = result
    succeeded.value = true
    mfaOpen.value = false
    emit('saved', result)
    // Keep the parent until the MFA exit has returned focus to its trigger.
  } catch (error) {
    if (disposed) return
    mfaError.value = error.message
    mfaErrorAttempt.value++
  } finally { if (!disposed) saving.value = false }
}
function afterMfaClose() {
  if (succeeded.value && !disposed) emit('close')
}
onBeforeRouteLeave(() => !saving.value && (!props.open || !dirty.value || window.confirm('最低充值金额尚未保存，确认放弃并离开？')))

function beforeUnload(event) {
  if (props.open && dirty.value) { event.preventDefault(); event.returnValue = '' }
}
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => { disposed = true; session.cancel(); window.removeEventListener('beforeunload', beforeUnload) })
</script>

<template>
  <Teleport to="body">
    <Transition name="minimum-deposit" appear @after-enter="onAfterEnter" @after-leave="onAfterLeave">
      <div v-if="rendered" class="minimum-deposit-overlay fixed inset-0 grid place-items-center bg-slate-950/45" :style="layerStyle">
        <section ref="dialogRef" role="dialog" aria-modal="true" aria-labelledby="minimum-deposit-title" :aria-busy="saving" class="minimum-deposit-panel flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 id="minimum-deposit-title" class="min-w-0 break-words text-lg font-bold text-slate-900">最低充值金额设置</h2>
            <a-button html-type="button" aria-label="关闭" class="minimum-deposit-close shrink-0" :disabled="saving" @click="requestDialogClose">×</a-button>
          </header>
          <form novalidate class="flex min-h-0 flex-1 flex-col" @submit.prevent="save" @keydown.enter="($event.isComposing || composing) && $event.preventDefault()">
            <div class="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
              <div v-if="loadError" ref="errorRef" tabindex="-1" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                <p>{{ loadError }}</p>
                <a-button html-type="button" class="mt-3" @click="retryLoad">重新读取</a-button>
              </div>
              <template v-else>
                <p class="text-sm leading-6 text-slate-500">统一设置所有币种的最低充值价值，默认 100 USDT。保存后按汇率换算各币种最低数量。</p>
                <div>
                  <label for="minimum-deposit-amount" class="mb-2 block text-sm font-semibold text-slate-700">最低充值价值（USDT，必填）</label>
                  <a-input id="minimum-deposit-amount" :ref="el => { inputRef = nativeControl(el) }" v-model:value="draft" type="text" inputmode="decimal" autocomplete="off" required aria-required="true" :aria-invalid="!!fieldError" :aria-describedby="fieldError ? 'minimum-deposit-error' : undefined" :disabled="saving" placeholder="例如 100" @blur="touched = true" @compositionstart="composing = true" @compositionend="composing = false" />
                  <p v-if="fieldError" id="minimum-deposit-error" class="mt-2 text-sm text-rose-700">{{ fieldError }}</p>
                  <p v-if="dirty" class="mt-2 text-xs text-amber-700">有未保存的更改</p>
                </div>
                <div v-if="discard" ref="discardRef" tabindex="-1" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p>更改尚未保存，是否放弃？</p>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <a-button html-type="button" @click="discard = false; inputRef?.focus()">继续编辑</a-button>
                    <a-button html-type="button" @click="discardChanges">放弃更改</a-button>
                  </div>
                </div>
              </template>
            </div>
            <footer class="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <a-button html-type="button" :disabled="saving" @click="requestDialogClose">取消</a-button>
              <a-button :ref="el => { submitRef = nativeControl(el) }" html-type="submit" type="primary" @focus="afterMfaClose" :disabled="!saved || phase !== 'open' || saving" :loading="saving">保存设置</a-button>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
  <MfaVerificationModal :open="mfaOpen" title="MFA 验证" description="修改最低充值金额前，请输入 MFA 验证码" :loading="saving" :error="mfaError" :error-attempt="mfaErrorAttempt" :return-focus="submitRef" @cancel="cancelVerification" @update:open="value => { if (!value) cancelVerification() }" @verify="verifyAndSave" />
</template>

<style scoped>
.minimum-deposit-overlay {
  --dialog-padding-top: max(1rem, env(safe-area-inset-top, 0px));
  --dialog-padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
  padding: var(--dialog-padding-top) max(1rem, env(safe-area-inset-right, 0px)) var(--dialog-padding-bottom) max(1rem, env(safe-area-inset-left, 0px));
}
.minimum-deposit-panel {
  max-height: calc(100vh - var(--dialog-padding-top) - var(--dialog-padding-bottom));
  max-height: calc(100dvh - var(--dialog-padding-top) - var(--dialog-padding-bottom));
}
.minimum-deposit-panel :deep(button) { min-height: 44px; height: auto; white-space: normal; }
.minimum-deposit-panel :deep(input) { min-height: 44px; font-size: 16px; }
.minimum-deposit-close { min-width: 44px; font-size: 24px; }
.minimum-deposit-panel :deep(:focus-visible) { outline: 2px solid #2563eb; outline-offset: 2px; }
.minimum-deposit-enter-active { transition: opacity 200ms ease-out; }
.minimum-deposit-leave-active { transition: opacity 150ms ease-in; }
.minimum-deposit-enter-active .minimum-deposit-panel { transition: transform 200ms ease-out; }
.minimum-deposit-leave-active .minimum-deposit-panel { transition: transform 150ms ease-in; }
.minimum-deposit-enter-from, .minimum-deposit-leave-to { opacity: 0; }
.minimum-deposit-enter-from .minimum-deposit-panel, .minimum-deposit-leave-to .minimum-deposit-panel { transform: scale(.96); }
@media (prefers-reduced-motion: reduce) {
  .minimum-deposit-enter-active, .minimum-deposit-leave-active { transition-duration: 50ms; }
  .minimum-deposit-enter-active .minimum-deposit-panel, .minimum-deposit-leave-active .minimum-deposit-panel { transition: none; }
  .minimum-deposit-enter-from .minimum-deposit-panel, .minimum-deposit-leave-to .minimum-deposit-panel { transform: none; }
}
</style>
