<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import FrontPopupCard from './FrontPopupCard.vue'
import FrontPopupCloseButton from './FrontPopupCloseButton.vue'
import FrontPopupInnerPanel from './FrontPopupInnerPanel.vue'
import FrontPopupShell from './FrontPopupShell.vue'
import FrontStrokeIcon from './FrontStrokeIcon.vue'

/** 多种方式均已绑定时，默认优先使用的验证方式（可与后端用户偏好对齐） */
const DEFAULT_VERIFY_PRIORITY = ['mfa', 'email', 'phone']

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  phoneBound: { type: Boolean, default: false },
  emailBound: { type: Boolean, default: false },
  mfaBound: { type: Boolean, default: false },
  /** withdraw：提币；login：登录成功后二次校验 */
  variant: { type: String, default: 'withdraw' }
})

const emit = defineEmits(['update:modelValue', 'backdrop-close', 'confirmed'])

const otpCode = ref('')
const err = ref('')
const activeMethod = ref('mfa')
const sendState = ref('idle')
const resendCountdown = ref(0)
const otpInputRef = ref(null)

let resendTimer = null

const methodMeta = {
  mfa: { key: 'mfa', label: '验证器', shortLabel: '验证器', icon: 'shield' },
  email: { key: 'email', label: '邮箱验证', shortLabel: '邮箱', icon: 'mail' },
  phone: { key: 'phone', label: '短信验证', shortLabel: '短信', icon: 'smartphone' }
}

const availableMethods = computed(() => {
  const list = []
  if (props.mfaBound) list.push('mfa')
  if (props.emailBound) list.push('email')
  if (props.phoneBound) list.push('phone')
  return list
})

function pickDefaultMethod(available) {
  for (const k of DEFAULT_VERIFY_PRIORITY) {
    if (available.includes(k)) return k
  }
  return available[0] || 'mfa'
}

function clearResendTimer() {
  if (resendTimer != null) {
    clearInterval(resendTimer)
    resendTimer = null
  }
}

function resetResendUi() {
  clearResendTimer()
  resendCountdown.value = 0
  sendState.value = 'idle'
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      otpCode.value = ''
      err.value = ''
      resetResendUi()
      const avail = availableMethods.value
      activeMethod.value = pickDefaultMethod(avail)
      nextTick(() => requestAnimationFrame(() => focusOtpInput()))
    } else {
      resetResendUi()
    }
  }
)

watch(availableMethods, (avail) => {
  if (!props.modelValue) return
  if (!avail.includes(activeMethod.value)) {
    activeMethod.value = pickDefaultMethod(avail)
  }
})

onUnmounted(() => {
  clearResendTimer()
})

function close() {
  emit('update:modelValue', false)
}

function onlyDigits(s, maxLen) {
  const d = String(s || '').replace(/\D/g, '')
  return typeof maxLen === 'number' ? d.slice(0, maxLen) : d
}

function onOtpInput(ev) {
  const t = ev.target
  otpCode.value = onlyDigits(t.value, otpMaxLen)
  t.value = otpCode.value
  err.value = ''
}

const otpMaxLen = 6

const subtitleByMethod = computed(() => {
  const m = activeMethod.value
  const isLogin = props.variant === 'login'
  if (m === 'mfa') {
    return isLogin
      ? '请打开谷歌验证器，输入 6 位动态码以确认本次登录。'
      : '请打开谷歌验证器，输入 6 位动态码以确认本次提币。'
  }
  if (m === 'email') return '验证码将发至您绑定的邮箱；若未收到，可在下方重新获取。'
  return '验证码将发至您绑定的手机；若未收到，可在下方重新获取。'
})

const dialogTitle = computed(() =>
  props.variant === 'login' ? '登录安全验证' : '提币安全认证'
)

const confirmButtonLabel = computed(() =>
  props.variant === 'login' ? '验证并继续' : '验证并确认提币'
)

const fieldLabel = computed(() => {
  if (activeMethod.value === 'mfa') return '谷歌验证器动态码'
  if (activeMethod.value === 'email') return '邮箱验证码'
  return '短信验证码'
})

const showChannelActions = computed(
  () => activeMethod.value === 'email' || activeMethod.value === 'phone'
)

const resendDisabled = computed(() => resendCountdown.value > 0)

const resendButtonLabel = computed(() => {
  if (resendCountdown.value > 0) return `${resendCountdown.value}s 后可重新获取`
  if (sendState.value === 'sent') return '重新获取验证码'
  return '获取验证码'
})

const sendActionIcon = computed(() =>
  activeMethod.value === 'email' ? 'mail' : 'smartphone'
)

const sendSuccessDetail = computed(() =>
  activeMethod.value === 'email'
    ? '我们已向您的绑定邮箱投递验证码。演示环境不会真实发信，接入邮件网关后将显示真实发送结果。'
    : '我们已向您的绑定手机发送短信。演示环境不会真实发送，接入短信网关后将显示真实发送结果。'
)

