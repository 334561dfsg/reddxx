<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from 'ant-design-vue'
import { getSiteConfigSnapshot, SITE_CONFIG_STORAGE_KEY } from '../../admin/mock/siteConfig'
import { useFrontSiteI18n } from '../../composables/useFrontSiteI18n'
import FrontDialPicker from '../../components/front/FrontDialPicker.vue'
import WithdrawAuthDialog from '../../components/front/WithdrawAuthDialog.vue'
import FrontPopupShell from '../../components/front/FrontPopupShell.vue'
import FrontPopupCard from '../../components/front/FrontPopupCard.vue'
import FrontPopupCloseButton from '../../components/front/FrontPopupCloseButton.vue'
import {
  FRONT_DEMO_SEED_USERS,
  FRONT_WALLET_LOGIN_PROVIDERS,
  useFrontAuthStore
} from '../../stores/frontAuth'
import { useFrontSecurityStore } from '../../stores/frontSecurity'

const route = useRoute()
const router = useRouter()
const auth = useFrontAuthStore()
const security = useFrontSecurityStore()

const { allowedDialPresets } = useFrontSiteI18n()
const dialOptionsForLogin = computed(() => {
  const list = allowedDialPresets.value
  return list.length ? list : [{ dial: '+86', label: '中国 +86' }]
})

const dialSelectOptions = computed(() =>
  dialOptionsForLogin.value.map((o) => ({ value: o.dial, label: o.label, icon: o.icon })),
)
const loginMode = ref('email')
/** 注册页：邮箱注册 | 手机号注册 */
const registerMode = ref('email')
const phoneDial = ref('+86')
const phoneNational = ref('')

watch(dialOptionsForLogin, (opts) => {
  const first = opts[0]?.dial
  if (first && !opts.some((o) => o.dial === phoneDial.value)) {
    phoneDial.value = first
  }
}, { immediate: true })

const isRegister = computed(
  () => route.name === 'front-register' || route.query.tab === 'register'
)

watch(
  () => isRegister.value,
  (reg) => {
    if (reg) {
      loginMode.value = 'email'
      registerMode.value = 'email'
    }
  }
)

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMsg = ref('')
const pending = ref(false)
const demoPending = ref(false)
const walletPendingKey = ref(null)

const inviteCode = ref('')

const registerOtpCode = ref('')
const registerCooldown = ref(0)
const registerSentHint = ref(false)
let registerCooldownTimer = null

function clearRegisterCooldownTimer() {
  if (registerCooldownTimer) {
    clearInterval(registerCooldownTimer)
    registerCooldownTimer = null
  }
}

function startRegisterCooldown() {
  clearRegisterCooldownTimer()
  registerCooldown.value = 60
  registerCooldownTimer = setInterval(() => {
    registerCooldown.value -= 1
    if (registerCooldown.value <= 0) clearRegisterCooldownTimer()
  }, 1000)
}

function sendRegisterVerificationCode() {
  errorMsg.value = ''
  auth.ensureHydrated()
  const pre =
    registerMode.value === 'email'
      ? auth.validateRegisterVerificationTarget({ channel: 'email', email: email.value })
      : auth.validateRegisterVerificationTarget({
          channel: 'phone',
          dial: phoneDial.value,
          nationalDigits: phoneNational.value
        })
  if (!pre.ok) {
    errorMsg.value = pre.message
    return
  }
  registerSentHint.value = true
  startRegisterCooldown()
}

watch(registerMode, () => {
  errorMsg.value = ''
  registerOtpCode.value = ''
  registerSentHint.value = false
  clearRegisterCooldownTimer()
  registerCooldown.value = 0
  if (!isRegister.value) return
  if (registerMode.value === 'phone') {
    email.value = ''
  } else {
    phoneNational.value = ''
  }
})

