<script setup>
import '../../styles/trade-workspace.css'
import {computed,watch} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {tradingMarkets as markets,path,fmt} from '../../data'
import {tradeProducts} from '../../utils/tradeProducts'
import {useMarketFavorites} from '../../composables/useMarketFavorites'
import {useTradePageState} from '../../composables/tradePageState'
import Coin from '../Coin.vue'
import RecordFilter from '../RecordFilter.vue'
import TradeOrderForm from '../TradeOrderForm.vue'
import TradeChartPanel from './TradeChartPanel.vue'
import TradeOrderBook from './TradeOrderBook.vue'
import TradeRecordsPanel from './TradeRecordsPanel.vue'
const props=defineProps({mode:{type:String,required:true}})
const route=useRoute(),router=useRouter(),state=useTradePageState(props.mode)
const product=tradeProducts[props.mode]
const pair=computed(()=>markets.find(m=>m.id===(route.params.symbol||state.symbol)||m.name.replace('/','')===route.params.symbol)||markets[0])
watch(()=>pair.value.id,id=>state.symbol=id,{immediate:true})
const {favorites,favorite}=useMarketFavorites('nt-trade-favorites')
const marketCategory=m=>['XAU','XAG','XAUT','PAXG'].includes(m.symbol)?'trade.pages.metals':m.category
const pairs=computed(()=>markets.map(m=>({value:m.id,label:m.name,category:marketCategory(m),price:fmt(m.price),change:m.change})))
const pairCategories=computed(()=>['home.products.perpTag1','aiQuant.market.forex','trade.pages.metals','trade.pages.energy'].filter(value=>pairs.value.some(m=>m.category===value)).map(value=>({value})))
function choosePair(id){router.push(path('/trade/'+props.mode+'/'+id))}
// Unknown symbols fall back to the default pair; make the URL say which pair is actually shown.
watch(()=>route.params.symbol,symbol=>{if(symbol&&pair.value.id!==symbol&&pair.value.name.replace('/','')!==symbol)router.replace(path('/trade/'+props.mode+'/'+pair.value.name.replace('/','')))},{immediate:true})
// Snapshot-only pairs carry volume '—'; show a dash instead of NaN volume/turnover.
const hasVolume=computed(()=>Number.isFinite(Number(pair.value.volume))&&Number(pair.value.volume)>0&&Number(pair.value.price)>0)
</script>
<template>
<div class="trading-terminal product-terminal" :class="mode==='spot'?'spot-three-column':mode+'-workspace'">
  <h1 class="terminal-accessible-title">{{ $t(product.title) }}</h1>
  <section class="instrument-bar" :aria-label="$t('trade.pages.marketOverview')">
    <div class="instrument-identity"><RecordFilter variant="market" :categories="pairCategories" :id="mode+'-market'" :model-value="pair.id" :label="$t('trade.form.tradingAsset')" :search-label="$t('trade.searchSymbol')" :options="pairs" @update:model-value="choosePair"><template #leading><Coin :symbol="pair.symbol"/></template></RecordFilter><button class="instrument-favorite" :aria-label="$t(favorites.includes(pair.id)?'common.unfavoriteMarket':'common.favoriteMarket',{symbol:pair.name})" :aria-pressed="favorites.includes(pair.id)" @click="favorite(pair.id)">{{ favorites.includes(pair.id)?'★':'☆' }}</button></div>
    <strong class="instrument-price" :class="pair.change<0?'negative':'positive'">{{ fmt(pair.price) }}</strong>
    <dl class="instrument-stats"><div><dt>{{ $t('home.markets.colChange') }}</dt><dd :class="pair.change<0?'negative':'positive'">{{ pair.change }}%</dd></div><div><dt>{{ $t('trade.24hHigh') }}</dt><dd>{{ fmt(pair.price*1.064) }}</dd></div><div><dt>{{ $t('trade.24hLow') }}</dt><dd>{{ fmt(pair.price*.979) }}</dd></div><div><dt>{{ $t('home.markets.colVolume') }}</dt><dd>{{ hasVolume?`${$compact(pair.volume/pair.price)} ${pair.symbol}`:'—' }}</dd></div><div><dt>{{ $t('trade.turnover') }}</dt><dd>{{ hasVolume?`${$compact(pair.volume)} USDT`:'—' }}</dd></div></dl>
  </section>
  <div class="workspace-grid">
    <TradeChartPanel v-model="state.interval" :pair="pair"/>
    <TradeOrderBook :pair="pair"/>
    <section class="terminal-panel order-panel" :aria-label="$t(product.title)"><h2 class="panel-heading">{{ $t(mode==='futures'?'trade.futuresOrder':mode==='options'?'trade.optionsOrder':'common.spotTrading') }}</h2><TradeOrderForm :mode="mode" :pair="pair"/></section>
    <TradeRecordsPanel :mode="mode" :state="state"/>
  </div>
</div>
</template>

