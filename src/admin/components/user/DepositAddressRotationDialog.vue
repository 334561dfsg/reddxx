<script setup>
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { matchedRouteKey, onBeforeRouteLeave } from 'vue-router'
import MfaVerificationModal from '../MfaVerificationModal.vue'
import { useDialogLifecycle } from '../../composables/useDialogLifecycle.js'
import { depositAddressRotationRepository as repository } from '../../repositories/depositAddressRotationRepository.js'
import { validateDepositEntry } from '../../../features/user-deposit-address/repository.js'

const props = defineProps({ visible: Boolean, user: { type: Object, default: null }, order: { type: Object, default: null }, returnFocus: { type: [Object, Function], default: null } })
const isOrderAddress = row => !!props.order?.toAddress && row.coin === props.order.coin && row.network === props.order.network && row.original === props.order.toAddress
const emit = defineEmits(['close', 'saved'])
const dialogRef = ref(null)
const titleRef = ref(null)
const errorRef = ref(null)
const submitRef = ref(null)
const session = ref(null)
const entries = ref([])
const error = ref('')
const fieldErrors = ref({})
const attempted = ref(false)
const discard = ref(false)
const result = ref(null)
const pending = ref(null)
const mfaOpen = ref(false)
const verifying = ref(false)
const mfaError = ref('')
const mfaErrorAttempt = ref(0)
let disposed = false
let discardAuthorized = false
const dirty = computed(() => !result.value && entries.value.some(row => row.address !== row.original))
const changedCount = computed(() => entries.value.filter(row => row.address.trim() !== row.original).length)
const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.visible), dialogRef, initialFocusRef: titleRef,
  returnFocusRef: computed(() => props.returnFocus), closeDisabled: computed(() => verifying.value || mfaOpen.value),
  requestClose: () => {
    if (dirty.value && !discardAuthorized) { discard.value = true; nextTick(() => errorRef.value?.focus()); return false }
    emit('close')
  }
})
const close = () => requestDialogClose()
const discardChanges = () => { discardAuthorized = true; close(); discardAuthorized = false }
function load() {
  repository.cancel(pending.value)
  entries.value = []; session.value = null; error.value = ''; fieldErrors.value = {}; attempted.value = false
  discard.value = false; result.value = null; pending.value = null
  mfaOpen.value = false; mfaError.value = ''; mfaErrorAttempt.value = 0
  try {
    session.value = repository.open(props.user?.id)
    entries.value = session.value.addresses.map(row => ({ ...row, original: row.address }))
  } catch (failure) { error.value = failure.message }
}
watch(() => props.visible, visible => { if (visible) load() }, { immediate: true })
function validate() {
  if (!attempted.value) return
  fieldErrors.value = Object.fromEntries(entries.value
    .filter(row => row.address.trim() !== row.original)
    .map(row => [row.id, validateDepositEntry(row)]).filter(([, message]) => message))
}
watch(entries, validate, { deep: true })
async function requestVerification() {
  if (phase.value !== 'open' || verifying.value || mfaOpen.value || result.value) return
  attempted.value = true; validate(); error.value = ''
  try {
    pending.value = repository.prepare(session.value, entries.value)
    mfaError.value = ''; mfaErrorAttempt.value = 0; mfaOpen.value = true
  } catch (failure) { error.value = failure.message; await nextTick(); errorRef.value?.focus() }
}
function cancelVerification() {
  if (verifying.value) return
  repository.cancel(pending.value); pending.value = null; mfaOpen.value = false
}
async function verify(code) {
  if (verifying.value || !pending.value) return
  verifying.value = true
  try {
    const saved = await repository.confirm(pending.value, code)
    if (disposed) return
    result.value = saved; mfaOpen.value = false; pending.value = null
    emit('saved', saved)
  } catch (failure) {
    if (disposed) return
    mfaError.value = failure.message; mfaErrorAttempt.value++
  } finally { if (!disposed) verifying.value = false }
}
if (inject(matchedRouteKey, null)) onBeforeRouteLeave(() => {
  if (verifying.value) return false
  return !props.visible || !dirty.value || window.confirm('入金地址尚未保存，确认放弃并离开？')
})
onBeforeUnmount(() => { disposed = true; repository.cancel(pending.value) })
</script>

