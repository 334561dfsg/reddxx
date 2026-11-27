<script setup>
import { computed, ref, watch } from 'vue'
import FrontPopupCard from './FrontPopupCard.vue'
import FrontPopupCloseButton from './FrontPopupCloseButton.vue'
import FrontPopupShell from './FrontPopupShell.vue'
import FrontStrokeIcon from './FrontStrokeIcon.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '提现安全验证' },
  description: { type: String, default: '为保障资金安全，提现前需完成二次验证。' },
  hint: { type: String, default: '请输入发送到您绑定手机或邮箱的验证码；若已开启验证器，请输入 App 中的动态码。' },
  codeLength: { type: Number, default: 6 },
  /** 如：100 USDT链上提现 */
  withdrawSummary: { type: String, default: '' },
  confirmLabel: { type: String, default: '确认提币' },
  cancelLabel: { type: String, default: '取消' }
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel', 'backdrop-cancel'])

const code = ref('')

const codeOk = computed(() => new RegExp(`^\\d{${props.codeLength}}$`).test(code.value))

watch(
  () => props.modelValue,
  (open) => {
    if (open) code.value = ''
  }
)

function close() {
  emit('update:modelValue', false)
}

function onConfirm() {
  if (!codeOk.value) return
  emit('submit', code.value)
  close()
}

function onCancel() {
  emit('cancel')
  close()
}
</script>

<template>
  <FrontPopupShell
    :model-value="modelValue"
    aria-labelledby="withdraw-verify-dialog-title"
    @update:model-value="emit('update:modelValue', $event)"
    @backdrop-click="emit('backdrop-cancel')"
  >
    <FrontPopupCard variant="padded" @click.stop>
      <FrontPopupCloseButton @click="onCancel" />
      <div class="flex items-start gap-3">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-400/12 text-amber-100"
          aria-hidden="true"
        >
          <FrontStrokeIcon name="check" size-class="h-5 w-5" />
        </div>
        <div class="min-w-0 flex-1 pr-10 sm:pr-11">
          <h3 id="withdraw-verify-dialog-title" class="text-lg font-semibold leading-snug">
            {{ title }}
          </h3>
          <p class="mt-2 text-sm leading-relaxed text-emerald-100/85">
            {{ description }}
          </p>
          <p
            v-if="withdrawSummary"
            class="mt-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white/75"
          >
            {{ withdrawSummary }}
          </p>
        </div>
      </div>

      <p class="mt-4 text-xs leading-relaxed text-white/55">
        {{ hint }}
      </p>

      <label class="mt-4 block">
        <span class="text-xs text-white/50">验证码（{{ codeLength }} 位）</span>
        <input
          v-model="code"
          type="text"
          :inputmode="codeLength <= 6 ? 'numeric' : 'text'"
          :maxlength="codeLength"
          autocomplete="one-time-code"
          :placeholder="'0'.repeat(codeLength)"
          class="mt-1.5 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-center font-mono text-lg tracking-[0.35em] text-white placeholder:text-white/25 focus:outline-none"
          @keydown.enter.prevent="onConfirm"
        />
      </label>

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10"
          @click="onCancel"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          :disabled="!codeOk"
          class="rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
          @click="onConfirm"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </FrontPopupCard>
  </FrontPopupShell>
</template>
