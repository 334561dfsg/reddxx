<script setup>
import { computed, ref, watch } from 'vue'
import FrontBindSuccessState from './FrontBindSuccessState.vue'
import FrontPopupCard from './FrontPopupCard.vue'
import FrontPopupCloseButton from './FrontPopupCloseButton.vue'
import FrontPopupInnerPanel from './FrontPopupInnerPanel.vue'
import FrontPopupShell from './FrontPopupShell.vue'
import FrontStrokeIcon from './FrontStrokeIcon.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 绑定用 TOTP 密钥（由服务端下发） */
  demoSecret: { type: String, default: 'JBSWY3DPEHPK3PXP' }
})

const emit = defineEmits([
  'update:modelValue',
  'skip',
  'completed',
  'backdrop-close',
  'secret-copied'
])

const mfaPhase = ref('prompt')
const mfaBindStep = ref(1)
const mfaOtp = ref('')

const mfaViewKey = computed(() =>
  mfaPhase.value === 'prompt' ? 'prompt' : `bind-${mfaBindStep.value}`
)

const otpValid = computed(() => /^\d{6}$/.test(mfaOtp.value))

function resetMfaFlow() {
  mfaPhase.value = 'prompt'
  mfaBindStep.value = 1
  mfaOtp.value = ''
}

watch(() => props.modelValue, () => {
  resetMfaFlow()
})

function close() {
  emit('update:modelValue', false)
}

function mfaPromptSkip() {
  emit('skip')
  close()
}

function mfaPromptGoBind() {
  mfaPhase.value = 'bind'
  mfaBindStep.value = 1
  mfaOtp.value = ''
}

function mfaBackToPrompt() {
  mfaPhase.value = 'prompt'
  mfaBindStep.value = 1
  mfaOtp.value = ''
}

function mfaBindNext() {
  if (mfaBindStep.value < 3) {
    mfaBindStep.value += 1
  }
}

function mfaBindPrev() {
  if (mfaBindStep.value > 1) {
    mfaBindStep.value -= 1
    mfaOtp.value = ''
  }
}

function copyDemoSecret() {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(props.demoSecret).catch(() => {})
  }
  emit('secret-copied')
}

function submitMfaOtp() {
  if (!otpValid.value) return
  mfaBindStep.value = 3
}

function finishMfaBind() {
  emit('completed')
  close()
}
</script>

