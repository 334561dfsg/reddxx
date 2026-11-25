<script setup>
import FeedbackToast from '../../shared/feedback/FeedbackToast.vue'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import FrontDialPicker from '../../components/front/FrontDialPicker.vue'
import { useFrontSiteI18n } from '../../composables/useFrontSiteI18n'
import { useFrontAuthStore } from '../../stores/frontAuth'

const router = useRouter()
const auth = useFrontAuthStore()

const { allowedDialPresets } = useFrontSiteI18n()

const dialOptionsForPicker = computed(() => {
  const list = allowedDialPresets.value
  return list.length ? list : [{ dial: '+86', label: '中国 +86' }]
})

const dialSelectOptions = computed(() =>
  dialOptionsForPicker.value.map((o) => ({ value: o.dial, label: o.label, icon: o.icon })),
)

/** 邮箱验证 | 手机号验证 */
const resetChannel = ref('email')
const email = ref('')
const phoneDial = ref('+86')
const phoneNational = ref('')
const otpCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

watch(dialOptionsForPicker, (opts) => {
  const first = opts[0]?.dial
  if (first && !opts.some((o) => o.dial === phoneDial.value)) {
    phoneDial.value = first
  }
}, { immediate: true })

watch(resetChannel, () => {
  errorMsg.value = ''
  sentHint.value = false
})

const errorMsg = ref('')
const pending = ref(false)
const step = ref('form')
const sentHint = ref(false)
const cooldown = ref(0)
let cooldownTimer = null

function clearCooldownTimer() {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
}

function startCooldown() {
  clearCooldownTimer()
  cooldown.value = 60
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearCooldownTimer()
  }, 1000)
}

onUnmounted(() => {
  clearCooldownTimer()
})

function sendVerificationCode() {
  errorMsg.value = ''
  const pre =
    resetChannel.value === 'email'
      ? auth.validateResetAccountExists({ channel: 'email', email: email.value })
      : auth.validateResetAccountExists({
          channel: 'phone',
          dial: phoneDial.value,
          nationalDigits: phoneNational.value
        })
  if (!pre.ok) {
    errorMsg.value = pre.message
    return
  }
  sentHint.value = true
  startCooldown()
}

async function onSubmit() {
  errorMsg.value = ''
  pending.value = true
  try {
    await Promise.resolve()
    const r = auth.resetPasswordWithVerification({
      channel: resetChannel.value,
      email: email.value,
      dial: phoneDial.value,
      nationalDigits: phoneNational.value,
      code: otpCode.value,
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value
    })
    if (!r.ok) {
      errorMsg.value = r.message
      return
    }
    step.value = 'done'
  } finally {
    pending.value = false
  }
}

function goLogin() {
  router.replace({ name: 'front-login' })
}
</script>

