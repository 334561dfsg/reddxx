<script setup>
import StatusTag from '../ui/StatusTag.vue'
import LineIcon from '../ui/LineIcon.vue'
import EmptyState from '../ui/EmptyState.vue'
import {money} from '../../utils/format.js'
import {computed,ref} from 'vue'
import FeedbackToast from '../../platform/FeedbackToast.js'
import {fmt,path} from '../../data'
import {locale} from '../../i18n'
import {openModal,session} from '../../session'
import Skeleton from '../ui/Skeleton.vue'
import RequestState from '../ui/RequestState.vue'
import {changeStrategyStatus} from '../../api/strategy.js'
import {invalidate} from '../../composables/useRequest.js'
import PortfolioSummaryCard from '../PortfolioSummaryCard.vue'
import FinancePagination from '../FinancePagination.vue'
import {useFinancePagination} from '../../composables/useFinancePagination'
// Reference "my strategies": summary, per-mode table with status/demo badges, actions and expandable daily stats.
// The account ({balance, records}) is loaded and polled by pages/Strategy.vue; null while the first load runs.
const props=defineProps({account:{type:Object,default:null},status:{type:String,required:true},error:Object})
const emit=defineEmits(['retry'])
const loading=computed(()=>props.status==='loading')
const records=computed(()=>props.account?.records||[])
const {page,total,shown}=useFinancePagination(records,10)
// money comes from the shared site formatters
const summary=computed(()=>{const list=records.value,pnl=list.reduce((sum,r)=>sum+r.pnl,0);return {capital:list.reduce((sum,r)=>sum+r.capital,0),pnl,running:list.filter(r=>r.status==='running').length,total:list.length}})
const signed=value=>(value>=0?'+':'-')+money(Math.abs(value))
const returnPercent=record=>record.capital?record.pnl/record.capital*100:0
const endDate=record=>!record.endAt?'—':new Date(record.endAt).toLocaleDateString(locale.value,{year:'numeric',month:'2-digit',day:'2-digit'})
const styleKey=record=>record.template.style
const marketKey=record=>record.template.market
const feedback=ref(null),busy=ref(null)
function notify(type,key){feedback.value=null;requestAnimationFrame(()=>{feedback.value={type,key}})}
// Both modes go through the API (simulated latency for 模擬, the server for 真實).
// busy={id,kind}: the clicked button spins, the row's other actions are disabled, repeated clicks are ignored.
const isBusy=(record,kind)=>busy.value?.id===record.id&&(!kind||busy.value.kind===kind)
async function apply(record,kind){
 if(busy.value)return
 busy.value={id:record.id,kind}
 // Bind to the mode that owned the row when clicked; a mode switch during the wait must not retarget it.
 const mode=session.mode
 try{await changeStrategyStatus({mode,record,kind});notify('success','aiQuant.actions.toast.'+kind+'Success')}
 catch{notify('error','aiQuant.actions.toast.'+kind+'Error')}
 finally{busy.value=null;invalidate('strategy')}
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
 <!-- Summary labels and the table header stay while loading; figures and rows are skeletons of the loaded size. -->
 <RequestState v-if="status==='error'" :status="status" :error="error" class="strategy-request-frame" @retry="emit('retry')"/>
 <EmptyState v-else-if="!loading&&!records.length" class="my-strategies-empty" :text="$t('aiQuant.myStrategies.empty')"><RouterLink class="strategy-outline" :to="path('/ai-quant/strategy')">{{ $t('aiQuant.myStrategies.browseStrategies') }}</RouterLink></EmptyState>
 <template v-else>
  <span v-if="loading" role="status" class="sr-only">{{ $t('common.loading') }}</span>
  <PortfolioSummaryCard :loading="loading" label-id="ms-summary-capital" :label="$t('aiQuant.myStrategies.summary.totalCapital')" :value="money(summary.capital)" unit="USDT"
   :accent="{value:signed(summary.pnl),unit:'USDT',label:$t('aiQuant.myStrategies.summary.totalPnl'),tone:summary.pnl>=0?'profit':'loss'}"
   :stats="[{label:$t('aiQuant.myStrategies.summary.running'),value:String(summary.running),sensitive:false},{label:$t('aiQuant.myStrategies.summary.total'),value:String(summary.total),sensitive:false}]"/>
  <div class="my-strategies-table"><table>
   <thead><tr><th scope="col">{{ $t('aiQuant.table.columns.strategyName') }}</th><th scope="col" class="num">{{ $t('aiQuant.table.columns.pnl') }}</th><th scope="col" class="num">{{ $t('aiQuant.table.columns.capital') }}</th><th scope="col" class="num">{{ $t('aiQuant.table.columns.endDate') }}</th><th scope="col" class="num">{{ $t('aiQuant.table.columns.action') }}</th></tr></thead>
   <tbody><template v-if="loading"><tr v-for="n in 4" :key="n" class="ms-skeleton-row" aria-hidden="true"><td><div class="ms-skeleton-lines"><Skeleton width="64px" height="22px"/><Skeleton width="180px" height="18px"/><Skeleton width="120px" height="12px"/></div></td><td class="num"><div class="ms-skeleton-lines"><Skeleton width="110px" height="18px"/><Skeleton width="56px" height="12px"/></div></td><td class="num"><Skeleton width="96px"/></td><td class="num"><Skeleton width="88px"/></td><td class="num"><div class="ms-skeleton-actions"><Skeleton width="72px" height="32px"/><Skeleton width="96px" height="32px"/></div></td></tr></template><template v-else v-for="record in shown" :key="record.id">
    <tr>
     <td :data-label="$t('aiQuant.table.columns.strategyName')"><div class="ms-name"><div class="ms-badges"><StatusTag domain="strategy" :status="record.status"/><span v-if="record.status==='running'" class="ms-pulse" aria-hidden="true"></span><span v-if="record.mode==='demo'" class="ms-demo">{{ $t('common.demo.account') }}</span></div><strong>{{ record.template.name }}</strong><small>{{ $t(styleKey(record)) }} · {{ $t(marketKey(record)) }}</small></div></td>
     
     <td class="num" :data-label="$t('aiQuant.table.columns.pnl')"><div class="ms-pnl"><strong :class="record.pnl>=0?'profit':'loss'">{{ record.pnl>=0?'+':'' }}{{ money(record.pnl) }}<span>USDT</span></strong><span class="ms-return" :class="record.pnl>=0?'profit':'loss'">{{ record.pnl>=0?'+':'' }}{{ returnPercent(record).toFixed(2) }}%</span></div></td>
     <td class="num mono" :data-label="$t('aiQuant.table.columns.capital')">{{ fmt(record.capital) }}<span class="ms-unit">USDT</span></td>
     <td class="num ms-date" :data-label="$t('aiQuant.table.columns.endDate')">{{ endDate(record) }}</td>
     <td class="num" :data-label="$t('aiQuant.table.columns.action')"><div class="ms-actions">
      <template v-for="kind in ['pause','resume','stop']" :key="kind"><button v-if="(kind==='pause'&&record.status==='running')||(kind==='resume'&&record.status==='paused')||(kind==='stop'&&['running','paused'].includes(record.status))" type="button" class="ms-button" :class="{loading:isBusy(record,kind)}" :disabled="isBusy(record)" :aria-busy="isBusy(record,kind)||undefined" :aria-haspopup="kind==='stop'?'dialog':undefined" @click="act(record,kind)">
       <LineIcon name="spinner" v-if="isBusy(record,kind)" class="ms-icon ms-spin" aria-hidden="true"/>
       <LineIcon name="pause" v-else-if="kind==='pause'" class="ms-icon" aria-hidden="true"/>
       <LineIcon name="play" v-else-if="kind==='resume'" class="ms-icon" aria-hidden="true"/>
       <LineIcon name="stop" v-else class="ms-icon" aria-hidden="true"/>
       <span>{{ $t('aiQuant.actions.'+kind) }}</span>
      </button></template>
      <RouterLink class="ms-button ghost" :to="path('/ai-quant/strategy/mine/'+encodeURIComponent(record.id)+'/stats')">{{ $t('aiQuant.actions.viewStats') }}<LineIcon name="chevron-right" class="ms-icon" aria-hidden="true"/></RouterLink>
     </div></td>
    </tr>
    
   </template></tbody>
  </table></div>
  <FinancePagination v-if="!loading" v-model:page="page" :total="total" :page-size="10"/>
 </template>
 <FeedbackToast v-if="feedback" :type="feedback.type" :source="()=>feedback?$t(feedback.key):''"/>
</div>
</template>
<style>.ms-skeleton-row td{height:107px;box-sizing:border-box}@media(max-width:767px){.ms-skeleton-row td{height:auto}}.ms-skeleton-lines{display:grid;gap:8px;justify-items:start}.my-strategies-table td.num .ms-skeleton-lines{justify-items:end}.my-strategies-table td.num>.nt-skeleton{margin-left:auto}.ms-skeleton-actions{display:flex;gap:8px;justify-content:flex-end}</style>
