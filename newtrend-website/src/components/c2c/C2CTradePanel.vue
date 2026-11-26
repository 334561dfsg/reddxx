<script setup>
import LineIcon from '../ui/LineIcon.vue'
import {ref} from 'vue'
import C2CQuotes from './C2CQuotes.vue'
import C2COrderForm from './C2COrderForm.vue'
import RequestState from '../ui/RequestState.vue'
import {listC2CQuotes} from '../../api/c2c.js'
import {useRequest} from '../../composables/useRequest.js'
const props=defineProps({side:{type:String,default:'buy'}})
const selected=ref(null)
// Quotes for this side (the panel is kept alive per side by C2CBuy); the quote list shows skeletons until loaded.
const quotes=useRequest(()=>listC2CQuotes(props.side),{tags:['c2c']})
</script>
<template>
 <div class="c2c-heading"><div><h1>{{ $t('c2c.pageTitle') }}</h1><p>{{ $t('c2c.subtitle') }}</p></div></div>
 <div class="c2c-layout"><RequestState v-if="quotes.status.value==='error'" :status="quotes.status.value" :error="quotes.error.value" class="c2c-request-frame" @retry="quotes.refresh"/><C2CQuotes v-else :quotes="quotes.data.value" :skeleton-count="side==='sell'?1:5" :skeleton-note="side==='sell'" :selected="selected?.symbol" @select="selected=$event"/><aside class="c2c-order-panel" :class="{'is-empty':!selected}"><C2COrderForm v-if="selected" :side="side" :quote="selected"/><div v-else class="c2c-select-prompt"><LineIcon set="c2c" name="exchange"/><p>{{ $t('c2c.order.selectPrompt') }}</p></div></aside></div>
</template>
