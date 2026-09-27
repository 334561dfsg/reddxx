<script setup>
defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    required: true
  },
  placeholder: {
    type: String,
    required: true
  },
  inputMode: {
    type: String,
    default: 'text'
  },
  autocomplete: {
    type: String,
    default: 'off'
  },
  iconPath: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <label class="block">
    <span class="mb-1 block text-sm font-medium text-slate-700">{{ label }}</span>
    <a-input :value="modelValue" :inputmode="inputMode" :autocomplete="autocomplete" :placeholder="placeholder" allow-clear @update:value="emit('update:modelValue', $event)">
      <template #prefix><svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPath" /></svg></template>
    </a-input>
  </label>
</template>