<template>
  <FrontPopupShell
    :model-value="modelValue"
    aria-labelledby="mfa-dialog-title"
    @update:model-value="emit('update:modelValue', $event)"
    @backdrop-click="emit('backdrop-close')"
  >
    <FrontPopupCard variant="shell">
      <Transition name="mfa-bind-view" mode="out-in">
        <FrontPopupInnerPanel
          :key="mfaViewKey"
          max-preset="720"
          class="min-h-[min(42vh,320px)]"
          @click.stop
        >
          <FrontPopupCloseButton @click="close" />
          <div class="shrink-0 border-b border-white/10 px-4 pb-3 pt-4">
            <div class="flex items-start gap-3">
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/15 text-sky-200/90"
                aria-hidden="true"
              >
                <FrontStrokeIcon name="lock" size-class="h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1 pr-10 sm:pr-11">
                <p v-if="mfaPhase === 'bind'" class="text-[10px] font-medium uppercase tracking-wider text-white/45">
                  绑定 Google 验证器 · 第 {{ mfaBindStep }} / 3 步
                </p>
                <h3 id="mfa-dialog-title" class="text-lg font-semibold leading-snug">
                  <template v-if="mfaPhase === 'prompt'">建议绑定两步验证</template>
                  <template v-else-if="mfaBindStep === 1">在验证器中添加密钥</template>
                  <template v-else-if="mfaBindStep === 2">确认验证码</template>
                  <template v-else>验证器已启用</template>
                </h3>
              </div>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <template v-if="mfaPhase === 'prompt'">
              <p class="text-sm leading-relaxed text-emerald-100/85">
                检测到你的充币已到账。为保障账号与资金安全，我们强烈建议<b class="font-medium text-white/90">绑定 MFA</b>（使用
                <b class="font-medium text-white/90">Google 验证器</b>等应用生成动态口令）。
              </p>
              <ul class="mt-3 list-inside list-disc space-y-1 text-xs text-white/55">
                <li>降低被盗号后资产被转走的风险</li>
                <li>敏感操作（如提币、改安全设置）时可二次校验</li>
              </ul>
            </template>

            <template v-else-if="mfaBindStep === 1">
              <ol class="space-y-3 text-sm text-emerald-100/88">
                <li>
                  <span class="font-medium text-white/90">1.</span>
                  在手机上安装
                  <span class="text-white/90">Google Authenticator</span>（苹果 App Store / Google Play）。
                </li>
                <li>
                  <span class="font-medium text-white/90">2.</span>
                  打开应用，选择「添加账号」→「扫描二维码」或「输入设置密钥」。
                </li>
              </ol>

              <div class="mt-4 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-5">
                <p class="text-xs text-white/50">使用验证器扫描以下二维码</p>
                <div
                  class="flex h-36 w-36 items-center justify-center rounded-lg border border-white/15 bg-white"
                  role="img"
                  aria-label="Google 验证器绑定二维码"
                >
                  <span class="select-none text-center text-[10px] leading-tight text-neutral-400">
                    QR
                  </span>
                </div>
                <div class="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
                  <p class="text-[10px] uppercase tracking-wide text-white/45">密钥</p>
                  <p class="mt-1 break-all font-mono text-xs text-lime-200/90">
                    {{ demoSecret }}
                  </p>
                  <button
                    type="button"
                    class="mt-2 text-xs font-medium text-sky-300 hover:text-sky-200"
                    @click="copyDemoSecret"
                  >
                    复制密钥
                  </button>
                </div>
              </div>
            </template>

            <template v-else-if="mfaBindStep === 2">
              <p class="text-sm leading-relaxed text-emerald-100/85">
                输入验证器中显示的 <b class="text-white/90">6 位数字</b>，用于确认时间与密钥已正确配置。
              </p>
              <label class="mt-4 block">
                <span class="text-xs text-white/50">验证码</span>
                <input
                  v-model="mfaOtp"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  autocomplete="one-time-code"
                  placeholder="000000"
                  class="mt-1.5 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-center font-mono text-lg tracking-[0.35em] text-white placeholder:text-white/25 focus:outline-none"
                  @keydown.enter.prevent="submitMfaOtp"
                />
              </label>
            </template>

            <template v-else>
              <FrontBindSuccessState primary-label="完成" @primary="finishMfaBind">
                <template #title>Google 验证器已启用</template>
                <template #description>
                  你的账户多了一层动态口令保护。请妥善保管手机与验证器应用；更换设备时请按平台流程迁移或于安全中心重新绑定。
                </template>
              </FrontBindSuccessState>
            </template>
          </div>

          <div
            v-if="mfaPhase === 'prompt' || (mfaPhase === 'bind' && mfaBindStep < 3)"
            class="shrink-0 border-t border-white/10 px-4 pb-5 pt-4"
          >
            <template v-if="mfaPhase === 'prompt'">
              <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  class="rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10"
                  @click="mfaPromptSkip"
                >
                  暂不绑定
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-lime-300"
                  @click="mfaPromptGoBind"
                >
                  去绑定
                </button>
              </div>
            </template>

            <template v-else-if="mfaBindStep === 1">
              <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  class="rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10"
                  @click="mfaBackToPrompt"
                >
                  返回
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-lime-300"
                  @click="mfaBindNext"
                >
                  已添加，下一步
                </button>
              </div>
            </template>

            <template v-else-if="mfaBindStep === 2">
              <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  class="rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10"
                  @click="mfaBindPrev"
                >
                  上一步
                </button>
                <button
                  type="button"
                  :disabled="!otpValid"
                  class="rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
                  @click="submitMfaOtp"
                >
                  验证并继续
                </button>
              </div>
            </template>
          </div>
        </FrontPopupInnerPanel>
      </Transition>
    </FrontPopupCard>
  </FrontPopupShell>
</template>

<style scoped>
.mfa-bind-view-enter-active {
  transition: opacity 0.16s ease-out;
}

.mfa-bind-view-leave-active {
  transition: opacity 0.1s ease-in;
}

.mfa-bind-view-enter-from,
.mfa-bind-view-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .mfa-bind-view-enter-active,
  .mfa-bind-view-leave-active {
    transition-duration: 0.01ms !important;
  }

  .mfa-bind-view-enter-from,
  .mfa-bind-view-leave-to {
    opacity: 1 !important;
  }
}
</style>