<template>
  <Teleport to="body">
    <Transition name="address-rotation" appear @after-enter="onAfterEnter" @after-leave="onAfterLeave">
      <div v-if="rendered" class="rotation-overlay fixed inset-0 grid place-items-center bg-slate-950/50" :style="layerStyle">
        <section ref="dialogRef" data-testid="rotation-dialog" role="dialog" aria-modal="true" aria-labelledby="rotation-title" :aria-busy="verifying" class="rotation-panel flex w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div class="min-w-0"><h2 id="rotation-title" ref="titleRef" tabindex="-1" class="text-lg font-semibold text-slate-900">修改入金地址</h2><p class="mt-1 break-all text-sm text-slate-500">{{ user?.username }} · {{ user?.id }}</p></div>
            <button type="button" aria-label="关闭" class="close-button" :disabled="verifying" @click="close">×</button>
          </header>
          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
            <div v-if="discard" ref="errorRef" tabindex="-1" class="rounded-lg bg-amber-50 p-4">
              <h3 class="font-semibold">放弃尚未保存的地址修改？</h3>
              <div class="mt-3 flex flex-wrap gap-2"><button class="secondary" type="button" @click="discard = false; nextTick(() => submitRef?.focus())">继续编辑</button><button class="primary" type="button" @click="discardChanges">放弃修改</button></div>
            </div>
            <template v-else-if="result">
              <div role="status" class="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900"><h3 class="font-semibold">修改成功</h3><p class="mt-1">原地址已保留给该用户，公共收款地址已更新。</p></div>
              <div v-for="row in result.addresses" :key="row.coin + row.network" class="space-y-1 border-b border-slate-100 pb-3 text-sm"><h4 class="font-semibold">{{ row.coin }} / {{ row.network }}</h4><p class="break-all text-slate-600">该用户地址：{{ row.userAddress }}</p><p class="break-all text-slate-600">新公共地址：{{ row.publicAddress }}</p></div>
            </template>
            <template v-else>
              <p class="rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-900">修改后，原地址将保留给该用户，新地址用于公共收款。仅更新有改动的项目，历史入金订单不变。</p>
              <p v-if="error" ref="errorRef" tabindex="-1" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ error }}</p>
              <p v-if="session && !entries.length" class="text-sm text-slate-500">暂无启用的公共收款地址，请先在公共收款地址页面配置。</p>
              <div v-for="row in entries" :key="row.id" class="space-y-2">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <label :for="`rotation-${row.id}`" class="block text-sm font-semibold text-slate-800">{{ row.coin }} <span class="font-normal text-slate-500">/ {{ row.network }}</span></label>
                  <span v-if="isOrderAddress(row) && row.address.trim() === row.original" class="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">当前订单使用</span>
                  <span v-if="row.address.trim() !== row.original" class="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">已修改</span>
                </div>
                <input :id="`rotation-${row.id}`" v-model="row.address" :aria-label="`${row.coin} ${row.network} 公共收款地址`" type="text" required autocomplete="off" spellcheck="false" :aria-invalid="!!fieldErrors[row.id]" :aria-describedby="fieldErrors[row.id] ? `rotation-error-${row.id}` : undefined" class="address-input" :class="{ 'address-input--order': isOrderAddress(row) && row.address.trim() === row.original, 'address-input--changed': row.address.trim() !== row.original }" />
                <p v-if="fieldErrors[row.id]" :id="`rotation-error-${row.id}`" class="text-sm text-rose-700">{{ fieldErrors[row.id] }}</p>
                <p v-if="row.address.trim() !== row.original" class="break-all text-xs text-slate-500">该用户将使用原地址：{{ row.original }}</p>
                <p v-if="row.address.trim() !== row.original && session.dedicated.some(own => own.coin === row.coin && own.network === row.network && own.address !== row.original)" class="text-xs text-amber-700">该用户已有专属配置，本次将替换为上方原公共地址。</p>
              </div>
            </template>
          </div>
          <footer class="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
            <template v-if="!discard">
              <span v-if="!result" class="mr-auto text-xs text-slate-500">已修改 {{ changedCount }} 项</span>
              <button v-if="!result" type="button" class="secondary" :disabled="verifying" @click="close">取消</button>
              <button ref="submitRef" type="button" class="primary" :disabled="verifying || phase !== 'open' || (!result && !entries.length)" @click="result ? close() : requestVerification()">{{ result ? '完成' : verifying ? '验证中…' : '确认修改' }}</button>
            </template>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
  <MfaVerificationModal :open="mfaOpen" title="谷歌身份验证" description="验证后将同时保留该用户原地址，并更新公共收款地址。" :loading="verifying" :error="mfaError" :error-attempt="mfaErrorAttempt" :return-focus="submitRef" @cancel="cancelVerification" @update:open="value => { if (!value) cancelVerification() }" @verify="verify" />
</template>

<style scoped>
.rotation-overlay { padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left)); }
.rotation-panel { max-height: calc(100vh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom))); max-height: calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom))); }
.address-input { width: 100%; min-width: 0; min-height: 44px; border: 1px solid #cbd5e1; border-radius: .5rem; padding: .625rem .75rem; font-size: 1rem; }
.address-input--order { border-color: #d97706; background: #fffbeb; color: #78350f; }
.address-input--changed { border-color: #3b82f6; background: #eff6ff; color: #1e3a8a; }
.address-input[aria-invalid="true"] { border-color: #e11d48; background: #fff1f2; color: #881337; }
.address-input[aria-invalid="true"]:focus-visible { outline-color: #e11d48; }
.primary, .secondary { min-height: 44px; border: 1px solid #cbd5e1; border-radius: .5rem; padding: .625rem 1rem; font-size: .875rem; }
.primary { background: #2563eb; color: white; border-color: #2563eb; }
.secondary { background: white; color: #334155; }
.close-button { min-width: 44px; min-height: 44px; font-size: 1.5rem; flex-shrink: 0; border-radius: .5rem; }
button:focus-visible, input:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
button:disabled { opacity: .5; cursor: not-allowed; }
.address-rotation-enter-active { transition: opacity 200ms ease-out; }
.address-rotation-leave-active { transition: opacity 150ms ease-in; }
.address-rotation-enter-active .rotation-panel { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.address-rotation-leave-active .rotation-panel { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.address-rotation-enter-from, .address-rotation-leave-to { opacity: 0; }
.address-rotation-enter-from .rotation-panel, .address-rotation-leave-to .rotation-panel { opacity: 0; transform: scale(.96); }
@media (prefers-reduced-motion: reduce) {
  .address-rotation-enter-active, .address-rotation-leave-active, .address-rotation-enter-active .rotation-panel, .address-rotation-leave-active .rotation-panel { transition-duration: 50ms; }
  .address-rotation-enter-from .rotation-panel, .address-rotation-leave-to .rotation-panel { transform: none; }
}
</style>
