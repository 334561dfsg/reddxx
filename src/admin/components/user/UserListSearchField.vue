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
    <span class="relative block">
      <input
        :value="modelValue"
        :inputmode="inputMode"
        :autocomplete="autocomplete"
        type="text"
        :placeholder="placeholder"
        class="w-full rounded-lg border border-slate-300 px-4 py-2 pl-10 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        @input="emit('update:modelValue', $event.target.value)"
      />
      <svg
        class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPath"></path>
      </svg>
    </span>
  </label>
</template>
