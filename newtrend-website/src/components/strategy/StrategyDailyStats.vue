<script setup>
import LineIcon from '../ui/LineIcon.vue'
import EmptyState from '../ui/EmptyState.vue'
import {signedMoney} from '../../utils/format.js'
import {computed,onMounted,ref} from 'vue'
import {locale} from '../../i18n'
import {summarizeDailyStats} from '../../utils/strategyTemplates'
import FinancePagination from '../FinancePagination.vue'
import {useFinancePagination} from '../../composables/useFinancePagination'
// Reference "查看統計" panel (newtrendcapital.com index chunk, read 2026-11-26): net P&L summary with UTC date range,
// trade count and active days, then one row per trading day (newest first) with a centred loss/profit bar scaled
// to the largest |P&L|. Bars grow in with a 25ms stagger (capped at 250ms); days are paged with the shared pager.
const props=defineProps({items:{type:Array,default:()=>[]}})
// Shared list pager (10 days per page) instead of the reference's latest-N truncation (user request).
const {page,total,shown}=useFinancePagination(()=>props.items,10)
const summary=computed(()=>summarizeDailyStats(props.items))
// Scale and range span every day, so bars and the caption stay stable across pages.
const maxAbs=computed(()=>props.items.reduce((m,i)=>Math.max(m,Math.abs(i.pnl)),0))
const sign=v=>!Number.isFinite(v)||v===0?'flat':v>0?'up':'down'
// signed amounts come from the shared site formatters
const signed=signedMoney
const parts=date=>{const [y,m,d]=date.split('-').map(Number),at=new Date(Date.UTC(y,m-1,d));return {day:new Intl.DateTimeFormat(locale.value,{month:'short',day:'numeric',timeZone:'UTC'}).format(at),weekday:new Intl.DateTimeFormat(locale.value,{weekday:'short',timeZone:'UTC'}).format(at)}}
const range=computed(()=>{if(!props.items.length)return '';const last=parts(props.items[0].date).day,first=parts(props.items.at(-1).date).day;return first===last?last:`${first} – ${last}`})
const width=item=>drawn.value&&maxAbs.value>0?`${(Math.min(1,Math.abs(item.pnl)/maxAbs.value)*50).toFixed(2)}%`:'0%'
const drawn=ref(false)
onMounted(()=>requestAnimationFrame(()=>{drawn.value=true}))
</script>
<template>
<EmptyState v-if="!items.length" class="ms-stats-empty" :text="$t('aiQuant.dailyStats.empty')"/>
<div v-else class="ds">
 <div class="ds-summary">
  <div class="ds-net"><span class="ds-label">{{ $t('aiQuant.dailyStats.netPnl') }}</span>
   <span class="ds-net-value" :class="sign(summary.totalPnl)"><LineIcon v-if="sign(summary.totalPnl)!=='flat'" :name="sign(summary.totalPnl)==='up'?'trend-up':'trend-down'" aria-hidden="true"/>{{ signed(summary.totalPnl) }}</span>
   <span class="ds-caption">{{ $t('aiQuant.dailyStats.rangeCaption',{range}) }}</span></div>
  <div class="ds-counts"><div><span class="ds-label">{{ $t('aiQuant.dailyStats.tradesLabel') }}</span><span class="ds-count">{{ summary.totalTradeCount }}</span></div><div><span class="ds-label">{{ $t('aiQuant.dailyStats.activeDays') }}</span><span class="ds-count">{{ summary.activeDays }}</span></div></div>
 </div>
 <div class="ds-grid ds-head" aria-hidden="true"><span>{{ $t('aiQuant.dailyStats.date') }}</span><span class="r">{{ $t('aiQuant.dailyStats.tradesLabel') }}</span><span class="ds-head-bar"><span>{{ $t('aiQuant.dailyStats.loss') }}</span><span>{{ $t('aiQuant.dailyStats.profit') }}</span></span><span class="r">{{ $t('aiQuant.dailyStats.pnl') }}</span></div>
 <ul class="ds-list">
  <li v-for="(item,index) in shown" :key="item.date" class="ds-grid ds-row">
   <span class="ds-date"><span>{{ parts(item.date).day }}</span><small>{{ parts(item.date).weekday }}</small></span>
   <span class="ds-trades r"><span class="sr-only">{{ $t('aiQuant.dailyStats.tradesLabel') }} </span>{{ item.tradeCount }}</span>
   <span class="ds-bar" aria-hidden="true"><span class="ds-axis"></span><span v-if="sign(item.pnl)!=='flat'" :class="['ds-fill',sign(item.pnl)]" :style="{width:width(item),transitionDelay:Math.min(index*25,250)+'ms'}"></span><span v-else class="ds-dot"></span></span>
   <span class="ds-pnl r" :class="sign(item.pnl)">{{ signed(item.pnl) }}</span>
  </li>
 </ul>
 <FinancePagination v-model:page="page" :total="total" :page-size="10"/>