function startResendCountdown(seconds = 60) {
  clearResendTimer()
  resendCountdown.value = seconds
  resendTimer = window.setInterval(() => {
    resendCountdown.value -= 1
    if (resendCountdown.value <= 0) {
      clearResendTimer()
      resendCountdown.value = 0
    }
  }, 1000)
}

function sendCodeDemo() {
  if (activeMethod.value === 'mfa' || resendDisabled.value) return
  sendState.value = 'sent'
  startResendCountdown(60)
}

function focusOtpInput() {
  otpInputRef.value?.focus()
}

function otpCellClass(index) {
  const len = otpCode.value.length
  const isActive = index === len && len < otpMaxLen
  const isFilled = index < len
  const errored = !!err.value
  return [
    'flex h-[3rem] w-[2.625rem] shrink-0 items-center justify-center rounded-xl border bg-white/[0.03] font-mono text-lg font-semibold tabular-nums text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[border-color,box-shadow,background-color] duration-150 sm:h-[3.25rem] sm:w-11 sm:text-xl',
    isFilled ? 'border-white/22 bg-white/[0.06]' : 'border-white/12',
    isActive && !errored
      ? 'border-lime-400/55 shadow-[0_0_0_1px_rgba(163,230,53,0.35),inset_0_0_20px_rgba(163,230,53,0.06)]'
      : '',
    errored && !isFilled ? 'border-amber-400/35' : '',
    errored && isFilled ? 'border-amber-400/25' : ''
  ]
    .filter(Boolean)
    .join(' ')
}

function selectMethod(key) {
  activeMethod.value = key
  otpCode.value = ''
  err.value = ''
  resetResendUi()
  if (otpInputRef.value) otpInputRef.value.value = ''
}

const methodTabSelectedClass =
  'z-[1] border border-lime-400/45 bg-gradient-to-b from-lime-400/[0.34] via-lime-400/[0.14] to-lime-500/[0.06] text-white'

const methodTabIdleClass =
  'border border-transparent text-white/48 hover:border-white/[0.08] hover:bg-white/[0.06] hover:text-white/85 active:bg-white/[0.08]'

function methodTabClass(key) {
  return activeMethod.value === key ? methodTabSelectedClass : methodTabIdleClass
}

function methodTabIconClass(key) {
  return activeMethod.value === key
    ? 'bg-lime-400/35 text-lime-50'
    : 'bg-white/[0.06] text-white/55 group-hover:bg-white/[0.1] group-hover:text-white/80'
}

function methodTabLabelClass(key) {
  return activeMethod.value === key ? 'text-white' : ''
}

function submit() {
  const code = onlyDigits(otpCode.value, otpMaxLen)
  if (code.length !== otpMaxLen) {
    err.value = `请输入 ${otpMaxLen} 位验证码`
    return
  }
  emit('confirmed', { method: activeMethod.value, code })
  close()
}
</script>