/** 简易图形验证码（前端模拟；登录与站点 loginCaptchaEnabled 联动，注册页始终启用） */
const CAPTCHA_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const captchaChallenge = ref('')
const captchaInput = ref('')
const captchaCharStyles = ref([])

function randomCaptchaString(len = 4) {
  let s = ''
  for (let i = 0; i < len; i += 1) {
    s += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]
  }
  return s
}

function regenerateCaptcha() {
  const code = randomCaptchaString(4)
  captchaChallenge.value = code
  captchaInput.value = ''
  captchaCharStyles.value = code.split('').map(() => ({
    transform: `rotate(${Math.random() * 22 - 11}deg) translateY(${Math.random() * 4 - 2}px)`
  }))
}

const loginVerifyOpen = ref(false)
const loginVerifySessionActive = ref(false)
const loginVerifySucceeded = ref(false)

const loginVerifyBindings = computed(() => ({
  phoneBound: security.currentBindings.phoneBound,
  emailBound: security.currentBindings.emailBound,
  mfaBound: security.currentBindings.mfaBound
}))

function navigateAfterAuth() {
  const redir = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return router.replace(redir.startsWith('/front') ? redir : '/front/personal-center')
}

watch(loginVerifyOpen, (open) => {
  if (!open) {
    if (loginVerifySessionActive.value && !loginVerifySucceeded.value) {
      auth.logout()
      errorMsg.value = '需完成安全验证后才能登录'
    }
    loginVerifySessionActive.value = false
    loginVerifySucceeded.value = false
  }
})

function onLoginVerifyConfirmed() {
  loginVerifySucceeded.value = true
  navigateAfterAuth()
}

function maybeStartLoginSecondFactor() {
  security.ensureHydrated()
  if (!security.hasAnyVerifyChannel) {
    navigateAfterAuth()
    return
  }
  loginVerifySessionActive.value = true
  loginVerifySucceeded.value = false
  loginVerifyOpen.value = true
}

const walletProviders = computed(() => {
  const c = getSiteConfigSnapshot()
  const credentialsDisabled = c.emailLoginEnabled === false && c.phoneLoginEnabled === false
  if (c.walletLoginEnabled === false && !credentialsDisabled) return []
  const rows = Array.isArray(c.walletLoginProviders) ? c.walletLoginProviders : []
  const byKey = new Map(rows.map((r) => [r.key, r]))
  return FRONT_WALLET_LOGIN_PROVIDERS.filter((d) => {
    const r = byKey.get(d.key)
    if (!r) return true
    return r.enabled !== false
  }).map((d) => {
    const r = byKey.get(d.key)
    const custom = r && String(r.customLabel || '').trim()
    return { ...d, label: custom || d.label }
  })
})

const walletLoginEnabled = ref(true)
const emailLoginEnabled = ref(true)
const phoneLoginEnabled = ref(true)
const loginCaptchaEnabled = ref(false)
const inviteCodeRequired = ref(false)

/** 登录受站点「登录验证码」开关控制；注册页始终展示图形验证码 */
const showCaptchaBlock = computed(
  () => loginCaptchaEnabled.value || isRegister.value
)

function refreshSiteAuthSettings() {
  const c = getSiteConfigSnapshot()
  emailLoginEnabled.value = c.emailLoginEnabled !== false
  phoneLoginEnabled.value = c.phoneLoginEnabled !== false
  walletLoginEnabled.value =
    (c.emailLoginEnabled === false && c.phoneLoginEnabled === false) || c.walletLoginEnabled !== false
  loginCaptchaEnabled.value = c.loginCaptchaEnabled === true
  inviteCodeRequired.value = c.inviteCodeRequired === true
  if (showCaptchaBlock.value) {
    regenerateCaptcha()
  } else {
    captchaChallenge.value = ''
    captchaInput.value = ''
    captchaCharStyles.value = []
  }
}

const onSiteConfigStorage = (e) => {
  if (e.key === SITE_CONFIG_STORAGE_KEY) refreshSiteAuthSettings()
}

