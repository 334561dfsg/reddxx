<script setup>
import {computed} from 'vue'
import {earnPortfolio} from '../../earnPortfolio'
import {products,fmt} from '../../data'
import {locale} from '../../i18n'
import Coin from '../Coin.vue'
const props=defineProps({holdingId:{type:String,required:true}})
const holding=computed(()=>earnPortfolio.holdings.find(row=>row.id===props.holdingId))
const product=computed(()=>products.find(row=>row.id===holding.value?.productId))
const dates=[['subscribedAt','subscribedAt'],['startedAt','startedAt'],['maturityAt','maturityAt'],['lastAccruedAt','lastAccruedAt'],['nextAccrualLabel','nextAccrualAt']]
const date=value=>new Date(value).toLocaleString(locale.value,{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})
</script>
<template><div v-if="holding" class="portfolio-holding-details"><div class="earn-product-line"><Coin :symbol="holding.symbol"/><div><strong>{{ product.name }}</strong><small>{{ $t('earn.myEarnings.status.'+holding.status) }}</small></div></div><dl><dt>{{ $t('earn.myEarnings.table.principal') }}</dt><dd>{{ fmt(holding.principal) }} {{ holding.symbol }}</dd><dt>{{ $t('earn.myEarnings.summary.accruedReward') }}</dt><dd class="positive">{{ fmt(holding.accrued) }} {{ holding.symbol }}</dd><template v-for="[label,key] in dates" :key="key"><template v-if="holding[key]&&(key!=='nextAccrualAt'||holding.status==='active')"><dt>{{ $t('earn.myEarnings.holdings.'+label) }}</dt><dd><time :datetime="new Date(holding[key]).toISOString()">{{ date(holding[key]) }}</time></dd></template></template></dl><p class="earn-caption">{{ $t('earn.payoutMode.at_end') }}</p></div></template>
<style scoped>.portfolio-holding-details dl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;margin:24px 0;font-size:14px}.portfolio-holding-details dt{color:#fff6}.portfolio-holding-details dd{margin:0;text-align:right;overflow-wrap:anywhere;font:500 12px/20px 'IBM Plex Mono',monospace}</style>
