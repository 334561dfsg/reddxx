<script setup>
import {computed,shallowRef} from 'vue'
import {tradingMarkets,fmt} from '../../data'
import {tradeMarketCategory,tradeMarketCategories} from '../../utils/tradeProducts'
import {useMarketFavorites} from '../../composables/useMarketFavorites'
import {useTickers} from '../../composables/useMarket.js'
import Coin from '../Coin.vue'
import LineIcon from '../ui/LineIcon.vue'
// Mobile trading pair picker (user reference, 2026-11-27), opened by the overlay as a left drawer from the compact
// trading header: search, favourites / all / category tabs, sortable 交易對·成交額 / 價格·漲跌幅 header and one row per
// pair (star, icon, name, turnover, live price, change). Choosing a row reports its id; the overlay closes first and
// the trading page then routes to it. Stars share the trading favourites list.
const props=defineProps({current:String})
const emit=defineEmits(['select'])
const {favorites,favorite}=useMarketFavorites('nt-trade-favorites')
const tickers=useTickers()
const query=shallowRef(''),tab=shallowRef('all'),sort=shallowRef({key:'',desc:true})
const rows=computed(()=>tradingMarkets.map(m=>{const q=tickers.data.value?.[m.id];return {id:m.id,name:m.name,symbol:m.symbol,category:tradeMarketCategory(m),
 volume:Number.isFinite(Number(m.volume))&&Number(m.volume)>0?Number(m.volume):null,price:q?.price??m.price,change:q?Number(q.change.toFixed(2)):m.change}}))
const tabs=computed(()=>['all',...tradeMarketCategories.filter(c=>rows.value.some(r=>r.category===c))])
const visible=computed(()=>{
 const text=query.value.trim().toLowerCase().replace('/','')
 let list=rows.value.filter(r=>(tab.value==='all'||(tab.value==='favorites'?favorites.value.includes(r.id):r.category===tab.value))&&(!text||r.name.toLowerCase().replace('/','').includes(text)))
 const {key,desc}=sort.value
 if(key){const dir=desc?-1:1;list=[...list].sort((a,b)=>key==='name'?dir*a.name.localeCompare(b.name):dir*((a[key]??-Infinity)-(b[key]??-Infinity))||a.name.localeCompare(b.name))}
 return list
})
// Each header toggles descending → ascending → original order.
function toggleSort(key){const s=sort.value;sort.value=s.key!==key?{key,desc:true}:s.desc?{key,desc:false}:{key:'',desc:true}}
const ariaSort=key=>sort.value.key===key?(sort.value.desc?'descending':'ascending'):'none'
const columns=[['name','trade.pair'],['volume','trade.turnover'],['price','trade.price'],['change','home.markets.colChange']]
const emptyText=computed(()=>query.value.trim()?'trade.pages.noMarketMatch':tab.value==='favorites'?'trade.marketList.emptyFavorites.title':'trade.marketList.emptyCategory.title')
</script>
<template>
<div class="market-picker">
 <label class="picker-search"><LineIcon name="search" aria-hidden="true"/><input v-model="query" type="search" :placeholder="$t('trade.searchSymbol')" :aria-label="$t('trade.searchSymbol')" autocomplete="off"/></label>
 <div class="picker-tabs" role="group" :aria-label="$t('trade.pages.marketCategories')">
  <button type="button" class="picker-fav-tab" :aria-pressed="tab==='favorites'" :aria-label="$t('trade.marketList.favorites')" @click="tab='favorites'">{{ tab==='favorites'?'★':'☆' }}</button>
  <button v-for="c in tabs" :key="c" type="button" :aria-pressed="tab===c" @click="tab=c">{{ $t(c==='all'?'aiQuant.templates.filterAll':c) }}</button>
 </div>
 <div class="picker-head">
  <span class="picker-head-group"><button v-for="[key,label] in columns.slice(0,2)" :key="key" type="button" :aria-sort="ariaSort(key)" @click="toggleSort(key)">{{ $t(label) }}<span class="sort-mark" aria-hidden="true">{{ sort.key===key?(sort.desc?'↓':'↑'):'⇅' }}</span></button></span>
  <span class="picker-head-group end"><button v-for="[key,label] in columns.slice(2)" :key="key" type="button" :aria-sort="ariaSort(key)" @click="toggleSort(key)">{{ $t(label) }}<span class="sort-mark" aria-hidden="true">{{ sort.key===key?(sort.desc?'↓':'↑'):'⇅' }}</span></button></span>
 </div>
 <ul v-if="visible.length" class="picker-list" :aria-label="$t('trade.pair')">
  <li v-for="r in visible" :key="r.id" :class="{current:r.id===current}">
   <button type="button" class="picker-star" :aria-pressed="favorites.includes(r.id)" :aria-label="$t(favorites.includes(r.id)?'common.unfavoriteMarket':'common.favoriteMarket',{symbol:r.name})" @click="favorite(r.id)">{{ favorites.includes(r.id)?'★':'☆' }}</button>
   <button type="button" class="picker-row" :aria-current="r.id===current?'true':undefined" @click="emit('select',r.id)">
    <Coin :symbol="r.symbol"/>
    <span class="picker-name"><strong>{{ r.name }}</strong><small>{{ r.volume===null?'—':$compact(r.volume) }}</small></span>
    <span class="picker-quote"><strong>{{ fmt(r.price) }}</strong><small :class="r.change<0?'negative':'positive'">{{ r.change>0?'+':'' }}{{ r.change }}%</small></span>
   </button>
  </li>
 </ul>
 <p v-else class="picker-empty" role="status">{{ $t(emptyText) }}</p>
