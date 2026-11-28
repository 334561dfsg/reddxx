<script setup>
import {computed,nextTick,onMounted,shallowRef,useTemplateRef,watch} from 'vue'
import {tradingMarkets,fmt} from '../../data'
import {filterPairs,nextSort,pairRows,pairTabs} from '../../utils/pairList.js'
import {useMarketFavorites} from '../../composables/useMarketFavorites'
import {useTickers} from '../../composables/useMarket.js'
import {useScrollOverflow} from '../../composables/useScrollOverflow.js'
import Coin from '../Coin.vue'
import LineIcon from '../ui/LineIcon.vue'
// Shared trading pair list (user reference, 2026-11-27 / 2026-11-28): search, favourites / all / category tabs,
// sortable 交易對·成交額 / 價格·漲跌幅 header and one row per pair (star, icon, name, turnover, live price, change).
// Used by the phone/tablet pair drawer (overlay/MarketPicker, variant "drawer") and the desktop pair panel left of the
// chart (TradeWorkspace, variant "panel"). Choosing a row reports its id; the caller routes to it. Stars share the
// trading favourites list. Filtering and sorting live in utils/pairList.js.
const props=defineProps({current:String,variant:{type:String,default:'drawer'}})
const emit=defineEmits(['select'])
const {favorites,favorite}=useMarketFavorites('nt-trade-favorites')
const isFavorite=id=>favorites.value.includes(id)
const tickers=useTickers()
const query=shallowRef(''),tab=shallowRef('all'),sort=shallowRef({key:'',desc:true})
const rows=computed(()=>pairRows(tradingMarkets,tickers.data.value))
const tabs=computed(()=>pairTabs(rows.value))
// A category that disappears from the catalogue falls back to 全部 instead of an empty list.
const activeTab=computed(()=>tab.value==='favorites'||tabs.value.includes(tab.value)?tab.value:'all')
const visible=computed(()=>filterPairs(rows.value,{tab:activeTab.value,query:query.value,favorites:favorites.value,sort:sort.value}))
const toggleSort=key=>{sort.value=nextSort(sort.value,key)}
const ariaSort=key=>sort.value.key===key?(sort.value.desc?'descending':'ascending'):'none'
const sortMark=key=>sort.value.key===key?(sort.value.desc?'↓':'↑'):'⇅'
const columns=[['name','trade.pair'],['volume','trade.turnover'],['price','trade.price'],['change','home.markets.colChange']]
const emptyText=computed(()=>query.value.trim()?'trade.pages.noMarketMatch':activeTab.value==='favorites'?'trade.marketList.emptyFavorites.title':'trade.marketList.emptyCategory.title')
// Keep the current pair in view inside the list (scrolls the list only, never the page): on mount and on pair change.
const listEl=useTemplateRef('listEl')
function revealCurrent(){
 const list=listEl.value,row=list?.querySelector('li.current')
 if(!row)return
 const box=list.getBoundingClientRect(),item=row.getBoundingClientRect()
 if(item.top<box.top)list.scrollTop-=box.top-item.top
 else if(item.bottom>box.bottom)list.scrollTop+=item.bottom-box.bottom
}
onMounted(revealCurrent)
watch(()=>props.current,()=>nextTick(revealCurrent))
// Category tabs stay on one row; extra categories scroll sideways with a right fade (useScrollOverflow).
const tabsEl=useTemplateRef('tabsEl')
const tabsScroll=useScrollOverflow(tabsEl)
</script>
<template>
<div class="market-picker" :class="'pair-list-'+variant">
 <label class="picker-search"><LineIcon name="search" aria-hidden="true"/><input v-model="query" type="search" :placeholder="$t('trade.searchSymbol')" :aria-label="$t('trade.searchSymbol')" autocomplete="off"/></label>
 <div ref="tabsEl" class="picker-tabs" :class="{'has-more':tabsScroll.more.value}" role="group" :aria-label="$t('trade.pages.marketCategories')" @scroll.passive="tabsScroll.update" @wheel="tabsScroll.onWheel">
  <button type="button" class="picker-fav-tab" :aria-pressed="activeTab==='favorites'" :aria-label="$t('trade.marketList.favorites')" @click="tab='favorites'">{{ activeTab==='favorites'?'★':'☆' }}</button>
  <button v-for="c in tabs" :key="c" type="button" :aria-pressed="activeTab===c" @click="tab=c">{{ $t(c==='all'?'aiQuant.templates.filterAll':c) }}</button>
 </div>
 <div class="picker-head">
  <span class="picker-head-group"><button v-for="[key,label] in columns.slice(0,2)" :key="key" type="button" :aria-sort="ariaSort(key)" @click="toggleSort(key)">{{ $t(label) }}<span class="sort-mark" aria-hidden="true">{{ sortMark(key) }}</span></button></span>
  <span class="picker-head-group end"><button v-for="[key,label] in columns.slice(2)" :key="key" type="button" :aria-sort="ariaSort(key)" @click="toggleSort(key)">{{ $t(label) }}<span class="sort-mark" aria-hidden="true">{{ sortMark(key) }}</span></button></span>
 </div>
 <ul v-if="visible.length" ref="listEl" class="picker-list" :aria-label="$t('trade.pair')">
  <li v-for="r in visible" :key="r.id" :class="{current:r.id===current}">
   <button type="button" class="picker-star" :aria-pressed="isFavorite(r.id)" :aria-label="$t(isFavorite(r.id)?'common.unfavoriteMarket':'common.favoriteMarket',{symbol:r.name})" @click="favorite(r.id)">{{ isFavorite(r.id)?'★':'☆' }}</button>
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
/* 3px trading scrollbar for the list in both the drawer and the desktop panel. Chrome ignores ::-webkit-scrollbar
   once scrollbar-width or scrollbar-color is set (the trading page sets both on every element), so both are reset here and
   scrollbar-width: thin is kept only for browsers without the WebKit pseudo-elements (Firefox). */
