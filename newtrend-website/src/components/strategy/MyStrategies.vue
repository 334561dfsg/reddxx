<script setup>
import {computed,ref} from 'vue'
import FeedbackToast from '../../../../src/shared/feedback/FeedbackToast.vue'
import {fmt,path} from '../../data'
import {locale} from '../../i18n'
import {openModal,session} from '../../session'
import {strategyAccountFor} from '../../strategyPortfolio'
import {changeStrategyStatus} from '../../utils/strategyTemplates'
import PortfolioSummaryCard from '../PortfolioSummaryCard.vue'
// Reference "my strategies": summary, per-mode table with status/demo badges, actions and expandable daily stats.
const account=computed(()=>strategyAccountFor(session.mode))
const records=computed(()=>account.value.records)
const money=value=>Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
const summary=computed(()=>{const list=records.value,pnl=list.reduce((sum,r)=>sum+r.pnl,0);return {capital:list.reduce((sum,r)=>sum+r.capital,0),pnl,running:list.filter(r=>r.status==='running').length,total:list.length}})
const signed=value=>(value>=0?'+':'-')+money(Math.abs(value))
const returnPercent=record=>record.capital?record.pnl/record.capital*100:0
const endDate=record=>new Date(record.endAt).toLocaleDateString(locale.value,{year:'numeric',month:'2-digit',day:'2-digit'})
const styleKey=record=>record.template.style
const marketKey=record=>record.template.market
const feedback=ref(null),busy=ref(null)
function notify(type,key){feedback.value=null;requestAnimationFrame(()=>{feedback.value={type,key}})}
// Local mock settles after a short simulated round trip so the row shows a real loading state.
// busy={id,kind}: the clicked button spins, the row's other actions are disabled, repeated clicks are ignored.
const ACTION_DELAY=650
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const isBusy=(record,kind)=>busy.value?.id===record.id&&(!kind||busy.value.kind===kind)
async function apply(record,kind){
 if(busy.value)return
 busy.value={id:record.id,kind}
 try{await wait(ACTION_DELAY);changeStrategyStatus(account.value,record.id,kind);notify('success','aiQuant.actions.toast.'+kind+'Success')}
 catch{notify('error','aiQuant.actions.toast.'+kind+'Error')}
 finally{busy.value=null}
}
function act(record,kind){
 if(busy.value)return
 if(kind!=='stop')return apply(record,kind)
 openModal('account-confirm','aiQuant.actions.stopConfirm.title',{subtitle:record.template.name,danger:{key:'aiQuant.actions.stopConfirm.notice',params:{name:record.template.name}},cancelLabel:'aiQuant.actions.stopConfirm.cancel',confirmLabel:'aiQuant.actions.stopConfirm.confirm',destructive:true,focusCancel:true,onConfirm:()=>apply(record,'stop')})
}
</script>
<template>
<div class="my-strategies">
 <header class="my-strategies-head"><span>{{ $t('aiQuant.myStrategies.subtitle') }}</span><h1>{{ $t('aiQuant.myStrategies.title') }}</h1></header>
 <div v-if="!records.length" class="my-strategies-empty"><p>{{ $t('aiQuant.myStrategies.empty') }}</p><RouterLink class="strategy-outline" :to="path('/ai-quant/strategy')">{{ $t('aiQuant.myStrategies.browseStrategies') }}</RouterLink></div>
 <template v-else>
  <PortfolioSummaryCard label-id="ms-summary-capital" :label="$t('aiQuant.myStrategies.summary.totalCapital')" :value="money(summary.capital)" unit="USDT"
   :accent="{value:signed(summary.pnl),unit:'USDT',label:$t('aiQuant.myStrategies.summary.totalPnl'),tone:summary.pnl>=0?'profit':'loss'}"
   :stats="[{label:$t('aiQuant.myStrategies.summary.running'),value:String(summary.running),sensitive:false},{label:$t('aiQuant.myStrategies.summary.total'),value:String(summary.total),sensitive:false}]"/>
  <div class="my-strategies-table"><table>
   <thead><tr><th scope="col">{{ $t('aiQuant.table.columns.strategyName') }}</th><th scope="col" class="num">{{ $t('aiQuant.table.columns.pnl') }}</th><th scope="col" class="num">{{ $t('aiQuant.table.columns.capital') }}</th><th scope="col" class="num">{{ $t('aiQuant.table.columns.endDate') }}</th><th scope="col" class="num">{{ $t('aiQuant.table.columns.action') }}</th></tr></thead>
   <tbody><template v-for="record in records" :key="record.id">
    <tr>
     <td :data-label="$t('aiQuant.table.columns.strategyName')"><div class="ms-name"><div class="ms-badges"><span class="ms-status" :class="record.status">{{ $t('aiQuant.status.'+record.status) }}</span><span v-if="record.status==='running'" class="ms-pulse" aria-hidden="true"></span><span v-if="record.mode==='demo'" class="ms-demo">{{ $t('common.demo.account') }}</span></div><strong>{{ record.template.name }}</strong><small>{{ $t(styleKey(record)) }} · {{ $t(marketKey(record)) }}</small></div></td>
     
     <td class="num" :data-label="$t('aiQuant.table.columns.pnl')"><div class="ms-pnl"><strong :class="record.pnl>=0?'profit':'loss'">{{ record.pnl>=0?'+':'' }}{{ money(record.pnl) }}<span>USDT</span></strong><span class="ms-return" :class="record.pnl>=0?'profit':'loss'">{{ record.pnl>=0?'+':'' }}{{ returnPercent(record).toFixed(2) }}%</span></div></td>
     <td class="num mono" :data-label="$t('aiQuant.table.columns.capital')">{{ fmt(record.capital) }}<span class="ms-unit">USDT</span></td>
     <td class="num ms-date" :data-label="$t('aiQuant.table.columns.endDate')">{{ endDate(record) }}</td>
     <td class="num" :data-label="$t('aiQuant.table.columns.action')"><div class="ms-actions">
      <template v-for="kind in ['pause','resume','stop']" :key="kind"><button v-if="(kind==='pause'&&record.status==='running')||(kind==='resume'&&record.status==='paused')||(kind==='stop'&&record.status!=='completed')" type="button" class="ms-button" :class="{loading:isBusy(record,kind)}" :disabled="isBusy(record)" :aria-busy="isBusy(record,kind)||undefined" :aria-haspopup="kind==='stop'?'dialog':undefined" @click="act(record,kind)">
       <svg v-if="isBusy(record,kind)" class="ms-icon ms-spin" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
       <svg v-else-if="kind==='pause'" class="ms-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>
       <svg v-else-if="kind==='resume'" class="ms-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3l14 9-14 9V3z"/></svg>
       <svg v-else class="ms-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
       <span>{{ $t('aiQuant.actions.'+kind) }}</span>
      </button></template>
      <RouterLink class="ms-button ghost" :to="path('/ai-quant/strategy/mine/'+encodeURIComponent(record.id)+'/stats')">{{ $t('aiQuant.actions.viewStats') }}<svg class="ms-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></RouterLink>
     </div></td>
    </tr>
    
   </template></tbody>
  </table></div>
 </template>
 <FeedbackToast v-if="feedback" :type="feedback.type" :source="()=>feedback?$t(feedback.key):''"/>
</div>
</template>
