<script setup>
import '../../styles/trade-workspace.css'
import {computed,shallowRef,watch} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {tradingMarkets as markets,path,fmt} from '../../data'
import {openModal} from '../../session'
import {useTradePageState,useOrderDrafts} from '../../composables/tradePageState'
import {useMediaQuery,COMPACT_TRADE_QUERY} from '../../composables/useMediaQuery.js'
import {useDepth,useLivePair,useTrades} from '../../composables/useMarket.js'
import {findTradingMarket,tradePath as buildTradePath} from '../../utils/tradeRoutes.js'
import TradeChartPanel from '../../components/trading/TradeChartPanel.vue'
import Skeleton from '../../components/ui/Skeleton.vue'
import LineIcon from '../../components/ui/LineIcon.vue'
// Phone chart view (GMXX mobile reference, 2026-11-27), opened from the chart button of the compact trading header:
// back + pair title (opens the pair drawer), price with 24h high / low / turnover, the shared chart panel (interval and
// OHLC), then 委託訂單 (bids and asks side by side) / 最新成交 tabs, and fixed buy/sell actions that return to the
// trade page with that side selected. Wider screens have the chart on the trade page, so they are sent back there.
const route=useRoute(),router=useRouter()
const mode=computed(()=>route.params.mode)
const pair=computed(()=>findTradingMarket(markets,route.params.symbol)||markets[0])
const state=computed(()=>useTradePageState(mode.value))
const drafts=useOrderDrafts()
const tradePath=computed(()=>path(buildTradePath(mode.value,pair.value)))
const compact=useMediaQuery(COMPACT_TRADE_QUERY)
watch(compact,value=>{if(!value)router.replace(tradePath.value)},{immediate:true})

const {live,livePair,hasVolume}=useLivePair(()=>pair.value)

const tab=shallowRef('book')
const depth=useDepth(()=>pair.value.id),trades=useTrades(()=>pair.value.id)
const LEVELS=10
// Row i pairs the i-th best bid with the i-th best ask; bars grow with the cumulative size from the spread.
const bookRows=computed(()=>{
 const book=depth.data.value;if(!book)return null
 const bids=book.bids.slice(0,LEVELS),asks=[...book.asks].reverse().slice(0,LEVELS)
 const cum=list=>{let t=0;return list.map(([,q])=>t+=q)}
 const cb=cum(bids),ca=cum(asks),max=Math.max(cb.at(-1)||1,ca.at(-1)||1)
 return Array.from({length:LEVELS},(_,i)=>({bid:bids[i],ask:asks[i],bidShare:(cb[i]||0)/max*100,askShare:(ca[i]||0)/max*100}))
})
const time=t=>new Date(t).toTimeString().slice(0,8)

