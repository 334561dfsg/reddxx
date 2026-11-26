<script setup>
import {computed,ref,watch} from 'vue'
import LendingIcon from '../components/lending/LendingIcon.vue'
import LendingPanel from '../components/lending/LendingPanel.vue'
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
import '../styles/finance-layout.css'
const route=useRoute()
const financeNav=ref(null)
watch([financeNav,()=>route.path],([nav],_previous,onCleanup)=>{
 if(!nav)return
 function revealActive(){
  const active=nav.querySelector('.router-link-exact-active')
  if(!active||nav.scrollWidth<=nav.clientWidth)return
  const frame=nav.getBoundingClientRect(),item=active.getBoundingClientRect()
  if(item.left<frame.left+4)nav.scrollLeft-=frame.left+4-item.left
  else if(item.right>frame.right-4)nav.scrollLeft+=item.right-frame.right+4
 }
 revealActive()
 const observer=new ResizeObserver(revealActive)
 observer.observe(nav)
 onCleanup(()=>observer.disconnect())
},{flush:'post',immediate:true})
let navDrag=null
let suppressNavClick=false
function startNavDrag(event){
 if(event.pointerType!=='mouse'||event.button!==0||event.currentTarget.scrollWidth<=event.currentTarget.clientWidth)return
 suppressNavClick=false
 navDrag={id:event.pointerId,x:event.clientX,left:event.currentTarget.scrollLeft,moved:false}
}
function moveNavDrag(event){
 if(!navDrag||event.pointerId!==navDrag.id)return
 const delta=event.clientX-navDrag.x
 if(!navDrag.moved&&Math.abs(delta)<6)return
 navDrag.moved=true
 event.currentTarget.setPointerCapture(event.pointerId)
 event.currentTarget.scrollLeft=navDrag.left-delta
 event.preventDefault()
}
function endNavDrag(event){
 if(!navDrag||event.pointerId!==navDrag.id)return
 suppressNavClick=navDrag.moved
 if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
 navDrag=null
}
function clickNav(event){
 if(suppressNavClick&&event.detail!==0){event.preventDefault();event.stopPropagation()}
 suppressNavClick=false
}
const section=computed(()=>route.params.section||'simple'),product=computed(()=>section.value==='simple'&&route.params.id?products.find(p=>p.id===route.params.id):null)
</script>
<template>
<EarnDetail v-if="product" :product="product"/>
<div v-else class="page-wrap finance-page" :class="{'finance-overview':!route.params.id||route.params.id==='my','earn-page':['simple','my-earnings'].includes(section),'earn-portfolio-page':section==='my-earnings','loan-fidelity-page':section==='loan','loan-borrow-page':section==='loan'&&route.params.id==='borrow'}"><nav ref="financeNav" @pointerdown="startNavDrag" @pointermove="moveNavDrag" @pointerup="endNavDrag" @pointercancel="endNavDrag" @lostpointercapture="navDrag=null" @pointerleave="!navDrag?.moved&&(navDrag=null)" @click.capture="clickNav" @dragstart.prevent v-if="!(section==='loan'&&route.params.id==='borrow')" class="subnav" :aria-label="$t(&quot;earn.nav.ariaLabel&quot;)"><RouterLink :to="path('/earn/simple')"><LendingIcon v-if="section==='loan'" name="sprout"/><EarnIcon name="sprout" v-else/>{{ $t("earn.nav.products") }}</RouterLink><RouterLink :to="path('/earn/my-earnings')"><LendingIcon v-if="section==='loan'" name="coins"/><Icon name="coins" v-else/>{{ $t("earn.nav.myEarnings") }}</RouterLink><RouterLink :to="path('/earn/loan')"><LendingIcon v-if="section==='loan'" name="banknote"/><EarnIcon name="banknote" v-else/>{{ $t("common.loan") }}</RouterLink><RouterLink :to="path('/earn/loan/my')"><LendingIcon v-if="section==='loan'" name="wallet"/><EarnIcon name="receipt" v-else/>{{ $t("earn.nav.myLoans") }}</RouterLink></nav>
<EarnCatalog v-if="section==='simple'"/>
<EarnPortfolio v-else-if="section==='my-earnings'"/>
<LendingPanel v-else-if="section==='loan'"/>
</div></template>
<style scoped>.finance-table{padding:0;overflow:hidden}.finance-table .pill{padding:6px 16px;font-size:0.75rem}.finance-table td{font-size:0.8125rem;padding:20px}.finance-table td:first-child{width:30%}.finance-table h2{font-size:1rem}@media(max-width:900px){.finance-table table,.finance-table tbody{display:block}.finance-table thead{display:none}.finance-table tr{display:grid;grid-template-columns:1fr 1fr;padding:20px;gap:12px;border-bottom:1px solid #ffffff0c}.finance-table td{display:block;padding:0;border:0}.finance-table td:first-child{grid-column:1/-1;width:auto;margin-bottom:8px}.finance-table td[data-label]::before{content:attr(data-label);display:block;font-size:0.6875rem;color:#fff6;margin-bottom:5px}.finance-table td:last-child{grid-column:1/-1;text-align:right}}
</style>
