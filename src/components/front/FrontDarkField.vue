<script setup>
import { computed, useAttrs } from 'vue'

/**
 * 深色弹窗内通用表单项：标签 + 输入框（text / otp 大号居中）。
 */
const props = defineProps({
  label: { type: String, default: '' },
  variant: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'otp'].includes(v)
  }
})

defineOptions({ inheritAttrs: false })

const model = defineModel({ type: String, default: '' })

const attrs = useAttrs()

const rootClass = computed(() => attrs.class)
const inputAttrs = computed(() => {
  const { class: _c, ...rest } = attrs
  return rest
})

const inputClass = computed(() => {
  const base =
    'mt-1.5 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-white placeholder:text-white/25 focus:outline-none'
  if (props.variant === 'otp') {
    return `${base} text-center font-mono text-lg tracking-[0.35em]`
  }
  return `${base} text-sm`
})
</script>

<template>
  <label class="block" :class="rootClass">
    <span v-if="label" class="text-xs text-white/50">{{ label }}</span>
    <input v-model="model" :class="inputClass" v-bind="inputAttrs" />
  </label>
</template>
