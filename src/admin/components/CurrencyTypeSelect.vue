<script setup>
import { computed } from 'vue'
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
  <select :id="id" v-model="valueProxy" class="ant-select !w-32 !h-8">
    <option v-if="includeAll" :value="allValue">{{ allLabel }}</option>
    <option :value="ASSET_CURRENCY_TYPE.VIRTUAL">虚拟币</option>
    <option :value="ASSET_CURRENCY_TYPE.FIAT">法币</option>
    <option :value="ASSET_CURRENCY_TYPE.METAL">贵金属</option>
  </select>
</template>