const onAdminSiteConfigUpdated = () => refreshSiteAuthSettings()

const passwordLoginEnabled = computed(() => emailLoginEnabled.value || phoneLoginEnabled.value)
const walletOnlyLogin = computed(
  () => !isRegister.value && !emailLoginEnabled.value && !phoneLoginEnabled.value
)
const showRegisterModeTabs = computed(
  () => isRegister.value && emailLoginEnabled.value && phoneLoginEnabled.value
)
const showLoginModeTabs = computed(
  () => !isRegister.value && emailLoginEnabled.value && phoneLoginEnabled.value
)
const showWalletLoginButton = computed(
  () =>
    !isRegister.value &&
    walletLoginEnabled.value &&
    walletProviders.value.length > 0
)

function syncAuthModesToEnabledMethods() {
  if (emailLoginEnabled.value) {
    if (loginMode.value !== 'phone' || !phoneLoginEnabled.value) loginMode.value = 'email'
    if (registerMode.value !== 'phone' || !phoneLoginEnabled.value) registerMode.value = 'email'
    return
  }
  if (phoneLoginEnabled.value) {
    loginMode.value = 'phone'
    registerMode.value = 'phone'
  }
}

watch([emailLoginEnabled, phoneLoginEnabled], syncAuthModesToEnabledMethods, { immediate: true })

onMounted(() => {
  refreshSiteAuthSettings()
  window.addEventListener('storage', onSiteConfigStorage)
  window.addEventListener('admin-site-config-updated', onAdminSiteConfigUpdated)
})

onUnmounted(() => {
  clearRegisterCooldownTimer()
  window.removeEventListener('storage', onSiteConfigStorage)
  window.removeEventListener('admin-site-config-updated', onAdminSiteConfigUpdated)
})

const walletAccentClass = {
  metamask: 'from-orange-400/90 to-orange-600/80',
  walletconnect: 'from-sky-400/85 to-blue-600/75',
  coinbase: 'from-blue-400/85 to-indigo-600/80',
  okx: 'from-slate-500/85 to-slate-800/80',
  rabby: 'from-lime-400/75 to-teal-600/75'
}

watch(
  () => route.fullPath,
  () => {
    errorMsg.value = ''
  }
)

const demoLoginDefaults = () => {
  const d = FRONT_DEMO_SEED_USERS[0]
  email.value = d.email
  password.value = d.password
}

watch(
  isRegister,
  (reg) => {
    errorMsg.value = ''
    inviteCode.value = ''
    if (reg) {
      const refQ = route.query.ref || route.query.invite
      if (typeof refQ === 'string' && refQ.trim()) {
        inviteCode.value = refQ.trim()
      }
    }
    if (loginCaptchaEnabled.value || reg) {
      regenerateCaptcha()
    } else {
      captchaInput.value = ''
      captchaChallenge.value = ''
      captchaCharStyles.value = []
    }
    if (reg) {
      email.value = ''
      password.value = ''
      confirmPassword.value = ''
      phoneNational.value = ''
      registerMode.value = 'email'
      registerOtpCode.value = ''
      registerSentHint.value = false
      clearRegisterCooldownTimer()
      registerCooldown.value = 0
    } else {
      confirmPassword.value = ''
      registerOtpCode.value = ''
      registerSentHint.value = false
      clearRegisterCooldownTimer()
      registerCooldown.value = 0
      demoLoginDefaults()
    }
  },
  { immediate: true }
)

const title = computed(() => (isRegister.value ? '创建账户' : '欢迎回来'))
const subtitle = computed(() => {
  if (walletOnlyLogin.value) {
    return '使用钱包连接完成登录'
  }
  if (isRegister.value) {
    return registerMode.value === 'phone'
      ? '获取短信验证码后，填写手机号与密码完成注册'
      : '获取邮箱验证码后，填写邮箱与密码完成注册'
  }
  if (loginMode.value === 'phone') {
    return '选择区号并填写手机号与密码'
  }
  if (!walletLoginEnabled.value) {
    return '输入邮箱与密码完成登录'
  }
  return '输入邮箱与密码，或使用下方钱包登录'
})

