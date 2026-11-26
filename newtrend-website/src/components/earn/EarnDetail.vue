<script setup>
import LineIcon from '../ui/LineIcon.vue'
import BackLink from '../ui/BackLink.vue'
// Reference detail card glow uses the coin's brand colour at ~33% alpha (USDT measured: #26a17b55).
const COIN_GLOW={USDT:'#26a17b',USDC:'#2775ca',BTC:'#f7931a',ETH:'#627eea',SOL:'#9945ff'}
const coinGlow=symbol=>(COIN_GLOW[symbol]||'#a5ff4a')+'55'
import EarnConditions from './EarnConditions.vue'
import {path,fmt} from '../../data'
import {openModal} from '../../session'
import {quotaPercent} from '../../utils/earnProducts'
import Coin from '../Coin.vue'
import Icon from '../Icon.vue'
import EarnTimeline from './EarnTimeline.vue'
import NotFound from '../../pages/NotFound.vue'
import Skeleton from '../ui/Skeleton.vue'
import RequestState from '../ui/RequestState.vue'
import {computed} from 'vue'
import {getEarnProduct} from '../../api/earn.js'
import {useRequest} from '../../composables/useRequest.js'
const props=defineProps({productId:{type:String,required:true}})
const {data:product,error,status,refresh}=useRequest(()=>getEarnProduct(props.productId),{tags:['earn']})
const notFound=computed(()=>status.value==='error'&&error.value?.code==='notFound')
</script>
<template><NotFound v-if="notFound"/><article v-else class="earn-detail">
<BackLink class="earn-back" :to="path('/earn/simple')">{{ $t('earn.productDetail.back') }}</BackLink>
<RequestState :status="status" :error="error" class="earn-panel" @retry="refresh">
<template #loading>
 <!-- Mirrors the loaded panels (same classes, static titles, measured content heights) so nothing shifts on arrival. -->
 <div class="earn-panel earn-detail-summary"><div class="earn-product-line"><Skeleton width="56px" height="56px" round/><div class="earn-skeleton-lines"><Skeleton width="260px" height="36px"/><Skeleton width="120px" height="16px"/></div></div><div class="earn-skeleton-lines earn-skeleton-end earn-skeleton-rate"><Skeleton width="200px" height="44px"/><Skeleton width="96px" height="14px"/></div></div>
 <section class="earn-panel"><h2><LineIcon set="earn" name="calendar"/>{{ $t('earn.timeline.title') }}</h2><div class="earn-skeleton-timeline"><Skeleton height="68px"/><Skeleton width="45%" height="32px"/></div></section>
 <div class="earn-detail-columns">
  <section class="earn-panel"><h2><Icon name="coins"/>{{ $t('earn.productDetail.groups.rules') }}</h2><div class="earn-skeleton-dl"><template v-for="n in 3" :key="n"><Skeleton width="96px"/><Skeleton width="120px"/></template></div></section>
  <section class="earn-panel"><h2><Icon name="layers"/>{{ $t('earn.productDetail.groups.quota') }}</h2><Skeleton height="6px" class="earn-skeleton-quota"/><Skeleton width="96px" height="14px"/><div class="earn-skeleton-dl"><template v-for="n in 2" :key="n"><Skeleton width="96px"/><Skeleton width="140px"/></template></div></section>
 </div>
 <section class="earn-panel"><h2>{{ $t('earn.productDetail.risk.title') }}</h2><div class="earn-skeleton-lines earn-skeleton-risk"><Skeleton/><Skeleton/><Skeleton width="55%"/></div></section>
 <section class="earn-panel"><h2>{{ $t('lending.requirements') }}</h2><div class="earn-skeleton-lines earn-skeleton-conditions"><Skeleton width="240px"/><Skeleton width="200px" height="12px"/></div></section>
