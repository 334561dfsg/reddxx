<script setup>
import { computed, ref, watch } from 'vue'
import FrontDialPicker from './FrontDialPicker.vue'
import FrontBindSuccessState from './FrontBindSuccessState.vue'
import FrontDarkField from './FrontDarkField.vue'
import FrontFlowStepHeader from './FrontFlowStepHeader.vue'
import FrontLimeButton from './FrontLimeButton.vue'
import { useFrontSiteI18n } from '../../composables/useFrontSiteI18n'

/**
 * 绑定手机号流程（无 Teleport，可嵌入安全总览或单独弹窗）。
 * 始终展示国家/地区区号选择 + 本地号码（区号列表来自站点配置 allowedDialCodes）。
 */
const emit = defineEmits(['back', 'completed', 'send-code'])

const { allowedDialPresets } = useFrontSiteI18n()

const dialOptions = computed(() => {
  const list = allowedDialPresets.value
  return list.length ? list : [{ dial: '+86', label: '中国 +86' }]
})

const dialSelectOptions = computed(() =>
  dialOptions.value.map((o) => ({ value: o.dial, label: o.label, icon: o.icon })),
)

const step = ref(1)
const dial = ref('+86')
const phone = ref('')
const smsCode = ref('')

watch(
  dialOptions,
  (opts) => {
    const first = opts[0]?.dial
    if (first && !opts.some((o) => o.dial === dial.value)) {
      dial.value = first
    }
  },
  { immediate: true }
)

const nationalDigits = computed(() => String(phone.value).replace(/\D/g, ''))

const phoneOk = computed(() => {
  const n = nationalDigits.value
  if (dial.value === '+86') {
    return /^1\d{10}$/.test(n)
  }
  return n.length >= 6 && n.length <= 13
})

const codeOk = computed(() => /^\d{6}$/.test(smsCode.value))

function reset() {
  step.value = 1
  dial.value = dialOptions.value[0]?.dial || '+86'
  phone.value = ''
  smsCode.value = ''
}

defineExpose({ reset })

function onBack() {
  if (step.value === 1) {
    emit('back')
    return
  }
  if (step.value === 2) {
    step.value = 1
    smsCode.value = ''
    return
  }
  step.value = 2
}

function maskDisplay() {
  const n = nationalDigits.value
  if (n.length >= 7) {
    return `${n.slice(0, 3)}****${n.slice(-4)}`
  }
  return n
}

function onSendCode() {
  if (!phoneOk.value) return
  emit('send-code', {
    dial: dial.value,
    national: nationalDigits.value,
    display: `${dial.value} ${maskDisplay()}`
  })
  step.value = 2
}

function onConfirmBind() {
  if (!codeOk.value) return
  step.value = 3
}

function onFinish() {
  emit('completed', {
    phone: `${dial.value} ${maskDisplay()}`,
    dial: dial.value,
    national: nationalDigits.value
  })
}
</script>

<template>
  <div class="flex min-h-0 w-full flex-1 flex-col overflow-hidden text-white">
    <FrontFlowStepHeader title="绑定手机号" @back="onBack" />

    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <template v-if="step === 1">
        <p class="text-sm leading-relaxed text-emerald-100/85">
          用于接收安全验证码与异常登录提醒，请选择区号并在右侧填写本人手机号码（不含区号）。
        </p>

        <div class="mt-4">
          <label class="block text-xs font-medium text-white/50">手机号码</label>
          <div class="mt-1.5 flex gap-2 items-stretch">
            <div class="w-[38%] min-w-[6.75rem] max-w-[10rem] shrink-0">
              <FrontDialPicker
                v-model="dial"
                :options="dialSelectOptions"
                field-key="bind-phone-dial"
                aria-label="国家或地区区号"
              />
            </div>
            <input
              v-model="phone"
              type="tel"
              maxlength="16"
              inputmode="numeric"
              autocomplete="tel-national"
              placeholder="不含区号的本地号码"
              class="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 text-sm text-white placeholder:text-white/25 focus:outline-none min-h-[2.75rem] h-[2.75rem]"
            />
          </div>
        </div>
        <FrontLimeButton class="mt-4 w-full" :disabled="!phoneOk" @click="onSendCode">
          获取验证码
        </FrontLimeButton>
      </template>

      <template v-else-if="step === 2">
        <p class="text-sm text-white/70">
          验证码已发送至
          <span class="font-medium text-white/90">{{ `${dial} ${maskDisplay()}` }}</span>
          ，请查收短信并填写验证码。
        </p>
        <FrontDarkField
          v-model="smsCode"
          class="mt-4"
          label="短信验证码"
          variant="otp"
          type="text"
          inputmode="numeric"
          maxlength="6"
          autocomplete="one-time-code"
          placeholder="000000"
          @keydown.enter.prevent="onConfirmBind"
        />
        <FrontLimeButton class="mt-4 w-full" :disabled="!codeOk" @click="onConfirmBind">
          确认绑定
        </FrontLimeButton>
      </template>

      <template v-else>
        <FrontBindSuccessState @primary="onFinish">
          <template #title>手机号绑定成功</template>
          <template #description>
            号码
            <span class="font-medium text-emerald-100/90 tabular-nums">{{
              `${dial} ${maskDisplay()}`
            }}</span>
            已可用于短信验证与账户安全通知。
          </template>
        </FrontBindSuccessState>
      </template>
    </div>
  </div>
</template>
