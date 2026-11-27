<script setup>
import {isDemo,MODE_REAL,MODE_DEMO} from '../../utils/accountMode.js'
import '../../styles/trade-workspace.css'
import {computed,watch} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {tradingMarkets as markets,path,fmt} from '../../data'
import {tradeProducts,tradeMarketCategory as marketCategory,tradeMarketCategories} from '../../utils/tradeProducts'
import {useMarketFavorites} from '../../composables/useMarketFavorites'
import {useTradePageState,useOrderDrafts} from '../../composables/tradePageState'
import {useMediaQuery,COMPACT_TRADE_QUERY} from '../../composables/useMediaQuery.js'
import {t} from '../../i18n'
import {openModal,session,requestModeSwitch} from '../../session'
import LineIcon from '../ui/LineIcon.vue'
import Coin from '../Coin.vue'
import RecordFilter from '../RecordFilter.vue'
import TradeOrderForm from '../TradeOrderForm.vue'
import TradeChartPanel from './TradeChartPanel.vue'
import TradeOrderBook from './TradeOrderBook.vue'
import TradeRecordsPanel from './TradeRecordsPanel.vue'
import Skeleton from '../ui/Skeleton.vue'
import {streamStatus,useTicker,useTickers} from '../../composables/useMarket.js'
const props=defineProps({mode:{type:String,required:true}})
const route=useRoute(),router=useRouter(),state=useTradePageState(props.mode)
const product=tradeProducts[props.mode]
// Phone layout after the GMXX mobile trade pages (user reference, 2026-11-27), in the NewQuantCapital style: one-line
// header with a product switch and a chart toggle (chart and 24h stats collapsed by default, kept in page state), the
// order form and a compact book side by side, records as cards below. Desktop and tablet keep the grid layout.
const compact=useMediaQuery(COMPACT_TRADE_QUERY)
// The phone layout has no inline chart: its chart button opens the chart page (TradeChart, GMXX reference).
const showChart=computed(()=>!compact.value)
const openChart=()=>router.push(path('/trade/'+props.mode+'/'+pair.value.name.replace('/','')+'/chart'))
const productItems=computed(()=>[['futures','trade.pages.perpetual'],['options','trade.pages.delivery'],['spot','common.spotTrading']].map(([value,label])=>({value,label:t(label)})))
function chooseProduct(next){if(next!==props.mode)router.push(path('/trade/'+next+'/'+pair.value.name.replace('/','')))}
// Phone layout: the pair opens the left pair drawer (MarketPicker) instead of the dropdown.
// Account badge (GMXX 真实账户): shows the current mode; tapping asks to switch to the other one (same confirmation as the header).
const demoMode=computed(()=>isDemo(session.mode))
const switchMode=()=>requestModeSwitch(demoMode.value?MODE_REAL:MODE_DEMO)
// Product switch opens a bottom sheet (GMXX mobile reference) instead of a dropdown.
const openProducts=()=>openModal('option-sheet','trade.pages.product',{options:productItems.value,current:props.mode,onSelect:chooseProduct})
const openPairs=()=>openModal('market-picker','trade.pair',{current:pair.value.id,onSelect:choosePair})
// Tapping a book price on the phone layout fills the limit price of the futures or spot form (options trade at market).
const drafts=useOrderDrafts()
function usePrice(price){
 const value=String(price)
 if(props.mode==='futures'){drafts.futures.type='limit';drafts.futures.price=value}
 else if(props.mode==='spot'){drafts.spot.type='limit';drafts.spot[drafts.spot.side||'buy'].price=value}
}
const pair=computed(()=>markets.find(m=>m.id===(route.params.symbol||state.symbol)||m.name.replace('/','')===route.params.symbol)||markets[0])
watch(()=>pair.value.id,id=>state.symbol=id,{immediate:true})
const {favorites,favorite}=useMarketFavorites('nt-trade-favorites')
// Live data from the market stream: the selected pair's ticker and every market for the pair picker. Until the
// first snapshot the price is null and the figures render as skeletons; order actions are held (see TradeOrderForm).
const ticker=useTicker(()=>pair.value.id),tickers=useTickers()
// Switching pairs resubscribes the single-market ticker; until its snapshot arrives, use the same market's entry
// from the all-markets stream so the header keeps real figures instead of skeletons (no layout jump).
const live=computed(()=>ticker.data.value??tickers.data.value?.[pair.value.id]??null)
const livePair=computed(()=>({...pair.value,price:live.value?.price??null,change:live.value?Number(live.value.change.toFixed(2)):pair.value.change,high:live.value?.high,low:live.value?.low}))
// Pair picker rows use the latest pushed price when available.
const pairs=computed(()=>markets.map(m=>{const q=tickers.data.value?.[m.id];return {value:m.id,label:m.name,category:marketCategory(m),price:fmt(q?.price??m.price),change:q?Number(q.change.toFixed(2)):m.change}}))
// Live prices by market name, for current positions' unrealised P&L.
const livePrices=computed(()=>Object.fromEntries(Object.values(tickers.data.value||{}).map(q=>[q.name,q.price])))
const pairCategories=computed(()=>tradeMarketCategories.filter(value=>pairs.value.some(m=>m.category===value)).map(value=>({value})))
function choosePair(id){router.push(path('/trade/'+props.mode+'/'+id))}
// Unknown symbols fall back to the default pair; make the URL say which pair is actually shown.
watch(()=>route.params.symbol,symbol=>{if(symbol&&pair.value.id!==symbol&&pair.value.name.replace('/','')!==symbol)router.replace(path('/trade/'+props.mode+'/'+pair.value.name.replace('/','')))},{immediate:true})
// Snapshot-only pairs carry volume '—'; show a dash instead of NaN volume/turnover.
const hasVolume=computed(()=>Number.isFinite(Number(pair.value.volume))&&Number(pair.value.volume)>0&&Number(pair.value.price)>0)
</script>
<template>
<div class="trading-terminal product-terminal" :class="[mode==='spot'?'spot-three-column':mode+'-workspace',{compact}]">
  <h1 class="terminal-accessible-title">{{ $t(product.title) }}</h1>
  <section class="instrument-bar" :aria-label="$t('trade.pages.marketOverview')">
    <div class="instrument-identity"><template v-if="compact"><button type="button" class="pair-trigger" aria-haspopup="dialog" :aria-label="$t('trade.form.tradingAsset')+' '+pair.name" @click="openPairs"><Coin :symbol="pair.symbol"/><strong>{{ pair.name }}</strong><LineIcon name="caret-down"/></button><button v-if="session.loggedIn" type="button" class="account-badge" :class="{demo:demoMode}" aria-haspopup="dialog" @click="switchMode">{{ $t(demoMode?'common.demo.account':'common.demo.realAccount') }}</button></template><RecordFilter v-else variant="market" :categories="pairCategories" :id="mode+'-market'" :model-value="pair.id" :label="$t('trade.form.tradingAsset')" :search-label="$t('trade.searchSymbol')" :options="pairs" @update:model-value="choosePair"><template #leading><Coin :symbol="pair.symbol"/></template></RecordFilter><button v-if="!compact" class="instrument-favorite" :aria-label="$t(favorites.includes(pair.id)?'common.unfavoriteMarket':'common.favoriteMarket',{symbol:pair.name})" :aria-pressed="favorites.includes(pair.id)" @click="favorite(pair.id)">{{ favorites.includes(pair.id)?'★':'☆' }}</button></div>
    <div v-if="compact" class="instrument-tools"><button type="button" class="product-switch" aria-haspopup="dialog" :aria-label="$t('trade.pages.product')+' '+productItems.find(o=>o.value===mode)?.label" @click="openProducts">{{ productItems.find(o=>o.value===mode)?.label }}<LineIcon name="caret-down"/></button><button type="button" class="chart-toggle" :aria-label="$t('trade.pages.showChart')" :title="$t('trade.pages.showChart')" @click="openChart"><LineIcon name="candlestick"/></button></div>
    <strong class="instrument-price" :class="livePair.change<0?'negative':'positive'"><template v-if="live">{{ fmt(livePair.price) }}<small v-if="compact" class="instrument-change">{{ livePair.change>0?'+':'' }}{{ livePair.change }}%</small></template><Skeleton v-else inline width="120px"/></strong><button v-if="compact" class="instrument-favorite compact-favorite" :aria-label="$t(favorites.includes(pair.id)?'common.unfavoriteMarket':'common.favoriteMarket',{symbol:pair.name})" :aria-pressed="favorites.includes(pair.id)" @click="favorite(pair.id)">{{ favorites.includes(pair.id)?'★':'☆' }}</button>
    <dl v-if="showChart" class="instrument-stats"><div><dt>{{ $t('home.markets.colChange') }}</dt><dd :class="livePair.change<0?'negative':'positive'"><template v-if="live">{{ livePair.change }}%</template><Skeleton v-else inline width="48px"/></dd></div><div><dt>{{ $t('trade.24hHigh') }}</dt><dd><template v-if="live">{{ fmt(livePair.high) }}</template><Skeleton v-else inline width="72px"/></dd></div><div><dt>{{ $t('trade.24hLow') }}</dt><dd><template v-if="live">{{ fmt(livePair.low) }}</template><Skeleton v-else inline width="72px"/></dd></div><div><dt>{{ $t('home.markets.colVolume') }}</dt><dd>{{ hasVolume?`${$compact(pair.volume/pair.price)} ${pair.symbol}`:'—' }}</dd></div><div><dt>{{ $t('trade.turnover') }}</dt><dd>{{ hasVolume?`${$compact(pair.volume)} USDT`:'—' }}</dd></div></dl>
    <span v-if="streamStatus!=='open'" class="stream-status" role="status"><span class="stream-dot" aria-hidden="true"></span>{{ $t(streamStatus==='reconnecting'?'trade.stream.reconnecting':'trade.stream.connecting') }}</span>
  </section>
  <div class="workspace-grid">
    <TradeChartPanel v-if="showChart" :id="mode+'-chart'" v-model="state.interval" :pair="livePair"/>
    <TradeOrderBook :pair="livePair" :compact="compact" :pickable="compact&&mode!=='options'" @pick-price="usePrice"/>
    <section class="terminal-panel order-panel" :aria-label="$t(product.title)"><h2 class="panel-heading" :class="{'sr-only':compact}">{{ $t(mode==='futures'?'trade.futuresOrder':mode==='options'?'trade.optionsOrder':'common.spotTrading') }}</h2><TradeOrderForm :mode="mode" :pair="livePair" :compact="compact"/></section>
    <TradeRecordsPanel :mode="mode" :state="state" :prices="livePrices" :compact="compact"/>
  </div>
</div>
</template>
<style>.stream-status{display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:12px;line-height:16px;color:#f5a524;white-space:nowrap}.stream-dot{width:6px;height:6px;border-radius:50%;background:currentColor;animation:stream-pulse 1.2s ease-in-out infinite}@keyframes stream-pulse{50%{opacity:.3}}@media(prefers-reduced-motion:reduce){.stream-dot{animation:none}}</style>