</div>
</template>
<style scoped>
.market-picker{display:flex;flex-direction:column;min-height:0;flex:1}
.picker-search{display:flex;align-items:center;gap:8px;flex:none;height:40px;padding:0 12px;margin:0 16px;border-radius:var(--nt-radius-control);background:var(--nt-border);color:#fff8}
.picker-search svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6;flex:none}
.picker-search input{flex:1;min-width:0;height:100%;border:0;background:transparent;color:#fff;font-size:14px;outline:none}
.picker-tabs{display:flex;align-items:center;gap:4px 16px;flex:none;padding:10px 16px 6px;overflow-x:auto;scrollbar-width:none}
.picker-tabs button{flex:none;min-height:32px;color:var(--nt-text-secondary);font-size:13px;white-space:nowrap}
.picker-tabs button[aria-pressed=true]{color:#fff;font-weight:600}
.picker-fav-tab{font-size:16px;min-width:24px}
.picker-fav-tab[aria-pressed=true]{color:var(--nt-accent)}
.picker-head{display:flex;justify-content:space-between;flex:none;padding:4px 16px 6px 48px;border-bottom:1px solid var(--nt-border)}
.picker-head-group{display:flex;gap:12px}
.picker-head button{display:inline-flex;align-items:center;gap:2px;min-height:28px;color:#fff8;font-size:12px}
.picker-head button[aria-sort=ascending],.picker-head button[aria-sort=descending]{color:#fff}
.sort-mark{font-size:10px}
.picker-list{list-style:none;margin:0;padding:0 0 max(12px,env(safe-area-inset-bottom));overflow-y:auto;overscroll-behavior:contain;flex:1;min-height:0}
.picker-list li{display:flex;align-items:center}
.picker-list li.current{background:var(--nt-border-subtle)}
.picker-star{flex:none;display:grid;place-items:center;width:44px;height:52px;padding-left:8px;color:#fff8;font-size:16px}
.picker-star[aria-pressed=true]{color:var(--nt-accent)}
.picker-row{flex:1;min-width:0;display:flex;align-items:center;gap:10px;min-height:52px;padding:6px 16px 6px 0;text-align:left;color:#fff}
.picker-row:hover,.picker-row:focus-visible{outline:none;background:#ffffff06}
.picker-row .coin{width:28px;height:28px;flex:none}
.picker-name,.picker-quote{display:grid;gap:2px;min-width:0}
.picker-name{flex:1}
.picker-quote{text-align:right;flex:none}
.picker-name strong,.picker-quote strong{font-size:14px;line-height:20px;font-weight:600;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.picker-name small,.picker-quote small{font-size:12px;line-height:16px;color:#fff8;font-variant-numeric:tabular-nums}
.picker-quote .positive{color:var(--nt-green,var(--nt-up))}.picker-quote .negative{color:var(--nt-red,var(--nt-down))}
.picker-empty{margin:0;padding:32px 16px;text-align:center;color:#fff8}
.picker-star:focus-visible,.picker-tabs button:focus-visible,.picker-head button:focus-visible{outline:none;text-decoration:underline}
</style>
