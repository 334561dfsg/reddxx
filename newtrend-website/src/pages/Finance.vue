<script setup>
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import {products,path,fmt} from '../data'
import {session,openModal} from '../session'
import Coin from '../components/Coin.vue'
import Icon from '../components/Icon.vue'
import EarnCatalog from '../components/earn/EarnCatalog.vue'
import EarnPortfolio from '../components/earn/EarnPortfolio.vue'
import EarnDetail from '../components/earn/EarnDetail.vue'
import EarnIcon from '../components/earn/EarnIcon.vue'
import '../styles/earn-fidelity.css'
const route=useRoute()
const section=computed(()=>route.params.section||'simple'),product=computed(()=>section.value==='simple'&&route.params.id?products.find(p=>p.id===route.params.id):null)
</script>
<template>
<EarnDetail v-if="product" :product="product"/>
<div v-else class="page-wrap finance-page" :class="{'earn-page':['simple','my-earnings'].includes(section),'earn-portfolio-page':section==='my-earnings'}"><nav class="subnav" :aria-label="$t(&quot;earn.nav.ariaLabel&quot;)"><RouterLink :to="path('/earn/simple')"><EarnIcon name="sprout"/>{{ $t("earn.nav.products") }}</RouterLink><RouterLink :to="path('/earn/my-earnings')"><Icon name="coins"/>{{ $t("earn.nav.myEarnings") }}</RouterLink><RouterLink :to="path('/earn/loan')"><EarnIcon name="banknote"/>{{ $t("common.loan") }}</RouterLink><RouterLink :to="path('/earn/loan/my')"><EarnIcon name="receipt"/>{{ $t("earn.nav.myLoans") }}</RouterLink></nav>
<EarnCatalog v-if="section==='simple'"/>
<EarnPortfolio v-else-if="section==='my-earnings'"/>
<template v-else-if="section==='loan'&&!route.params.id"><small class="page-kicker">{{ $t("margin.market.subtitle") }}</small><h1 class="page-title">{{ $t("margin.market.title") }}</h1><p class="page-desc">{{ $t("margin.market.description") }}</p><div class="three-cols section-gap"><div class="card"><div class="coin-label"><Coin symbol="USD"/>{{ $t("USD") }}</div><p class="mini-label section-gap">{{ $t("earn.table.columns.dailyRate") }}</p><strong class="metric">0.10%</strong><dl class="details-list"><dt>{{ $t("margin.market.borrowRange") }}</dt><dd>{{ $t("100 – 100,000 USD") }}</dd><dt>{{ $t("earn.table.columns.term") }}</dt><dd>{{ $t("finance.ui.714306090180Days") }}</dd></dl><button class="primary-button wide-button section-gap" @click="openModal('loan',&quot;margin.market.title&quot;,{name:&quot;finance.ui.usdSecuredLoan&quot;,symbol:'USD',min:100,rate:.1,days:30})">{{ $t("margin.market.borrowCta") }}<Icon name="arrow-right"/></button></div></div></template>
<template v-else><h1 class="page-title">{{ $t(section==='loan'?"earn.nav.myLoans":"earn.nav.myEarnings") }}</h1><div class="card empty"><Icon name="wallet"/><p v-if="!session.subscriptions.length">{{ $t("copytrade.trader.noPositions") }}</p><div v-else v-for="(s,i) in session.subscriptions" :key="i" class="summary-line" style="padding:16px">{{ $t(s.name) }}<b>{{ $t(fmt(s.amount)) }} {{ s.symbol||'USD' }}</b><span class="positive">{{ $t(s.status) }}</span></div><RouterLink class="green-link section-gap" :to="path('/earn/simple')">{{ $t("finance.ui.browseEarnProducts") }}</RouterLink></div></template>
</div></template>
<style scoped>.finance-table{padding:0;overflow:hidden}.finance-table .pill{padding:6px 16px;font-size:0.75rem}.finance-table td{font-size:0.8125rem;padding:20px}.finance-table td:first-child{width:30%}.finance-table h2{font-size:1rem}@media(max-width:900px){.finance-table table,.finance-table tbody{display:block}.finance-table thead{display:none}.finance-table tr{display:grid;grid-template-columns:1fr 1fr;padding:20px;gap:12px;border-bottom:1px solid #ffffff0c}.finance-table td{display:block;padding:0;border:0}.finance-table td:first-child{grid-column:1/-1;width:auto;margin-bottom:8px}.finance-table td[data-label]::before{content:attr(data-label);display:block;font-size:0.6875rem;color:#fff6;margin-bottom:5px}.finance-table td:last-child{grid-column:1/-1;text-align:right}}
</style>