function authQuery(overrides = {}) {
  const q = { ...route.query }
  delete q.tab
  return { ...q, ...overrides }
}

function switchToLogin() {
  router.replace({ name: 'front-login', query: authQuery() })
}

function switchToRegister() {
  router.replace({ name: 'front-register', query: authQuery() })
}

function goResetPassword() {
  router.push({ name: 'front-reset-password', query: authQuery() })
}

async function onSubmit() {
  if (pending.value || walletPendingKey.value || loginVerifyOpen.value) return
  errorMsg.value = ''
  if (inviteCodeRequired.value && !inviteCode.value.trim()) {
    errorMsg.value = '请填写邀请码'
    return
  }
  if (showCaptchaBlock.value) {
    const a = captchaInput.value.trim().toUpperCase()
    const b = captchaChallenge.value.toUpperCase()
    if (!a || a !== b) {
      errorMsg.value = '图片验证码错误，请重试'
      regenerateCaptcha()
      return
    }
  }
  pending.value = true
  try {
    await Promise.resolve()
    auth.ensureHydrated()
    if (walletOnlyLogin.value) {
      walletPickerOpen.value = true
      return
    }
    if (!isRegister.value && loginMode.value === 'phone') {
      const r = auth.loginWithPhone(phoneDial.value, phoneNational.value, password.value)
      if (!r.ok) {
        errorMsg.value = r.message
        return
      }
      maybeStartLoginSecondFactor()
      return
    }
    if (isRegister.value && registerMode.value === 'phone') {
      const r = auth.registerWithPhone(
        phoneDial.value,
        phoneNational.value,
        password.value,
        confirmPassword.value,
        '',
        registerOtpCode.value
      )
      if (!r.ok) {
        errorMsg.value = r.message
        return
      }
      navigateAfterAuth()
      return
    }
    if (!passwordLoginEnabled.value) {
      errorMsg.value = '当前仅支持钱包登录'
      return
    }
    const r = isRegister.value
      ? auth.register(
          email.value,
          password.value,
          confirmPassword.value,
          '',
          registerOtpCode.value
        )
      : auth.login(email.value, password.value)
    if (!r.ok) {
      errorMsg.value = r.message
      return
    }
    if (isRegister.value) {
      navigateAfterAuth()
      return
    }
    maybeStartLoginSecondFactor()
  } finally {
    pending.value = false
  }
}

const walletPickerOpen = ref(false)

async function onDemoLogin() {
  if (isRegister.value || pending.value || walletPendingKey.value || loginVerifyOpen.value) return
  errorMsg.value = ''
  pending.value = true
  demoPending.value = true
  try {
    auth.ensureHydrated()
    // Only the built-in mock identity uses this direct demo entry.
    const demo = FRONT_DEMO_SEED_USERS[0]
    const result = auth.login(demo.email, demo.password)
    if (!result.ok) {
      errorMsg.value = result.message
      return
    }
    await navigateAfterAuth()
  } catch {
    errorMsg.value = '演示登录失败，请重试'
  } finally {
    pending.value = false
    demoPending.value = false
  }
}

async function onWalletLogin(providerKey) {
  if (pending.value || walletPendingKey.value || loginVerifyOpen.value) return
  errorMsg.value = ''
  walletPendingKey.value = providerKey
  try {
    await Promise.resolve()
    auth.ensureHydrated()
    const r = auth.loginWithMockWallet(providerKey)
    if (!r.ok) {
      errorMsg.value = r.message
      return
    }
    maybeStartLoginSecondFactor()
  } finally {
    walletPendingKey.value = null
  }
}

