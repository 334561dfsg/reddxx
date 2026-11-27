<script setup>
import { computed, ref } from 'vue'
import BindEmailDialog from '../../components/front/BindEmailDialog.vue'
import BindPhoneDialog from '../../components/front/BindPhoneDialog.vue'
import DepositMfaRecommendDialog from '../../components/front/DepositMfaRecommendDialog.vue'
import SecurityCheckDialog from '../../components/front/SecurityCheckDialog.vue'
import WithdrawInvalidAmountDialog from '../../components/front/WithdrawInvalidAmountDialog.vue'
import WithdrawVerifyCodeDialog from '../../components/front/WithdrawVerifyCodeDialog.vue'

/**
 * 安全与验证：组合前台对话框组件的预览页（直链可达，主导航不展示）。
 */
const popupDemoType = ref('withdraw_invalid_amount')

// --- 提币数量不在范围 ---
const withdrawAmountMin = 10
const withdrawAmountMax = 1000
const amountPopupOpen = ref(false)
const amountActionLog = ref('')

const withdrawAmountMessage = computed(() => {
  return `本次提币数量不符合要求，允许范围为 ${withdrawAmountMin} ~ ${withdrawAmountMax}（包含最小与最大值）。请调整后重试。`
})

function openWithdrawInvalidAmountDialog() {
  amountActionLog.value = ''
  amountPopupOpen.value = true
}

function onWithdrawAmountConfirm() {
  amountActionLog.value = '已继续提币。'
}

function onWithdrawAmountCancel() {
  amountActionLog.value = '已返回修改提币数量。'
}

// --- 充币成功 → MFA 推荐绑定 ---
const simulateMfaBound = ref(false)
const mfaActionLog = ref('')
const mfaDialogOpen = ref(false)

function simulateDepositSuccess() {
  if (simulateMfaBound.value) {
    mfaActionLog.value = '充币已到账。当前账号已绑定 MFA，不再弹出推荐绑定。'
    return
  }
  mfaActionLog.value = ''
  mfaDialogOpen.value = true
}

function onMfaSkip() {
  mfaActionLog.value = '已选择暂不绑定 MFA。'
}

function onMfaBackdrop() {
  mfaActionLog.value = '已关闭弹窗。'
}

function onMfaCompleted() {
  simulateMfaBound.value = true
  mfaActionLog.value = 'MFA 绑定完成。下次充币成功将不再提示；可勾选「未绑定」再次查看推荐流程。'
}

function onMfaSecretCopied() {
  mfaActionLog.value = '已复制密钥。'
}

// --- 提现验证码 ---
const withdrawVerifyOpen = ref(false)
const withdrawVerifyLog = ref('')
const withdrawVerifySummary = '本次提币 · 100 USDT · 手续费 1 USDT'

function openWithdrawVerifyDialog() {
  withdrawVerifyLog.value = ''
  withdrawVerifyOpen.value = true
}

function onWithdrawVerifySubmit(code) {
  withdrawVerifyLog.value = `已提交验证码：${code}。`
}

function onWithdrawVerifyCancel() {
  withdrawVerifyLog.value = '已取消提现验证。'
}

function onWithdrawVerifyBackdrop() {
  withdrawVerifyLog.value = '已通过点击遮罩关闭验证弹窗。'
}

// --- 账号安全：总览 / 单独手机 / 单独邮箱 ---
const securityOpen = ref(false)
const securityLog = ref('')
const secPhoneBound = ref(false)
const secEmailBound = ref(false)
const secMfaBound = ref(false)

const bindPhoneOnlyOpen = ref(false)
const bindEmailOnlyOpen = ref(false)

function openSecurityCheck() {
  securityLog.value = ''
  securityOpen.value = true
}

function openBindPhoneOnly() {
  bindPhoneOnlyOpen.value = true
}

function openBindEmailOnly() {
  bindEmailOnlyOpen.value = true
}

function onSecurityBackdrop() {
  securityLog.value = '已关闭安全检测弹窗。'
}

function logSecurity(msg) {
  securityLog.value = msg
}
</script>