.picker-list{scrollbar-width:auto;scrollbar-color:auto}
.picker-list::-webkit-scrollbar{width:3px;height:3px}
.picker-list::-webkit-scrollbar-track{background:transparent}
.picker-list::-webkit-scrollbar-thumb{background:var(--nt-border);border-radius:3px}
@supports not selector(::-webkit-scrollbar){.picker-list{scrollbar-width:thin;scrollbar-color:var(--nt-border) transparent}}
.picker-empty{margin:0;padding:32px 16px;text-align:center;color:#fff8}
/* Desktop panel (trading tokens: list 14/20, secondary 12/16, 52px rows, 3px scrollbars). */
.pair-list-panel .picker-search{height:32px;margin:12px 12px 0;padding:0 10px}
.pair-list-panel .picker-search svg{width:16px;height:16px}
.pair-list-panel .picker-tabs{padding:8px 12px 4px;gap:0 8px;overscroll-behavior-x:contain}
.pair-list-panel .picker-fav-tab{min-width:20px}
.picker-tabs::-webkit-scrollbar{display:none}
.picker-tabs.has-more{-webkit-mask-image:linear-gradient(to left,transparent,#000 24px);mask-image:linear-gradient(to left,transparent,#000 24px)}
.pair-list-panel .picker-tabs button{min-height:28px}
.pair-list-panel .picker-head{padding:2px 10px 4px 36px;gap:6px}
.pair-list-panel .picker-head-group{gap:6px}
.pair-list-panel .picker-head button{white-space:nowrap}
.pair-list-panel .picker-list{padding-bottom:4px}
.pair-list-panel .picker-star{width:36px;padding-left:6px}
.pair-list-panel .picker-row{padding-right:12px;gap:8px}
.pair-list-panel .picker-row .coin{width:24px;height:24px}
.picker-star:focus-visible,.picker-tabs button:focus-visible,.picker-head button:focus-visible{outline:none;text-decoration:underline}
</style>