async function onPickWalletProvider(providerKey) {
  walletPickerOpen.value = false
  await onWalletLogin(providerKey)
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
        <div class="mb-5 text-center">
          <p
            class="inline-flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/[0.06] px-3 py-1 text-xs font-medium uppercase tracking-wider text-lime-200/90 sm:px-2.5 sm:py-0.5 sm:text-[10px]"
          >
            CryptoX Pro
          </p>
          <h1 class="mt-2 text-xl font-bold tracking-tight text-white sm:text-xl">{{ title }}</h1>
          <p class="mt-1.5 text-sm leading-normal text-white/50 sm:mt-1 sm:text-[13px] sm:leading-snug sm:text-white/45">
            {{ subtitle }}
          </p>
        </div>

        <div
          v-if="showRegisterModeTabs"
          class="mb-4 flex rounded-xl border border-white/[0.07] bg-black/40 p-1 shadow-inner shadow-black/20"
          role="tablist"
          aria-label="注册方式"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="registerMode === 'email'"
            class="flex-1 rounded-lg py-2.5 text-sm font-medium transition sm:py-2"
            :class="
              registerMode === 'email'
                ? 'bg-white/[0.1] text-lime-200 shadow-sm'
                : 'text-white/45 hover:text-white/75'
            "
            @click="registerMode = 'email'"
          >
            邮箱注册
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="registerMode === 'phone'"
            class="flex-1 rounded-lg py-2.5 text-sm font-medium transition sm:py-2"
            :class="
              registerMode === 'phone'
                ? 'bg-white/[0.1] text-lime-200 shadow-sm'
                : 'text-white/45 hover:text-white/75'
            "
            @click="registerMode = 'phone'"
          >
            手机号注册
          </button>
        </div>

        <div
          v-if="showLoginModeTabs"
          class="mb-4 flex rounded-xl border border-white/[0.07] bg-black/40 p-1 shadow-inner shadow-black/20"
          role="tablist"
          aria-label="登录方式"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="loginMode === 'email'"
            class="flex-1 rounded-lg py-2.5 text-sm font-medium transition sm:py-2"
            :class="
              loginMode === 'email'
                ? 'bg-white/[0.1] text-lime-200 shadow-sm'
                : 'text-white/45 hover:text-white/75'
            "
            @click="loginMode = 'email'"
          >
            邮箱登录
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="loginMode === 'phone'"
            class="flex-1 rounded-lg py-2.5 text-sm font-medium transition sm:py-2"
            :class="
              loginMode === 'phone'
                ? 'bg-white/[0.1] text-lime-200 shadow-sm'
                : 'text-white/45 hover:text-white/75'
            "
            @click="loginMode = 'phone'"
          >
            手机号登录
          </button>
        </div>

        <p
          v-if="errorMsg"
          class="mb-2 rounded-lg border border-rose-400/25 bg-rose-500/[0.08] px-3 py-2 text-sm text-rose-100/95 sm:px-2.5 sm:py-1.5 sm:text-xs"
          role="alert"
        >
          {{ errorMsg }}
        </p>

        <form v-if="!walletOnlyLogin && passwordLoginEnabled" class="space-y-2" @submit.prevent="onSubmit">
          <!-- 注册：邮箱与手机互斥；区号按钮与输入框均为 2.75rem 高，切换时高度一致，无需额外 min-h（避免块内留白） -->
          <div v-if="isRegister">
            <div v-if="registerMode === 'email'">
              <label class="mb-0.5 block text-sm font-medium text-white/55 sm:text-[11px] sm:text-white/45">邮箱</label>
              <input
                v-model="email"
                type="email"
                autocomplete="email"
                required
                placeholder="name@example.com"
                class="h-[2.75rem] min-h-[2.75rem] w-full rounded-lg border border-white/[0.1] bg-black/40 px-3 py-0 text-base leading-normal text-white placeholder:text-white/35 focus:border-lime-400/45 focus:outline-none focus:ring-1 focus:ring-lime-400/25 sm:text-sm sm:placeholder:text-white/30"
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
                    field-key="front-register-phone-dial"
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
                  class="min-h-[2.75rem] h-[2.75rem] min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-black/40 px-3 py-0 text-base leading-normal text-white placeholder:text-white/35 focus:border-lime-400/45 focus:outline-none focus:ring-1 focus:ring-lime-400/25 sm:text-sm sm:placeholder:text-white/30"
                />
              </div>
            </div>
          </div>

          <div v-if="isRegister" class="space-y-1">
            <div class="flex flex-wrap items-end gap-2">
              <div class="min-w-0 flex-1">
                <label class="mb-0.5 block text-sm font-medium text-white/55 sm:text-[11px] sm:text-white/45">{{
                  registerMode === 'email' ? '邮箱验证码' : '短信验证码'
                }}</label>
                <input
                  v-model="registerOtpCode"
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
                :disabled="registerCooldown > 0 || pending"
                @click="sendRegisterVerificationCode"
              >
                {{ registerCooldown > 0 ? `${registerCooldown}s 后重发` : '获取验证码' }}
              </button>
            </div>
            <p v-if="registerSentHint" class="text-xs leading-snug text-lime-300/85">
              演示：验证码已模拟发送，请填写任意 6 位数字完成校验。
            </p>
          </div>

          <!-- 登录：邮箱与手机互斥，固定区块高度避免切换 Tab 时版面跳动 -->
          <div
            v-if="!isRegister"
            class="min-h-[5.25rem]"
          >
            <div v-if="loginMode === 'email'">
              <label class="mb-0.5 block text-sm font-medium text-white/55 sm:text-[11px] sm:text-white/45">邮箱</label>
              <input
                v-model="email"
                type="email"
                autocomplete="email"
                required
                placeholder="name@example.com"
                class="h-[2.75rem] min-h-[2.75rem] w-full rounded-lg border border-white/[0.1] bg-black/40 px-3 py-0 text-base leading-normal text-white placeholder:text-white/35 focus:border-lime-400/45 focus:outline-none focus:ring-1 focus:ring-lime-400/25 sm:text-sm sm:placeholder:text-white/30"
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
                    field-key="front-auth-phone-dial"
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
                  class="min-h-[2.75rem] h-[2.75rem] min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-black/40 px-3 py-0 text-base leading-normal text-white placeholder:text-white/35 focus:border-lime-400/45 focus:outline-none focus:ring-1 focus:ring-lime-400/25 sm:text-sm sm:placeholder:text-white/30"
                />
              </div>
            </div>
          </div>

          <div>
            <label class="mb-0.5 block text-sm font-medium text-white/55 sm:text-[11px] sm:text-white/45">密码</label>
            <input
              v-model="password"
              type="password"
              :autocomplete="isRegister ? 'new-password' : 'current-password'"
              required
              minlength="6"
              placeholder="至少 6 位"
              class="w-full rounded-lg border border-white/[0.1] bg-black/40 px-3 py-3 text-base text-white placeholder:text-white/35 focus:border-lime-400/45 focus:outline-none focus:ring-1 focus:ring-lime-400/25 sm:py-2 sm:text-sm sm:placeholder:text-white/30"
            />
            <div v-if="!isRegister" class="mt-1.5 flex justify-end">
              <button
                type="button"
                class="text-xs font-medium text-lime-300/90 underline-offset-2 hover:text-lime-200 hover:underline sm:text-[13px]"
                @click="goResetPassword"
              >
                忘记密码？
              </button>
            </div>
          </div>

          <div v-if="isRegister">
            <label class="mb-0.5 block text-sm font-medium text-white/55 sm:text-[11px] sm:text-white/45"
              >确认密码</label
            >
            <input
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              minlength="6"
              placeholder="再次输入"
              class="w-full rounded-lg border border-white/[0.1] bg-black/40 px-3 py-3 text-base text-white placeholder:text-white/35 focus:border-lime-400/45 focus:outline-none focus:ring-1 focus:ring-lime-400/25 sm:py-2 sm:text-sm sm:placeholder:text-white/30"
            />
          </div>

          <div v-if="showCaptchaBlock && captchaChallenge" class="space-y-1.5">
            <label class="mb-0.5 block text-sm font-medium text-white/55 sm:text-[11px] sm:text-white/45"
              >图片验证码</label
            >
            <div class="flex flex-row items-stretch gap-2">
              <div class="flex shrink-0 items-stretch gap-1.5 sm:gap-2">
                <div
                  class="relative flex h-[2.75rem] w-[6.75rem] shrink-0 items-center justify-center gap-0.5 overflow-hidden rounded-lg border border-white/[0.12] bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(0,0,0,0.35)_100%)] px-2 font-mono text-base font-bold tracking-[0.18em] text-white/95 sm:w-[7.25rem] sm:text-lg sm:tracking-[0.2em]"
                  aria-hidden="true"
                >
                  <span
                    v-for="(ch, i) in captchaChallenge"
                    :key="`${captchaChallenge}-${i}`"
                    class="inline-block select-none"
                    :style="captchaCharStyles[i] || {}"
                  >{{ ch }}</span>
                </div>
                <button
                  type="button"
                  class="flex h-[2.75rem] w-[2.75rem] shrink-0 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.06] text-white/80 transition hover:bg-white/[0.1] hover:text-white"
                  aria-label="刷新验证码"
                  title="刷新验证码"
                  @click="regenerateCaptcha"
                >
                  <svg
                    class="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.85"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                </button>
              </div>
              <input
                v-model="captchaInput"
                type="text"
                autocomplete="off"
                maxlength="8"
                placeholder="右侧输入，不区分大小写"
                class="h-[2.75rem] min-h-[2.75rem] min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-black/40 px-3 py-0 text-base leading-normal text-white placeholder:text-white/35 focus:border-lime-400/45 focus:outline-none focus:ring-1 focus:ring-lime-400/25 sm:text-sm sm:placeholder:text-white/30"
              />
            </div>
          </div>

          <div v-if="isRegister || inviteCodeRequired">
            <label class="mb-0.5 block text-sm font-medium text-white/55 sm:text-[11px] sm:text-white/45"
              >邀请码</label
            >
            <input
              v-model="inviteCode"
              type="text"
              autocomplete="off"
              :required="inviteCodeRequired"
              :placeholder="
                inviteCodeRequired
                  ? '请输入邀请码'
                  : '邀请码 / 推荐码（选填，可从推广链接带入）'
              "
              class="w-full rounded-lg border border-white/[0.1] bg-black/40 px-3 py-3 text-base text-white placeholder:text-white/35 focus:border-lime-400/45 focus:outline-none focus:ring-1 focus:ring-lime-400/25 sm:py-2 sm:text-sm sm:placeholder:text-white/30"
            />
          </div>

          <button
            type="submit"
            class="mx-auto flex w-full max-w-[16.5rem] items-center justify-center rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-[15rem] sm:py-2 sm:text-sm"
            :disabled="pending || Boolean(walletPendingKey)"
          >
            {{
              pending
                ? '请稍候…'
                : isRegister
                  ? '注册并登录'
                  : '登录'
            }}
          </button>
        </form>

        <div v-if="!isRegister" class="mt-3">
          <Button
            block
            size="large"
            html-type="button"
            :loading="demoPending"
            :disabled="pending || Boolean(walletPendingKey) || loginVerifyOpen"
            @click="onDemoLogin"
          >
            {{ demoPending ? '演示账号登录中…' : '演示账号' }}
          </Button>
        </div>

        <template v-if="showWalletLoginButton">
          <div v-if="!walletOnlyLogin" class="relative my-3">
            <div class="absolute inset-0 flex items-center" aria-hidden="true">
              <div class="w-full border-t border-white/[0.06]"></div>
            </div>
            <div class="relative flex justify-center">
              <span class="bg-[#0b0e11] px-2 text-xs text-white/40 sm:text-[10px] sm:text-white/35">或</span>
            </div>
          </div>
          <button
            type="button"
            class="mx-auto flex w-full max-w-[16.5rem] items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-black/35 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white/[0.18] hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[15rem] sm:py-2 sm:text-sm"
            :disabled="pending || Boolean(walletPendingKey)"
            @click="walletPickerOpen = true"
          >
            <svg
              class="h-4 w-4 shrink-0 text-white/80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
            钱包登录
          </button>
        </template>

        <p
          v-if="!isRegister && passwordLoginEnabled"
          class="mt-5 text-center text-sm text-white/45"
        >
          还没有账号？
          <button
            type="button"
            class="font-medium text-lime-300/95 underline-offset-2 hover:text-lime-200 hover:underline"
            @click="switchToRegister"
          >
            注册
          </button>
        </p>
        <p
          v-else
          class="mt-5 text-center text-sm text-white/45"
        >
          已有账号？
          <button
            type="button"
            class="font-medium text-lime-300/95 underline-offset-2 hover:text-lime-200 hover:underline"
            @click="switchToLogin"
          >
            登录
          </button>
        </p>

        <!-- <p class="mt-3 text-center text-xs leading-snug text-white/38 sm:text-[9px] sm:text-white/32">
          演示：钱包未接真实扩展；账号仅存本机 ·
          <code class="rounded bg-white/[0.06] px-1 py-px text-[11px] text-white/55 sm:text-[9px] sm:text-white/45"
            >frontAuth</code
          >
        </p> -->
      </div>
    </div>

    <WithdrawAuthDialog
      v-model="loginVerifyOpen"
      variant="login"
      :phone-bound="loginVerifyBindings.phoneBound"
      :email-bound="loginVerifyBindings.emailBound"
      :mfa-bound="loginVerifyBindings.mfaBound"
      @confirmed="onLoginVerifyConfirmed"
    />

    <FrontPopupShell
      v-model="walletPickerOpen"
      ariaLabelledby="wallet-picker-title"
      close-on-backdrop
    >
      <FrontPopupCard variant="padded" class="relative" @click.stop>
        <FrontPopupCloseButton @click="walletPickerOpen = false" />
        <h2 id="wallet-picker-title" class="pr-10 text-lg font-semibold tracking-tight text-white">
          选择钱包
        </h2>
        <p class="mt-1 text-xs leading-relaxed text-white/45">
          以下为演示环境可用的钱包入口；未连接真实链上扩展。
        </p>
        <ul class="mt-4 max-h-[min(52vh,22rem)] space-y-2 overflow-y-auto pr-0.5" role="listbox" aria-label="钱包列表">
          <li v-for="p in walletProviders" :key="p.key">
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5 text-left transition hover:border-white/[0.14] hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
              :title="`${p.label} · ${p.mockAddress.slice(0, 8)}…`"
              :disabled="pending || Boolean(walletPendingKey)"
              role="option"
              @click="onPickWalletProvider(p.key)"
            >
              <span
                class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br shadow-inner"
                :class="walletAccentClass[p.key] || 'from-white/20 to-white/5'"
                aria-hidden="true"
              >
                <svg
                  class="h-[17px] w-[17px] text-white opacity-95"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-medium text-white/90">{{ p.label }}</span>
                <span class="mt-0.5 block truncate font-mono text-[11px] text-white/35">{{ p.mockAddress }}</span>
              </span>
              <span
                v-if="walletPendingKey === p.key"
                class="shrink-0 text-xs text-lime-300/95"
              >连接中…</span>
            </button>
          </li>
        </ul>
      </FrontPopupCard>
    </FrontPopupShell>
  </div>
</template>