</template>
<div class="earn-panel earn-detail-summary nt-glow-host"><span class="nt-glow glow-earn-detail" :style="{'--glow-color':coinGlow(product.symbol)}" aria-hidden="true"></span><div class="earn-product-line"><Coin :symbol="product.symbol"/><div><div class="earn-title-line"><h1>{{ product.name }}</h1><span v-if="product.hot" class="earn-hot"><LineIcon set="earn" name="flame"/>{{ $t('earn.badge.hot') }}</span></div><p class="earn-caption">{{ product.symbol }} · {{ product.days?$t('common.durationDays',{count:product.days}):$t('earn.tabs.flexible') }}</p></div></div><div class="earn-detail-rate"><div><strong>{{ product.rate.toFixed(4) }}%</strong><span>{{ $t('earn.dailyRate.label') }}</span></div><p class="earn-caption earn-mono">{{ $t('earn.apy.approx',{value:product.apy.toFixed(2)}) }}</p></div></div>
<section class="earn-panel"><h2><LineIcon set="earn" name="calendar"/>{{ $t('earn.timeline.title') }}</h2><EarnTimeline :days="product.days"/></section>
<div class="earn-detail-columns"><section class="earn-panel"><h2><Icon name="coins"/>{{ $t('earn.productDetail.groups.rules') }}</h2><dl><dt>{{ $t('earn.productDetail.keyFacts.min') }}</dt><dd>{{ fmt(product.min) }} {{ product.symbol }}</dd><dt>{{ $t('earn.productDetail.keyFacts.max') }}</dt><dd>{{ fmt(product.max) }} {{ product.symbol }}</dd><dt>{{ $t('earn.productDetail.keyFacts.perUserQuota') }}</dt><dd>{{ product.perUser==null?$t('earn.productDetail.unlimited'):fmt(product.perUser)+' '+product.symbol }}</dd></dl></section>
<section class="earn-panel"><h2><Icon name="layers"/>{{ $t('earn.productDetail.groups.quota') }}</h2><div class="earn-quota" role="progressbar" :aria-label="$t('earn.productDetail.quotaFilled',{percent:quotaPercent(product)})" :aria-valuenow="quotaPercent(product)" aria-valuemin="0" aria-valuemax="100"><span :style="{width:quotaPercent(product)+'%'}"></span></div><p class="earn-caption">{{ $t('earn.productDetail.quotaFilled',{percent:quotaPercent(product)}) }}</p><dl><dt>{{ $t('earn.productDetail.keyFacts.availableQuota') }}</dt><dd>{{ product.remaining }} {{ product.symbol }}</dd><dt>{{ $t('earn.productDetail.keyFacts.totalSubscribed') }}</dt><dd>{{ fmt(product.subscribed) }} {{ product.symbol }}</dd></dl></section></div>
<section class="earn-panel earn-risk"><h2>{{ $t('earn.productDetail.risk.title') }}</h2><ul><li>{{ product.risk }}</li><li>{{ $t('earn.productDetail.risk.notGuaranteed') }}</li><li v-if="product.days">{{ $t('earn.productDetail.risk.earlyRedemption') }}</li></ul></section>
<EarnConditions :product="product"/>
<div class="earn-detail-action"><div><strong class="earn-accent earn-mono">{{ product.rate.toFixed(4) }}%</strong><small>{{ $t('earn.dailyRate.suffix') }} · {{ product.days?$t('common.durationDays',{count:product.days}):$t('earn.tabs.flexible') }} · {{ $t('earn.products.min',{amount:fmt(product.min)+' '+product.symbol}) }}</small></div><button class="earn-buy" @click="openModal('earn-subscribe','earn.subscribe.title',product)">{{ $t('earn.actions.subscribe') }}</button></div>
</RequestState>
</article></template>
<style>
.earn-skeleton-lines{display:grid;gap:8px;min-width:0}.earn-skeleton-end{justify-items:end}
.earn-detail .nt-request-loading>.earn-panel,.earn-detail .nt-request-loading>.earn-detail-columns{margin-bottom:32px}
.earn-detail .nt-request-loading .earn-product-line .earn-skeleton-lines{gap:4px}
.earn-detail .earn-skeleton-rate{height:62px;align-content:center}
.earn-detail .earn-skeleton-timeline{display:grid;gap:16px;margin-top:28px}
.earn-detail .earn-skeleton-dl{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;margin-top:20px;align-items:center}.earn-detail .earn-skeleton-dl .nt-skeleton{height:22.5px}.earn-detail .earn-skeleton-dl .nt-skeleton:nth-child(even){justify-self:end}
.earn-detail .earn-skeleton-quota{margin:20px 0 8px}.earn-detail .earn-skeleton-quota+.nt-skeleton{height:18px}
.earn-detail .earn-skeleton-risk{margin-top:16px;gap:9.5px}.earn-detail .earn-skeleton-risk .nt-skeleton{height:16.8px}
.earn-detail .earn-skeleton-conditions{margin-top:4px;gap:10px}
</style>
