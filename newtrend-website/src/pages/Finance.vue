<script setup>
import ChannelSectionSwitch from '../components/ui/ChannelSectionSwitch.vue'
import NotFound from './NotFound.vue'
import QuantAmbient from '../components/quant/QuantAmbient.vue'
import {computed} from 'vue'
import LendingPanel from '../components/lending/LendingPanel.vue'
import {useRoute} from 'vue-router'
import {path} from '../data'
import {t} from '../i18n'
import EarnCatalog from '../components/earn/EarnCatalog.vue'
import EarnPortfolio from '../components/earn/EarnPortfolio.vue'
import EarnDetail from '../components/earn/EarnDetail.vue'
import FinanceLanding from '../components/finance/FinanceLanding.vue'
import '../styles/earn-fidelity.css'
import '../styles/finance-layout.css'
const route=useRoute()
const section=computed(()=>route.params.section||'simple'),productId=computed(()=>section.value==='simple'?route.params.id||null:null)
// Each Finance module keeps its own two entries; Earn and Loan are no longer mixed in one bar.
const sections=computed(()=>section.value==='loan'?[
 {to:path('/earn/loan'),label:t('common.loan'),icon:'banknote',iconSet:'lending'},
 {to:path('/earn/loan/my'),label:t('earn.nav.myLoans'),icon:'wallet',iconSet:'lending'},
]:[
 {to:path('/earn/simple'),label:t('earn.nav.products'),icon:'sprout',iconSet:'earn'},
 {to:path('/earn/my-earnings'),label:t('earn.nav.myEarnings'),icon:'coins'},
])
const pageClass=computed(()=>({
 'page-ambient page-ambient-grid':section.value!=='loan',
 'finance-overview':!route.params.id||route.params.id==='my',
 'earn-page':['simple','my-earnings'].includes(section.value),
 'earn-portfolio-page':section.value==='my-earnings',
 'loan-fidelity-page':section.value==='loan',
 'loan-borrow-page':section.value==='loan'&&route.params.id==='borrow',
}))
// Unknown ids under a valid section render the not-found page (not the catalog or an empty shell).
// Earn product ids are resolved by EarnDetail through the API (it renders not-found itself).
const missing=computed(()=>{const id=route.params.id;if(!id)return false;if(section.value==='simple')return false;if(section.value==='loan')return !['borrow','my'].includes(id);return true})
</script>
<template>
<NotFound v-if="missing"/>
<FinanceLanding v-else-if="!route.params.section"/>
<EarnDetail v-else-if="productId" :key="productId" :product-id="productId"/>
<div v-else class="page-wrap finance-page" :class="pageClass">
 <ChannelSectionSwitch
  v-if="!(section==='loan'&&route.params.id==='borrow')"
  class="subnav"
  :items="sections"
  :aria-label="section==='loan'?$t('common.loan'):$t('earn.nav.ariaLabel')"
 />
 <QuantAmbient v-if="section==='loan'"/>
 <EarnCatalog v-if="section==='simple'"/>
 <EarnPortfolio v-else-if="section==='my-earnings'"/>
 <LendingPanel v-else-if="section==='loan'"/>
</div>
</template>
<style scoped>.finance-table{padding:0;overflow:hidden}.finance-table .pill{padding:6px 16px;font-size:0.75rem}.finance-table td{font-size:0.8125rem;padding:20px}.finance-table td:first-child{width:30%}.finance-table h2{font-size:1rem}@media(max-width:900px){.finance-table table,.finance-table tbody{display:block}.finance-table thead{display:none}.finance-table tr{display:grid;grid-template-columns:1fr 1fr;padding:20px;gap:12px;border-bottom:1px solid #ffffff0c}.finance-table td{display:block;padding:0;border:0}.finance-table td:first-child{grid-column:1/-1;width:auto;margin-bottom:8px}.finance-table td[data-label]::before{content:attr(data-label);display:block;font-size:0.6875rem;color:var(--nt-text-muted);margin-bottom:5px}.finance-table td:last-child{grid-column:1/-1;text-align:right}}
</style>
