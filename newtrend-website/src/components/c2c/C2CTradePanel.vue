<script setup>
import LineIcon from '../ui/LineIcon.vue'
import {computed,onDeactivated,ref,watch} from 'vue'
import {t} from '../../i18n'
import BottomSheet from '../ui/BottomSheet.vue'
import {useMediaQuery} from '../../composables/useMediaQuery.js'
import C2CQuotes from './C2CQuotes.vue'
import C2COrderForm from './C2COrderForm.vue'
import RequestState from '../ui/RequestState.vue'
import {listC2CQuotes} from '../../api/c2c.js'
import {useRequest} from '../../composables/useRequest.js'
const props=defineProps({side:{type:String,default:'buy'}})
const selected=ref(null)
// Phones (user decision 2026-11-27): tapping a quote opens the order form in a bottom sheet. The one form instance is
// teleported into the sheet (desktop keeps it in the side column), so a resize keeps its input; leaving phone width
// closes the sheet and the form shows in the column again.
const phone=useMediaQuery('(max-width: 767px)')
const sheetOpen=ref(false)
const sheetTitle=computed(()=>selected.value?t(props.side==='sell'?'c2c.order.formTitleSell':'c2c.order.formTitleBuy',{asset:selected.value.symbol}):'')
function select(quote){selected.value=quote;if(phone.value)sheetOpen.value=true}
watch(phone,value=>{if(!value)sheetOpen.value=false})
onDeactivated(()=>{sheetOpen.value=false})
// Quotes for this side (the panel is kept alive per side by C2CBuy); the quote list shows skeletons until loaded.
const quotes=useRequest(()=>listC2CQuotes(props.side),{tags:['c2c']})
</script>
<template>
 <div class="c2c-heading"><div><h1>{{ $t('c2c.pageTitle') }}</h1><p>{{ $t('c2c.subtitle') }}</p></div></div>
 <BottomSheet v-model:open="sheetOpen" :title="sheetTitle" :body-id="'c2c-sheet-'+side" class="c2c-order-sheet"/>
 <div class="c2c-layout"><RequestState v-if="quotes.status.value==='error'" :status="quotes.status.value" :error="quotes.error.value" class="c2c-request-frame" @retry="quotes.refresh"/><C2CQuotes v-else :quotes="quotes.data.value" :skeleton-count="side==='sell'?1:5" :skeleton-note="side==='sell'" :selected="selected?.id" @select="select"/><aside class="c2c-order-panel" :class="{'is-empty':!selected}"><Teleport v-if="selected" defer :to="'#c2c-sheet-'+side" :disabled="!phone"><C2COrderForm :side="side" :quote="selected"/></Teleport><div v-else class="c2c-select-prompt"><LineIcon set="c2c" name="exchange"/><p>{{ $t('c2c.order.selectPrompt') }}</p></div></aside></div>
</template>