</div>
</template>
<style>
.ds{display:flex;flex-direction:column;gap:16px;padding:20px;border-top:1px solid #191b1f}
.ds-summary{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 24px;padding:14px 16px;border:1px solid #191b1f;border-radius:12px;background:#1b1e22}
.ds-net,.ds-counts>div{display:flex;flex-direction:column;gap:4px}
.ds-counts{display:flex;align-items:center;gap:24px}
.ds-label{font-size:12px;line-height:16px;letter-spacing:.04em;text-transform:uppercase;color:#6e6f71}
.ds-net-value{display:flex;align-items:center;gap:6px;font-family:var(--nt-font-mono);font-size:24px;line-height:1;font-weight:700;color:#b4b5b6}
.ds-net-value svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ds-caption{font-size:12px;line-height:18px;color:#6e6f71}
.ds-count{font-family:var(--nt-font-mono);font-size:18px;line-height:1;font-weight:600;color:#fff;font-variant-numeric:tabular-nums}
.ds-grid{display:grid;grid-template-columns:6.5rem 3.5rem minmax(0,1fr) 8.5rem;align-items:center;column-gap:16px}
.ds-head{font-size:12px;line-height:16px;letter-spacing:.04em;text-transform:uppercase;color:#6e6f71}
.ds-head-bar{display:flex;justify-content:space-between}
.ds .r{text-align:right}
.ds-list{margin:0;padding:0;list-style:none}
.ds-row{padding:10px 0;border-top:1px solid #191b1f}
.ds-row:first-child{border-top:0}
.ds-row:hover{background:#ffffff05}
.ds-date{display:flex;align-items:baseline;gap:6px;font-size:15px;line-height:22px;color:#b4b5b6}
.ds-date small{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#6e6f71}
.ds-trades{font-family:var(--nt-font-mono);font-size:12px;color:#87888a;font-variant-numeric:tabular-nums}
.ds-bar{position:relative;height:20px;width:100%}
.ds-axis{position:absolute;top:0;bottom:0;left:50%;width:1px;background:#191b1f;transform:translateX(-50%)}
.ds-fill{position:absolute;top:6px;bottom:6px;transition:width 500ms ease-out}
.ds-fill.up{left:50%;border-radius:0 999px 999px 0;background:#2bc287}
.ds-fill.down{right:50%;border-radius:999px 0 0 999px;background:#ff4466}
.ds-dot{position:absolute;left:50%;top:50%;width:6px;height:6px;border-radius:50%;background:#6e6f71;transform:translate(-50%,-50%)}
.ds-pnl{font-family:var(--nt-font-mono);font-size:15px;font-weight:600;color:#87888a}
.ds .up{color:#2bc287}.ds .down{color:#ff4466}
.ds-fill.up,.ds-fill.down{color:inherit}
.ds-more{margin:0;text-align:center;font-size:12px;color:#6e6f71}
.ds .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@media(prefers-reduced-motion:reduce){.ds-fill{transition:none}}
@media(max-width:767px){.ds-grid{grid-template-columns:5rem 2.5rem minmax(0,1fr) 6rem;column-gap:8px}}
</style>
