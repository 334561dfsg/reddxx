<script setup>
import {statusLabelKey} from '../../utils/statusLabels.js'
import {dateTime} from '../../utils/format.js'
import {session} from '../../session'
import {computed} from 'vue'
import {fmt} from '../../data'
import Skeleton from '../ui/Skeleton.vue'
import RequestState from '../ui/RequestState.vue'
import {getEarnHolding} from '../../api/earn.js'
import {useRequest} from '../../composables/useRequest.js'
import {locale} from '../../i18n'
import Coin from '../Coin.vue'
const props=defineProps({holdingId:{type:String,required:true}})
const {data:holding,error,status,refresh}=useRequest(()=>getEarnHolding(props.holdingId,session.mode),{tags:['earn']})
const product=computed(()=>holding.value?.product)
const dates=[['subscribedAt','subscribedAt'],['startedAt','startedAt'],['maturityAt','maturityAt'],['lastAccruedAt','lastAccruedAt'],['nextAccrualLabel','nextAccrualAt']]
const date=value=>dateTime(value,locale.value)
</script>
<template><RequestState :status="status" :error="error" @retry="refresh"><template #loading><div class="portfolio-holding-details"><div class="earn-product-line"><Skeleton width="32px" height="32px" round/><div class="holding-skeleton-lines"><Skeleton width="160px"/><Skeleton width="64px" height="12px"/></div></div><div class="holding-skeleton-lines holding-skeleton-list"><Skeleton v-for="n in 6" :key="n"/></div></div></template><div class="portfolio-holding-details"><div class="earn-product-line"><Coin :symbol="holding.symbol"/><div><strong>{{ product.name }}</strong><small>{{ $t(statusLabelKey('earn',holding.status)) }}</small></div></div><dl><dt>{{ $t('earn.myEarnings.table.principal') }}</dt><dd>{{ fmt(holding.principal) }} {{ holding.symbol }}</dd><dt>{{ $t('earn.myEarnings.summary.accruedReward') }}</dt><dd class="positive">{{ fmt(holding.accrued) }} {{ holding.symbol }}</dd><template v-for="[label,key] in dates" :key="key"><template v-if="holding[key]&&(key!=='nextAccrualAt'||holding.status==='active')"><dt>{{ $t('earn.myEarnings.holdings.'+label) }}</dt><dd><time :datetime="new Date(holding[key]).toISOString()">{{ date(holding[key]) }}</time></dd></template></template></dl><p class="earn-caption">{{ $t('earn.payoutMode.at_end') }}</p></div></RequestState></template>
<style scoped>.holding-skeleton-lines{display:grid;gap:8px;min-width:0}.holding-skeleton-list{margin:24px 0;gap:16px}.portfolio-holding-details dl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;margin:24px 0;font-size:14px}.portfolio-holding-details dt{color:#fff6}.portfolio-holding-details dd{margin:0;text-align:right;overflow-wrap:anywhere;font:500 12px/20px 'IBM Plex Mono',monospace}</style>
