<script setup>
import FeedbackToast from '../../shared/feedback/FeedbackToast.vue'
import { computed, nextTick, ref, watch } from 'vue'
import FrontDarkField from './FrontDarkField.vue'
import FrontLimeButton from './FrontLimeButton.vue'
import FrontPopupCard from './FrontPopupCard.vue'
import FrontPopupShell from './FrontPopupShell.vue'
import FrontStrokeIcon from './FrontStrokeIcon.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'completed', 'backdrop-close'])

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const submitError = ref('')
const success = ref(false)

const minLen = 8
const maxLen = 32

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      nextTick(() => reset())
    } else {
      success.value = false
      submitError.value = ''
    }
  }
)

function reset() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  submitError.value = ''
  success.value = false
}

function close() {
  emit('update:modelValue', false)
}

const newPasswordHint = computed(() => {
  const n = newPassword.value.length
  if (!n) return `建议 ${minLen}–${maxLen} 位，含字母与数字`
  if (n < minLen) return `至少 ${minLen} 位`
  if (n > maxLen) return `最多 ${maxLen} 位`
  if (!/[a-zA-Z]/.test(newPassword.value) || !/\d/.test(newPassword.value)) {
    return '建议同时包含字母与数字'
  }
  return '密码强度良好'
})

const canSubmit = computed(() => {
  if (success.value) return false
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) return false
  if (newPassword.value.length < minLen || newPassword.value.length > maxLen) return false
  if (newPassword.value !== confirmPassword.value) return false
  if (newPassword.value === currentPassword.value) return false
  return true
})

function onSubmit() {
  submitError.value = ''
  if (!currentPassword.value) {
    submitError.value = '请输入当前登录密码'
    return
  }
  if (newPassword.value.length < minLen || newPassword.value.length > maxLen) {
    submitError.value = `新密码长度需在 ${minLen}–${maxLen} 位之间`
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    submitError.value = '两次输入的新密码不一致'
    return
  }
  if (newPassword.value === currentPassword.value) {
    submitError.value = '新密码不能与当前密码相同'
    return
  }
  success.value = true
  emit('completed')
}

defineExpose({ reset })
</script>

<template>
  <FrontPopupShell
    :model-value="modelValue"
    aria-labelledby="change-password-title"
    @update:model-value="emit('update:modelValue', $event)"
    @backdrop-click="emit('backdrop-close')"
  >
    <FrontPopupCard variant="flow" flow-max="720" @click.stop>
      <div class="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 id="change-password-title" class="text-base font-semibold text-white">修改登录密码</h2>
        <button
          type="button"
          class="rounded-lg px-2 py-1.5 text-sm text-white/55 hover:bg-white/10 hover:text-white/85"
          aria-label="关闭"
          @click="close"
        >
          <FrontStrokeIcon name="x" size-class="h-5 w-5" />
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <template v-if="success">
          <FeedbackToast type="success" :source="() => '登录密码已更新，请使用新密码登录。'"/>
          <FrontLimeButton class="mt-5 w-full" @click="close">完成</FrontLimeButton>
        </template>

        <template v-else>
          <p class="text-sm leading-relaxed text-emerald-100/85">
            为保障账户安全，修改前请确认当前环境可信；勿在公共设备上操作。
          </p>

          <FrontDarkField
            v-model="currentPassword"
            class="mt-4"
            label="当前登录密码"
            type="password"
            autocomplete="current-password"
            placeholder="请输入当前密码"
          />

          <div class="mt-4">
            <FrontDarkField
              v-model="newPassword"
              label="新登录密码"
              type="password"
              autocomplete="new-password"
              :maxlength="maxLen"
              placeholder="设置新密码"
            />
            <p class="mt-1 text-xs" :class="newPasswordHint.includes('建议') ? 'text-white/40' : 'text-lime-300/80'">
              {{ newPasswordHint }}
            </p>
          </div>

          <FrontDarkField
            v-model="confirmPassword"
            class="mt-4"
            label="确认新密码"
            type="password"
            autocomplete="new-password"
            :maxlength="maxLen"
            placeholder="再次输入新密码"
          />

          <FeedbackToast v-if="submitError" type="error" :source="() => (submitError) ? (submitError) : ''"/>

          <FrontLimeButton class="mt-5 w-full" :disabled="!canSubmit" @click="onSubmit">
            确认修改
          </FrontLimeButton>
        </template>
      </div>
    </FrontPopupCard>
  </FrontPopupShell>
</template>
