<script setup>
import '../../styles/trade-workspace.css'
import {computed,watch} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {tradingMarkets as markets,path} from '../../data'
import {tradeProducts} from '../../utils/tradeProducts'
import {findTradingMarket,tradePath} from '../../utils/tradeRoutes.js'
import {fillLimitPrice,useTradePageState} from '../../composables/tradePageState'
import {useMediaQuery,COMPACT_TRADE_QUERY,PAIR_PANEL_QUERY} from '../../composables/useMediaQuery.js'
import {useLivePair} from '../../composables/useMarket.js'
import {t} from '../../i18n'
import {openModal} from '../../session'
import TradeOrderForm from '../TradeOrderForm.vue'
import PairList from './PairList.vue'
import TradeChartPanel from './TradeChartPanel.vue'
import TradeInstrumentBar from './TradeInstrumentBar.vue'
import TradeOrderBook from './TradeOrderBook.vue'
import TradeRecordsPanel from './TradeRecordsPanel.vue'
// Page shell for the futures (合約交易), delivery (二元期權) and spot pages: resolves the pair from the route, picks the
// layout and wires the panels together. Layouts (trade-workspace.css):
// - wide (≥1200px, `.with-pairs`): pair panel left of the chart; the instrument bar spans the panel and chart while
//   the order book and order form rise beside it; records fill the rest of the viewport (user reference, 2026-11-28).
// - tablet (768–1199px): chart, book and form grid; the pair opens the left pair drawer.
// - compact (≤767px, GMXX mobile reference 2026-11-27): one-line header with pair drawer, product sheet and chart page
//   button; order form beside a compact book; records as cards. No inline chart.
const props=defineProps({mode:{type:String,required:true}})
const route=useRoute(),router=useRouter(),state=useTradePageState(props.mode)
const product=tradeProducts[props.mode]
const compact=useMediaQuery(COMPACT_TRADE_QUERY),wide=useMediaQuery(PAIR_PANEL_QUERY)
const layout=computed(()=>compact.value?'compact':wide.value?'wide':'tablet')

// The route symbol (slug or legacy id), else the last pair of this product, else the first market.
const pair=computed(()=>findTradingMarket(markets,route.params.symbol)||findTradingMarket(markets,state.symbol)||markets[0])
watch(()=>pair.value.id,id=>{state.symbol=id},{immediate:true})
// Every pair has one canonical URL: unknown symbols and legacy ids are replaced by the shown pair's slug.
watch(()=>route.params.symbol,symbol=>{
 const canonical=tradePath(props.mode,pair.value)
 if(symbol&&route.path!==path(canonical))router.replace(path(canonical))
},{immediate:true})
const {live,livePair,tickers,hasVolume}=useLivePair(()=>pair.value)
// Live prices by market name, for open positions' unrealised P&L.
const livePrices=computed(()=>Object.fromEntries(Object.values(tickers.data.value||{}).map(q=>[q.name,q.price])))

function choosePair(id){const market=findTradingMarket(markets,id);if(market)router.push(path(tradePath(props.mode,market)))}
function chooseProduct(next){if(next!==props.mode)router.push(path(tradePath(next,pair.value)))}
const openChart=()=>router.push(path(tradePath(props.mode,pair.value,{chart:true})))
const openPairs=()=>openModal('market-picker','trade.pair',{current:pair.value.id,onSelect:choosePair})
// Product switch (phone) opens a bottom sheet (GMXX mobile reference).
const productItems=computed(()=>Object.entries(tradeProducts).map(([value,{title}])=>({value,label:t(title)})))
const openProducts=()=>openModal('option-sheet','trade.pages.product',{options:productItems.value,current:props.mode,onSelect:chooseProduct})
const orderHeading={futures:'trade.futuresOrder',options:'trade.optionsOrder',spot:'common.spotTrading'}
</script>
<template>
<div class="trading-terminal product-terminal" :class="{compact,'with-pairs':layout==='wide'}">
  <h1 class="terminal-accessible-title">{{ $t(product.title) }}</h1>
  <TradeInstrumentBar :pair="pair" :live-pair="livePair" :live="live" :has-volume="hasVolume" :layout="layout" :product-label="$t(product.title)" @open-pairs="openPairs" @open-products="openProducts" @open-chart="openChart"/>
  <div class="workspace-grid">
    <section v-if="layout==='wide'" class="terminal-panel pairs-panel" :aria-label="$t('trade.pair')"><PairList :current="pair.id" variant="panel" @select="choosePair"/></section>
    <TradeChartPanel v-if="!compact" :id="mode+'-chart'" v-model="state.interval" :pair="livePair"/>
    <!-- Phone: tapping a book price fills the futures/spot limit price (delivery trades at market). -->
    <TradeOrderBook :pair="livePair" :compact="compact" :pickable="compact&&mode!=='options'" @pick-price="price=>fillLimitPrice(mode,price)"/>
    <section class="terminal-panel order-panel" :aria-label="$t(product.title)"><h2 class="panel-heading" :class="{'sr-only':compact}">{{ $t(orderHeading[mode]) }}</h2><TradeOrderForm :mode="mode" :pair="livePair" :compact="compact"/></section>
    <TradeRecordsPanel v-model:record="state.record" :mode="mode" :pages="state.pages" :prices="livePrices" :compact="compact" @page="(id,value)=>state.pages[id]=value"/>
  </div>
</div>
</template>
