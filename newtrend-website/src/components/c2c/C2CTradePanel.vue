<script setup>
import {ref} from 'vue'
import C2CQuotes from './C2CQuotes.vue'
import C2COrderForm from './C2COrderForm.vue'
import C2CIcon from './C2CIcon.vue'
defineProps({side:{type:String,default:'buy'}})
const selected=ref(null)
</script>
<template>
 <div class="c2c-heading"><div><h1>{{ $t('c2c.pageTitle') }}</h1><p>{{ $t('c2c.subtitle') }}</p></div></div>
 <div class="c2c-layout"><C2CQuotes :side="side" :selected="selected?.symbol" @select="selected=$event"/><aside class="c2c-order-panel" :class="{'is-empty':!selected}"><C2COrderForm v-if="selected" :side="side" :quote="selected"/><div v-else class="c2c-select-prompt"><C2CIcon name="exchange"/><p>{{ $t('c2c.order.selectPrompt') }}</p></div></aside></div>
</template>