const sides=computed(()=>mode.value==='spot'?['trade.buy','trade.sell']:['trade.buyLong','trade.sellShort'])
function trade(side){
 if(mode.value==='futures')drafts.futures.side=side
 else if(mode.value==='options')drafts.options.side=side
 else drafts.spot.side=side
 router.push(tradePath.value)
}
const back=()=>router.push(tradePath.value)
function choosePair(id){const market=findTradingMarket(markets,id);if(market)router.replace(path(buildTradePath(mode.value,market,{chart:true})))}
const openPairs=()=>openModal('market-picker','trade.pair',{current:pair.value.id,onSelect:choosePair})
</script>
<template>
<div class="trading-terminal product-terminal compact chart-page">
 <header class="chart-page-head">
  <button type="button" class="chart-back" :aria-label="$t('trade.chartPage.back')" @click="back"><LineIcon name="arrow-left"/></button>
  <h1><button type="button" class="chart-title" aria-haspopup="dialog" :aria-label="$t('trade.form.tradingAsset')+' '+pair.name" @click="openPairs">{{ pair.name }}<LineIcon name="caret-down"/></button></h1>
  <span class="chart-back-spacer" aria-hidden="true"></span>
 </header>
 <section class="chart-quote" :aria-label="$t('trade.pages.marketOverview')">
  <div class="chart-quote-main">
   <strong :class="livePair.change<0?'negative':'positive'"><template v-if="live">{{ fmt(livePair.price) }}</template><Skeleton v-else inline width="140px"/></strong>
   <span :class="livePair.change<0?'negative':'positive'">{{ livePair.change>0?'+':'' }}{{ livePair.change }}%</span>
  </div>
  <dl>
   <div><dt>{{ $t('trade.24hHigh') }}</dt><dd><template v-if="live">{{ fmt(livePair.high) }}</template><Skeleton v-else inline width="64px"/></dd></div>
   <div><dt>{{ $t('trade.24hLow') }}</dt><dd><template v-if="live">{{ fmt(livePair.low) }}</template><Skeleton v-else inline width="64px"/></dd></div>
   <div><dt>{{ $t('trade.turnover') }}</dt><dd>{{ hasVolume?$compact(pair.volume):'—' }}</dd></div>
  </dl>
 </section>
 <TradeChartPanel v-model="state.interval" :pair="livePair"/>
 <section class="chart-market" :aria-label="$t('trade.pages.records')">
  <div class="record-tabs chart-tabs"><button v-for="[key,label] in [['book','trade.chartPage.orderBook'],['trades','trade.pages.latestTrades']]" :key="key" type="button" :class="{active:tab===key}" :aria-pressed="tab===key" @click="tab=key">{{ $t(label) }}</button></div>
  <div v-if="tab==='book'" class="chart-book" :aria-busy="!bookRows||undefined">
   <div class="chart-book-head"><span>{{ $t('trade.quantity') }}({{ pair.symbol }})</span><span>{{ $t('trade.price') }}(USDT)</span><span>{{ $t('trade.quantity') }}({{ pair.symbol }})</span></div>
   <template v-if="bookRows"><div v-for="(row,i) in bookRows" :key="i" class="chart-book-row">
    <span class="bid" :style="{'--depth':row.bidShare+'%'}"><span>{{ row.bid?row.bid[1].toFixed(4):'' }}</span><span class="positive">{{ row.bid?fmt(row.bid[0]):'' }}</span></span>
    <span class="ask" :style="{'--depth':row.askShare+'%'}"><span class="negative">{{ row.ask?fmt(row.ask[0]):'' }}</span><span>{{ row.ask?row.ask[1].toFixed(4):'' }}</span></span>
   </div></template>
   <template v-else><div v-for="n in LEVELS" :key="n" class="chart-book-row" aria-hidden="true"><span class="bid"><Skeleton inline width="48px"/><Skeleton inline width="64px"/></span><span class="ask"><Skeleton inline width="64px"/><Skeleton inline width="48px"/></span></div></template>
  </div>
  <div v-else class="chart-trades" :aria-busy="!trades.data.value||undefined">
   <div class="chart-trades-head"><span>{{ $t('trade.pages.time') }}</span><span>{{ $t('trade.price') }}(USDT)</span><span>{{ $t('trade.quantity') }}({{ pair.symbol }})</span></div>
   <template v-if="trades.data.value"><div v-for="item in trades.data.value" :key="item.id" class="chart-trades-row"><span>{{ time(item.time) }}</span><span :class="item.side==='buy'?'positive':'negative'">{{ fmt(item.price) }}</span><span>{{ item.qty.toFixed(4) }}</span></div>
    <p v-if="!trades.data.value.length" class="chart-empty">{{ $t('trade.chartPage.emptyTrades') }}</p></template>
   <template v-else><div v-for="n in LEVELS" :key="n" class="chart-trades-row" aria-hidden="true"><span><Skeleton inline width="56px"/></span><span><Skeleton inline width="64px"/></span><span><Skeleton inline width="48px"/></span></div></template>
  </div>
 </section>
 <footer class="chart-actions"><button v-for="(label,i) in sides" :key="label" type="button" :class="i?'sell':'buy'" @click="trade(i?'sell':'buy')">{{ $t(label) }}</button></footer>
