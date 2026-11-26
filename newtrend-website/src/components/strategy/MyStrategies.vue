<script setup>
import {computed,ref} from 'vue'
import FeedbackToast from '../../../../src/shared/feedback/FeedbackToast.vue'
import {fmt,path} from '../../data'
import {locale} from '../../i18n'
import {openModal,session} from '../../session'
import {strategyAccountFor} from '../../strategyPortfolio'
import {changeStrategyStatus} from '../../utils/strategyTemplates'
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
const expanded=ref(''),feedback=ref(null),busy=ref('')
function notify(type,key){feedback.value=null;requestAnimationFrame(()=>{feedback.value={type,key}})}
function apply(record,kind){
 if(busy.value)return
 busy.value=record.id
 try{changeStrategyStatus(account.value,record.id,kind);notify('success','aiQuant.actions.toast.'+kind+'Success')}
 catch{notify('error','aiQuant.actions.toast.'+kind+'Error')}
 finally{busy.value=''}
}
function act(record,kind){
 if(kind!=='stop')return apply(record,kind)
 openModal('account-confirm','aiQuant.actions.stopConfirm.title',{subtitle:record.template.name,danger:{key:'aiQuant.actions.stopConfirm.notice',params:{name:record.template.name}},cancelLabel:'aiQuant.actions.stopConfirm.cancel',confirmLabel:'aiQuant.actions.stopConfirm.confirm',destructive:true,focusCancel:true,onConfirm:()=>apply(record,'stop')})
}
const toggle=id=>{expanded.value=expanded.value===id?'':id}
</script>
<template>
<div class="my-strategies">
 <header class="my-strategies-head"><span>{{ $t('aiQuant.myStrategies.subtitle') }}</span><h1>{{ $t('aiQuant.myStrategies.title') }}</h1></header>
 <div v-if="!records.length" class="my-strategies-empty"><p>{{ $t('aiQuant.myStrategies.empty') }}</p><RouterLink class="strategy-outline" :to="path('/ai-quant/strategy')">{{ $t('aiQuant.myStrategies.browseStrategies') }}</RouterLink></div>
 <template v-else>
  <section class="my-strategies-summary">
   <div class="my-strategies-primary"><div><small>{{ $t('aiQuant.myStrategies.summary.totalCapital') }}</small><p>{{ money(summary.capital) }}<span>USDT</span></p></div><div><small>{{ $t('aiQuant.myStrategies.summary.totalPnl') }}</small><p :class="summary.pnl>=0?'profit':'loss'">{{ signed(summary.pnl) }}<span>USDT</span></p></div></div>
   <dl><div><dt>{{ $t('aiQuant.myStrategies.summary.running') }}</dt><dd>{{ summary.running }}</dd></div><div><dt>{{ $t('aiQuant.myStrategies.summary.total') }}</dt><dd>{{ summary.total }}</dd></div></dl>
  </section>
  <div class="my-strategies-table"><table>
   <thead><tr><th scope="col">{{ $t('aiQuant.table.columns.strategyName') }}</th><th scope="col">{{ $t('aiQuant.table.columns.trend') }}</th><th scope="col" class="num">{{ $t('aiQuant.table.columns.pnl') }}</th><th scope="col" class="num">{{ $t('aiQuant.table.columns.capital') }}</th><th scope="col" class="num">{{ $t('aiQuant.table.columns.endDate') }}</th><th scope="col" class="num">{{ $t('aiQuant.table.columns.action') }}</th></tr></thead>
   <tbody><template v-for="record in records" :key="record.id">
    <tr>
     <td :data-label="$t('aiQuant.table.columns.strategyName')"><div class="ms-name"><div class="ms-badges"><span class="ms-status" :class="record.status">{{ $t('aiQuant.status.'+record.status) }}</span><span v-if="record.status==='running'" class="ms-pulse" aria-hidden="true"></span><span v-if="record.mode==='demo'" class="ms-demo">{{ $t('common.demo.account') }}</span></div><strong>{{ record.template.name }}</strong><small>{{ $t(styleKey(record)) }} · {{ $t(marketKey(record)) }}</small></div></td>
     <td :data-label="$t('aiQuant.table.columns.trend')"><span class="ms-faint">{{ $t('aiQuant.strategies.trendPlaceholder') }}</span></td>
     <td class="num" :data-label="$t('aiQuant.table.columns.pnl')"><div class="ms-pnl"><strong :class="record.pnl>=0?'profit':'loss'">{{ record.pnl>=0?'+':'' }}{{ money(record.pnl) }}<span>USDT</span></strong><span class="ms-return" :class="record.pnl>=0?'profit':'loss'">{{ record.pnl>=0?'+':'' }}{{ returnPercent(record).toFixed(2) }}%</span></div></td>
     <td class="num mono" :data-label="$t('aiQuant.table.columns.capital')">{{ fmt(record.capital) }}<span class="ms-unit">USDT</span></td>
     <td class="num ms-date" :data-label="$t('aiQuant.table.columns.endDate')">{{ endDate(record) }}</td>
     <td class="num" :data-label="$t('aiQuant.table.columns.action')"><div class="ms-actions">
      <button v-if="record.status==='running'" type="button" class="ms-button" :disabled="busy===record.id" @click="act(record,'pause')">{{ $t('aiQuant.actions.pause') }}</button>
      <button v-if="record.status==='paused'" type="button" class="ms-button" :disabled="busy===record.id" @click="act(record,'resume')">{{ $t('aiQuant.actions.resume') }}</button>
      <button v-if="record.status!=='completed'" type="button" class="ms-button danger" :disabled="busy===record.id" aria-haspopup="dialog" @click="act(record,'stop')">{{ $t('aiQuant.actions.stop') }}</button>
      <button type="button" class="ms-button ghost" :aria-expanded="expanded===record.id" :aria-controls="'ms-stats-'+record.id" @click="toggle(record.id)">{{ $t(expanded===record.id?'aiQuant.actions.hideStats':'aiQuant.actions.viewStats') }}</button>
     </div></td>
    </tr>
    <tr v-if="expanded===record.id" :id="'ms-stats-'+record.id" class="ms-stats-row"><td colspan="6"><p class="ms-stats-empty">{{ $t('aiQuant.dailyStats.empty') }}</p></td></tr>
   </template></tbody>
  </table></div>
 </template>
 <FeedbackToast v-if="feedback" :type="feedback.type" :source="()=>feedback?$t(feedback.key):''"/>
</div>
</template>
