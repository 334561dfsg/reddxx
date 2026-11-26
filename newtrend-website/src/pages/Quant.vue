<script setup>
import {computed,shallowRef} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {path} from '../data'
import Icon from '../components/Icon.vue'
import Strategy from './Strategy.vue'
import QuantFundCard from '../components/quant/QuantFundCard.vue'
import QuantFundDetail from '../components/quant/QuantFundDetail.vue'
import QuantFundPositions from '../components/quant/QuantFundPositions.vue'
import QuantFundInterestRecords from '../components/quant/QuantFundInterestRecords.vue'
import QuantAmbient from '../components/quant/QuantAmbient.vue'
import {quantFunds} from '../quantFundPortfolio'
import '../styles/quant-fidelity.css'
const route=useRoute(),router=useRouter(),market=shallowRef('all')
const productId=computed(()=>route.params.productId||''),orderId=computed(()=>route.params.orderId||''),section=computed(()=>productId.value||orderId.value?'quant-fund':route.params.section),mine=computed(()=>['mine','positions'].includes(route.params.id)),isFund=computed(()=>section.value==='quant-fund')
const assets=computed(()=>[...new Set(quantFunds.map(p=>p.asset))].sort())
const funds=computed(()=>market.value==='all'?quantFunds:quantFunds.filter(p=>p.asset===market.value))
function openFund(product){router.push(path(`/ai-quant/quant-fund/products/${product.id}`))}
</script>
<template><Strategy v-if="section==='strategy'"/><div v-else class="page-wrap quant-page" :class="section?'quant-sub':'quant-landing'"><QuantAmbient :aurora="isFund&&!productId&&!orderId"/>
<template v-if="!section"><div class="page-hero"><small class="page-kicker">{{ $t("aiQuant.landing.eyebrow") }}</small><h1 class="page-title">{{ $t("aiQuant.landing.title") }}</h1><p class="page-desc">{{ $t("aiQuant.landing.subtitle") }}</p></div><div class="two-cols quant-intro"><div v-for="(kind,i) in [&quot;aiQuant.landing.strategy.name&quot;,&quot;aiQuant.landing.quantFund.name&quot;]" :key="kind" class="card nt-glow-host"><span class="nt-glow glow-quant-channel" :class="{green:i}" aria-hidden="true"></span><div class="coin-label"><Icon :name="i?'shield':'bot'" green/><div><small class="page-kicker">{{ $t(i?"aiQuant.landing.quantFund.kicker":"aiQuant.landing.strategy.kicker") }}</small><h2>{{ $t(kind) }}</h2></div></div><p>{{ $t(i?"aiQuant.landing.quantFund.valueProp":"aiQuant.landing.strategy.valueProp") }}</p><div class="quant-chips"><span class="tag-chip">{{ $t(i?"aiQuant.landing.quantFund.chipA":"aiQuant.landing.strategy.chipA") }}</span> <span class="tag-chip">{{ $t(i?"aiQuant.landing.quantFund.chipB":"aiQuant.landing.strategy.chipB") }}</span></div><RouterLink class="pill primary" :to="path(i?'/ai-quant/quant-fund':'/ai-quant/strategy')">{{ $t(i?"aiQuant.landing.quantFund.browse":"aiQuant.landing.strategy.browse") }} <Icon name="arrow-right"/></RouterLink><RouterLink class="card-footer" :to="path(i?'/ai-quant/quant-fund/positions':'/ai-quant/strategy/mine')"><span>{{ $t(i?"aiQuant.landing.quantFund.mine":"aiQuant.landing.strategy.mine") }}</span><small>{{ $t("quant.ui.private") }}{{ $t(i?"quant.ui.subscriptionsAndInterest":"quant.ui.runningInstances") }}</small></RouterLink></div></div></template>
<QuantFundInterestRecords v-else-if="orderId" :order-id="orderId"/><template v-else><nav class="subnav"><RouterLink :to="path(isFund?'/ai-quant/quant-fund':'/ai-quant/strategy')" :class="{active:Boolean(productId)}"><Icon :name="isFund?'shield':'bot'"/>{{ $t(isFund?"aiQuant.landing.quantFund.name":"aiQuant.nav.strategy") }}</RouterLink><RouterLink :to="path(isFund?'/ai-quant/quant-fund/positions':'/ai-quant/strategy/mine')"><Icon name="briefcase"/>{{ $t(isFund?"aiQuant.landing.quantFund.mine":"aiQuant.landing.strategy.mine") }}</RouterLink></nav>
<QuantFundPositions v-if="mine"/><QuantFundDetail v-else-if="productId" :product-id="productId"/>
<template v-else-if="isFund"><div class="qf-list">
<section class="qf-hero"><div class="qf-hero-glow" aria-hidden="true"></div><div class="qf-hero-copy"><span class="qf-hero-eyebrow"><Icon name="sparkles" green/>{{ $t("aiQuant.quantFund.hero.subtitle") }}</span><h1>{{ $t("aiQuant.quantFund.hero.title") }}</h1><p>{{ $t("aiQuant.quantFund.hero.description") }}</p></div>
<div class="qf-hero-mark" aria-hidden="true"><div class="qf-hero-mark-glow"></div><div class="qf-hero-ring"></div><div class="qf-hero-ring dashed"></div><div class="qf-hero-core"><Icon name="bot" green/></div><div class="qf-hero-badge bottom"><Icon name="shield"/></div><div class="qf-hero-badge top"><Icon name="trending-up-down" green/></div></div></section>
<section class="qf-catalog"><div v-if="assets.length" class="qf-filters" role="group" :aria-label="$t('aiQuant.quantFund.filters.assetAll')"><button type="button" :aria-pressed="market==='all'" :class="{active:market==='all'}" @click="market='all'">{{ $t("aiQuant.quantFund.filters.assetAll") }}</button><button v-for="asset in assets" :key="asset" type="button" :aria-pressed="market===asset" :class="{active:market===asset}" @click="market=asset">{{ asset }}</button></div>
<div class="three-cols qf-grid"><QuantFundCard v-for="f in funds" :key="f.id" :product="f" @open="openFund"/></div></section>
<footer class="qf-disclaimer"><Icon name="shield"/><span>{{ $t("aiQuant.quantFund.hero.disclaimer") }}</span></footer>
</div></template>

</template></div></template>
<style scoped>.strategy-hero{padding:40px 0;gap:10%}.strategy-hero h1{font-size:3.5rem}.strategy-graph{align-self:center;height:380px}.strategy-graph .eyebrow{margin:0}.fund-hero{padding:56px 40px;margin-top:60px}.fund-hero .page-desc{max-width:600px}#templates{scroll-margin-top:90px}@media(max-width:900px){.strategy-hero h1{font-size:2.5rem}.strategy-hero{gap:24px}.strategy-graph{height:300px}.fund-hero{padding:32px;margin-top:30px}}@media(max-width:600px){.strategy-hero h1{font-size:2.25rem}.strategy-hero .two-cols{grid-template-columns:1fr 1fr}.strategy-graph{min-height:260px}.fund-hero{padding:24px}.fund-hero .page-title{font-size:1.75rem}}
</style>