</div>
</template>
<style scoped>
.chart-page{min-height:100vh;min-height:100dvh;padding:0 0 calc(76px + env(safe-area-inset-bottom))}
.chart-page-head{position:sticky;top:0;z-index:5;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;min-height:48px;padding:env(safe-area-inset-top) 4px 0;background:var(--nt-bg)}
.chart-page-head h1{margin:0;text-align:center;font-size:16px;line-height:22px}
.chart-back,.chart-title{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;color:#fff}
.chart-back{width:44px}
.chart-back svg,.chart-title svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.chart-title{font:inherit;font-weight:600}
.chart-title svg{width:14px;height:14px}
.chart-back:focus-visible,.chart-title:focus-visible{outline:none;background:var(--nt-border);border-radius:var(--nt-radius-control)}
.chart-quote{display:flex;justify-content:space-between;gap:12px;padding:8px 16px 12px;border-bottom:1px solid var(--terminal-divider)}
.chart-quote-main{display:grid;gap:4px;align-content:start}
.chart-quote-main strong{font-size:24px;line-height:32px;font-weight:600;font-variant-numeric:tabular-nums}
.chart-quote-main span{font-size:13px;line-height:18px}
.chart-quote dl{display:grid;gap:4px;margin:0;font-size:12px;line-height:18px}
.chart-quote dl>div{display:grid;grid-template-columns:auto minmax(72px,auto);gap:12px}
.chart-quote dt{color:var(--terminal-muted)}
.chart-quote dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}
.positive{color:var(--nt-green)}.negative{color:var(--nt-red)}
.chart-page :deep(.chart-panel){border-bottom:1px solid var(--terminal-divider)}
.chart-market{padding-bottom:8px}
.chart-tabs{justify-content:center;gap:32px}
.chart-book-head,.chart-trades-head{display:grid;padding:10px 16px 6px;font-size:12px;line-height:16px;color:var(--terminal-muted)}
.chart-book-head{grid-template-columns:1fr auto 1fr}.chart-book-head span:nth-child(2){text-align:center}.chart-book-head span:last-child{text-align:right}
.chart-book-row{display:grid;grid-template-columns:1fr 1fr;padding:0 16px;font-size:12px;line-height:16px;font-variant-numeric:tabular-nums}
.chart-book-row>span{position:relative;display:flex;justify-content:space-between;gap:8px;padding:5px 4px}
.chart-book-row>span:before{content:'';position:absolute;top:0;bottom:0;width:var(--depth,0);pointer-events:none}
.chart-book-row>.bid:before{right:0;background:#06221a}.chart-book-row>.ask:before{left:0;background:#230e16}
.chart-book-row>span>span{position:relative}
.chart-trades-head,.chart-trades-row{grid-template-columns:1fr 1fr 1fr}
.chart-trades-row{display:grid;padding:5px 16px;font-size:12px;line-height:16px;font-variant-numeric:tabular-nums}
.chart-trades-head span:nth-child(2),.chart-trades-row span:nth-child(2){text-align:center}
.chart-trades-head span:last-child,.chart-trades-row span:last-child{text-align:right}
.chart-empty{margin:0;padding:24px 16px;text-align:center;color:var(--terminal-muted)}
.chart-actions{position:fixed;left:0;right:0;bottom:0;z-index:5;display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px max(16px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));background:var(--nt-bg);border-top:1px solid var(--terminal-divider)}
.chart-actions button{min-height:44px;border-radius:var(--nt-radius-pill);color:#fff;font-size:15px;font-weight:600}
.chart-actions .buy{background:var(--nt-green)}.chart-actions .sell{background:var(--nt-red)}
.chart-actions button:focus-visible{outline:none;text-decoration:underline}
</style>