<template>
  <FrontPopupShell
    :model-value="modelValue"
    aria-labelledby="withdraw-auth-title"
    @update:model-value="emit('update:modelValue', $event)"
    @backdrop-click="emit('backdrop-close')"
  >
    <FrontPopupCard variant="shell">
      <FrontPopupInnerPanel max-preset="420" @click.stop>
        <FrontPopupCloseButton @click="close" />
        <div class="px-4 pb-5 pt-5">
          <div class="flex items-start gap-3 pr-8">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lime-400/30 bg-lime-400/12 text-lime-200/95"
              aria-hidden="true"
            >
              <FrontStrokeIcon name="lock" size-class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <h2 id="withdraw-auth-title" class="text-lg font-semibold leading-snug text-white">
                {{ dialogTitle }}
              </h2>
              <p v-if="availableMethods.length" class="mt-1.5 text-xs leading-relaxed text-white/52">
                {{ subtitleByMethod }}
              </p>
              <p v-else class="mt-1.5 text-xs leading-relaxed text-amber-200/85">
                {{
                  variant === 'login'
                    ? '未检测到已绑定的验证方式，请先在安全中心完成绑定。'
                    : '未检测到已绑定的验证方式，请先完成安全绑定后再提币。'
                }}
              </p>
            </div>
          </div>

          <div
            v-if="availableMethods.length > 1"
            class="mt-5"
            role="tablist"
            aria-label="选择验证方式"
          >
            <div
              class="grid gap-1 rounded-2xl border border-white/[0.08] bg-black/30 p-1"
              :class="availableMethods.length === 2 ? 'grid-cols-2' : 'grid-cols-3'"
            >
              <button
                v-for="key in availableMethods"
                :key="key"
                type="button"
                role="tab"
                :aria-selected="activeMethod === key"
                class="group relative flex min-h-[2.75rem] flex-row items-center justify-center gap-2 overflow-hidden rounded-[11px] px-2 py-2 [-webkit-tap-highlight-color:transparent] focus-visible:outline-none sm:min-h-[2.875rem] sm:gap-2.5 sm:px-2.5"
                :class="methodTabClass(key)"
                @click="selectMethod(key)"
              >
                <span
                  v-if="activeMethod === key"
                  class="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent"
                  aria-hidden="true"
                />
                <span
                  class="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  :class="methodTabIconClass(key)"
                  aria-hidden="true"
                >
                  <FrontStrokeIcon :name="methodMeta[key].icon" size-class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <span
                  class="relative min-w-0 truncate text-left text-[11px] font-semibold leading-none tracking-tight sm:text-xs"
                  :class="methodTabLabelClass(key)"
                >
                  {{ methodMeta[key].shortLabel }}
                </span>
              </button>
            </div>
          </div>
          <p
            v-if="availableMethods.length > 1"
            class="mt-2 text-[11px] leading-relaxed text-white/38"
          >
            已绑定多种验证方式时，默认优先使用「验证器」；您也可以切换为邮箱或短信。
          </p>

          <template v-if="availableMethods.length">
            <div
              class="mt-5 rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.05] to-black/35 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            >
              <div class="mb-3">
                <p class="text-[13px] font-medium text-white/75">{{ fieldLabel }}</p>
                <p class="mt-0.5 text-[11px] leading-relaxed text-white/38">
                  点击数字框聚焦输入，支持一次性粘贴 {{ otpMaxLen }} 位验证码。
                </p>
              </div>

              <div
                class="relative -mx-0.5 flex cursor-text justify-center gap-1.5 sm:gap-2"
                role="group"
                aria-label="验证码输入"
                @click="focusOtpInput"
              >
                <div class="pointer-events-none flex justify-center gap-1.5 sm:gap-2">
                  <div
                    v-for="i in otpMaxLen"
                    :key="i"
                    :class="otpCellClass(i - 1)"
                    aria-hidden="true"
                  >
                    {{ otpCode[i - 1] ?? '' }}
                  </div>
                </div>
                <input
                  ref="otpInputRef"
                  :value="otpCode"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  autocomplete="one-time-code"
                  aria-label="请输入验证码"
                  class="absolute inset-0 z-10 h-full w-full cursor-text opacity-0 [-webkit-tap-highlight-color:transparent]"
                  @input="onOtpInput"
                  @focus="err = ''"
                />
              </div>

              <div
                v-if="showChannelActions"
                class="mt-4 border-t border-white/[0.08] pt-4"
              >
                <button
                  type="button"
                  class="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.14] bg-gradient-to-b from-white/[0.07] to-white/[0.02] py-3.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] transition hover:border-lime-400/40 hover:from-lime-400/12 hover:to-lime-400/[0.04] hover:text-lime-50 disabled:cursor-not-allowed disabled:from-white/[0.03] disabled:to-white/[0.02] disabled:text-white/35 disabled:shadow-none"
                  :disabled="resendDisabled"
                  @click="sendCodeDemo"
                >
                  <FrontStrokeIcon
                    :name="sendActionIcon"
                    size-class="h-4 w-4 shrink-0 opacity-90"
                    class="inline-flex"
                  />
                  <span>{{ resendButtonLabel }}</span>
                </button>
                <Transition name="withdraw-send-hint">
                  <div
                    v-if="sendState === 'sent'"
                    class="mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.12] to-emerald-950/[0.15] px-3.5 py-3 text-left shadow-[inset_0_1px_0_0_rgba(52,211,153,0.12)]"
                  >
                    <span
                      class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/25 text-emerald-100"
                      aria-hidden="true"
                    >
                      <FrontStrokeIcon name="check" size-class="h-3.5 w-3.5" />
                    </span>
                    <p class="min-w-0 text-[12px] leading-relaxed text-emerald-100/88">
                      <span class="font-semibold text-emerald-50/95">验证码已发送</span>
                      <span class="mt-1 block text-[11px] leading-relaxed text-emerald-100/70">
                        {{ sendSuccessDetail }}
                      </span>
                    </p>
                  </div>
                </Transition>
              </div>
            </div>

            <p v-if="err" class="mt-3 flex items-center gap-1.5 text-xs text-amber-200/90">
              <span class="inline-flex text-amber-400/90" aria-hidden="true">
                <FrontStrokeIcon name="lightbulb" size-class="h-3.5 w-3.5" />
              </span>
              {{ err }}
            </p>
          </template>

          <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="rounded-lg border border-white/[0.14] bg-white/[0.04] py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/[0.08] sm:px-4"
              @click="close"
            >
              取消
            </button>
            <button
              v-if="availableMethods.length"
              type="button"
              class="rounded-lg bg-lime-400 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 sm:px-5"
              @click="submit"
            >
              {{ confirmButtonLabel }}
            </button>
          </div>
        </div>
      </FrontPopupInnerPanel>
    </FrontPopupCard>
  </FrontPopupShell>
</template>

<style scoped>
.withdraw-send-hint-enter-active {
  transition: opacity 0.22s ease-out, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.withdraw-send-hint-leave-active {
  transition: opacity 0.16s ease-in, transform 0.16s ease-in;
}
.withdraw-send-hint-enter-from,
.withdraw-send-hint-leave-to {
  opacity: 0;
  transform: translateY(0.35rem);
}
</style>