<template>
  <div class="mx-auto min-h-screen w-full max-w-md px-4 py-8 pb-24 text-white md:max-w-3xl md:px-6">
    <header class="mb-8">
      <h1 class="text-2xl font-bold text-white">安全与验证</h1>
      <p class="mt-2 text-sm text-white/60">
        用于联调与预览：提币校验、提现验证码、充币后 MFA 引导、安全总览及手机/邮箱绑定等流程。
      </p>
    </header>

    <section class="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <label class="block text-xs text-white/60">
        选择弹窗类型
        <select
          v-model="popupDemoType"
          class="mt-1.5 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
        >
          <option value="withdraw_invalid_amount">提币：数量不符合范围</option>
          <option value="withdraw_verify_code">提币：安全验证（验证码）</option>
          <option value="deposit_mfa">充币成功：未绑定 MFA 时推荐绑定</option>
          <option value="security_account">账号安全：检测总览 / 手机 / 邮箱</option>
        </select>
      </label>

      <div v-if="popupDemoType === 'withdraw_invalid_amount'" class="mt-4 space-y-3">
        <p class="text-xs text-white/60 leading-relaxed">
          允许范围为
          <span class="font-medium text-lime-200/90">{{ withdrawAmountMin }} ~ {{ withdrawAmountMax }}</span>
          （含边界）。组件：
          <span class="text-white/80">WithdrawInvalidAmountDialog</span>。
        </p>

        <button
          type="button"
          class="w-full rounded-lg bg-lime-400 px-5 py-3 text-sm font-semibold text-black hover:bg-lime-300"
          @click="openWithdrawInvalidAmountDialog"
        >
          展示弹窗提示
        </button>

        <p v-if="amountActionLog" class="text-xs text-white/55">
          {{ amountActionLog }}
        </p>
      </div>

      <div v-else-if="popupDemoType === 'withdraw_verify_code'" class="mt-4 space-y-3">
        <p class="text-xs text-white/60 leading-relaxed">
          组件：<span class="text-white/80">WithdrawVerifyCodeDialog</span>。
        </p>

        <button
          type="button"
          class="w-full rounded-lg bg-lime-400 px-5 py-3 text-sm font-semibold text-black hover:bg-lime-300"
          @click="openWithdrawVerifyDialog"
        >
          打开提现验证弹窗
        </button>

        <p v-if="withdrawVerifyLog" class="text-xs text-white/55">
          {{ withdrawVerifyLog }}
        </p>
      </div>

      <div v-else-if="popupDemoType === 'deposit_mfa'" class="mt-4 space-y-4">
        <p class="text-xs text-white/60 leading-relaxed">
          组件：<span class="text-white/80">DepositMfaRecommendDialog</span>。
        </p>

        <label class="flex cursor-pointer items-center gap-2 text-xs text-white/70">
          <input
            v-model="simulateMfaBound"
            type="checkbox"
            class="h-4 w-4 rounded border-white/25 bg-black/40 text-lime-400"
          />
          模拟账号已绑定 MFA（勾选后仅提示到账，不弹窗）
        </label>

        <button
          type="button"
          class="w-full rounded-lg bg-lime-400 px-5 py-3 text-sm font-semibold text-black hover:bg-lime-300"
          @click="simulateDepositSuccess"
        >
          模拟充币成功
        </button>

        <p v-if="mfaActionLog" class="text-xs text-white/55">
          {{ mfaActionLog }}
        </p>
      </div>

      <div v-else-if="popupDemoType === 'security_account'" class="mt-4 space-y-4">
        <p class="text-xs text-white/60 leading-relaxed">
          安全检测总览整合手机、邮箱与验证器绑定；也可只打开手机或邮箱绑定弹窗。
        </p>

        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            class="rounded-lg bg-lime-400 px-4 py-3 text-sm font-semibold text-black hover:bg-lime-300 sm:flex-1"
            @click="openSecurityCheck"
          >
            打开安全检测总览
          </button>
          <button
            type="button"
            class="rounded-lg border border-white/20 px-4 py-3 text-sm font-medium text-white/85 hover:bg-white/10 sm:flex-1"
            @click="openBindPhoneOnly"
          >
            仅绑定手机
          </button>
          <button
            type="button"
            class="rounded-lg border border-white/20 px-4 py-3 text-sm font-medium text-white/85 hover:bg-white/10 sm:flex-1"
            @click="openBindEmailOnly"
          >
            仅绑定邮箱
          </button>
        </div>

        <label class="flex cursor-pointer items-center gap-2 text-xs text-white/70">
          <input
            v-model="secPhoneBound"
            type="checkbox"
            class="h-4 w-4 rounded border-white/25 bg-black/40 text-lime-400"
          />
          模拟手机已绑定（总览标签）
        </label>
        <label class="flex cursor-pointer items-center gap-2 text-xs text-white/70">
          <input
            v-model="secEmailBound"
            type="checkbox"
            class="h-4 w-4 rounded border-white/25 bg-black/40 text-lime-400"
          />
          模拟邮箱已绑定
        </label>
        <label class="flex cursor-pointer items-center gap-2 text-xs text-white/70">
          <input
            v-model="secMfaBound"
            type="checkbox"
            class="h-4 w-4 rounded border-white/25 bg-black/40 text-lime-400"
          />
          模拟 MFA 已开启
        </label>

        <p v-if="securityLog" class="text-xs text-white/55">
          {{ securityLog }}
        </p>
      </div>
    </section>
  </div>

  <WithdrawInvalidAmountDialog
    v-model="amountPopupOpen"
    :message="withdrawAmountMessage"
    @confirm="onWithdrawAmountConfirm"
    @cancel="onWithdrawAmountCancel"
  />

  <WithdrawVerifyCodeDialog
    v-model="withdrawVerifyOpen"
    :withdraw-summary="withdrawVerifySummary"
    @submit="onWithdrawVerifySubmit"
    @cancel="onWithdrawVerifyCancel"
    @backdrop-cancel="onWithdrawVerifyBackdrop"
  />

  <DepositMfaRecommendDialog
    v-model="mfaDialogOpen"
    @skip="onMfaSkip"
    @completed="onMfaCompleted"
    @backdrop-close="onMfaBackdrop"
    @secret-copied="onMfaSecretCopied"
  />

  <SecurityCheckDialog
    v-model="securityOpen"
    v-model:phone-bound="secPhoneBound"
    v-model:email-bound="secEmailBound"
    v-model:mfa-bound="secMfaBound"
    @backdrop-close="onSecurityBackdrop"
    @phone-send-code="logSecurity('总览：请求发送短信，手机号 ' + $event)"
    @email-send-code="logSecurity('总览：请求发送邮件，' + $event)"
    @mfa-secret-copied="logSecurity('总览：已复制 MFA 密钥')"
  />

  <BindPhoneDialog
    v-model="bindPhoneOnlyOpen"
    @completed="logSecurity('单独手机绑定完成：' + JSON.stringify($event))"
    @send-code="logSecurity('单独手机：请求发送短信，' + $event)"
    @backdrop-close="logSecurity('已关闭绑定手机弹窗')"
  />

  <BindEmailDialog
    v-model="bindEmailOnlyOpen"
    @completed="logSecurity('单独邮箱绑定完成：' + JSON.stringify($event))"
    @send-code="logSecurity('单独邮箱：请求发送邮件，' + $event)"
    @backdrop-close="logSecurity('已关闭绑定邮箱弹窗')"
  />
</template>
