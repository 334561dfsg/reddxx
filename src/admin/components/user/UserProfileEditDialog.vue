<script setup>
import { computed, nextTick, reactive, ref, watch, onBeforeUnmount } from 'vue'
import { updateProfile, validateProfile } from '../../repositories/userRelationshipRepository.js'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'
import AgentDeliveryCard from '../agent/AgentDeliveryCard.vue'
import { createSalespersonMfa, salespersonDelivery } from '../../../features/user-staff/userMfa.js'
import { generateUserPassword } from '../../../features/user-staff/userCredentials.js'
import { passwordCredential } from '../../../features/user-staff/userStaff.js'
import SelectOnlyCombobox from '../form/SelectOnlyCombobox.vue'
import { getAllowedPhoneDialOptions, getPhoneDialTextLabel, splitPhoneByDial } from '../../utils/phoneDialOptions.js'

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
const delivery = ref(null)
const deliveryRef = ref(null)
const copying = ref(false)
let disposed = false
onBeforeUnmount(() => { disposed = true; delivery.value = null })
const submitError = ref('')
const errors = reactive({})
const form = reactive({ username: '', email: '', phoneDial: '+86', phoneNational: '', isSalesperson: false, remark: '', reason: '' })
const passwordMode = ref('auto')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const isPromotion = computed(() => form.isSalesperson && props.user?.isSalesperson !== true)
const setPasswordMode = (mode) => {
  passwordMode.value = mode
  password.value = mode === 'auto' ? generateUserPassword() : ''
  confirmPassword.value = ''
}
watch(isPromotion, (active) => {
  if (active && !password.value) setPasswordMode('auto')
  if (!active) { password.value = ''; confirmPassword.value = '' }
})
const userId = computed(() => String(props.user?.id ?? props.user?.userId ?? ''))
const dialOptions = computed(() => getAllowedPhoneDialOptions().map((item) => ({
  value: item.dial,
  label: getPhoneDialTextLabel(item)
})))
const phoneErrorId = 'profile-edit-phone-error'
const phoneDialErrorId = 'profile-edit-phone-dial-error'