<template>
  <div
    class="relative min-h-[calc(100dvh-3.5rem)] px-4 py-5 lg:min-h-[calc(100vh-3.5rem)] lg:py-6"
  >
    <div
      class="pointer-events-none absolute inset-0 overflow-hidden bg-[#050505]"
      aria-hidden="true"
    >
      <div
        class="absolute -left-1/4 top-0 h-[28rem] w-[28rem] rounded-full bg-lime-400/[0.06] blur-[100px]"
      />
      <div
        class="absolute -right-1/4 bottom-0 h-[24rem] w-[24rem] rounded-full bg-violet-500/[0.07] blur-[90px]"
      />
      <div
        class="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,#050505_55%,#050505_100%)]"
      />
    </div>

    <div class="relative mx-auto w-full max-w-[420px]">
      <div
        class="rounded-2xl border border-white/[0.08] bg-[#0b0e11]/90 p-4 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-md sm:p-5"
      >
        <template v-if="step === 'form'">
          <div class="mb-5 text-center">
            <p
              class="inline-flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/[0.06] px-3 py-1 text-xs font-medium uppercase tracking-wider text-lime-200/90 sm:px-2.5 sm:py-0.5 sm:text-[10px]"
            >
              CryptoX Pro
            </p>
            <h1 class="mt-2 text-xl font-bold tracking-tight text-white">重置密码</h1>
            <p class="mt-1.5 text-sm leading-normal text-white/50 sm:text-[13px] sm:text-white/45">
              选择邮箱或手机号收取验证码，验证通过后设置新密码（演示环境验证码可为任意 6 位数字）。
            </p>
          </div>

          <div
            class="mb-4 flex rounded-xl border border-white/[0.07] bg-black/40 p-1 shadow-inner shadow-black/20"
            role="tablist"
            aria-label="验证方式"
          >
            <button
              type="button"
              role="tab"
              :aria-selected="resetChannel === 'email'"
              class="flex-1 rounded-lg py-2.5 text-sm font-medium transition sm:py-2"
              :class="
                resetChannel === 'email'
                  ? 'bg-white/[0.1] text-lime-200 shadow-sm'
                  : 'text-white/45 hover:text-white/75'
              "
              @click="resetChannel = 'email'"
            >
              邮箱验证
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="resetChannel === 'phone'"
              class="flex-1 rounded-lg py-2.5 text-sm font-medium transition sm:py-2"
              :class="
                resetChannel === 'phone'
                  ? 'bg-white/[0.1] text-lime-200 shadow-sm'
                  : 'text-white/45 hover:text-white/75'
              "
              @click="resetChannel = 'phone'"
            >
              手机号验证
            </button>
          </div>

          <FeedbackToast v-if="errorMsg" type="error" :source="() => (errorMsg) ? (errorMsg) : ''"></FeedbackToast>

          <form class="space-y-3" @submit.prevent="onSubmit">
            <!-- 邮箱一行与区号+手机行均为 2.75rem 控件高，切换 Tab 时不上下伸缩 -->
            <div>
              <div v-if="resetChannel === 'email'">
                <label class="mb-0.5 block text-sm font-medium text-white/55 sm:text-[11px] sm:text-white/45"
                  >注册邮箱</label
                >
                <input
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  required
                  placeholder="name@example.com"
                  class="h-[2.75rem] min-h-[2.75rem] w-full rounded-lg border border-white/[0.1] bg-black/40 px-3 py-0 text-base leading-normal text-white placeholder:text-white/35 focus:border-lime-400/45 focus:outline-none focus:ring-1 focus:ring-lime-400/25 sm:text-sm"
                />
              </div>
              <div v-else>
                <label class="mb-0.5 block text-sm font-medium text-white/55 sm:text-[11px] sm:text-white/45"
                  >手机号码</label
                >
                <div class="flex gap-2 items-stretch">
                  <div class="w-[38%] min-w-[6.75rem] max-w-[10rem] shrink-0">
                    <FrontDialPicker
                      v-model="phoneDial"
                      :options="dialSelectOptions"
                      field-key="front-reset-phone-dial"
                      aria-label="国家或地区区号"
                    />
                  </div>
                  <input
                    v-model="phoneNational"
                    type="tel"
                    inputmode="numeric"
                    autocomplete="tel-national"
                    required
                    placeholder="不含区号的本地号码"
                    class="h-[2.75rem] min-h-[2.75rem] min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-black/40 px-3 py-0 text-base leading-normal text-white placeholder:text-white/35 focus:border-lime-400/45 focus:outline-none focus:ring-1 focus:ring-lime-400/25 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-end gap-2">
              <div class="min-w-0 flex-1">
                <label class="mb-0.5 block text-sm font-medium text-white/55 sm:text-[11px] sm:text-white/45"
                  >验证码</label
                >
                <input
                  v-model="otpCode"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  autocomplete="one-time-code"
                  required
                  placeholder="6 位数字"
                  class="h-[2.75rem] min-h-[2.75rem] w-full rounded-lg border border-white/[0.1] bg-black/40 px-3 py-0 text-base leading-normal text-white placeholder:text-white/35 focus:border-lime-400/45 focus:outline-none focus:ring-1 focus:ring-lime-400/25 sm:text-sm tabular-nums"
                />
              </div>
              <button
                type="button"
                class="h-[2.75rem] min-h-[2.75rem] shrink-0 rounded-lg border border-white/[0.14] bg-white/[0.06] px-3 text-sm font-medium text-lime-200/95 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-45"
                :disabled="cooldown > 0 || pending"
                @click="sendVerificationCode"
              >
                {{ cooldown > 0 ? `${cooldown}s 后重发` : '获取验证码' }}
              </button>
            </div>
            <p v-if="sentHint" class="text-xs leading-relaxed text-lime-300/85">
              演示：验证码已模拟发送，请填写任意 6 位数字完成校验。
            </p>

            <div>
              <label class="mb-0.5 block text-sm font-medium text-white/55 sm:text-[11px] sm:text-white/45"
                >新密码</label
              >
              <input
                v-model="newPassword"
                type="password"
                autocomplete="new-password"
                required
                minlength="6"
                placeholder="至少 6 位"
                class="w-full rounded-lg border border-white/[0.1] bg-black/40 px-3 py-3 text-base text-white placeholder:text-white/35 focus:border-lime-400/45 focus:outline-none focus:ring-1 focus:ring-lime-400/25 sm:py-2 sm:text-sm"
              />
            </div>
            <div>
              <label class="mb-0.5 block text-sm font-medium text-white/55 sm:text-[11px] sm:text-white/45"
                >确认新密码</label
              >
              <input
                v-model="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                minlength="6"
                placeholder="再次输入新密码"
                class="w-full rounded-lg border border-white/[0.1] bg-black/40 px-3 py-3 text-base text-white placeholder:text-white/35 focus:border-lime-400/45 focus:outline-none focus:ring-1 focus:ring-lime-400/25 sm:py-2 sm:text-sm"
              />
            </div>

            <button
              type="submit"
              class="mx-auto mt-1 flex w-full max-w-[16.5rem] items-center justify-center rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-[15rem] sm:py-2"
              :disabled="pending"
            >
              {{ pending ? '提交中…' : '确认重置' }}
            </button>
          </form>

          <p class="mt-5 text-center text-sm text-white/45">
            想起密码了？
            <button
              type="button"
              class="font-medium text-lime-300/95 underline-offset-2 hover:text-lime-200 hover:underline"
              @click="goLogin"
            >
              返回登录
            </button>
          </p>

          <p class="mt-3 text-center text-xs leading-snug text-white/38 sm:text-[9px] sm:text-white/32">
            演示：账号与验证码均为本机模拟 ·
            <code class="rounded bg-white/[0.06] px-1 py-px text-[11px] text-white/55 sm:text-[9px]"
              >frontAuth</code
            >
          </p>
        </template>

        <div v-else class="py-2 text-center">
          <div
            class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-lime-400/15 text-lime-300"
            aria-hidden="true"
          >
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-white">密码已重置</h2>
          <p class="mt-2 text-sm text-white/50">请使用新密码登录账户。</p>
          <button
            type="button"
            class="mx-auto mt-5 flex w-full max-w-[16.5rem] items-center justify-center rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 sm:max-w-[15rem] sm:py-2"
            @click="goLogin"
          >
            去登录
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
