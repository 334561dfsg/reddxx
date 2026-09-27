<script setup>
import { computed } from 'vue'
import { Select } from 'ant-design-vue'
import { ASSET_CURRENCY_TYPE } from '../constants/assets'

const props = defineProps({
  id: {
    type: String,
    default: undefined
  },
  modelValue: {
    type: String,
    default: 'all'
  },
  includeAll: {
    type: Boolean,
    default: true
  },
  allLabel: {
    type: String,
    default: '全部币种类型'
  },
  allValue: {
    type: String,
    default: 'all'
  }
})

const emit = defineEmits(['update:modelValue'])

const valueProxy = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<template>
  <Select
    :id="id"
    v-model:value="valueProxy"
    aria-label="币种类型"
    class="w-32"
    :options="[
      ...(includeAll ? [{ value: allValue, label: allLabel }] : []),
      { value: ASSET_CURRENCY_TYPE.VIRTUAL, label: '虚拟币' },
      { value: ASSET_CURRENCY_TYPE.FIAT, label: '法币' },
      { value: ASSET_CURRENCY_TYPE.METAL, label: '贵金属' }
    ]"
  />
</template>