const resetForm = () => {
  const phoneParts = splitPhoneByDial(props.user?.phone || '', dialOptions.value.map((item) => ({
    dial: item.value,
    label: item.label
  })))
  password.value = ''
  confirmPassword.value = ''
  passwordMode.value = 'auto'
  showPassword.value = false
  delivery.value = null
  copying.value = false
  form.username = props.user?.username || ''
  form.email = props.user?.email || ''
  form.phoneDial = phoneParts.dial
  form.phoneNational = phoneParts.nationalDigits
  form.isSalesperson = props.user?.isSalesperson === true
  if (isPromotion.value) setPasswordMode('auto')
  form.remark = props.user?.remark || ''
  form.reason = ''
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
  closeDisabled: computed(() => submitting.value || copying.value)
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
  if (isPromotion.value) {
    if (password.value.length < 6 || password.value.length > 128) errors.password = '密码须为 6–128 个字符'
    if (passwordMode.value === 'manual' && password.value !== confirmPassword.value) errors.confirmPassword = '两次输入的密码不一致'
  }
  if (form.reason.trim().length > 200) errors.reason = '操作原因不能超过 200 字'
  if (Object.keys(errors).length) {
    submitError.value = '请检查并修正表单中的错误'
    await focusError()
    return
  }

  submitting.value = true
  try {
    const targetId = userId.value
    const values = { ...form }
    const promoted = values.isSalesperson && props.user?.isSalesperson !== true
    const loginPassword = promoted ? password.value : null
    const credential = promoted ? await passwordCredential(loginPassword) : null
    const mfaSetup = promoted ? (props.user?.mfaSetup || await createSalespersonMfa(values.email.trim())) : null
    if (disposed || !props.visible || targetId !== userId.value) return
    const updated = updateProfile(targetId, values, { mfaSetup, passwordCredential: credential })
    if (promoted) delivery.value = salespersonDelivery(updated.email, loginPassword, mfaSetup)
    password.value = ''
    confirmPassword.value = ''
    emit('saved', updated)
    submitting.value = false
    if (delivery.value) { await nextTick(); deliveryRef.value?.focus() } else close()
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
        <section ref="dialogRef" class="profile-dialog-panel flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]" :class="delivery ? 'max-w-2xl' : 'max-w-lg'" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" :aria-busy="submitting">
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div class="min-w-0 flex-1">
              <h2 id="profile-edit-title" class="text-lg font-semibold text-slate-900">{{ delivery ? '业务员设置成功' : '编辑用户资料' }}</h2>
              <p class="mt-1 break-words text-sm text-slate-500">{{ user?.username || '未知用户' }} · UID {{ userId || '—' }}</p>
            </div>
            <button type="button" :disabled="submitting || copying" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40" aria-label="关闭" @click="close">×</button>
          </header>

          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <p v-if="submitError" ref="errorRef" tabindex="-1" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 outline-none" role="alert">{{ submitError }}</p>

            <div v-if="delivery" ref="deliveryRef" tabindex="-1" class="outline-none">
              <AgentDeliveryCard :delivery="delivery" recipient="业务员" title="业务员设置成功，以下信息可发送给业务员" description="请复制账号、新登录密码和 MFA 信息，发送给业务员并设置验证器。" @copying="copying=$event" />
            </div>
            <template v-else>
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

            <fieldset class="min-w-0">
              <legend class="text-sm font-medium text-slate-800">手机号</legend>
              <div class="mt-1.5 grid grid-cols-[minmax(8rem,10rem)_minmax(0,1fr)] gap-3 max-sm:grid-cols-1">
                <SelectOnlyCombobox
                  v-model="form.phoneDial"
                  :options="dialOptions"
                  label="区号"
                  :disabled="submitting || !dialOptions.length"
                  :invalid="Boolean(errors.phoneDial)"
                  :error-id="phoneDialErrorId"
                  id-base="profile-edit-phone-dial"
                />
                <label class="block min-w-0">
                  <span class="mb-1 block text-sm font-medium text-slate-700">手机号码</span>
                  <input
                    v-model="form.phoneNational"
                    :disabled="submitting"
                    type="tel"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    maxlength="24"
                    autocomplete="off"
                    placeholder="不含区号"
                    class="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    :aria-invalid="Boolean(errors.phone)"
                    :aria-describedby="errors.phone ? phoneErrorId : null"
                  />
                </label>
              </div>
              <span v-if="errors.phoneDial" :id="phoneDialErrorId" class="mt-1 block text-xs text-rose-600">{{ errors.phoneDial }}</span>
              <span v-if="errors.phone" :id="phoneErrorId" class="mt-1 block text-xs text-rose-600">{{ errors.phone }}</span>
            </fieldset>

            <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
              <input v-model="form.isSalesperson" :disabled="submitting" type="checkbox" class="h-4 w-4 rounded border-slate-300 accent-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed" />
              是否为业务员
            </label>

            <fieldset v-if="isPromotion" :disabled="submitting" class="space-y-3 rounded-lg border border-slate-200 p-3">
              <legend class="px-1 text-sm font-medium text-slate-800">初始登录密码 <span class="text-rose-500">*</span></legend>
              <div class="flex gap-2">
                <button type="button" :aria-pressed="passwordMode === 'auto'" class="rounded-md border px-3 py-1.5 text-sm" :class="passwordMode === 'auto' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'" @click="setPasswordMode('auto')">自动生成</button>
                <button type="button" :aria-pressed="passwordMode === 'manual'" class="rounded-md border px-3 py-1.5 text-sm" :class="passwordMode === 'manual' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'" @click="setPasswordMode('manual')">手动输入</button>
              </div>
              <label class="block text-sm text-slate-700">
                密码
                <input v-model="password" :readonly="passwordMode === 'auto'" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" maxlength="128" required :aria-invalid="Boolean(errors.password)" aria-describedby="profile-password-hint profile-password-error" class="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <p id="profile-password-error" class="text-xs text-rose-600">{{ errors.password }}</p>
              <label v-if="passwordMode === 'manual'" class="block text-sm text-slate-700">
                确认密码
                <input v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" maxlength="128" required :aria-invalid="Boolean(errors.confirmPassword)" aria-describedby="profile-confirm-password-error" class="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                <span id="profile-confirm-password-error" class="mt-1 block text-xs text-rose-600">{{ errors.confirmPassword }}</span>
              </label>
              <label class="flex items-center gap-2 text-sm text-slate-700"><input v-model="showPassword" type="checkbox" class="h-4 w-4 accent-blue-600" />显示密码</label>
              <p id="profile-password-hint" class="text-xs text-slate-500">6–128 个字符。保存后将更新该用户的登录密码，原密码失效。</p>
            </fieldset>

            <label class="block">
              <span class="text-sm font-medium text-slate-800">操作原因（可选）</span>
              <textarea v-model="form.reason" :disabled="submitting" rows="3" maxlength="200" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" placeholder="请填写为什么编辑用户资料" />
              <span class="mt-1 flex justify-between gap-3 text-xs"><span class="text-rose-600">{{ errors.reason || '' }}</span><span class="text-slate-500">{{ form.reason.length }}/200</span></span>
            </label>
            </template>
          </div>

          <footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
            <button type="button" :disabled="submitting || copying" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40" @click="close">{{ delivery ? '完成' : '取消' }}</button>
            <button v-if="!delivery" type="button" :disabled="submitting || phase !== 'open'" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" @click="submit">{{ submitting ? '保存中…' : '保存资料' }}</button>
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
